import { authorizeApiRequest } from "@/lib/auth/api-authorization";
import { arrivalDateSchema } from "@/lib/arrivals/schema";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/http/request-id";
import { apiError } from "@/lib/http/api-error";
import { notionApiError } from "@/lib/notion/api-error-response";
import { getGuestsRepository } from "@/lib/notion/guests-repository";

export async function GET(request: Request) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const authorization = await authorizeApiRequest(request, requestId);
  if (authorization.response) return authorization.response;
  const date = arrivalDateSchema.safeParse(new URL(request.url).searchParams.get("date"));
  if (!date.success) return apiError(400, "INVALID_DATE", "Use a valid arrival date in YYYY-MM-DD format.", requestId);
  try {
    const arrivals = await getGuestsRepository().listByArrivalDate(date.data);
    return Response.json({ arrivals }, { headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } });
  } catch (error) {
    return notionApiError(error, requestId);
  }
}
