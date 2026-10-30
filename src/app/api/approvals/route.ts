import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const status = searchParams.get("status"); // e.g. "pending", "approved", "rejected"
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const supabase = createAdminClient();

    let query = supabase
      .from("approvals")
      .select(
        `
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
      `
      )
      .order("decided_at", { ascending: false, nullsFirst: true })
      .limit(limit);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: approvals, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    // Filter to only include approvals for mandates owned by this user
    const userApprovals = (approvals || []).filter((app: any) => {
      const mandateOwner = app.payment_requests?.mandates?.user_id;
      return !mandateOwner || mandateOwner === user.id;
    });

    return NextResponse.json({ approvals: userApprovals });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch approvals" },
      { status: 500 }
    );
  }
}
