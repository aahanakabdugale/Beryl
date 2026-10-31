import { z } from "zod";

// ==============================================================================
// 1. Audit Query Parameters Schema
// ==============================================================================
export const AuditQuerySchema = z.object({
  mandate_id: z.string().uuid().optional(),
  decision: z
    .enum(["all", "approve", "needs_approval", "block"])
    .optional()
    .default("all"),
  rule_code: z.string().optional(),
  merchant: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  status: z
    .enum([
      "all",
      "COMPLETED",
      "APPROVED",
      "PENDING_APPROVAL",
      "APPROVED_BY_USER",
      "REJECTED_BY_USER",
      "BLOCKED",
    ])
    .optional()
    .default("all"),
  has_paypal: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === "true")),
  from: z.string().optional(),
  to: z.string().optional(),
  view: z
    .enum(["requests", "system_events", "all"])
    .optional()
    .default("requests"),
  sort_by: z
    .enum(["created_at", "amount_cents", "item", "merchant"])
    .optional()
    .default("created_at"),
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  format: z.enum(["json", "csv"]).optional().default("json"),
});

export type AuditQueryParams = z.infer<typeof AuditQuerySchema>;

// ==============================================================================
// 2. Audit Record (Formatted for AG Grid and Inspection Drawer)
// ==============================================================================
export interface AuditRecord {
  id: string; // payment request ID
  request_id: string;
  timestamp: string; // ISO date
  created_at: string;
  item: string;
  category: string;
  amount_cents: number;
  amount_formatted: string;
  merchant: string;
  merchant_domain: string;
  decision: "approve" | "needs_approval" | "block" | "unknown";
  rule_code: string;
  reason_text: string;
  agent_reason: string;
  flags: string[];
  approval_id: string | null;
  approval_status: "pending" | "approved" | "rejected" | "timed_out" | null;
  approval_decided_at: string | null;
  final_outcome:
    | "COMPLETED"
    | "APPROVED"
    | "PENDING_APPROVAL"
    | "APPROVED_BY_USER"
    | "REJECTED_BY_USER"
    | "BLOCKED"
    | "UNKNOWN";
  paypal_order_id: string | null;
  paypal_status: string | null;
  payment_created_at: string | null;
  mandate_id: string;
  mandate_name: string;
  source: string;
  product_url: string | null;
  channel3_product_id: string | null;
  listed_price_cents: number | null;
  in_stock: boolean;
  raw_details: Record<string, any>;
}

// ==============================================================================
// 3. System Audit Event Record (from audit_events table)
// ==============================================================================
export interface SystemAuditEvent {
  id: string;
  mandate_id: string | null;
  event_type: string;
  payload: Record<string, any>;
  created_at: string;
}

// ==============================================================================
// 4. Audit Summary Metrics
// ==============================================================================
export interface AuditSummary {
  total_requests: number;
  approved_count: number;
  needs_approval_count: number;
  blocked_count: number;
  completed_payments_count: number;
  total_spent_cents: number;
  total_spent_formatted: string;
}

// ==============================================================================
// 5. Paginated Audit API Response
// ==============================================================================
export interface AuditApiResponse {
  records: AuditRecord[];
  system_events?: SystemAuditEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  summary: AuditSummary;
}

// ==============================================================================
// 6. CSV Export Helper (RFC 4180 format)
// ==============================================================================
export function auditRecordsToCsv(records: AuditRecord[]): string {
  const headers = [
    "Timestamp",
    "Request ID",
    "Mandate",
    "Item",
    "Category",
    "Merchant",
    "Amount",
    "Decision",
    "Rule Code",
    "Reason",
    "Agent Reason",
    "Final Outcome",
    "PayPal Order ID",
    "PayPal Status",
  ];

  const escapeCsv = (str: any) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = records.map((r) => [
    escapeCsv(r.timestamp),
    escapeCsv(r.request_id),
    escapeCsv(r.mandate_name),
    escapeCsv(r.item),
    escapeCsv(r.category),
    escapeCsv(r.merchant),
    escapeCsv(r.amount_formatted),
    escapeCsv(r.decision),
    escapeCsv(r.rule_code),
    escapeCsv(r.reason_text),
    escapeCsv(r.agent_reason),
    escapeCsv(r.final_outcome),
    escapeCsv(r.paypal_order_id || ""),
    escapeCsv(r.paypal_status || ""),
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
}
