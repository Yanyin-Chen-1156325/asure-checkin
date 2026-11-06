import { authorizeApiRequest } from "@/lib/auth/api-authorization";
import { rejectUntrustedOrigin } from "@/lib/http/request-origin";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/http/request-id";
import { getTemplatesRepository } from "@/lib/notion/templates-repository";
import { templateApiError } from "@/lib/notion/template-api-error";

export async function POST(request: Request) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const authorization = await authorizeApiRequest(request, requestId);
  if (authorization.response) return authorization.response;
  const originError = rejectUntrustedOrigin(request, requestId);
  if (originError) return originError;
  try {
    const template = await getTemplatesRepository().ensureDefaultTemplate();
    return Response.json({ template }, { headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } });
  } catch (error) {
    return templateApiError(error, requestId);
  }
}
