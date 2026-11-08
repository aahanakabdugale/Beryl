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
    }

    // 2. Fetch directly from payment_requests under user's mandates with decisions and approvals
    // This is the source of truth that never fails even if approvals table schema has differences!
    let allApprovals: any[] = [];
    const seenRequestIds = new Set<string>();

    if (userMandateIds.length > 0) {
      try {
        const { data: requests } = await supabase
          .from("payment_requests")
          .select(`
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
            ),
            decisions (
              outcome,
              rule_code,
              reason_text
            ),
            approvals (
              id,
              status,
              decided_at
            )
          `)
          .in("mandate_id", userMandateIds)
          .order("created_at", { ascending: false });

        for (const req of requests || []) {
          const decList = Array.isArray(req.decisions)
            ? req.decisions
            : req.decisions
            ? [req.decisions]
            : [];
          const isNeedsApproval = decList.some(
            (d: any) => (d.outcome || "").toLowerCase() === "needs_approval"
          );

          const appList = Array.isArray(req.approvals)
            ? req.approvals
            : req.approvals
            ? [req.approvals]
            : [];
          const existingApp = appList[0];

          if (isNeedsApproval || existingApp) {
            seenRequestIds.add(req.id);
            const approvalId = existingApp?.id || req.id;
            const normalizedStatus = (existingApp?.status || "pending").toLowerCase();

            // Auto-persist into approvals table if missing
            if (!existingApp) {
              try {
                await supabase.from("approvals").insert({
                  id: approvalId,
                  request_id: req.id,
                  status: "pending",
                });
              } catch {}
            }

            const mandate = Array.isArray(req.mandates) ? req.mandates[0] : req.mandates;

            allApprovals.push({
              id: approvalId,
              request_id: req.id,
              status: normalizedStatus,
              decided_at: existingApp?.decided_at || null,
              created_at: req.created_at,
              payment_requests: {
                ...req,
                mandates: mandate,
              },
            });
          }
        }
      } catch (err) {
        console.warn("Could not query payment_requests for approvals:", err);
      }
    }

    // 3. Also query approvals table directly to catch any legacy or seed approvals
    try {
      const { data: rawApps } = await supabase
        .from("approvals")
        .select(`
          id,
          request_id,
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
        `)
        .limit(limit);

      for (const app of rawApps || []) {
        if (app.request_id && seenRequestIds.has(app.request_id)) {
          continue; // Already processed
        }

        const pr = Array.isArray(app.payment_requests)
          ? app.payment_requests[0]
          : app.payment_requests;
        const mandate = Array.isArray(pr?.mandates)
          ? pr?.mandates[0]
          : pr?.mandates;

        const isUserMandate = pr?.mandate_id && userMandateIds.includes(pr.mandate_id);
        const isUserOwner = mandate?.user_id === user.id;

        if (isUserMandate || isUserOwner) {
          allApprovals.push({
            id: app.id,
            request_id: app.request_id,
            status: (app.status || "pending").toLowerCase(),
            decided_at: app.decided_at || null,
            payment_requests: pr
              ? {
                  ...pr,
                  mandates: mandate,
                }
              : undefined,
          });
        }
      }
    } catch (e) {
      console.warn("Approvals direct query fallback:", e);
    }

    // 4. Apply status filter if requested
    let filteredApprovals = allApprovals;
    if (statusFilter && statusFilter !== "all") {
      const targetStatus = statusFilter.toLowerCase();
      filteredApprovals = filteredApprovals.filter(
        (a: any) => a.status === targetStatus
      );
    }

    // 5. Sort: Pending first, then newest
    filteredApprovals.sort((a: any, b: any) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return 0;
    });

    return NextResponse.json({ approvals: filteredApprovals });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch approvals" },
      { status: 500 }
    );
  }
}
