import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Proxy API requests to the backend to avoid CORS issues in dev.
  if (pathname.startsWith("/api/")) {
    const target = new URL(`${pathname}${search}`, BACKEND_BASE_URL);
    return NextResponse.rewrite(target);
  }

  // Auth guard for protected routes.
  const sessionToken = req.cookies.get("better-auth.session_token")?.value;
  const protectedRoutes = ["/dashboard", "/workflows", "/agents", "/settings"];
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtected && !sessionToken) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/workflows/:path*", "/agents/:path*", "/settings/:path*"],
};
