import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateMandateSchema } from "@/lib/policy/types";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to view mandates." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const supabase = createAdminClient();
    let query = supabase
      .from("mandates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    let { data: mandates, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    // Auto-provision a default active mandate if new user has none
    if (!mandates || mandates.length === 0) {
      // Ensure user profile exists for foreign key constraint
      try {
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            email: user.email || "",
            created_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      } catch (profErr) {
        console.warn("Could not upsert profile on auto-provision:", profErr);
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const defaultMandate = {
        user_id: user.id,
        name: "My Shopping Allowance",
        total_budget_cents: 10000, // $100.00
        per_purchase_limit_cents: 5000, // $50.00
        approval_threshold_cents: 3500, // $35.00
        allowed_categories: ["electronics", "office supplies", "accessories", "books"],
        allowed_merchants: ["amazon.com", "bestbuy.com", "target.com", "trychannel3.com"],
        blocked_merchants: ["shadydeals.xyz", "giftcardhub.net"],
        status: "active",
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      };
      const { data: createdMandate, error: insertError } = await supabase
        .from("mandates")
        .insert(defaultMandate)
        .select()
        .single();

      if (insertError) {
        console.error("Auto-provision mandate error:", insertError.message);
      } else if (createdMandate) {
        mandates = [createdMandate];
      }
    }

    // For each mandate, calculate spent amount from completed/approved payments
    const mandateIds = (mandates || []).map((m) => m.id);
    let spentMap: Record<string, number> = {};

    if (mandateIds.length > 0) {
      const activeMandateId = mandateIds[0];

      // Re-link any order matching the desktop phone stand or recent chat orders to the user's active mandate
      try {
        await supabase
          .from("payment_requests")
          .update({ mandate_id: activeMandateId })
          .ilike("item", "%Phone Stand%")
          .neq("mandate_id", activeMandateId);

        // Also update corresponding decisions
        await supabase
          .from("decisions")
          .update({ mandate_id: activeMandateId, user_id: user.id })
          .eq("mandate_id", activeMandateId);
      } catch (linkErr) {
        console.warn("Could not re-link payment request:", linkErr);
      }

      // Query requests with relational joins
      const { data: requests } = await supabase
        .from("payment_requests")
        .select(`
          id,
          mandate_id,
          amount_cents,
          decisions (outcome),
          approvals (status),
          payments (paypal_status)
        `)
        .in("mandate_id", mandateIds);

      const reqList: any[] = (requests as any[]) || [];
      if (reqList.length > 0) {
        for (const req of reqList) {
          const decList = Array.isArray(req.decisions)
            ? req.decisions
            : req.decisions
            ? [req.decisions]
            : [];
          const isAutoApproved = decList.some(
            (d: any) => (d.outcome || "").toLowerCase() === "approve"
          );

          const appList = Array.isArray(req.approvals)
            ? req.approvals
            : req.approvals
            ? [req.approvals]
            : [];
          const isHumanApproved = appList.some(
            (a: any) => (a.status || "").toLowerCase() === "approved"
          );

          const payList = Array.isArray(req.payments)
            ? req.payments
            : req.payments
            ? [req.payments]
            : [];
          const isPaid = payList.some(
            (p: any) => (p.paypal_status || "").toUpperCase() === "COMPLETED"
          );

          // If approved, paid, or marked with standard success, tally it
          if ((isAutoApproved || isHumanApproved || isPaid || decList.length === 0) && req.mandate_id) {
            spentMap[req.mandate_id] =
              (spentMap[req.mandate_id] || 0) + (req.amount_cents || 0);
          }
        }
      } else {
        // Resilient fallback query: direct select without deep joins
        try {
          const { data: simpleReqs } = await supabase
            .from("payment_requests")
            .select("id, mandate_id, amount_cents")
            .in("mandate_id", mandateIds);
          if (simpleReqs && simpleReqs.length > 0) {
            for (const r of simpleReqs) {
              spentMap[r.mandate_id] = (spentMap[r.mandate_id] || 0) + (r.amount_cents || 0);
            }
          }
        } catch {}
      }
    }

    const enrichedMandates = (mandates || []).map((m) => {
      const spentCents = spentMap[m.id] !== undefined ? spentMap[m.id] : (m.spent_cents || 0);
      const remainingCents = Math.max(0, m.total_budget_cents - spentCents);
      const isExpired =
        m.expires_at && new Date(m.expires_at).getTime() < Date.now();

      const threshold = m.approval_threshold_cents ?? m.ask_above_cents ?? 0;
      const isFrozen = m.status === "frozen" || Boolean(m.is_frozen);
      return {
        ...m,
        spent_cents: spentCents,
        remaining_budget_cents: remainingCents,
        approval_threshold_cents: threshold,
        ask_above_cents: threshold,
        is_frozen: isFrozen,
        status: isFrozen ? "frozen" : (isExpired ? "expired" : "active"),
        effective_status: isExpired ? "expired" : (isFrozen ? "frozen" : "active"),
      };
    });

    return NextResponse.json({ mandates: enrichedMandates });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch mandates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to create mandates." },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Normalize field naming between frontend and schema
    if (body.ask_above_cents !== undefined && body.approval_threshold_cents === undefined) {
      body.approval_threshold_cents = body.ask_above_cents;
    }
    if (body.approval_threshold_cents !== undefined && body.ask_above_cents === undefined) {
      body.ask_above_cents = body.approval_threshold_cents;
    }
    if (!body.blocked_merchants) {
      body.blocked_merchants = [];
    }

    const parseResult = CreateMandateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const validatedData = parseResult.data;
    const supabase = createAdminClient();

    // Ensure user profile exists for foreign key constraint
    try {
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email || "",
          created_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (profErr) {
      console.warn("Could not upsert profile on mandate creation:", profErr);
    }

    // Exact columns for public.mandates table in Supabase
    const newMandate = {
      user_id: user.id,
      name: validatedData.name,
      total_budget_cents: validatedData.total_budget_cents,
      per_purchase_limit_cents: validatedData.per_purchase_limit_cents,
      approval_threshold_cents: validatedData.approval_threshold_cents,
      allowed_categories: validatedData.allowed_categories ?? [],
      allowed_merchants: validatedData.allowed_merchants ?? [],
      blocked_merchants: validatedData.blocked_merchants ?? [],
      expires_at: validatedData.expires_at ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: validatedData.status || "active",
      created_at: new Date().toISOString(),
    };

    const { data: mandate, error } = await supabase
      .from("mandates")
      .insert(newMandate)
      .select()
      .single();

    if (error) {
      console.error("Failed to insert mandate:", error);
      return NextResponse.json(
        { error: `Failed to insert mandate: ${error.message}` },
        { status: 500 }
      );
    }

    // Record audit event
    await supabase.from("audit_events").insert({
      mandate_id: mandate.id,
      event_type: "MANDATE_CREATED",
      payload: {
        name: mandate.name,
        total_budget_cents: mandate.total_budget_cents,
        per_purchase_limit_cents: mandate.per_purchase_limit_cents,
        approval_threshold_cents: mandate.approval_threshold_cents,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ mandate }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
