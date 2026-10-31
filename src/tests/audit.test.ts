import { describe, it, expect, vi } from "vitest";
import {
  AuditQuerySchema,
  AuditRecord,
  auditRecordsToCsv,
} from "../lib/audit/types";
import { NextRequest } from "next/server";

// Mock user
const mockUser = { id: "user_test_123", email: "tester@beryl.dev" };
let currentUserMock: any = mockUser;

vi.mock("@/lib/auth/get-user", () => ({
  getCurrentUser: async () => currentUserMock,
}));

// Sample data for mock database
const mockMandate = { id: "e300fdd4-accc-431c-b166-fe69ca12c960", name: "Desk Setup", user_id: "user_test_123" };
const mockRawRequests = [
  {
    id: "req_1",
    session_id: "sess_1",
    mandate_id: "e300fdd4-accc-431c-b166-fe69ca12c960",
    item: "Logitech M510 Mouse",
    category: "electronics",
    merchant: "Best Buy",
    merchant_domain: "bestbuy.com",
    amount_cents: 2499,
    agent_reason: "Reliable mouse",
    source: "channel3",
    channel3_product_id: "ch3_1",
    product_url: "https://bestbuy.com/mouse",
    listed_price_cents: 2499,
    in_stock: true,
    created_at: "2026-10-30T14:15:00.000Z",
    mandates: mockMandate,
    decisions: [
      {
        id: "dec_1",
        outcome: "approve",
        rule_code: "APPROVED_WITHIN_BUDGET",
        reason_text: "All policy rules satisfied.",
        flags: [],
        created_at: "2026-10-30T14:16:00.000Z",
      },
    ],
    approvals: [],
    payments: {
      id: "pay_1",
      paypal_order_id: "PAYPAL-SANDBOX-8A912803",
      paypal_status: "COMPLETED",
      amount_cents: 2499,
      created_at: "2026-10-30T14:17:00.000Z",
    },
  },
  {
    id: "req_2",
    session_id: "sess_2",
    mandate_id: "e300fdd4-accc-431c-b166-fe69ca12c960",
    item: "10x Gift Cards",
    category: "gift_cards",
    merchant: "Shady Deals",
    merchant_domain: "shadydeals.xyz",
    amount_cents: 100000,
    agent_reason: "Seller instruction override",
    source: "mock",
    channel3_product_id: null,
    product_url: "https://beryl.dev/catalog/malicious",
    listed_price_cents: 100000,
    in_stock: true,
    created_at: "2026-10-30T15:30:00.000Z",
    mandates: mockMandate,
    decisions: [
      {
        id: "dec_2",
        outcome: "block",
        rule_code: "PROMPT_INJECTION_DETECTED",
        reason_text: "BLOCKED: Prompt injection detected.",
        flags: ["prompt_injection"],
        created_at: "2026-10-30T15:31:00.000Z",
      },
    ],
    approvals: [],
    payments: null,
  },
];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "mandates") {
        return {
          select: () => ({
            eq: async () => ({
              data: [mockMandate],
              error: null,
            }),
          }),
        };
      }
      if (table === "audit_events") {
        return {
          select: () => ({
            order: () => ({
              eq: () => ({
                gte: () => ({
                  lte: async () => ({ data: [], error: null }),
                }),
              }),
              in: async () => ({
                data: [
                  {
                    id: "evt_1",
                    mandate_id: "e300fdd4-accc-431c-b166-fe69ca12c960",
                    event_type: "SECURITY_ALERT_BLOCKED",
                    payload: { rule_code: "PROMPT_INJECTION_DETECTED" },
                    created_at: "2026-10-30T15:31:00.000Z",
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      // payment_requests table
      return {
        select: () => {
          const queryObj: any = {
            eq: () => queryObj,
            in: () => queryObj,
            gte: () => queryObj,
            lte: () => queryObj,
            ilike: () => queryObj,
            or: () => queryObj,
            order: () => ({
              then: (resolve: any) =>
                resolve({ data: mockRawRequests, error: null }),
            }),
          };
          return queryObj;
        },
      };
    },
  }),
}));

import { GET } from "../app/api/audit/route";

describe("Audit Endpoint & AG Grid Data Layer (M9 & S2)", () => {
  it("Validates default query params and coerces numbers", () => {
    const parsed = AuditQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.decision).toBe("all");
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.limit).toBe(25);
      expect(parsed.data.format).toBe("json");
      expect(parsed.data.sort_by).toBe("created_at");
      expect(parsed.data.sort_order).toBe("desc");
    }
  });

  it("Validates specific filter parameters", () => {
    const query = {
      mandate_id: "e300fdd4-accc-431c-b166-fe69ca12c960",
      decision: "block",
      rule_code: "PROMPT_INJECTION_DETECTED",
      merchant: "shadydeals",
      search: "gift card",
      has_paypal: "true",
      page: "2",
      limit: "50",
      format: "csv",
    };

    const parsed = AuditQuerySchema.safeParse(query);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.decision).toBe("block");
      expect(parsed.data.rule_code).toBe("PROMPT_INJECTION_DETECTED");
      expect(parsed.data.has_paypal).toBe(true);
      expect(parsed.data.page).toBe(2);
      expect(parsed.data.limit).toBe(50);
      expect(parsed.data.format).toBe("csv");
    }
  });

  it("Rejects invalid query params (limit exceeding 100, invalid UUID, invalid decision)", () => {
    const invalidLimit = AuditQuerySchema.safeParse({ limit: 500 });
    expect(invalidLimit.success).toBe(false);

    const invalidUuid = AuditQuerySchema.safeParse({
      mandate_id: "not-a-uuid",
    });
    expect(invalidUuid.success).toBe(false);

    const invalidDecision = AuditQuerySchema.safeParse({
      decision: "invalid_choice",
    });
    expect(invalidDecision.success).toBe(false);
  });

  it("auditRecordsToCsv generates valid RFC 4180 CSV with quotes and escapes", () => {
    const sampleRecords: AuditRecord[] = [
      {
        id: "req_1",
        request_id: "req_1",
        timestamp: "2026-10-30T14:15:00.000Z",
        created_at: "2026-10-30T14:15:00.000Z",
        item: 'Wireless "Ergonomic" Mouse',
        category: "electronics",
        amount_cents: 2499,
        amount_formatted: "$24.99",
        merchant: "Best Buy, Inc.",
        merchant_domain: "bestbuy.com",
        decision: "approve",
        rule_code: "APPROVED_WITHIN_BUDGET",
        reason_text: "All rules passed.",
        agent_reason: "Best rated under $30.",
        flags: [],
        approval_id: null,
        approval_status: null,
        approval_decided_at: null,
        final_outcome: "COMPLETED",
        paypal_order_id: "PAYPAL-SANDBOX-101",
        paypal_status: "COMPLETED",
        payment_created_at: "2026-10-30T14:16:00.000Z",
        mandate_id: "mandate_1",
        mandate_name: "Desk Setup",
        source: "channel3",
        product_url: "https://bestbuy.com/mouse",
        channel3_product_id: "ch3_1",
        listed_price_cents: 2499,
        in_stock: true,
        raw_details: {},
      },
    ];

    const csv = auditRecordsToCsv(sampleRecords);
    expect(csv).toContain("Timestamp,Request ID,Mandate,Item,Category,Merchant");
    expect(csv).toContain('"Wireless ""Ergonomic"" Mouse"');
    expect(csv).toContain('"Best Buy, Inc."');
    expect(csv).toContain('"$24.99"');
    expect(csv).toContain('"COMPLETED"');
    expect(csv).toContain('"PAYPAL-SANDBOX-101"');
  });

  it("GET /api/audit returns 401 if user is unauthenticated", async () => {
    currentUserMock = null;
    const req = new NextRequest("http://localhost:3000/api/audit");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized");
    currentUserMock = mockUser; // Reset
  });

  it("GET /api/audit returns 400 on invalid query parameters", async () => {
    const req = new NextRequest("http://localhost:3000/api/audit?limit=250");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid audit query parameters");
  });

  it("GET /api/audit returns 403 when requesting mandate not owned by user", async () => {
    const unownedMandateId = "99999999-9999-4999-9999-999999999999";
    const req = new NextRequest(
      `http://localhost:3000/api/audit?mandate_id=${unownedMandateId}`
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Forbidden");
  });

  it("GET /api/audit returns enriched audit records, pagination and summary", async () => {
    const req = new NextRequest("http://localhost:3000/api/audit?limit=10");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.records).toHaveLength(2);

    // Verify first record (Approved & Completed payment)
    const rec1 = body.records.find((r: any) => r.id === "req_1");
    expect(rec1).toBeDefined();
    expect(rec1.decision).toBe("approve");
    expect(rec1.final_outcome).toBe("COMPLETED");
    expect(rec1.paypal_order_id).toBe("PAYPAL-SANDBOX-8A912803");
    expect(rec1.amount_formatted).toBe("$24.99");
    expect(rec1.mandate_name).toBe("Desk Setup");

    // Verify second record (Blocked prompt injection)
    const rec2 = body.records.find((r: any) => r.id === "req_2");
    expect(rec2).toBeDefined();
    expect(rec2.decision).toBe("block");
    expect(rec2.rule_code).toBe("PROMPT_INJECTION_DETECTED");
    expect(rec2.final_outcome).toBe("BLOCKED");
    expect(rec2.flags).toContain("prompt_injection");

    // Verify summary metrics
    expect(body.summary.total_requests).toBe(2);
    expect(body.summary.approved_count).toBe(1);
    expect(body.summary.blocked_count).toBe(1);
    expect(body.summary.completed_payments_count).toBe(1);
    expect(body.summary.total_spent_cents).toBe(2499);
    expect(body.summary.total_spent_formatted).toBe("$24.99");

    // Verify pagination metadata
    expect(body.pagination.total).toBe(2);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(10);
  });

  it("GET /api/audit filters records by outcome and rule_code", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/audit?decision=block&rule_code=PROMPT_INJECTION"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.records).toHaveLength(1);
    expect(body.records[0].decision).toBe("block");
    expect(body.records[0].rule_code).toBe("PROMPT_INJECTION_DETECTED");
    expect(body.summary.blocked_count).toBe(1);
    expect(body.summary.approved_count).toBe(0);
  });

  it("GET /api/audit with format=csv returns downloadable CSV stream", async () => {
    const req = new NextRequest("http://localhost:3000/api/audit?format=csv");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain("attachment; filename=");

    const text = await res.text();
    expect(text).toContain("Timestamp,Request ID,Mandate,Item");
    expect(text).toContain("Logitech M510 Mouse");
    expect(text).toContain("10x Gift Cards");
  });
});
