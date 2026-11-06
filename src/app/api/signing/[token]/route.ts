import { signingSubmissionSchema } from "@/lib/arrivals/schema";
import { serverEnvironment } from "@/lib/env/server";
import { apiError } from "@/lib/http/api-error";
import { rejectUntrustedOrigin } from "@/lib/http/request-origin";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/http/request-id";
import { completeSigning, SigningWorkflowError } from "@/lib/signing/workflow";
import { verifySigningToken } from "@/lib/signing/token";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const originError = rejectUntrustedOrigin(request, requestId);
  if (originError) return originError;
  const { token } = await context.params;
  const claims = serverEnvironment.AUTH_SECRET ? await verifySigningToken(token, serverEnvironment.AUTH_SECRET) : null;
  if (!claims) return apiError(401, "INVALID_SIGNING_LINK", "This signing link is invalid or has expired.", requestId);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError(400, "INVALID_JSON", "The request body must be valid JSON.", requestId); }
  const input = signingSubmissionSchema.safeParse(body);
  if (!input.success) return apiError(400, "INVALID_SIGNATURE", input.error.issues[0]?.message ?? "Check the registration card.", requestId);
  try {
    await completeSigning(claims, input.data);
    return Response.json({ complete: true }, { headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } });
  } catch (error) {
    if (error instanceof SigningWorkflowError) {
      const status = error.code === "in_progress" ? 409 : error.code === "too_large" ? 413 : 409;
      return apiError(status, `SIGNING_${error.code.toUpperCase()}`, error.message, requestId);
    }
    console.error("Signing workflow failed", { requestId, signingId: claims.jti, error: error instanceof Error ? error.message : "Unknown error" });
    return apiError(503, "SIGNING_RETRY_REQUIRED", "The registration was accepted but could not be finalized. Keep this page open and try again, or ask reception for help.", requestId);
  }
}

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const { token } = await context.params;
  const claims = serverEnvironment.AUTH_SECRET ? await verifySigningToken(token, serverEnvironment.AUTH_SECRET) : null;
  if (!claims) return apiError(401, "INVALID_SIGNING_LINK", "This signing link is invalid or has expired.", requestId);
  const { getSigningOperationsRepository } = await import("@/lib/notion/signing-operations-repository");
  try {
    const operation = await getSigningOperationsRepository().get(claims.jti);
    return Response.json({ state: operation.state, complete: operation.state === "completed", retryable: operation.state === "accepted" || operation.state === "pdf_generated" || operation.state === "pdf_uploaded" || operation.state === "needs_attention" }, { headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } });
  } catch {
    return apiError(404, "SIGNING_NOT_FOUND", "The signing operation was not found.", requestId);
  }
}
