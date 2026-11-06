import { authorizeApiRequest } from "@/lib/auth/api-authorization";
import { signingStatusSchema } from "@/lib/arrivals/schema";
import { apiError } from "@/lib/http/api-error";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/http/request-id";
import { notionApiError } from "@/lib/notion/api-error-response";
import { getGuestsRepository } from "@/lib/notion/guests-repository";

export async function GET(request: Request) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const authorization = await authorizeApiRequest(request, requestId);
  if (authorization.response) return authorization.response;
  const search = new URL(request.url).searchParams;
  const date = search.get("date") || undefined;
  const name = search.get("name")?.trim().slice(0, 200) || undefined;
  const parsedStatus = signingStatusSchema.safeParse(search.get("status"));
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return apiError(400, "INVALID_DATE", "Use YYYY-MM-DD for the arrival date.", requestId);
  try {
    const records = await getGuestsRepository().listRecords({ date, name, status: parsedStatus.success ? parsedStatus.data : undefined });
    return Response.json({ records }, { headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } });
  } catch (error) { return notionApiError(error, requestId); }
}
