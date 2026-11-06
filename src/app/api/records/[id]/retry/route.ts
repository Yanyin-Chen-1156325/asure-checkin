import { authorizeApiRequest } from "@/lib/auth/api-authorization";
import { apiError } from "@/lib/http/api-error";
import { rejectUntrustedOrigin } from "@/lib/http/request-origin";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/http/request-id";
import { getGuestsRepository } from "@/lib/notion/guests-repository";
import { retrySigning } from "@/lib/signing/workflow";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const authorization = await authorizeApiRequest(request, requestId);
  if (authorization.response) return authorization.response;
  const originError = rejectUntrustedOrigin(request, requestId);
  if (originError) return originError;
  const { id } = await context.params;
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) return apiError(400, "INVALID_RECORD_ID", "The record ID is invalid.", requestId);
  try {
    const record = await getGuestsRepository().getRecord(id);
    if (!record.signingId || record.signingStatus !== "needs_attention") return apiError(409, "NOT_RETRYABLE", "This record does not need recovery.", requestId);
    await retrySigning(record.signingId);
    return Response.json({ complete: true }, { headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } });
  } catch {
    console.error("Signing recovery failed", { requestId, guestId: id });
    return apiError(503, "RECOVERY_FAILED", "Recovery did not complete. The operation remains available for another retry.", requestId);
  }
}
