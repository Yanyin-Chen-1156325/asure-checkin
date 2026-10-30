import { authorizeApiRequest } from "@/lib/auth/api-authorization";
import { walkInInputSchema } from "@/lib/arrivals/schema";
import { apiError } from "@/lib/http/api-error";
import { rejectUntrustedOrigin } from "@/lib/http/request-origin";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/http/request-id";
import { notionApiError } from "@/lib/notion/api-error-response";
import { getGuestsRepository } from "@/lib/notion/guests-repository";

export async function POST(request: Request) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const authorization = await authorizeApiRequest(request, requestId);
  if (authorization.response) return authorization.response;
  const originError = rejectUntrustedOrigin(request, requestId);
  if (originError) return originError;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError(400, "INVALID_JSON", "The request body must be valid JSON.", requestId); }
  const input = walkInInputSchema.safeParse(body);
  if (!input.success) return apiError(400, "INVALID_WALK_IN", input.error.issues[0]?.message ?? "Check the guest details.", requestId);
  try {
    const arrival = await getGuestsRepository().createWalkIn(input.data);
    return Response.json({ arrival }, { status: 201, headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } });
  } catch (error) {
    return notionApiError(error, requestId);
  }
}
