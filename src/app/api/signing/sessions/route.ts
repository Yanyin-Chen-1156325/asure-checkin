import { authorizeApiRequest } from "@/lib/auth/api-authorization";
import { serverEnvironment } from "@/lib/env/server";
import { apiError } from "@/lib/http/api-error";
import { rejectUntrustedOrigin } from "@/lib/http/request-origin";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/http/request-id";
import { getGuestsRepository } from "@/lib/notion/guests-repository";
import { getTemplatesRepository } from "@/lib/notion/templates-repository";
import { getSigningOperationsRepository } from "@/lib/notion/signing-operations-repository";
import { createPreparedSnapshot } from "@/lib/signing/snapshot";
import { createSigningSessionSchema } from "@/lib/signing/schema";
import { createSigningToken } from "@/lib/signing/token";

export async function POST(request: Request) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const authorization = await authorizeApiRequest(request, requestId);
  if (authorization.response) return authorization.response;
  const originError = rejectUntrustedOrigin(request, requestId);
  if (originError) return originError;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError(400, "INVALID_JSON", "The request body must be valid JSON.", requestId); }
  const input = createSigningSessionSchema.safeParse(body);
  if (!input.success) return apiError(400, "INVALID_SIGNING_SESSION", input.error.issues[0]?.message ?? "Check the signing selection.", requestId);
  try {
    const template = await getTemplatesRepository().get(input.data.templatePageId);
    if (template.status !== "active") return apiError(409, "TEMPLATE_NOT_ACTIVE", "Select an active agreement template.", requestId);
    const guests = getGuestsRepository();
    const arrival = input.data.arrivalId ? await guests.get(input.data.arrivalId) : null;
    if (arrival) {
      if (arrival.arrivalDate !== input.data.arrivalDate) return apiError(409, "ARRIVAL_DATE_MISMATCH", "Reload the arrivals list and try again.", requestId);
      if (arrival.signingStatus === "signed") return apiError(409, "ALREADY_SIGNED", "This guest already has a signed registration card.", requestId);
    }
    const secret = serverEnvironment.AUTH_SECRET;
    if (!secret) throw new Error("AUTH_SECRET is not configured.");
    const signingId = crypto.randomUUID();
    const snapshot = createPreparedSnapshot({ signingId, templateId: template.templateId, templateVersion: template.version, templateName: template.name, content: template.content,
      guest: { name: arrival?.name ?? "", email: arrival?.email ?? "", phone: arrival?.phone ?? "", vehicle: arrival?.vehicle ?? "", arrivalDate: input.data.arrivalDate, source: arrival ? arrival.source : "walk_in" } });
    const operations = getSigningOperationsRepository();
    const operation = await operations.createPrepared(snapshot);
    if (arrival) {
      await operations.setGuestPageId(operation, arrival.id);
      await guests.markSigningStarted(arrival.id, signingId);
    }
    const token = await createSigningToken({ ...input.data, signingId }, secret);
    return Response.json({ url: `/sign/${token}` }, { status: 201, headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } });
  } catch (error) {
    console.error("Signing session creation failed", { requestId, error: error instanceof Error ? error.message : "Unknown error" });
    return apiError(502, "SIGNING_SESSION_FAILED", "The signing session could not be created.", requestId);
  }
}
