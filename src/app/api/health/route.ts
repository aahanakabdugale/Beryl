import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = process.uptime();
  
  return NextResponse.json(
    {
      status: "healthy",
      service: "beryl-policy-guard",
      version: "1.0.0",
      platform: "render",
      uptime_seconds: Math.floor(startTime),
      timestamp: new Date().toISOString(),
      checks: {
        policy_engine: "operational",
        paypal_sandbox: process.env.PAYPAL_CLIENT_ID ? "configured" : "mock_ready",
        supabase: process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "missing_url",
      },
    },
    { status: 200 }
  );
}
