import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Developer session locked.",
  });

  response.cookies.set({
    name: "beryl_dev_authenticated",
    value: "",
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });

  return response;
}
