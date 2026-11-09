import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/consumer",
  "/mandates",
  "/agent",
  "/approvals",
  "/audit",
  "/analytics",
];

const AUTH_PREFIXES = ["/login", "/auth", "/signup", "/sign-in", "/sign-up"];

const DEV_ONLY_PREFIXES = [
  "/dashboard/audit",
  "/dashboard/attack-lab",
];

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  const isProtectedPath = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const isDevOnlyPath = DEV_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const isAuthPath = AUTH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const isDemo = request.cookies.get("beryl_demo_mode")?.value === "true";
  const isDevAuth = request.cookies.get("beryl_dev_authenticated")?.value === "true";

  // If a consumer tries to access developer-only tools without dev key
  if (isDevOnlyPath && !isDevAuth) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.searchParams.set("dev_gate", "required");
    return NextResponse.redirect(redirectUrl);
  }

  // If user is not authenticated and not in developer/demo mode, redirect to login
  if (!user && !isDevAuth && !isDemo && isProtectedPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is authenticated or in developer/demo mode and visits login/signup, redirect to dashboard
  if ((user || isDevAuth || isDemo) && isAuthPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.searchParams.delete("redirectTo");
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
