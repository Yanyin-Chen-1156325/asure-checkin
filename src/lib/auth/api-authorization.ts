import "server-only";

import { getAuthConfig } from "./config";
import { sessionCookieName } from "./cookie";
import { verifySessionToken } from "./session-token";
import type { Role, Session } from "./types";
import { isRoleAllowed } from "./authorization";
import { apiError } from "@/lib/http/api-error";

export type ApiAuthorization = { session: Session; response?: never } | { session?: never; response: Response };

function cookieValue(cookieHeader: string | null, name: string): string | null {
  const prefix = `${name}=`;
  const match = cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

export async function authorizeApiRequest(
  request: Request,
  requestId: string,
  allowedRoles: readonly Role[] = ["owner", "staff"],
): Promise<ApiAuthorization> {
  const token = cookieValue(request.headers.get("cookie"), sessionCookieName());
  if (!token) return { response: apiError(401, "UNAUTHENTICATED", "Authentication is required.", requestId) };
  const session = await verifySessionToken(token, getAuthConfig().secret);
  if (!session) return { response: apiError(401, "UNAUTHENTICATED", "Authentication is required.", requestId) };
  if (!isRoleAllowed(session.role, allowedRoles)) {
    return { response: apiError(403, "FORBIDDEN", "You do not have permission to perform this action.", requestId) };
  }
  return { session };
}
