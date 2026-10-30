import "server-only";

import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthConfig } from "./config";
import { sessionCookieName } from "./cookie";
import { verifySessionToken } from "./session-token";
import type { Role, Session } from "./types";
import { isRoleAllowed } from "./authorization";

export async function getCurrentSession(): Promise<Session | null> {
  const token = (await cookies()).get(sessionCookieName())?.value;
  if (!token) return null;
  return verifySessionToken(token, getAuthConfig().secret);
}

export async function requirePageSession(): Promise<Session> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}

export async function requirePageRole(role: Role): Promise<Session> {
  const session = await requirePageSession();
  if (!isRoleAllowed(session.role, [role])) redirect("/admin/forbidden" as Route);
  return session;
}
