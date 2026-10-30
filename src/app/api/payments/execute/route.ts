import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { executePayPalPayment } from "@/lib/paypal";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to execute payments." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const requestId = body?.request_id;

    if (!requestId) {
      return NextResponse.json(
        { error: "request_id parameter is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch payment request and its decision/approval state
    const { data: paymentReq, error: reqError } = await supabase
      .from("payment_requests")
      .select(
        `
        id,
        mandate_id,
        item,
        amount_cents,
        merchant,
        merchant_domain,
        decisions (
          outcome,
          rule_code
        ),
        approvals (
          status
        )
      `
      )
      .eq("id", requestId)
      .single();

    if (reqError || !paymentReq) {
      return NextResponse.json(
        { error: "Payment request record not found" },
        { status: 404 }
      );
    }

    // 2. Security Check: Verify Guard Approval
    const decisions = Array.isArray(paymentReq.decisions)
      ? paymentReq.decisions
      : [];
    const approvals = Array.isArray(paymentReq.approvals)
      ? paymentReq.approvals
      : [];

    const isDirectlyApproved = decisions.some((d: any) => d.outcome === "approve");
    const isHumanApproved = approvals.some((a: any) => a.status === "approved");
    const isBlocked = decisions.some((d: any) => d.outcome === "block");

    if (isBlocked) {
      return NextResponse.json(
        {
          error:
            "Forbidden: This transaction was BLOCKED by BERYL Policy Guard and cannot be executed.",
        },
        { status: 403 }
      );
    }

    if (!isDirectlyApproved && !isHumanApproved) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Transaction requires human authorization before execution.",
        },
        { status: 403 }
      );
    }

    // 3. Execute PayPal Sandbox Order with Idempotency
    const paymentResult = await executePayPalPayment({
      requestId,
      amountCents: paymentReq.amount_cents,
      itemName: paymentReq.item,
      merchantDomain: paymentReq.merchant_domain,
      mandateId: paymentReq.mandate_id,
    });

    return NextResponse.json({
      success: true,
      message: paymentResult.idempotentReplay
        ? "Existing PayPal transaction retrieved (idempotent replay)."
        : "PayPal sandbox payment executed successfully.",
      payment: paymentResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to execute PayPal payment" },
      { status: 500 }
    );
  }
}
