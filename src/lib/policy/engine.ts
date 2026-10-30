import {
  Mandate,
  MandateSchema,
  PaymentRequest,
  PaymentRequestSchema,
  PolicyDecision,
  PolicyRuleCode,
  DecisionOutcome,
  TransactionHistory,
  TransactionHistorySchema,
} from "./types";

// Suspected prompt injection pattern signatures
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|prior|above)\s+instructions/i,
  /system\s+override/i,
  /disregard\s+(mandate|guardrails?|rules?|policy|limits?)/i,
  /bypass\s+(guardrails?|mandate|verification|limits?)/i,
  /developer\s+mode\s+activated/i,
  /buy\s+\d*\s*(steam|apple|amazon|google\s*play|vanilla|visa)?\s*gift\s*cards?/i,
  /transfer\s+funds\s+to/i,
  /send\s+(crypto|bitcoin|usdt|eth)/i,
];

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function normalize(str: string): string {
  return str.trim().toLowerCase();
}

/**
 * Pure, deterministic evaluation of a PaymentRequest against a Mandate and TransactionHistory.
 * Guaranteed to have zero network calls, zero state mutations, and pure integer cent math.
 *
 * @param rawMandate The user-defined spending mandate
 * @param rawRequest The agent-generated payment request
 * @param rawHistory Historical spend metrics under this mandate
 * @param now Optional date for testing time-dependent checks (defaults to new Date())
 * @returns PolicyDecision with outcome (approve, needs_approval, block), rule_code, and reason_text
 */
export function evaluate(
  rawMandate: Mandate,
  rawRequest: PaymentRequest,
  rawHistory: TransactionHistory,
  now: Date = new Date()
): PolicyDecision {
  const mandate = MandateSchema.parse(rawMandate);
  const request = PaymentRequestSchema.parse(rawRequest);
  const history = TransactionHistorySchema.parse(rawHistory);

  const evaluatedAt = now.toISOString();
  const spentBefore = history.total_spent_cents;
  const remainingBudgetBefore = Math.max(
    0,
    mandate.total_budget_cents - spentBefore
  );
  const remainingBudgetAfter = Math.max(
    0,
    remainingBudgetBefore - request.amount_cents
  );

  const details = {
    requested_amount_cents: request.amount_cents,
    remaining_budget_before_cents: remainingBudgetBefore,
    remaining_budget_after_cents: remainingBudgetAfter,
    spent_cents_before: spentBefore,
  };

  // --------------------------------------------------------------------------
  // Rule 1: Kill Switch Check (MANDATE_FROZEN)
  // --------------------------------------------------------------------------
  if (mandate.status === "frozen") {
    return {
      outcome: DecisionOutcome.BLOCK,
      rule_code: PolicyRuleCode.MANDATE_FROZEN,
      reason_text:
        "Transaction blocked: Mandate is currently frozen by the emergency kill switch.",
      flags: ["kill_switch_active"],
      evaluated_at: evaluatedAt,
      details,
    };
  }

  // --------------------------------------------------------------------------
  // Rule 2: Expiration Check (MANDATE_EXPIRED)
  // --------------------------------------------------------------------------
  if (mandate.status === "expired") {
    return {
      outcome: DecisionOutcome.BLOCK,
      rule_code: PolicyRuleCode.MANDATE_EXPIRED,
      reason_text: "Transaction blocked: Mandate status is marked as expired.",
      flags: ["mandate_expired"],
      evaluated_at: evaluatedAt,
      details,
    };
  }

  if (mandate.expires_at) {
    const expirationDate = new Date(mandate.expires_at);
    if (now.getTime() > expirationDate.getTime()) {
      return {
        outcome: DecisionOutcome.BLOCK,
        rule_code: PolicyRuleCode.MANDATE_EXPIRED,
        reason_text: `Transaction blocked: Mandate expired on ${expirationDate.toISOString()} (current time: ${now.toISOString()}).`,
        flags: ["mandate_expired"],
        evaluated_at: evaluatedAt,
        details,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Rule 3: Inventory / Stock Verification (INSUFFICIENT_STOCK)
  // --------------------------------------------------------------------------
  if (request.in_stock === false) {
    return {
      outcome: DecisionOutcome.BLOCK,
      rule_code: PolicyRuleCode.INSUFFICIENT_STOCK,
      reason_text: `Transaction blocked: The requested item "${request.item}" is out of stock.`,
      flags: ["out_of_stock"],
      evaluated_at: evaluatedAt,
      details,
    };
  }

  // --------------------------------------------------------------------------
  // Rule 4: Prompt Injection & Tampering Detection (PROMPT_INJECTION_DETECTED)
  // --------------------------------------------------------------------------
  const payloadToScan = [
    request.item,
    request.agent_reason,
    request.untrusted_metadata || "",
  ].join(" ");

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(payloadToScan)) {
      return {
        outcome: DecisionOutcome.BLOCK,
        rule_code: PolicyRuleCode.PROMPT_INJECTION_DETECTED,
        reason_text:
          "Security alert: Suspected indirect prompt injection or unauthorized override pattern detected in payment payload.",
        flags: ["prompt_injection", "untrusted_payload"],
        evaluated_at: evaluatedAt,
        details,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Rule 5: Price Integrity Check (PRICE_MISMATCH)
  // --------------------------------------------------------------------------
  if (
    request.listed_price_cents !== null &&
    request.listed_price_cents !== undefined
  ) {
    if (request.amount_cents !== request.listed_price_cents) {
      return {
        outcome: DecisionOutcome.BLOCK,
        rule_code: PolicyRuleCode.PRICE_MISMATCH,
        reason_text: `Price integrity violation: Requested payment amount (${formatCents(
          request.amount_cents
        )}) does not match the verified catalog listed price (${formatCents(
          request.listed_price_cents
        )}).`,
        flags: ["price_mismatch"],
        evaluated_at: evaluatedAt,
        details,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Rule 6: Blocked Merchant Denylist (BLOCKED_MERCHANT)
  // --------------------------------------------------------------------------
  const reqMerchant = normalize(request.merchant);
  const reqDomain = normalize(request.merchant_domain);

  if (mandate.blocked_merchants && mandate.blocked_merchants.length > 0) {
    const isBlocked = mandate.blocked_merchants.some((b) => {
      const normalizedBlocked = normalize(b);
      return (
        reqDomain === normalizedBlocked ||
        reqDomain.endsWith(`.${normalizedBlocked}`) ||
        reqMerchant.includes(normalizedBlocked)
      );
    });

    if (isBlocked) {
      return {
        outcome: DecisionOutcome.BLOCK,
        rule_code: PolicyRuleCode.BLOCKED_MERCHANT,
        reason_text: `Transaction blocked: Merchant "${request.merchant_domain || request.merchant}" is explicitly listed on the blocked merchant denylist.`,
        flags: ["blocked_merchant"],
        evaluated_at: evaluatedAt,
        details,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Rule 7: Allowed Merchant Allowlist Check
  // --------------------------------------------------------------------------
  if (mandate.allowed_merchants && mandate.allowed_merchants.length > 0) {
    const isAllowed = mandate.allowed_merchants.some((a) => {
      const normalizedAllowed = normalize(a);
      return (
        reqDomain === normalizedAllowed ||
        reqDomain.endsWith(`.${normalizedAllowed}`) ||
        reqMerchant.includes(normalizedAllowed)
      );
    });

    if (!isAllowed) {
      return {
        outcome: DecisionOutcome.BLOCK,
        rule_code: PolicyRuleCode.BLOCKED_MERCHANT,
        reason_text: `Transaction blocked: Merchant "${request.merchant_domain || request.merchant}" is not in the mandate's allowed merchants list.`,
        flags: ["unauthorized_merchant"],
        evaluated_at: evaluatedAt,
        details,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Rule 8: Allowed Category Check (DISALLOWED_CATEGORY)
  // --------------------------------------------------------------------------
  const reqCategory = normalize(request.category);
  if (mandate.allowed_categories && mandate.allowed_categories.length > 0) {
    const isCategoryAllowed = mandate.allowed_categories.some(
      (c) => normalize(c) === reqCategory
    );

    if (!isCategoryAllowed) {
      return {
        outcome: DecisionOutcome.BLOCK,
        rule_code: PolicyRuleCode.DISALLOWED_CATEGORY,
        reason_text: `Transaction blocked: Category "${request.category}" is not permitted under this mandate (allowed categories: ${mandate.allowed_categories.join(", ")}).`,
        flags: ["disallowed_category"],
        evaluated_at: evaluatedAt,
        details,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Rule 9: Per-Purchase Limit Check (PER_PURCHASE_LIMIT_EXCEEDED)
  // --------------------------------------------------------------------------
  if (request.amount_cents > mandate.per_purchase_limit_cents) {
    return {
      outcome: DecisionOutcome.BLOCK,
      rule_code: PolicyRuleCode.PER_PURCHASE_LIMIT_EXCEEDED,
      reason_text: `Transaction blocked: Requested amount (${formatCents(
        request.amount_cents
      )}) exceeds the per-purchase limit of ${formatCents(
        mandate.per_purchase_limit_cents
      )}.`,
      flags: ["per_purchase_limit_exceeded"],
      evaluated_at: evaluatedAt,
      details,
    };
  }

  // --------------------------------------------------------------------------
  // Rule 10: Total Budget Check (TOTAL_BUDGET_EXCEEDED)
  // --------------------------------------------------------------------------
  if (spentBefore + request.amount_cents > mandate.total_budget_cents) {
    return {
      outcome: DecisionOutcome.BLOCK,
      rule_code: PolicyRuleCode.TOTAL_BUDGET_EXCEEDED,
      reason_text: `Transaction blocked: Requested amount (${formatCents(
        request.amount_cents
      )}) exceeds remaining mandate budget of ${formatCents(
        remainingBudgetBefore
      )} (total budget: ${formatCents(mandate.total_budget_cents)}, already spent: ${formatCents(spentBefore)}).`,
      flags: ["total_budget_exceeded"],
      evaluated_at: evaluatedAt,
      details,
    };
  }

  // --------------------------------------------------------------------------
  // Rule 11: Periodic Caps & Rate Limits (DAILY_CAP, WEEKLY_CAP, RATE_LIMIT)
  // --------------------------------------------------------------------------
  if (
    mandate.daily_cap_cents &&
    history.daily_spent_cents + request.amount_cents > mandate.daily_cap_cents
  ) {
    return {
      outcome: DecisionOutcome.BLOCK,
      rule_code: PolicyRuleCode.DAILY_CAP_EXCEEDED,
      reason_text: `Transaction blocked: Requested amount exceeds the daily spending cap of ${formatCents(
        mandate.daily_cap_cents
      )} (today's spent: ${formatCents(history.daily_spent_cents)}).`,
      flags: ["daily_cap_exceeded"],
      evaluated_at: evaluatedAt,
      details,
    };
  }

  if (
    mandate.weekly_cap_cents &&
    history.weekly_spent_cents + request.amount_cents > mandate.weekly_cap_cents
  ) {
    return {
      outcome: DecisionOutcome.BLOCK,
      rule_code: PolicyRuleCode.WEEKLY_CAP_EXCEEDED,
      reason_text: `Transaction blocked: Requested amount exceeds the weekly spending cap of ${formatCents(
        mandate.weekly_cap_cents
      )} (this week's spent: ${formatCents(history.weekly_spent_cents)}).`,
      flags: ["weekly_cap_exceeded"],
      evaluated_at: evaluatedAt,
      details,
    };
  }

  if (
    mandate.max_purchases_per_day &&
    history.purchases_today_count >= mandate.max_purchases_per_day
  ) {
    return {
      outcome: DecisionOutcome.BLOCK,
      rule_code: PolicyRuleCode.PURCHASE_RATE_LIMIT_EXCEEDED,
      reason_text: `Transaction blocked: Daily purchase count limit (${mandate.max_purchases_per_day}) has already been reached for today.`,
      flags: ["rate_limit_exceeded"],
      evaluated_at: evaluatedAt,
      details,
    };
  }

  // --------------------------------------------------------------------------
  // Rule 12: Human-In-The-Loop Approval Threshold (APPROVAL_THRESHOLD_EXCEEDED)
  // --------------------------------------------------------------------------
  if (
    mandate.approval_threshold_cents > 0 &&
    request.amount_cents > mandate.approval_threshold_cents
  ) {
    return {
      outcome: DecisionOutcome.NEEDS_APPROVAL,
      rule_code: PolicyRuleCode.APPROVAL_THRESHOLD_EXCEEDED,
      reason_text: `Human approval required: Requested amount (${formatCents(
        request.amount_cents
      )}) exceeds the automatic approval threshold of ${formatCents(
        mandate.approval_threshold_cents
      )}. Escalated to user review.`,
      flags: ["threshold_exceeded"],
      evaluated_at: evaluatedAt,
      details,
    };
  }

  // --------------------------------------------------------------------------
  // Rule 13: All Constraints Met -> APPROVE
  // --------------------------------------------------------------------------
  return {
    outcome: DecisionOutcome.APPROVE,
    rule_code: PolicyRuleCode.APPROVED_WITHIN_MANDATE,
    reason_text: `Transaction approved: Amount (${formatCents(
      request.amount_cents
    )}) is within per-purchase limit, remaining budget, and allowed criteria.`,
    flags: [],
    evaluated_at: evaluatedAt,
    details,
  };
}
