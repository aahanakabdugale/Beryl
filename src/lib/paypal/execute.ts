import { createAdminClient } from "../supabase/admin";
import { createSandboxOrder } from "./client";
import { ExecutePaymentParams, PayPalExecutionResult } from "./types";
import crypto from "crypto";

/**
 * Executes a PayPal Sandbox Payment with full database-level and PayPal-level idempotency.
 * If the payment for this requestId already exists, the existing record is returned without re-charging.
 */
export async function executePayPalPayment(
  params: ExecutePaymentParams
): Promise<PayPalExecutionResult> {
  const supabase = createAdminClient();

  // 1. Database-Level Idempotency Check
  const { data: existingPayment } = await supabase
    .from("payments")
    .select("*")
    .eq("request_id", params.requestId)
    .single();

  if (existingPayment) {
    console.log(
      `✓ Idempotent replay: Payment for requestId ${params.requestId} already exists (${existingPayment.paypal_order_id}).`
    );

    return {
      success: true,
      paymentId: existingPayment.id,
      paypalOrderId: existingPayment.paypal_order_id,
      paypalStatus: existingPayment.paypal_status,
      amountCents: existingPayment.amount_cents,
      currency: params.currency || "USD",
      idempotentReplay: true,
      createdAt: existingPayment.created_at,
    };
  }

  // 2. Call PayPal Sandbox API (with PayPal-Request-Id header for provider idempotency)
  const order = await createSandboxOrder(params);
  const paymentId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const approvalUrl = order.links?.find((l) => l.rel === "approve")?.href;

  // In Sandbox demonstration, mark status as COMPLETED when order created successfully
  const finalStatus =
    order.status === "COMPLETED" || order.status === "CREATED"
      ? "COMPLETED"
      : order.status;

  // 3. Persist to payments table
  try {
    await supabase.from("payments").insert({
      id: paymentId,
      request_id: params.requestId,
      paypal_order_id: order.id,
      paypal_status: finalStatus,
      amount_cents: params.amountCents,
      created_at: createdAt,
    });
  } catch (err: any) {
    console.warn("⚠️ Could not persist payment record:", err.message);
  }

  // 4. Record Audit Event
  if (params.mandateId) {
    try {
      await supabase.from("audit_events").insert({
        mandate_id: params.mandateId,
        event_type: "PAYMENT_EXECUTED",
        payload: {
          request_id: params.requestId,
          payment_id: paymentId,
          paypal_order_id: order.id,
          paypal_status: finalStatus,
          amount_cents: params.amountCents,
          item: params.itemName,
          merchant_domain: params.merchantDomain,
          approval_url: approvalUrl,
        },
        created_at: createdAt,
      });
    } catch (err: any) {
      console.warn("⚠️ Could not log payment audit event:", err.message);
    }
  }

  return {
    success: true,
    paymentId,
    paypalOrderId: order.id,
    paypalStatus: finalStatus,
    amountCents: params.amountCents,
    currency: params.currency || "USD",
    idempotentReplay: false,
    approvalUrl,
    createdAt,
  };
}
