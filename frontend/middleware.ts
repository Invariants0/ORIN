import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const sessionToken = req.cookies.get("better-auth.session_token")?.value;
  
  const protectedRoutes = ["/dashboard", "/workflows", "/agents", "/settings"];
  const isProtected = protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route));

  if (isProtected && !sessionToken) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/workflows/:path*", "/agents/:path*", "/settings/:path*"],
};
