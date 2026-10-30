import { describe, it, expect, vi } from "vitest";
import { executePayPalPayment } from "../lib/paypal/execute";

const mockExistingPayment = {
  id: "pay_existing_123",
  request_id: "7b2d5a31-64d9-482a-a92c-57224217f0a1",
  paypal_order_id: "PAYPAL-SANDBOX-ORDER-88129",
  paypal_status: "COMPLETED",
  amount_cents: 1999,
  created_at: "2026-10-30T10:00:00Z",
};

vi.mock("../lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: mockExistingPayment,
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

describe("PayPal Sandbox Payment & Idempotency (M7)", () => {
  it("Idempotent Replay: Returns existing payment if requestId was already charged", async () => {
    const existingRequestId = "7b2d5a31-64d9-482a-a92c-57224217f0a1";

    const result = await executePayPalPayment({
      requestId: existingRequestId,
      amountCents: 1999,
      itemName: "USB-C Cable",
    });

    expect(result.success).toBe(true);
    expect(result.idempotentReplay).toBe(true);
    expect(result.paypalOrderId).toBe("PAYPAL-SANDBOX-ORDER-88129");
    expect(result.paypalStatus).toBe("COMPLETED");
  });
});
