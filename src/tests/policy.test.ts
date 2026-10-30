import { describe, it, expect } from "vitest";
import { evaluate } from "../lib/policy/engine";
import { PRD_9_ATTACK_SCENARIOS } from "../lib/policy/scenarios";
import {
  Mandate,
  PaymentRequest,
  TransactionHistory,
  DecisionOutcome,
  PolicyRuleCode,
} from "../lib/policy/types";

describe("BERYL Policy Engine — 9 Official PRD Attack Scenarios (Section 12)", () => {
  PRD_9_ATTACK_SCENARIOS.forEach((scenario) => {
    it(`Scenario ${scenario.id}: ${scenario.name} -> Expected: ${scenario.expectedOutcome} (${scenario.expectedRuleCode})`, () => {
      const decision = evaluate(
        scenario.mandate,
        scenario.request,
        scenario.history,
        scenario.now
      );

      expect(decision.outcome).toBe(scenario.expectedOutcome);
      expect(decision.rule_code).toBe(scenario.expectedRuleCode);

      if (scenario.expectedOutcome === DecisionOutcome.APPROVE) {
        expect(decision.details?.remaining_budget_after_cents).toBeDefined();
        expect(decision.details?.remaining_budget_after_cents).toBe(
          scenario.mandate.total_budget_cents -
            scenario.history.total_spent_cents -
            scenario.request.amount_cents
        );
      }
    });
  });
});

describe("BERYL Policy Engine — Additional Boundary & Edge Cases", () => {
  const baseMandate: Mandate = {
    name: "General Office",
    total_budget_cents: 10000, // $100.00
    per_purchase_limit_cents: 5000, // $50.00
    approval_threshold_cents: 3000, // $30.00
    allowed_categories: ["office supplies"],
    allowed_merchants: ["amazon.com"],
    blocked_merchants: ["scam-merchant.com"],
    daily_cap_cents: 7500,
    weekly_cap_cents: 10000,
    status: "active",
  };

  const baseHistory: TransactionHistory = {
    total_spent_cents: 0,
    daily_spent_cents: 0,
    weekly_spent_cents: 0,
    purchases_today_count: 0,
  };

  const baseRequest: PaymentRequest = {
    item: "Desk Organizer",
    category: "office supplies",
    merchant: "Amazon",
    merchant_domain: "amazon.com",
    amount_cents: 2000,
    agent_reason: "Organize desk workspace.",
    source: "channel3",
    listed_price_cents: 2000,
    in_stock: true,
  };

  it("Edge Case: Total budget exceeded by accumulated past spend", () => {
    const historyNearCap: TransactionHistory = {
      ...baseHistory,
      total_spent_cents: 9500, // $95.00 spent out of $100.00
    };

    // $20.00 requested + $95.00 spent = $115.00 > $100.00
    const decision = evaluate(baseMandate, baseRequest, historyNearCap);

    expect(decision.outcome).toBe(DecisionOutcome.BLOCK);
    expect(decision.rule_code).toBe(PolicyRuleCode.TOTAL_BUDGET_EXCEEDED);
  });

  it("Edge Case: Out of stock item is blocked", () => {
    const outOfStockRequest: PaymentRequest = {
      ...baseRequest,
      in_stock: false,
    };

    const decision = evaluate(baseMandate, outOfStockRequest, baseHistory);

    expect(decision.outcome).toBe(DecisionOutcome.BLOCK);
    expect(decision.rule_code).toBe(PolicyRuleCode.INSUFFICIENT_STOCK);
  });

  it("Edge Case: Blocked merchant substring or subdomain matching", () => {
    const maliciousSubdomainRequest: PaymentRequest = {
      ...baseRequest,
      merchant_domain: "pay.scam-merchant.com", // subdomain of blocked domain
    };

    const decision = evaluate(
      baseMandate,
      maliciousSubdomainRequest,
      baseHistory
    );

    expect(decision.outcome).toBe(DecisionOutcome.BLOCK);
    expect(decision.rule_code).toBe(PolicyRuleCode.BLOCKED_MERCHANT);
  });
});
