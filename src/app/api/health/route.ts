import { createRequestId, REQUEST_ID_HEADER } from "@/lib/http/request-id";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  return Response.json(
    { status: "ok", requestId },
    { headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } },
  );
}
