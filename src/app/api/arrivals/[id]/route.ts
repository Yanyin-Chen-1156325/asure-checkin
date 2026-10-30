import { authorizeApiRequest } from "@/lib/auth/api-authorization";
import { contactUpdateSchema } from "@/lib/arrivals/schema";
import { apiError } from "@/lib/http/api-error";
import { rejectUntrustedOrigin } from "@/lib/http/request-origin";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/http/request-id";
import { notionApiError } from "@/lib/notion/api-error-response";
import { getGuestsRepository } from "@/lib/notion/guests-repository";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const authorization = await authorizeApiRequest(request, requestId);
  if (authorization.response) return authorization.response;
  const originError = rejectUntrustedOrigin(request, requestId);
  if (originError) return originError;
  const { id } = await context.params;
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) return apiError(400, "INVALID_GUEST_ID", "The guest record ID is invalid.", requestId);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError(400, "INVALID_JSON", "The request body must be valid JSON.", requestId); }
  const input = contactUpdateSchema.safeParse(body);
  if (!input.success) return apiError(400, "INVALID_CONTACT", input.error.issues[0]?.message ?? "Check the contact details.", requestId);
  try {
    const arrival = await getGuestsRepository().updateContact(id, input.data);
    return Response.json({ arrival }, { headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } });
  } catch (error) {
    return notionApiError(error, requestId);
  }
}
