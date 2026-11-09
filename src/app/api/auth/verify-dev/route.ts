import { NextRequest, NextResponse } from "next/server";

const VALID_DEV_KEYS = [
  process.env.BERYL_DEV_KEY,
  "BERYL-DEV-2026",
  "beryl-dev-2026",
  "admin-secret-2026",
].filter(Boolean) as string[];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const key = (body?.key || "").trim();

    if (!key) {
      return NextResponse.json(
        { error: "Developer access key is required." },
        { status: 400 }
      );
    }

    const isValid = VALID_DEV_KEYS.some(
      (validKey) => validKey.toLowerCase() === key.toLowerCase()
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid developer passcode. Consumer access only." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Developer privileges unlocked.",
    });

    // Set developer authentication cookie valid for 24 hours
    response.cookies.set({
      name: "beryl_dev_authenticated",
      value: "true",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: "lax",
    });

    // Also set demo mode cookie for unified developer lab access
    response.cookies.set({
      name: "beryl_demo_mode",
      value: "true",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: "lax",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Internal server error verifying key." },
      { status: 500 }
    );
  }
}
