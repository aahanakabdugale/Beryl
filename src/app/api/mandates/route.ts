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

    const { data: mandates, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    // For each mandate, calculate spent amount from completed payments
    const mandateIds = (mandates || []).map((m) => m.id);
    let spentMap: Record<string, number> = {};

    if (mandateIds.length > 0) {
      const { data: requests } = await supabase
        .from("payment_requests")
        .select("id, mandate_id, amount_cents, decisions(outcome)")
        .in("mandate_id", mandateIds);

      if (requests) {
        for (const req of requests) {
          const isApproved =
            Array.isArray(req.decisions) &&
            req.decisions.some((d: any) => d.outcome === "approve");

          if (isApproved && req.mandate_id) {
            spentMap[req.mandate_id] =
              (spentMap[req.mandate_id] || 0) + (req.amount_cents || 0);
          }
        }
      }
    }

    const enrichedMandates = (mandates || []).map((m) => {
      const spentCents = spentMap[m.id] || 0;
      const remainingCents = Math.max(0, m.total_budget_cents - spentCents);
      const isExpired =
        m.expires_at && new Date(m.expires_at).getTime() < Date.now();

      return {
        ...m,
        spent_cents: spentCents,
        remaining_budget_cents: remainingCents,
        effective_status: isExpired ? "expired" : m.status,
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

    const newMandate = {
      ...validatedData,
      user_id: user.id,
      created_at: new Date().toISOString(),
    };

    const { data: mandate, error } = await supabase
      .from("mandates")
      .insert(newMandate)
      .select()
      .single();

    if (error) {
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
