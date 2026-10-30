import { authorizeApiRequest } from "@/lib/auth/api-authorization";
import { apiError } from "@/lib/http/api-error";
import { rejectUntrustedOrigin } from "@/lib/http/request-origin";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/http/request-id";
import { getTemplatesRepository } from "@/lib/notion/templates-repository";
import { templateApiError } from "@/lib/notion/template-api-error";
import { readJson } from "@/lib/templates/api-helpers";
import { createTemplateInputSchema } from "@/lib/templates/schema";

export async function GET(request: Request) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const authorization = await authorizeApiRequest(request, requestId);
  if (authorization.response) return authorization.response;
  try {
    const templates = await getTemplatesRepository().list(authorization.session.role === "owner");
    return Response.json({ templates }, { headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } });
  } catch (error) { return templateApiError(error, requestId); }
}

export async function POST(request: Request) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const authorization = await authorizeApiRequest(request, requestId, ["owner"]);
  if (authorization.response) return authorization.response;
  const originError = rejectUntrustedOrigin(request, requestId);
  if (originError) return originError;
  const json = await readJson(request, requestId);
  if (json.error) return json.error;
  const input = createTemplateInputSchema.safeParse(json.value);
  if (!input.success) return apiError(400, "INVALID_TEMPLATE", input.error.issues[0]?.message ?? "Check the template name.", requestId);
  try {
    const template = await getTemplatesRepository().createDraft(input.data.name);
    return Response.json({ template }, { status: 201, headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } });
  } catch (error) { return templateApiError(error, requestId); }
}
