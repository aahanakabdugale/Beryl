import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { FreezeMandateSchema } from "@/lib/policy/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mandateId } = await params;

    if (!mandateId) {
      return NextResponse.json(
        { error: "Mandate ID parameter is required" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to manage mandates." },
        { status: 401 }
      );
    }

    let shouldFreeze = true;
    let reason = "Emergency kill switch triggered by user";

    try {
      const body = await request.json();
      const parseResult = FreezeMandateSchema.safeParse(body);
      if (parseResult.success) {
        shouldFreeze = parseResult.data.freeze;
        if (parseResult.data.reason) {
          reason = parseResult.data.reason;
        }
      }
    } catch {
      // Default to freezing if empty body
    }

    const supabase = createAdminClient();

    // Verify mandate exists and belongs to the user
    const { data: existingMandate, error: fetchError } = await supabase
      .from("mandates")
      .select("id, status, user_id, name")
      .eq("id", mandateId)
      .single();

    if (fetchError || !existingMandate) {
      return NextResponse.json(
        { error: "Mandate not found" },
        { status: 404 }
      );
    }

    if (existingMandate.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this mandate" },
        { status: 403 }
      );
    }

    const newStatus = shouldFreeze ? "frozen" : "active";

    const { data: updatedMandate, error: updateError } = await supabase
      .from("mandates")
      .update({ status: newStatus })
      .eq("id", mandateId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update mandate status: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Record emergency kill switch audit event
    const eventType = shouldFreeze ? "MANDATE_FROZEN" : "MANDATE_UNFROZEN";
    await supabase.from("audit_events").insert({
      mandate_id: mandateId,
      event_type: eventType,
      payload: {
        mandate_name: existingMandate.name,
        previous_status: existingMandate.status,
        new_status: newStatus,
        reason,
        triggered_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      mandate_id: mandateId,
      status: newStatus,
      message: shouldFreeze
        ? "Emergency kill switch ACTIVATED: Mandate frozen."
        : "Mandate successfully reactivated.",
      mandate: updatedMandate,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to toggle mandate status" },
      { status: 500 }
    );
  }
}
