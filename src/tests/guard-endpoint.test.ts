import { describe, it, expect } from "vitest";
import { GuardEvaluateInputSchema } from "../lib/policy/types";
import { loadMandateHistory } from "../lib/policy/history";

describe("Guard Evaluate Endpoint & History Aggregator (M6)", () => {
  const validMandateId = "b90fa626-d933-4f15-8bf1-e40da1f64942";

  it("Validates valid GuardEvaluateInput payload", () => {
    const payload = {
      mandate_id: validMandateId,
      item: "Logitech Ergonomic Wireless Mouse",
      category: "electronics",
      merchant: "Best Buy",
      merchant_domain: "bestbuy.com",
      amount_cents: 2499,
      agent_reason: "User requested wireless mouse under $30.",
      source: "channel3" as const,
      listed_price_cents: 2499,
      in_stock: true,
    };

    const parsed = GuardEvaluateInputSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.amount_cents).toBe(2499);
      expect(parsed.data.mandate_id).toBe(validMandateId);
    }
  });

  it("Rejects payload with invalid mandate UUID or floating point amount", () => {
    const invalidPayload = {
      mandate_id: "not-a-uuid",
      item: "Test item",
      category: "electronics",
      merchant: "Amazon",
      merchant_domain: "amazon.com",
      amount_cents: 19.99, // Float cents is rejected
    };

    const parsed = GuardEvaluateInputSchema.safeParse(invalidPayload);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      expect(errors.mandate_id).toBeDefined();
      expect(errors.amount_cents).toBeDefined();
    }
  });

  it("loadMandateHistory aggregates total, daily and weekly spend accurately", async () => {
    const now = new Date("2026-10-30T12:00:00Z");

    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: async () => ({
            data: [
              // Approved 2 hours ago: $20.00
              {
                id: "req_1",
                amount_cents: 2000,
                created_at: "2026-10-30T10:00:00Z",
                decisions: [{ outcome: "approve" }],
              },
              // Approved 3 days ago: $35.00
              {
                id: "req_2",
                amount_cents: 3500,
                created_at: "2026-10-27T12:00:00Z",
                decisions: [{ outcome: "approve" }],
              },
              // Blocked request: $100.00 (should NOT count towards spend)
              {
                id: "req_3",
                amount_cents: 10000,
                created_at: "2026-10-30T09:00:00Z",
                decisions: [{ outcome: "block" }],
              },
            ],
            error: null,
          }),
        }),
      }),
    } as any;

    const history = await loadMandateHistory(
      mockSupabase,
      validMandateId,
      now
    );

    // Total spent: $20.00 + $35.00 = $55.00 (5500 cents)
    expect(history.total_spent_cents).toBe(5500);
    // Daily spent (last 24h): $20.00 (2000 cents)
    expect(history.daily_spent_cents).toBe(2000);
    expect(history.purchases_today_count).toBe(1);
    // Weekly spent (last 7d): $55.00 (5500 cents)
    expect(history.weekly_spent_cents).toBe(5500);
  });
});
