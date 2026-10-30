import { NextRequest, NextResponse } from "next/server";

import { sessionCookieName } from "@/lib/auth/cookie";
import { verifySessionToken } from "@/lib/auth/session-token";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(sessionCookieName())?.value;
  const secret = process.env.AUTH_SECRET;
  const session = token && secret ? await verifySessionToken(token, secret) : null;

  if (request.nextUrl.pathname.startsWith("/admin") && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (request.nextUrl.pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/login"] };
