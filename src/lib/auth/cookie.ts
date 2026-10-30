import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const SESSION_COOKIE_PRODUCTION = "__Host-motel_session";
export const SESSION_COOKIE_DEVELOPMENT = "motel_session";

export function sessionCookieName(nodeEnvironment = process.env.NODE_ENV): string {
  return nodeEnvironment === "production" ? SESSION_COOKIE_PRODUCTION : SESSION_COOKIE_DEVELOPMENT;
}

export function sessionCookieOptions(maxAge: number, nodeEnvironment = process.env.NODE_ENV): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: nodeEnvironment === "production",
    sameSite: "strict",
    path: "/",
    maxAge,
    priority: "high",
  };
}
