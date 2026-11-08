import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("Server signout error:", err);
  }

  const response = NextResponse.json({ success: true });

  // Explicitly delete session & role cookies
  response.cookies.delete("beryl_demo_mode");
  response.cookies.delete("beryl_dev_authenticated");

  return response;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {}

  const url = new URL("/", request.url);
  const response = NextResponse.redirect(url);
  response.cookies.delete("beryl_demo_mode");
  response.cookies.delete("beryl_dev_authenticated");
  return response;
}
