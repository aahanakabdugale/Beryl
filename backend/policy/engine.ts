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

// ==============================================================================
// G5: Prompt Injection & Adversarial Evasion Signatures (Heuristics First)
// ==============================================================================
export interface InjectionPattern {
  regex: RegExp;
  label: string;
  threatType: "override" | "jailbreak" | "exfiltration" | "obfuscation";
}

export const INJECTION_PATTERNS: InjectionPattern[] = [
  // 1. Hidden or obfuscated payloads (highest priority)
  {
    regex: /<!--[\s\S]*?(ignore|override|bypass|system|cards?|transfer)[\s\S]*?-->/i,
    label: "hidden comment injection tag",
    threatType: "obfuscation",
  },
  {
    regex:
      /style\s*=\s*["']display:\s*none["'][\s\S]*?(override|ignore|buy|gift)/i,
    label: "hidden CSS injection payload",
    threatType: "obfuscation",
  },
  // 2. Direct instruction overrides & context clears
  {
    regex:
      /ignore\s+(previous|all|prior|above|existing|system)\s+(instructions?|rules?|prompts?|constraints?|directives?)/i,
    label: "instruction override directive",
    threatType: "override",
  },
  {
    regex:
      /disregard\s+(all\s+)?(mandate|guardrails?|rules?|policy|limits?|instructions?)/i,
    label: "policy disregard command",
    threatType: "override",
  },
  {
    regex:
      /bypass\s+(all\s+)?(guardrails?|mandate|verification|limits?|security|checks?)/i,
    label: "security bypass command",
    threatType: "override",
  },
  {
    regex: /system\s+(override|directive|command|prompt|instruction)/i,
    label: "system override header",
    threatType: "override",
  },
  {
    regex:
      /(new|updated|revised)\s+(operating|system|admin)\s+(instructions?|mode|policy)/i,
    label: "operating instruction redefinition",
    threatType: "override",
  },
  {
    regex:
      /forget\s+(all\s+)?(previous|past|prior)\s+(instructions?|context|rules?)/i,
    label: "context clearing directive",
    threatType: "override",
  },
  // 3. Chat template & jailbreak role spoofing
  {
    regex: /(\[system\]|<system>|\[inst\]|<\/s>|<s>|\bassistant:|\bsystem:)/i,
    label: "chat template / system tag injection",
    threatType: "jailbreak",
  },
  {
    regex:
      /(developer\s+mode\s+activated|dan\s+mode|unrestricted\s+mode|god\s+mode)/i,
    label: "developer / jailbreak mode trigger",
    threatType: "jailbreak",
  },
  {
    regex:
      /you\s+are\s+now\s+in\s+(developer|unrestricted|god|admin|jailbreak)\s+mode/i,
    label: "unrestricted mode spoofing",
    threatType: "jailbreak",
  },
  {
    regex: /simulate\s+(being|acting\s+as)\s+an?\s+unrestricted/i,
    label: "simulation persona bypass",
    threatType: "jailbreak",
  },
  // 4. Unauthorized funds exfiltration & digital card purchases
  {
    regex:
      /buy\s+\d*\s*(steam|apple|amazon|google\s*play|vanilla|visa|walmart|razer)?\s*gift\s*cards?/i,
    label: "gift card diversion pattern",
    threatType: "exfiltration",
  },
  {
    regex:
      /transfer\s+(all\s+)?(funds?|money|balance|cash)\s+to/i,
    label: "unauthorized funds transfer directive",
    threatType: "exfiltration",
  },
  {
    regex:
      /send\s+(crypto|bitcoin|usdt|eth|ethereum|btc|solana)/i,
    label: "cryptocurrency exfiltration directive",
    threatType: "exfiltration",
  },
  {
    regex: /(paypal\.me\/|venmo\.com\/|cash\.app\/\$)/i,
    label: "direct peer-to-peer payment exfiltration link",
    threatType: "exfiltration",
  },
];

/**
 * G5 Heuristic: Scans all payment payload strings for prompt injection and adversary evasion signatures.
 */
export function detectPromptInjection(payload: string): {
  detected: boolean;
  label?: string;
  matchedText?: string;
  threatType?: string;
} {
  for (const pattern of INJECTION_PATTERNS) {
    const match = payload.match(pattern.regex);
    if (match) {
      return {
        detected: true,
        label: pattern.label,
        matchedText: match[0],
        threatType: pattern.threatType,
      };
    }
  }
  return { detected: false };
}

// ==============================================================================
// G4: Instruction Match & Semantic Divergence Check (Heuristics First)
// ==============================================================================
const STOP_WORDS = new Set([
  "a", "about", "all", "an", "and", "any", "are", "around", "as", "at", "be",
  "best", "bucks", "buy", "by", "can", "cheap", "could", "dollars", "find",
  "for", "from", "get", "give", "good", "have", "i", "in", "is", "it", "item",
  "like", "look", "looking", "me", "my", "need", "of", "on", "or", "our",
  "please", "price", "products", "purchase", "recommend", "reliable", "search",
  "some", "that", "the", "this", "to", "under", "us", "want", "we", "with",
  "would", "you", "your",
]);

// Categories strongly associated with redirection or exfiltration
const HIGH_RISK_DEFLECTION_CATEGORIES = new Set([
  "gift_cards",
  "gift cards",
  "cryptocurrency",
  "crypto",
  "prepaid_cards",
  "vouchers",
  "gambling",
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function stemMatch(w1: string, w2: string): boolean {
  if (w1 === w2) return true;
  if (w1.length > 3 && w2.startsWith(w1)) return true;
  if (w2.length > 3 && w1.startsWith(w2)) return true;
  // Plural/singular matching
  if (w1.endsWith("s") && w1.slice(0, -1) === w2) return true;
  if (w2.endsWith("s") && w2.slice(0, -1) === w1) return true;
  return false;
}

export interface InstructionMatchResult {
  matches: boolean;
  score: number;
  reason?: string;
  isHostileDeflection: boolean;
}

/**
 * G4 Heuristic: Evaluates whether the requested item aligns with the user's original instruction.
 */
export function checkInstructionMatch(
  originalInstruction: string,
  requestedItem: string,
  requestedCategory: string
): InstructionMatchResult {
  const instructionKeywords = extractKeywords(originalInstruction);

  // If user instruction had no recognizable content words, pass check
  if (instructionKeywords.length === 0) {
    return { matches: true, score: 1.0, isHostileDeflection: false };
  }

  const itemCategoryText = `${requestedItem} ${requestedCategory}`;
  const targetTokens = extractKeywords(itemCategoryText);

  // Check if requested category is a high-risk diversion
  const normalizedCategory = requestedCategory.trim().toLowerCase();
  const userRequestedCard = originalInstruction
    .toLowerCase()
    .includes("gift card");

  const isHostileDeflection =
    !userRequestedCard &&
    (HIGH_RISK_DEFLECTION_CATEGORIES.has(normalizedCategory) ||
      requestedItem.toLowerCase().includes("gift card"));

  if (isHostileDeflection) {
    return {
      matches: false,
      score: 0,
      reason: `Hostile deflection: Agent requested a restricted digital asset ("${requestedItem}") that was not requested by the user.`,
      isHostileDeflection: true,
    };
  }

  // Count keyword overlap
  let matchCount = 0;
  for (const ik of instructionKeywords) {
    if (targetTokens.some((tt) => stemMatch(ik, tt))) {
      matchCount++;
    }
  }

  const score = matchCount / instructionKeywords.length;

  if (matchCount === 0) {
    return {
      matches: false,
      score: 0,
      reason: `Instruction mismatch: Requested item "${requestedItem}" (${requestedCategory}) has zero topical overlap with user instruction "${originalInstruction}".`,
      isHostileDeflection: false,
    };
  }

  return {
    matches: true,
    score,
    isHostileDeflection: false,
  };
}

// ==============================================================================
// Helper formatters
// ==============================================================================
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
 * Implements full guard pipeline including:
 * - G5: Injection flagging
 * - G4: Instruction-match check
 * - G16: Price integrity check
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
  // Rule 3: G16 Inventory / Stock Verification (INSUFFICIENT_STOCK)
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
  // Rule 4: G5 Prompt Injection & Adversarial Evasion Detection
  // --------------------------------------------------------------------------
  const payloadToScan = [
    request.item,
    request.agent_reason,
    request.untrusted_metadata || "",
    request.product_url || "",
    request.merchant || "",
  ].join(" ");

  const injectionCheck = detectPromptInjection(payloadToScan);
  if (injectionCheck.detected) {
    return {
      outcome: DecisionOutcome.BLOCK,
      rule_code: PolicyRuleCode.PROMPT_INJECTION_DETECTED,
      reason_text: `Security alert: Suspected indirect prompt injection or unauthorized override pattern detected (${injectionCheck.label}).`,
      flags: ["prompt_injection", "untrusted_payload"],
      evaluated_at: evaluatedAt,
      details,
    };
  }

  // --------------------------------------------------------------------------
  // Rule 5: G16 Price Integrity & Catalog Snapshot Check (PRICE_MISMATCH)
  // --------------------------------------------------------------------------
  if (request.amount_cents <= 0) {
    return {
      outcome: DecisionOutcome.BLOCK,
      rule_code: PolicyRuleCode.PRICE_MISMATCH,
      reason_text: "Transaction blocked: Payment amount must be a positive integer in cents.",
      flags: ["invalid_amount", "price_tamper"],
      evaluated_at: evaluatedAt,
      details,
    };
  }

  if (
    request.listed_price_cents !== null &&
    request.listed_price_cents !== undefined
  ) {
    if (request.amount_cents !== request.listed_price_cents) {
      const isUndercut = request.amount_cents < request.listed_price_cents;
      const tamperFlag = isUndercut
        ? "price_undercut_tamper"
        : "price_inflation";

      return {
        outcome: DecisionOutcome.BLOCK,
        rule_code: PolicyRuleCode.PRICE_MISMATCH,
        reason_text: `Price integrity violation: Requested payment amount (${formatCents(
          request.amount_cents
        )}) does not match the verified catalog listed price (${formatCents(
          request.listed_price_cents
        )})${isUndercut ? " (suspected limit evasion / tampering)" : ""}.`,
        flags: ["price_mismatch", tamperFlag],
        evaluated_at: evaluatedAt,
        details,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Rule 6: G4 Instruction-Match Check (INSTRUCTION_MISMATCH)
  // --------------------------------------------------------------------------
  if (request.original_instruction) {
    const matchResult = checkInstructionMatch(
      request.original_instruction,
      request.item,
      request.category
    );

    if (!matchResult.matches) {
      const flags = ["instruction_mismatch"];
      if (matchResult.isHostileDeflection) {
        flags.push("hostile_deflection");
      }

      return {
        outcome: DecisionOutcome.BLOCK,
        rule_code: PolicyRuleCode.INSTRUCTION_MISMATCH,
        reason_text:
          matchResult.reason ||
          `Instruction mismatch: Requested item "${request.item}" does not match user instruction "${request.original_instruction}".`,
        flags,
        evaluated_at: evaluatedAt,
        details,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Rule 7: Blocked Merchant Denylist (BLOCKED_MERCHANT)
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
  // Rule 8: Allowed Merchant Allowlist Check
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
  // Rule 9: Allowed Category Check (DISALLOWED_CATEGORY)
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
  // Rule 10: Per-Purchase Limit Check (PER_PURCHASE_LIMIT_EXCEEDED)
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
  // Rule 11: Total Budget Check (TOTAL_BUDGET_EXCEEDED)
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
  // Rule 12: Periodic Caps & Rate Limits (DAILY_CAP, WEEKLY_CAP, RATE_LIMIT)
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
  // Rule 13: Human-In-The-Loop Approval Threshold (APPROVAL_THRESHOLD_EXCEEDED)
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
  // Rule 14: All Constraints Met -> APPROVE
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
