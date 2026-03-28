import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/**
 * ORIN Edge Proxy & Auth Guard
 * Handles request rewriting to the backend and client-side route protection.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  
  // 🛰️ 1. Generate unique Request ID for tracing
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // 🛡️ 2. Authentication Guard
  const sessionToken = req.cookies.get("better-auth.session_token")?.value;
  const protectedRoutes = ["/dashboard", "/workflows", "/agents", "/settings"];
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtected && !sessionToken) {
    console.warn(`[Proxy] 🔒 Unauthorized access to ${pathname} (Request: ${requestId})`);
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  // 📡 3. API Rewrite (BFF Pattern)
  if (pathname.startsWith("/api/")) {
    const target = new URL(`${pathname}${search}`, BACKEND_BASE_URL);
    
    // Log the proxy action for observability
    console.log(`[Proxy] 🔄 Proxying ${req.method} ${pathname} -> ${BACKEND_BASE_URL} (ID: ${requestId})`);

    const response = NextResponse.rewrite(target);
    
    // Inject tracing headers to help backend correlate requests
    response.headers.set("X-Request-ID", requestId);
    response.headers.set("X-Proxied-By", "ORIN-Edge-Proxy");
    
    return response;
  }

  // 🏥 4. Health Check (Proxy Level)
  if (pathname === "/healthcheck") {
    return NextResponse.json({ 
      status: "healthy", 
      proxy: "active",
      timestamp: new Date().toISOString() 
    });
  }

  return NextResponse.next();
}

/**
 * Middleware Matcher Configuration
 */
export const config = {
  matcher: [
    "/api/:path*", 
    "/dashboard/:path*", 
    "/workflows/:path*", 
    "/agents/:path*", 
    "/settings/:path*",
    "/healthcheck"
  ],
};
