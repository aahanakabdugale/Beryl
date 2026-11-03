import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get user's mandates
    const { data: mandates } = await supabase
      .from("mandates")
      .select("id")
      .eq("user_id", user.id);

    const mandateIds = (mandates || []).map((m) => m.id);

    // Delete seed demo items (Logitech mouse, HUANUO monitor arm)
    const { data: deletedReqs, error: delErr } = await supabase
      .from("payment_requests")
      .delete()
      .in("item", [
        "Logitech M510 Wireless Computer Mouse",
        "HUANUO Single Monitor Adjustable Gas Spring Arm",
        "Malicious Discount Cable Bundle",
      ])
      .select();

    // Recalculate spent cents for user's mandates
    if (mandateIds.length > 0) {
      for (const mid of mandateIds) {
        const { data: remainingReqs } = await supabase
          .from("payment_requests")
          .select(`
            amount_cents,
            decisions (outcome)
          `)
          .eq("mandate_id", mid);

        let realSpent = 0;
        if (remainingReqs) {
          for (const r of remainingReqs) {
            const decList = Array.isArray(r.decisions)
              ? r.decisions
              : r.decisions
              ? [r.decisions]
              : [];
            if (decList.some((d: any) => d.outcome === "approve")) {
              realSpent += r.amount_cents || 0;
            }
          }
        }

        await supabase
          .from("mandates")
          .update({ spent_cents: realSpent })
          .eq("id", mid);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Preloaded demo transactions removed successfully",
      deleted_count: deletedReqs?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to clean demo data" },
      { status: 500 }
    );
  }
}
