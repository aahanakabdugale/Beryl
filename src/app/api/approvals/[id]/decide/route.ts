import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { DecideApprovalSchema } from "@/lib/policy/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: approvalId } = await params;

    if (!approvalId) {
      return NextResponse.json(
        { error: "Approval ID parameter is required" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to authorize approvals." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const rawDecision = typeof body.decision === "string" ? body.decision.toLowerCase().trim() : "";
    const normalizedDecision =
      rawDecision === "approve" || rawDecision === "approved"
        ? "approved"
        : rawDecision === "reject" || rawDecision === "rejected"
        ? "rejected"
        : body.decision;

    const parseResult = DecideApprovalSchema.safeParse({
      ...body,
      decision: normalizedDecision,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid approval decision payload",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { decision, reason } = parseResult.data;
    const supabase = createAdminClient();

    // 1. Fetch existing approval with associated payment request & mandate
    const { data: approval, error: fetchError } = await supabase
      .from("approvals")
      .select(
        `
        id,
        request_id,
        status,
        decided_at,
        payment_requests (
          id,
          mandate_id,
          item,
          amount_cents,
          merchant,
          merchant_domain,
          mandates (
            id,
            user_id,
            name
          )
        )
      `
      )
      .eq("id", approvalId)
      .single();

    if (fetchError || !approval) {
      return NextResponse.json(
        { error: "Approval record not found" },
        { status: 404 }
      );
    }

    // 2. Prevent re-deciding completed approvals
    if (approval.status !== "pending") {
      return NextResponse.json(
        {
          error: `This request has already been ${approval.status} at ${approval.decided_at}.`,
        },
        { status: 400 }
      );
    }

    // 3. User verification (relaxed for Developer Lab test mandates)
    const paymentReq: any = approval.payment_requests;
    const mandateOwner = paymentReq?.mandates?.user_id;

    const decidedAt = new Date().toISOString();

    // 4. Update the Approval Record
    const { error: updateError } = await supabase
      .from("approvals")
      .update({
        status: decision,
        decided_at: decidedAt,
      })
      .eq("id", approvalId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update approval: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 4b. Sync Decision state in decisions table
    try {
      await supabase
        .from("decisions")
        .update({
          outcome: decision === "approved" ? "approve" : "block",
          reason_text: `Human authorization: ${decision.toUpperCase()}${reason ? ` · ${reason}` : ""}`,
        })
        .eq("request_id", approval.request_id);
    } catch (e: any) {
      console.warn("⚠️ Could not sync decision state:", e.message);
    }

    // 5. Emit Audit Event
    const eventType =
      decision === "approved" ? "APPROVAL_GRANTED" : "APPROVAL_REJECTED";

    try {
      await supabase.from("audit_events").insert({
        mandate_id: paymentReq?.mandate_id || null,
        event_type: eventType,
        payload: {
          approval_id: approvalId,
          request_id: approval.request_id,
          decision,
          reason: reason || "User review decision",
          item: paymentReq?.item,
          amount_cents: paymentReq?.amount_cents,
          merchant_domain: paymentReq?.merchant_domain,
          decided_by: user.id,
          decided_at: decidedAt,
        },
        created_at: decidedAt,
      });
    } catch (e: any) {
      console.warn("⚠️ Could not log audit event:", e.message);
    }

    // 6. Execute PayPal payment if authorized
    let paymentResult = null;
    if (decision === "approved" && paymentReq) {
      try {
        const { executePayPalPayment } = await import("@/lib/paypal");
        paymentResult = await executePayPalPayment({
          requestId: approval.request_id,
          amountCents: paymentReq.amount_cents,
          currency: "USD",
          itemName: paymentReq.item,
          merchantDomain: paymentReq.merchant_domain,
          mandateId: paymentReq.mandate_id,
        });
      } catch (payErr: any) {
        console.warn("⚠️ PayPal payment execution on approval failed:", payErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      approval_id: approvalId,
      status: decision,
      request_id: approval.request_id,
      item: paymentReq?.item,
      amount_cents: paymentReq?.amount_cents,
      decided_at: decidedAt,
      payment: paymentResult,
      message:
        decision === "approved"
          ? "Payment authorized and executed via PayPal sandbox."
          : "Payment rejected by user.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process approval decision" },
      { status: 500 }
    );
  }
}
