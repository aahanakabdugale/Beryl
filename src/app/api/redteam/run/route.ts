import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluate } from "@/lib/policy/engine";
import { ALL_REDTEAM_SCENARIOS } from "@/lib/policy/scenarios";
import { z } from "zod";
import crypto from "crypto";

const RunRedTeamInputSchema = z.object({
  scenario_ids: z.array(z.number().int()).optional(),
  mandate_id: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to run red-team attacks." },
        { status: 401 }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const parseResult = RunRedTeamInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid red-team request payload",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { scenario_ids, mandate_id } = parseResult.data;
    const supabase = createAdminClient();

    // If custom mandate specified, fetch it
    let customMandate: any = null;
    if (mandate_id) {
      const { data, error } = await supabase
        .from("mandates")
        .select("*")
        .eq("id", mandate_id)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: "Specified mandate not found" },
          { status: 404 }
        );
      }
      customMandate = data;
    }

    // Filter scenarios if specific IDs were requested
    const scenariosToRun = scenario_ids?.length
      ? ALL_REDTEAM_SCENARIOS.filter((s) => scenario_ids.includes(s.id))
      : ALL_REDTEAM_SCENARIOS;

    if (scenariosToRun.length === 0) {
      return NextResponse.json(
        { error: "No matching attack scenarios found to run." },
        { status: 400 }
      );
    }

    const runId = crypto.randomUUID();
    const runAt = new Date().toISOString();
    const startTime = Date.now();

    // 1. Execute all scenarios through the Pure Policy Engine
    const results = scenariosToRun.map((scenario) => {
      const activeMandate = customMandate || scenario.mandate;
      const decision = evaluate(
        activeMandate,
        scenario.request,
        scenario.history,
        scenario.now || new Date(runAt)
      );

      const passed = decision.outcome === scenario.expectedOutcome;

      return {
        scenario_id: scenario.id,
        name: scenario.name,
        description: scenario.description,
        expected_outcome: scenario.expectedOutcome,
        actual_outcome: decision.outcome,
        expected_rule_code: scenario.expectedRuleCode,
        actual_rule_code: decision.rule_code,
        passed,
        reason_text: decision.reason_text,
        flags: decision.flags,
        details: decision.details,
      };
    });

    const executionTimeMs = Date.now() - startTime;
    const total = results.length;
    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = total - passedCount;
    const scorePercentage = Math.round((passedCount / total) * 100);

    // 2. Persist individual scenario run results into `redteam_runs`
    const rowsToPersist = results.map((r) => ({
      id: crypto.randomUUID(),
      user_id: user.id,
      scenario: `${r.scenario_id}. ${r.name}: ${r.description}`,
      expected_outcome: r.expected_outcome,
      actual_outcome: r.actual_outcome,
      passed: r.passed,
      run_at: runAt,
    }));

    try {
      await supabase.from("redteam_runs").insert(rowsToPersist);
    } catch (err: any) {
      console.warn("⚠️ Could not persist redteam_runs to database:", err.message);
    }

    // 3. Emit Audit Event for this test run
    try {
      await supabase.from("audit_events").insert({
        mandate_id: customMandate?.id || null,
        event_type: "REDTEAM_SUITE_RUN",
        payload: {
          run_id: runId,
          total_scenarios: total,
          passed: passedCount,
          failed: failedCount,
          score_percentage: scorePercentage,
          execution_time_ms: executionTimeMs,
          user_id: user.id,
        },
        created_at: runAt,
      });
    } catch (err: any) {
      console.warn("⚠️ Could not log audit event for red-team run:", err.message);
    }

    const scoreboard = {
      run_id: runId,
      run_at: runAt,
      total,
      passed: passedCount,
      failed: failedCount,
      score_percentage: scorePercentage,
      status: failedCount === 0 ? "ALL_ATTACKS_DEFENDED" : "VULNERABILITIES_DETECTED",
      execution_time_ms: executionTimeMs,
    };

    return NextResponse.json({
      success: true,
      scoreboard,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to execute red-team runner" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to view red-team runs." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const supabase = createAdminClient();
    const { data: runs, error } = await supabase
      .from("redteam_runs")
      .select("*")
      .order("run_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    const totalRuns = (runs || []).length;
    const passedRuns = (runs || []).filter((r: any) => r.passed).length;
    const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 100;

    return NextResponse.json({
      runs: runs || [],
      summary: {
        total_runs: totalRuns,
        passed: passedRuns,
        failed: totalRuns - passedRuns,
        pass_rate_percentage: passRate,
        last_run_at: runs?.[0]?.run_at || null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch red-team history" },
      { status: 500 }
    );
  }
}
