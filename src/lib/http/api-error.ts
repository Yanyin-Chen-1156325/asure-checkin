import { createRequestId } from "./request-id";

export type ApiErrorBody = Readonly<{
  code: string;
  message: string;
  requestId: string;
}>;

export function apiError(
  status: number,
  code: string,
  message: string,
  requestId = createRequestId(),
): Response {
  const body: ApiErrorBody = { code, message, requestId };
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", "x-request-id": requestId },
  });
}
