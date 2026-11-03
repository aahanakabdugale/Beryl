import { z } from "zod";

// ==============================================================================
// 1. Policy Rule Codes
// ==============================================================================
export const PolicyRuleCode = {
  APPROVED_WITHIN_MANDATE: "APPROVED_WITHIN_MANDATE",
  APPROVAL_THRESHOLD_EXCEEDED: "APPROVAL_THRESHOLD_EXCEEDED",
  MANDATE_FROZEN: "MANDATE_FROZEN",
  MANDATE_EXPIRED: "MANDATE_EXPIRED",
  TOTAL_BUDGET_EXCEEDED: "TOTAL_BUDGET_EXCEEDED",
  PER_PURCHASE_LIMIT_EXCEEDED: "PER_PURCHASE_LIMIT_EXCEEDED",
  DISALLOWED_CATEGORY: "DISALLOWED_CATEGORY",
  BLOCKED_MERCHANT: "BLOCKED_MERCHANT",
  DAILY_CAP_EXCEEDED: "DAILY_CAP_EXCEEDED",
  WEEKLY_CAP_EXCEEDED: "WEEKLY_CAP_EXCEEDED",
  PURCHASE_RATE_LIMIT_EXCEEDED: "PURCHASE_RATE_LIMIT_EXCEEDED",
  PROMPT_INJECTION_DETECTED: "PROMPT_INJECTION_DETECTED",
  INSTRUCTION_MISMATCH: "INSTRUCTION_MISMATCH",
  PRICE_MISMATCH: "PRICE_MISMATCH",
  INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
} as const;

export type PolicyRuleCodeType =
  (typeof PolicyRuleCode)[keyof typeof PolicyRuleCode];

// ==============================================================================
// 2. Decision Outcome
// ==============================================================================
export const DecisionOutcome = {
  APPROVE: "approve",
  NEEDS_APPROVAL: "needs_approval",
  BLOCK: "block",
} as const;

export type DecisionOutcomeType =
  (typeof DecisionOutcome)[keyof typeof DecisionOutcome];

// ==============================================================================
// 3. Mandate Schema & Type
// ==============================================================================
export const MandateStatusSchema = z.enum(["active", "frozen", "expired"]);
export type MandateStatus = z.infer<typeof MandateStatusSchema>;

export const MandateSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().optional(),
  name: z.string().min(1, "Mandate name is required"),
  total_budget_cents: z
    .number()
    .int("Total budget must be integer cents")
    .nonnegative("Total budget must be non-negative"),
  per_purchase_limit_cents: z
    .number()
    .int("Per-purchase limit must be integer cents")
    .positive("Per-purchase limit must be positive"),
  approval_threshold_cents: z
    .number()
    .int("Approval threshold must be integer cents")
    .nonnegative("Approval threshold must be non-negative"),
  allowed_categories: z.array(z.string()).default([]),
  allowed_merchants: z.array(z.string()).default([]),
  blocked_merchants: z.array(z.string()).default([]),
  daily_cap_cents: z.number().int().nonnegative().optional().nullable(),
  weekly_cap_cents: z.number().int().nonnegative().optional().nullable(),
  max_purchases_per_day: z.number().int().nonnegative().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  status: MandateStatusSchema.default("active"),
  created_at: z.string().optional().nullable(),
});

export type Mandate = z.infer<typeof MandateSchema>;

export const CreateMandateSchema = MandateSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
}).extend({
  status: MandateStatusSchema.default("active"),
});

export type CreateMandateInput = z.infer<typeof CreateMandateSchema>;

export const FreezeMandateSchema = z.object({
  freeze: z.boolean().default(true),
  reason: z.string().optional(),
});

export type FreezeMandateInput = z.infer<typeof FreezeMandateSchema>;

export const DecideApprovalSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().optional(),
});

export type DecideApprovalInput = z.infer<typeof DecideApprovalSchema>;

// ==============================================================================
// 4. Payment Request Schema & Type
// ==============================================================================
export const PaymentRequestSourceSchema = z.enum(["channel3", "mock", "other"]);
export type PaymentRequestSource = z.infer<typeof PaymentRequestSourceSchema>;

export const PaymentRequestSchema = z.object({
  id: z.string().uuid().optional(),
  session_id: z.string().optional().nullable(),
  mandate_id: z.string().optional().nullable(),
  item: z.string().min(1, "Item description is required"),
  category: z.string().min(1, "Category is required"),
  merchant: z.string().min(1, "Merchant name is required"),
  merchant_domain: z.string().min(1, "Merchant domain is required"),
  amount_cents: z
    .number()
    .int("Amount must be integer cents")
    .positive("Amount must be greater than zero"),
  agent_reason: z.string().default(""),
  source: PaymentRequestSourceSchema.default("channel3"),
  channel3_product_id: z.string().optional().nullable(),
  product_url: z.string().optional().nullable(),
  listed_price_cents: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .nullable(),
  in_stock: z.boolean().default(true),
  untrusted_metadata: z.string().optional().nullable(),
  original_instruction: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
});

export type PaymentRequest = z.infer<typeof PaymentRequestSchema>;

export const GuardEvaluateInputSchema = PaymentRequestSchema.extend({
  mandate_id: z.string().uuid("A valid mandate_id UUID is required").optional().nullable(),
  auto_execute_payment: z.boolean().default(true),
});

export type GuardEvaluateInput = z.infer<typeof GuardEvaluateInputSchema>;

// ==============================================================================
// 5. Transaction History Schema & Type
// ==============================================================================
export const TransactionHistorySchema = z.object({
  total_spent_cents: z.number().int().nonnegative().default(0),
  daily_spent_cents: z.number().int().nonnegative().default(0),
  weekly_spent_cents: z.number().int().nonnegative().default(0),
  purchases_today_count: z.number().int().nonnegative().default(0),
});

export type TransactionHistory = z.infer<typeof TransactionHistorySchema>;

// ==============================================================================
// 6. Policy Decision Schema & Type
// ==============================================================================
export const PolicyDecisionSchema = z.object({
  outcome: z.enum(["approve", "needs_approval", "block"]),
  rule_code: z.string(),
  reason_text: z.string(),
  flags: z.array(z.string()).default([]),
  evaluated_at: z.string(),
  details: z
    .object({
      requested_amount_cents: z.number().int(),
      remaining_budget_before_cents: z.number().int(),
      remaining_budget_after_cents: z.number().int(),
      spent_cents_before: z.number().int(),
    })
    .optional(),
});

export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;
