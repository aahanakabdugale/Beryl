import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock user
const mockUser = { id: "user_test_redteam", email: "tester@beryl.dev" };
let currentUserMock: any = mockUser;

vi.mock("@/lib/auth/get-user", () => ({
  getCurrentUser: async () => currentUserMock,
}));

const mockInsertedRows: any[] = [];
const mockAuditEvents: any[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "redteam_runs") {
        return {
          insert: async (rows: any[]) => {
            mockInsertedRows.push(...rows);
            return { error: null };
          },
          select: () => ({
            order: () => ({
              limit: async () => ({
                data: [
                  {
                    id: "run_prev_1",
                    scenario: "1. Hidden prompt injection",
                    expected_outcome: "block",
                    actual_outcome: "block",
                    passed: true,
                    run_at: "2026-10-30T15:00:00Z",
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "audit_events") {
        return {
          insert: async (event: any) => {
            mockAuditEvents.push(event);
            return { error: null };
          },
        };
      }
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      };
    },
  }),
}));

import { POST, GET } from "../app/api/redteam/run/route";

describe("Red-Team Runner & Scoreboard (G12)", () => {
  it("POST /api/redteam/run replays all preset attack scenarios with 100% defense score", async () => {
    const req = new NextRequest("http://localhost:3000/api/redteam/run", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.scoreboard).toBeDefined();
    expect(body.scoreboard.total).toBe(10);
    expect(body.scoreboard.passed).toBe(10);
    expect(body.scoreboard.failed).toBe(0);
    expect(body.scoreboard.score_percentage).toBe(100);
    expect(body.scoreboard.status).toBe("ALL_ATTACKS_DEFENDED");

    // Verify all scenarios passed and detailed fields are present
    expect(body.results).toHaveLength(10);
    for (const r of body.results) {
      expect(r.passed).toBe(true);
      expect(r.actual_outcome).toBe(r.expected_outcome);
      expect(r.actual_rule_code).toBe(r.expected_rule_code);
      expect(r.reason_text).toBeTruthy();
    }

    // Verify database persistence occurred
    expect(mockInsertedRows.length).toBeGreaterThanOrEqual(10);
  });

  it("POST /api/redteam/run filters scenarios by scenario_ids", async () => {
    const req = new NextRequest("http://localhost:3000/api/redteam/run", {
      method: "POST",
      body: JSON.stringify({ scenario_ids: [1, 9] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.scoreboard.total).toBe(2);
    expect(body.scoreboard.passed).toBe(2);
    expect(body.results).toHaveLength(2);
    expect(body.results.map((r: any) => r.scenario_id)).toEqual([1, 9]);
  });

  it("POST /api/redteam/run rejects unauthorized requests", async () => {
    currentUserMock = null;
    const req = new NextRequest("http://localhost:3000/api/redteam/run", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    currentUserMock = mockUser; // Reset
  });

  it("GET /api/redteam/run returns previous runs and summary metrics", async () => {
    const req = new NextRequest("http://localhost:3000/api/redteam/run");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.runs).toBeDefined();
    expect(body.runs.length).toBeGreaterThan(0);
    expect(body.summary.pass_rate_percentage).toBe(100);
    expect(body.summary.total_runs).toBe(1);
  });
});
