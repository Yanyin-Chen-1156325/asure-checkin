import { isTrustedRequestOrigin } from "@/lib/auth/origin";
import { serverEnvironment } from "@/lib/env/server";
import { apiError } from "./api-error";

export function rejectUntrustedOrigin(request: Request, requestId: string): Response | null {
  return isTrustedRequestOrigin(request, serverEnvironment.APP_BASE_URL)
    ? null
    : apiError(403, "INVALID_ORIGIN", "The request could not be accepted.", requestId);
}
