import { NextRequest, NextResponse } from "next/server";
import { runShoppingAgent } from "@/lib/agent";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const instruction = body?.message || body?.instruction;

    if (!instruction || typeof instruction !== "string") {
      return NextResponse.json(
        { error: "Instruction message is required" },
        { status: 400 }
      );
    }

    const mandateId = body.mandateId;
    const sessionId = body.sessionId || crypto.randomUUID();

    const user = await getCurrentUser();
    const supabase = createAdminClient();

    let mandate = null;
    if (mandateId) {
      const { data } = await supabase
        .from("mandates")
        .select("*")
        .eq("id", mandateId)
        .single();
      mandate = data;
    }

    // Persist session if not exists
    if (mandateId) {
      try {
        await supabase.from("agent_sessions").upsert({
          id: sessionId,
          mandate_id: mandateId,
          original_instruction: instruction,
          created_at: new Date().toISOString(),
        });
      } catch {
        // Continue even if table grants are pending
      }
    }

    // Execute agent reasoning and tool calls
    const agentResult = await runShoppingAgent({
      instruction,
      mandate,
      sessionId,
      maxSteps: 5,
    });

    return NextResponse.json(agentResult);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Agent execution failed" },
      { status: 500 }
    );
  }
}
