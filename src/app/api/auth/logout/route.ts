import { cookies } from "next/headers";

import { sessionCookieName, sessionCookieOptions } from "@/lib/auth/cookie";
import { isTrustedRequestOrigin } from "@/lib/auth/origin";
import { serverEnvironment } from "@/lib/env/server";
import { apiError } from "@/lib/http/api-error";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/http/request-id";

export async function POST(request: Request) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  if (!isTrustedRequestOrigin(request, serverEnvironment.APP_BASE_URL)) {
    return apiError(403, "INVALID_ORIGIN", "The request could not be accepted.", requestId);
  }
  (await cookies()).set(sessionCookieName(), "", { ...sessionCookieOptions(0), expires: new Date(0) });
  return Response.json({ success: true }, { headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } });
}
