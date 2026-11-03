import { NextRequest, NextResponse } from "next/server";
import { runShoppingAgent } from "@/lib/agent";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import { evaluate } from "@/lib/policy/engine";
import { loadMandateHistory } from "@/lib/policy/history";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const instruction = body?.message || body?.instruction;

    if (!instruction || typeof instruction !== "string") {
      return NextResponse.json(
        { error: "Instruction message is required" },
        { status: 400 }
      );
    }

    const mandateId = body.mandateId;
    const sessionId = body.sessionId || crypto.randomUUID();

    const user = await getCurrentUser();
    const supabase = createAdminClient();

    let mandate = null;
    if (mandateId) {
      const { data } = await supabase
        .from("mandates")
        .select("*")
        .eq("id", mandateId)
        .maybeSingle();
      mandate = data;
    }

    if (!mandate && user) {
      const { data } = await supabase
        .from("mandates")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
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

    // Persist session if mandate exists
    if (mandate?.id) {
      try {
        await supabase.from("agent_sessions").upsert({
          id: sessionId,
          mandate_id: mandate.id,
          original_instruction: instruction,
          created_at: new Date().toISOString(),
        });
      } catch {
        // Continue even if table grants are pending
      }
    }

    // Execute agent reasoning and tool calls
    const agentResult = await runShoppingAgent({
      instruction,
      mandate,
      sessionId,
      maxSteps: 4,
    });

    let decision = null;
    let paymentExecution = null;
    let approvalId = null;

    // Evaluate proposed payment through BERYL Policy Engine
    if (agentResult.paymentRequest && mandate) {
      const requestId = crypto.randomUUID();
      const history = await loadMandateHistory(supabase, mandate.id);

      const guardInput = {
        id: requestId,
        mandate_id: mandate.id,
        session_id: sessionId,
        item: agentResult.paymentRequest.item,
        category: agentResult.paymentRequest.category,
        merchant: agentResult.paymentRequest.merchant,
        merchant_domain: agentResult.paymentRequest.merchant_domain,
        amount_cents: agentResult.paymentRequest.amount_cents,
        agent_reason: agentResult.paymentRequest.agent_reason || "Requested by shopper agent",
        source: "channel3",
        in_stock: true,
      };

      decision = evaluate(mandate, guardInput as any, history);

      // Persist payment request
      try {
        await supabase.from("payment_requests").upsert({
          id: requestId,
          session_id: sessionId,
          mandate_id: mandate.id,
          item: guardInput.item,
          category: guardInput.category,
          merchant: guardInput.merchant,
          merchant_domain: guardInput.merchant_domain,
          amount_cents: guardInput.amount_cents,
          agent_reason: guardInput.agent_reason,
          source: guardInput.source,
          in_stock: true,
          created_at: new Date().toISOString(),
        });
      } catch (e: any) {
        console.warn("Could not persist payment request:", e.message);
      }

      // Persist policy decision
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
        console.warn("Could not persist decision:", e.message);
      }

      // Escalate to human approval if needs_approval
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
          console.warn("Could not persist approval:", e.message);
        }
      }

      // Record audit event
      try {
        let eventType = "DECISION_APPROVED";
        if (decision.outcome === "block") {
          eventType = "SECURITY_ALERT_BLOCKED";
        } else if (decision.outcome === "needs_approval") {
          eventType = "APPROVAL_ESCALATED";
        }

        await supabase.from("audit_events").insert({
          mandate_id: mandate.id,
          event_type: eventType,
          payload: {
            request_id: requestId,
            decision_id: decisionId,
            outcome: decision.outcome,
            rule_code: decision.rule_code,
            item: guardInput.item,
            amount_cents: guardInput.amount_cents,
            merchant_domain: guardInput.merchant_domain,
            flags: decision.flags,
            reason_text: decision.reason_text,
          },
          created_at: new Date().toISOString(),
        });
      } catch (e: any) {
        console.warn("Could not persist audit event:", e.message);
      }

      // Auto-execute PayPal Sandbox if approved
      if (decision.outcome === "approve") {
        try {
          const { executePayPalPayment } = await import("@/lib/paypal");
          paymentExecution = await executePayPalPayment({
            requestId,
            amountCents: guardInput.amount_cents,
            currency: "USD",
            itemName: guardInput.item,
            merchantDomain: guardInput.merchant_domain,
            mandateId: mandate.id,
          });
        } catch (payErr: any) {
          console.warn("Auto payment execution failed in sandbox:", payErr.message);
        }

        // Direct guarantee: Update mandate spent_cents
        try {
          const { data: curM } = await supabase
            .from("mandates")
            .select("spent_cents")
            .eq("id", mandate.id)
            .maybeSingle();
          const newSpent = (curM?.spent_cents || 0) + guardInput.amount_cents;
          await supabase
            .from("mandates")
            .update({ spent_cents: newSpent })
            .eq("id", mandate.id);
        } catch (mErr: any) {
          console.warn("Could not sync mandate spent_cents:", mErr.message);
        }
      }
    }

    const paymentResult = agentResult.paymentRequest
      ? {
          ...agentResult.paymentRequest,
          decision,
          payment: paymentExecution,
          approvalId,
        }
      : undefined;

    return NextResponse.json({
      text: agentResult.response,
      response: agentResult.response,
      steps: agentResult.steps,
      paymentRequest: agentResult.paymentRequest,
      paymentRequests: paymentResult ? [paymentResult] : [],
      decision,
      payment: paymentExecution,
      approvalId,
      mandateId: mandate?.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Agent execution failed" },
      { status: 500 }
    );
  }
}
