import { describe, it, expect } from "vitest";
import { CreateMandateSchema, FreezeMandateSchema } from "../lib/policy/types";

describe("Mandate API Schemas & Validation", () => {
  it("Validates valid CreateMandate input", () => {
    const validInput = {
      name: "Desk Setup & Electronics",
      total_budget_cents: 15000,
      per_purchase_limit_cents: 5000,
      approval_threshold_cents: 3500,
      allowed_categories: ["electronics", "office supplies"],
      allowed_merchants: ["amazon.com", "bestbuy.com"],
      blocked_merchants: ["shadydeals.xyz"],
      daily_cap_cents: 7500,
      weekly_cap_cents: 15000,
      max_purchases_per_day: 5,
      expires_at: "2026-12-31T23:59:59.000Z",
      status: "active",
    };

    const result = CreateMandateSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("Rejects negative budget or non-integer cents", () => {
    const invalidInput = {
      name: "Bad Budget Mandate",
      total_budget_cents: -500, // Negative
      per_purchase_limit_cents: 25.5, // Non-integer
      approval_threshold_cents: 1000,
    };

    const result = CreateMandateSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.total_budget_cents).toBeDefined();
      expect(errors.per_purchase_limit_cents).toBeDefined();
    }
  });

  it("Validates FreezeMandate input", () => {
    const freezeTrue = FreezeMandateSchema.safeParse({
      freeze: true,
      reason: "Suspicious activity detected",
    });
    expect(freezeTrue.success).toBe(true);

    const freezeFalse = FreezeMandateSchema.safeParse({
      freeze: false,
    });
    expect(freezeFalse.success).toBe(true);
    if (freezeFalse.success) {
      expect(freezeFalse.data.freeze).toBe(false);
    }
  });
});
