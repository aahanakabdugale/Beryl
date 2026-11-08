import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to view approvals." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status"); // e.g. "pending", "approved", "rejected", "all"
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const supabase = createAdminClient();

    // 1. Fetch user mandates
    const { data: userMandates } = await supabase
      .from("mandates")
      .select("id, user_id, name, total_budget_cents, approval_threshold_cents")
      .eq("user_id", user.id);

    const userMandateIds = (userMandates || []).map((m) => m.id);

    // 2. Auto-link and auto-provision missing approvals for the active user
    if (userMandateIds.length > 0) {
      const activeMandateId = userMandateIds[0];

      // Re-link any recent keyboard payment request if it was assigned to a demo mandate
      try {
        await supabase
          .from("payment_requests")
          .update({ mandate_id: activeMandateId })
          .ilike("item", "%Keyboard%")
          .neq("mandate_id", activeMandateId);
      } catch {}

      // Check for any payment requests under user's mandates that need approval but lack an approvals row
      try {
        const { data: pendingPrs } = await supabase
          .from("payment_requests")
          .select("id, mandate_id, item, amount_cents, decisions(outcome)")
          .in("mandate_id", userMandateIds);

        for (const pr of pendingPrs || []) {
          const decList = Array.isArray(pr.decisions)
            ? pr.decisions
            : pr.decisions
            ? [pr.decisions]
            : [];
          const isNeedsApproval = decList.some(
            (d: any) => (d.outcome || "").toLowerCase() === "needs_approval"
          );

          if (isNeedsApproval) {
            const { data: existingApp } = await supabase
              .from("approvals")
              .select("id")
              .eq("request_id", pr.id)
              .maybeSingle();

            if (!existingApp) {
              const newAppId = crypto.randomUUID();
              const appRow = {
                id: newAppId,
                request_id: pr.id,
                mandate_id: pr.mandate_id,
                user_id: user.id,
                status: "pending",
              };
              const { error: insErr } = await supabase.from("approvals").insert(appRow);
              if (insErr) {
                await supabase.from("approvals").insert({ ...appRow, status: "PENDING" });
              }
            }
          }
        }
      } catch (syncErr) {
        console.warn("Auto-sync approvals error:", syncErr);
      }
    }

    // 3. Query approvals table
    const { data: approvals, error } = await supabase
      .from("approvals")
      .select(
        `
        id,
        request_id,
        mandate_id,
        user_id,
        status,
        decided_at,
        payment_requests (
          id,
          mandate_id,
          item,
          category,
          merchant,
          merchant_domain,
          amount_cents,
          agent_reason,
          product_url,
          listed_price_cents,
          created_at,
          mandates (
            id,
            user_id,
            name,
            total_budget_cents,
            approval_threshold_cents
          )
        )
      `
      )
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    // 4. Filter strictly to approvals belonging to this user
    let userApprovals = (approvals || [])
      .filter((app: any) => {
        const pr = Array.isArray(app.payment_requests)
          ? app.payment_requests[0]
          : app.payment_requests;
        const mandate = Array.isArray(pr?.mandates)
          ? pr?.mandates[0]
          : pr?.mandates;

        const mandateOwner = mandate?.user_id || app.user_id;
        const isUserMandate = app.mandate_id ? userMandateIds.includes(app.mandate_id) : false;
        const isPrMandate = pr?.mandate_id ? userMandateIds.includes(pr.mandate_id) : false;

        return mandateOwner === user.id || isUserMandate || isPrMandate;
      })
      .map((app: any) => {
        const pr = Array.isArray(app.payment_requests)
          ? app.payment_requests[0]
          : app.payment_requests;
        const mandate = Array.isArray(pr?.mandates)
          ? pr?.mandates[0]
          : pr?.mandates;

        const normalizedStatus = (app.status || "pending").toLowerCase();

        return {
          ...app,
          status: normalizedStatus,
          payment_requests: pr
            ? {
                ...pr,
                mandates: mandate,
              }
            : undefined,
        };
      });

    // 5. Apply status filter if requested
    if (statusFilter && statusFilter !== "all") {
      const targetStatus = statusFilter.toLowerCase();
      userApprovals = userApprovals.filter((a: any) => a.status === targetStatus);
    }

    // 6. Sort: Pending first, then by decided_at desc
    userApprovals.sort((a: any, b: any) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return 0;
    });

    return NextResponse.json({ approvals: userApprovals });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch approvals" },
      { status: 500 }
    );
  }
}
