import { cookies } from "next/headers";
import { z } from "zod";

import { getAuthConfig } from "@/lib/auth/config";
import { sessionCookieName, sessionCookieOptions } from "@/lib/auth/cookie";
import { verifyCredentials } from "@/lib/auth/credentials";
import { loginClientKey, loginLimiter } from "@/lib/auth/login-limiter";
import { isTrustedRequestOrigin } from "@/lib/auth/origin";
import { createSessionToken } from "@/lib/auth/session-token";
import { serverEnvironment } from "@/lib/env/server";
import { apiError } from "@/lib/http/api-error";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/http/request-id";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(128),
  password: z.string().min(1).max(1_024),
}).strict();

export async function POST(request: Request) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  if (!isTrustedRequestOrigin(request, serverEnvironment.APP_BASE_URL)) {
    return apiError(403, "INVALID_ORIGIN", "The request could not be accepted.", requestId);
  }

  const clientKey = loginClientKey(request);
  const currentLimit = loginLimiter.check(clientKey);
  if (!currentLimit.allowed) {
    const response = apiError(429, "TOO_MANY_ATTEMPTS", "Too many sign-in attempts. Try again later.", requestId);
    response.headers.set("retry-after", String(currentLimit.retryAfterSeconds));
    return response;
  }

  let input: z.infer<typeof loginSchema>;
  try {
    input = loginSchema.parse(await request.json());
  } catch {
    return apiError(400, "INVALID_REQUEST", "Enter a valid username and password.", requestId);
  }

  const user = await verifyCredentials(input.username, input.password);
  if (!user) {
    const limit = loginLimiter.recordFailure(clientKey);
    const response = apiError(
      limit.allowed ? 401 : 429,
      limit.allowed ? "INVALID_CREDENTIALS" : "TOO_MANY_ATTEMPTS",
      limit.allowed ? "The username or password is incorrect." : "Too many sign-in attempts. Try again later.",
      requestId,
    );
    if (!limit.allowed) response.headers.set("retry-after", String(limit.retryAfterSeconds));
    return response;
  }

  loginLimiter.reset(clientKey);
  const config = getAuthConfig();
  const token = await createSessionToken(user, config.secret, config.sessionTtlSeconds);
  (await cookies()).set(sessionCookieName(), token, sessionCookieOptions(config.sessionTtlSeconds));
  return Response.json(user, { headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } });
}
