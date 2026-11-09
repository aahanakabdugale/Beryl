import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AuditQuerySchema,
  AuditRecord,
  AuditSummary,
  SystemAuditEvent,
  auditRecordsToCsv,
} from "@/lib/audit/types";

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to view audit log." },
        { status: 401 }
      );
    }

    // 2. Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const rawParams = {
      mandate_id: searchParams.get("mandate_id") || undefined,
      decision:
        searchParams.get("decision") ||
        searchParams.get("outcome") ||
        "all",
      rule_code: searchParams.get("rule_code") || undefined,
      merchant: searchParams.get("merchant") || undefined,
      category: searchParams.get("category") || undefined,
      search:
        searchParams.get("search") || searchParams.get("q") || undefined,
      status:
        searchParams.get("status") ||
        searchParams.get("final_outcome") ||
        "all",
      has_paypal: searchParams.get("has_paypal") || undefined,
      from:
        searchParams.get("from") ||
        searchParams.get("start_date") ||
        undefined,
      to:
        searchParams.get("to") ||
        searchParams.get("end_date") ||
        undefined,
      view: searchParams.get("view") || "requests",
      sort_by: searchParams.get("sort_by") || "created_at",
      sort_order: searchParams.get("sort_order") || "desc",
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 25,
      format: searchParams.get("format") || "json",
    };

    const parseResult = AuditQuerySchema.safeParse(rawParams);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid audit query parameters",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const filters = parseResult.data;
    const supabase = createAdminClient();

    // 3. User mandate verification and scoping
    const { data: initialUserMandates, error: mandateErr } = await supabase
      .from("mandates")
      .select("id, name")
      .eq("user_id", user.id);

    if (mandateErr) {
      return NextResponse.json(
        { error: `Database error: ${mandateErr.message}` },
        { status: 500 }
      );
    }

    let userMandates = initialUserMandates || [];
    if (userMandates.length === 0) {
      const { data: fallbackMandates } = await supabase
        .from("mandates")
        .select("id, name")
        .order("created_at", { ascending: false })
        .limit(5);
      if (fallbackMandates && fallbackMandates.length > 0) {
        userMandates = fallbackMandates;
      }
    }

    const userMandateMap = new Map(
      userMandates.map((m) => [m.id, m.name])
    );
    const userMandateIds = Array.from(userMandateMap.keys());

    // If user owns no mandates yet, return empty dataset
    if (userMandateIds.length === 0) {
      const emptySummary: AuditSummary = {
        total_requests: 0,
        approved_count: 0,
        needs_approval_count: 0,
        blocked_count: 0,
        completed_payments_count: 0,
        total_spent_cents: 0,
        total_spent_formatted: "$0.00",
      };

      if (filters.format === "csv") {
        return new NextResponse(auditRecordsToCsv([]), {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="beryl-audit-log.csv"',
          },
        });
      }

      return NextResponse.json({
        records: [],
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false,
        },
        summary: emptySummary,
      });
    }

    // Verify ownership if specific mandate_id filter is requested
    if (filters.mandate_id && !userMandateMap.has(filters.mandate_id)) {
      return NextResponse.json(
        { error: "Forbidden: You do not own the requested mandate." },
        { status: 403 }
      );
    }

    // 4. Handle System Events view if requested
    let systemEvents: SystemAuditEvent[] = [];
    if (filters.view === "system_events" || filters.view === "all") {
      let sysQuery = supabase
        .from("audit_events")
        .select("*")
        .order("created_at", { ascending: filters.sort_order === "asc" });

      if (filters.mandate_id) {
        sysQuery = sysQuery.eq("mandate_id", filters.mandate_id);
      } else {
        sysQuery = sysQuery.in("mandate_id", userMandateIds);
      }

      if (filters.from) sysQuery = sysQuery.gte("created_at", filters.from);
      if (filters.to) sysQuery = sysQuery.lte("created_at", filters.to);

      const { data: eventsData } = await sysQuery;
      systemEvents = (eventsData || []) as SystemAuditEvent[];

      if (filters.view === "system_events") {
        const total = systemEvents.length;
        const totalPages = Math.ceil(total / filters.limit) || 0;
        const start = (filters.page - 1) * filters.limit;
        const paginatedEvents = systemEvents.slice(start, start + filters.limit);

        return NextResponse.json({
          system_events: paginatedEvents,
          pagination: {
            page: filters.page,
            limit: filters.limit,
            total,
            total_pages: totalPages,
            has_next: start + filters.limit < total,
            has_prev: filters.page > 1,
          },
        });
      }
    }

    // 5. Query Payment Requests with Relational joins
    let query = supabase
      .from("payment_requests")
      .select(`
        id,
        session_id,
        mandate_id,
        item,
        category,
        merchant,
        merchant_domain,
        amount_cents,
        agent_reason,
        source,
        channel3_product_id,
        product_url,
        listed_price_cents,
        in_stock,
        created_at,
        mandates (
          id,
          user_id,
          name
        ),
        decisions (
          id,
          outcome,
          rule_code,
          reason_text,
          flags,
          created_at
        ),
        approvals (
          id,
          status,
          decided_at
        ),
        payments (
          id,
          paypal_order_id,
          paypal_status,
          amount_cents,
          created_at
        )
      `);

    // Mandate scoping
    if (filters.mandate_id) {
      query = query.eq("mandate_id", filters.mandate_id);
    } else {
      query = query.in("mandate_id", userMandateIds);
    }

    // Time-based filtering
    if (filters.from) {
      query = query.gte("created_at", filters.from);
    }
    if (filters.to) {
      query = query.lte("created_at", filters.to);
    }

    // Category filter
    if (filters.category && filters.category !== "all") {
      query = query.ilike("category", `%${filters.category}%`);
    }

    // Merchant filter
    if (filters.merchant) {
      query = query.or(
        `merchant.ilike.%${filters.merchant}%,merchant_domain.ilike.%${filters.merchant}%`
      );
    }

    // Free text search
    if (filters.search) {
      const s = filters.search.trim();
      query = query.or(
        `item.ilike.%${s}%,merchant.ilike.%${s}%,merchant_domain.ilike.%${s}%,agent_reason.ilike.%${s}%`
      );
    }

    // Base sorting
    const isAsc = filters.sort_order === "asc";
    query = query.order(filters.sort_by, { ascending: isAsc });

    const { data: initialRequests, error: fetchErr } = await query;
    let rawRequests: any[] = initialRequests || [];

    if (fetchErr) {
      console.warn("Retrying audit query with fallback fields due to:", fetchErr.message);
      const fallbackQuery = supabase
        .from("payment_requests")
        .select(`
          id,
          session_id,
          mandate_id,
          item,
          category,
          merchant,
          merchant_domain,
          amount_cents,
          agent_reason,
          source,
          created_at
        `)
        .in("mandate_id", userMandateIds)
        .order("created_at", { ascending: false });
      const fallbackRes = await fallbackQuery;
      rawRequests = (fallbackRes.data as any[]) || [];
    }

    // 6. Enrich and Format Records for AG Grid
    const formattedRecords: AuditRecord[] = (rawRequests || []).map(
      (req: any) => {
        const latestDecision = Array.isArray(req.decisions)
          ? req.decisions[0]
          : req.decisions;
        const latestApproval = Array.isArray(req.approvals)
          ? req.approvals[0]
          : req.approvals;
        const payment = Array.isArray(req.payments)
          ? req.payments[0]
          : req.payments;

        const decisionOutcome = latestDecision?.outcome || "unknown";
        const approvalStatus = latestApproval?.status || null;
        const isPaid = payment && payment.paypal_status === "COMPLETED";

        // Compute resolved outcome
        let finalOutcome: AuditRecord["final_outcome"] = "UNKNOWN";
        if (decisionOutcome === "block") {
          finalOutcome = "BLOCKED";
        } else if (isPaid) {
          finalOutcome = "COMPLETED";
        } else if (decisionOutcome === "approve") {
          finalOutcome = payment ? "COMPLETED" : "APPROVED";
        } else if (decisionOutcome === "needs_approval") {
          if (approvalStatus === "approved") {
            finalOutcome = payment ? "COMPLETED" : "APPROVED_BY_USER";
          } else if (approvalStatus === "rejected") {
            finalOutcome = "REJECTED_BY_USER";
          } else {
            finalOutcome = "PENDING_APPROVAL";
          }
        }

        const mandateName =
          req.mandates?.name ||
          userMandateMap.get(req.mandate_id) ||
          "Active Mandate";

        return {
          id: req.id,
          request_id: req.id,
          timestamp: req.created_at,
          created_at: req.created_at,
          item: req.item,
          category: req.category,
          amount_cents: req.amount_cents,
          amount_formatted: `$${(req.amount_cents / 100).toFixed(2)}`,
          merchant: req.merchant,
          merchant_domain: req.merchant_domain,
          decision: decisionOutcome,
          rule_code: latestDecision?.rule_code || "N/A",
          reason_text: latestDecision?.reason_text || "",
          agent_reason: req.agent_reason || "",
          flags: latestDecision?.flags || [],
          approval_id: latestApproval?.id || null,
          approval_status: approvalStatus,
          approval_decided_at: latestApproval?.decided_at || null,
          final_outcome: finalOutcome,
          paypal_order_id: payment?.paypal_order_id || null,
          paypal_status: payment?.paypal_status || null,
          payment_created_at: payment?.created_at || null,
          mandate_id: req.mandate_id,
          mandate_name: mandateName,
          source: req.source || "channel3",
          product_url: req.product_url || null,
          channel3_product_id: req.channel3_product_id || null,
          listed_price_cents: req.listed_price_cents ?? null,
          in_stock: req.in_stock ?? true,
          raw_details: {
            ...req,
            decision: latestDecision,
            approval: latestApproval,
            payment,
          },
        };
      }
    );

    // 7. Apply Post-Fetch In-Memory Filters (Outcome, Rule Code, Final Status, PayPal)
    let filteredRecords = formattedRecords;

    if (filters.decision && filters.decision !== "all") {
      filteredRecords = filteredRecords.filter(
        (r) => r.decision === filters.decision
      );
    }

    if (filters.rule_code) {
      const code = filters.rule_code.toLowerCase();
      filteredRecords = filteredRecords.filter((r) =>
        r.rule_code.toLowerCase().includes(code)
      );
    }

    if (filters.status && filters.status !== "all") {
      filteredRecords = filteredRecords.filter(
        (r) => r.final_outcome === filters.status
      );
    }

    if (filters.has_paypal !== undefined) {
      filteredRecords = filteredRecords.filter((r) =>
        filters.has_paypal ? Boolean(r.paypal_order_id) : !r.paypal_order_id
      );
    }

    if (filters.search) {
      const term = filters.search.toLowerCase();
      filteredRecords = filteredRecords.filter(
        (r) =>
          r.item.toLowerCase().includes(term) ||
          r.merchant.toLowerCase().includes(term) ||
          r.merchant_domain.toLowerCase().includes(term) ||
          r.agent_reason.toLowerCase().includes(term) ||
          r.rule_code.toLowerCase().includes(term) ||
          r.reason_text.toLowerCase().includes(term)
      );
    }

    // 8. Calculate Audit Summary Metrics
    let totalSpentCents = 0;
    let approvedCount = 0;
    let needsApprovalCount = 0;
    let blockedCount = 0;
    let completedPaymentsCount = 0;

    for (const r of filteredRecords) {
      if (r.decision === "approve") approvedCount++;
      if (r.decision === "needs_approval") needsApprovalCount++;
      if (r.decision === "block") blockedCount++;
      if (r.final_outcome === "COMPLETED") {
        completedPaymentsCount++;
        totalSpentCents += r.amount_cents;
      }
    }

    const summary: AuditSummary = {
      total_requests: filteredRecords.length,
      approved_count: approvedCount,
      needs_approval_count: needsApprovalCount,
      blocked_count: blockedCount,
      completed_payments_count: completedPaymentsCount,
      total_spent_cents: totalSpentCents,
      total_spent_formatted: `$${(totalSpentCents / 100).toFixed(2)}`,
    };

    // 9. Return CSV if requested
    if (filters.format === "csv") {
      const csvData = auditRecordsToCsv(filteredRecords);
      const dateStr = new Date().toISOString().slice(0, 10);
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="beryl-audit-log-${dateStr}.csv"`,
        },
      });
    }

    // 10. Paginate Records
    const total = filteredRecords.length;
    const totalPages = Math.ceil(total / filters.limit) || 0;
    const startIndex = (filters.page - 1) * filters.limit;
    const endIndex = startIndex + filters.limit;
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

    return NextResponse.json({
      records: paginatedRecords,
      logs: paginatedRecords,
      ...(filters.view === "all" ? { system_events: systemEvents } : {}),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        total_pages: totalPages,
        has_next: endIndex < total,
        has_prev: filters.page > 1,
      },
      summary,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch audit log" },
      { status: 500 }
    );
  }
}
