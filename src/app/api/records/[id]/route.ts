import { authorizeApiRequest } from "@/lib/auth/api-authorization";
import { apiError } from "@/lib/http/api-error";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/http/request-id";
import { notionApiError } from "@/lib/notion/api-error-response";
import { getGuestsRepository } from "@/lib/notion/guests-repository";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const authorization = await authorizeApiRequest(request, requestId);
  if (authorization.response) return authorization.response;
  const { id } = await context.params;
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) return apiError(400, "INVALID_RECORD_ID", "The record ID is invalid.", requestId);
  try { return Response.json({ record: await getGuestsRepository().getRecord(id) }, { headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } }); }
  catch (error) { return notionApiError(error, requestId); }
}
