import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluate } from "@/lib/policy/engine";
import { loadMandateHistory } from "@/lib/policy/history";
import { GuardEvaluateInputSchema } from "@/lib/policy/types";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parseResult = GuardEvaluateInputSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid payment request payload",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const payload = parseResult.data;
    const requestId = payload.id || crypto.randomUUID();
    const supabase = createAdminClient();

    // 1. Fetch the Mandate (by ID or active mandate fallback)
    let mandate = null;
    if (payload.mandate_id) {
      const { data } = await supabase
        .from("mandates")
        .select("*")
        .eq("id", payload.mandate_id)
        .maybeSingle();
      mandate = data;
    }

    if (!mandate) {
      const { data } = await supabase
        .from("mandates")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      mandate = data;
    }

    if (!mandate) {
      return NextResponse.json(
        { error: "No active mandate found to evaluate payment against." },
        { status: 404 }
      );
    }

    // 2. Load Mandate Spending History
    const history = await loadMandateHistory(supabase, mandate.id);

    // 3. Evaluate Request against Mandate with Pure Policy Engine
    const decision = evaluate(mandate, payload, history);

    // 4. Persist Payment Request to Database
    try {
      await supabase.from("payment_requests").upsert({
        id: requestId,
        session_id: payload.session_id || null,
        mandate_id: mandate.id,
        item: payload.item,
        category: payload.category,
        merchant: payload.merchant,
        merchant_domain: payload.merchant_domain,
        amount_cents: payload.amount_cents,
        agent_reason: payload.agent_reason,
        source: payload.source,
        channel3_product_id: payload.channel3_product_id || null,
        product_url: payload.product_url || null,
        listed_price_cents: payload.listed_price_cents || null,
        in_stock: payload.in_stock,
        created_at: new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn("⚠️ Could not persist payment request:", e.message);
    }

    // 5. Persist Policy Decision
    const decisionId = crypto.randomUUID();
    try {
      await supabase.from("decisions").upsert({
        id: decisionId,
        request_id: requestId,
        outcome: decision.outcome,
        rule_code: decision.rule_code,
        reason_text: decision.reason_text,
        flags: decision.flags,
        created_at: decision.evaluated_at,
      });
    } catch (e: any) {
      console.warn("⚠️ Could not persist decision:", e.message);
    }

    // 6. Handle Escalation for Human Approval
    let approvalId: string | undefined;
    if (decision.outcome === "needs_approval") {
      approvalId = crypto.randomUUID();
      try {
        await supabase.from("approvals").upsert({
          id: approvalId,
          request_id: requestId,
          status: "pending",
          decided_at: null,
        });
      } catch (e: any) {
        console.warn("⚠️ Could not persist approval:", e.message);
      }
    }

    // 7. Emit Audit Event
    let eventType = "DECISION_APPROVED";
    if (decision.outcome === "block") {
      eventType = "SECURITY_ALERT_BLOCKED";
    } else if (decision.outcome === "needs_approval") {
      eventType = "APPROVAL_ESCALATED";
    }

    try {
      await supabase.from("audit_events").insert({
        mandate_id: mandate.id,
        event_type: eventType,
        payload: {
          request_id: requestId,
          decision_id: decisionId,
          outcome: decision.outcome,
          rule_code: decision.rule_code,
          item: payload.item,
          amount_cents: payload.amount_cents,
          merchant_domain: payload.merchant_domain,
          flags: decision.flags,
          reason_text: decision.reason_text,
        },
        created_at: new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn("⚠️ Could not persist audit event:", e.message);
    }

    // 8. Auto-Execute PayPal Payment if Approved
    let paymentExecutionResult = null;
    if (decision.outcome === "approve" && payload.auto_execute_payment !== false) {
      try {
        const { executePayPalPayment } = await import("@/lib/paypal");
        paymentExecutionResult = await executePayPalPayment({
          requestId,
          amountCents: payload.amount_cents,
          currency: "USD",
          itemName: payload.item,
          merchantDomain: payload.merchant_domain,
          mandateId: mandate.id,
        });
      } catch (payErr: any) {
        console.warn("⚠️ Auto payment execution failed in sandbox:", payErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      request_id: requestId,
      decision_id: decisionId,
      mandate_id: mandate.id,
      outcome: decision.outcome,
      rule_code: decision.rule_code,
      reason_text: decision.reason_text,
      flags: decision.flags,
      approval_id: approvalId,
      payment: paymentExecutionResult,
      details: decision.details,
      evaluated_at: decision.evaluated_at,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to evaluate guard policy" },
      { status: 500 }
    );
  }
}
