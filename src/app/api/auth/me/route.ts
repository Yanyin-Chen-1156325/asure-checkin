import { authorizeApiRequest } from "@/lib/auth/api-authorization";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/http/request-id";

export async function GET(request: Request) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const authorization = await authorizeApiRequest(request, requestId);
  if (authorization.response) return authorization.response;
  const { username, role, expiresAt } = authorization.session;
  return Response.json(
    { username, role, expiresAt },
    { headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } },
  );
}
