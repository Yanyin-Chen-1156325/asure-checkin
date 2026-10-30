import { authorizeApiRequest } from "@/lib/auth/api-authorization";
import { apiError } from "@/lib/http/api-error";
import { rejectUntrustedOrigin } from "@/lib/http/request-origin";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/http/request-id";
import { getTemplatesRepository } from "@/lib/notion/templates-repository";
import { templateApiError } from "@/lib/notion/template-api-error";
import { readJson, validateNotionPageId } from "@/lib/templates/api-helpers";
import { saveDraftInputSchema } from "@/lib/templates/schema";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const authorization = await authorizeApiRequest(request, requestId);
  if (authorization.response) return authorization.response;
  const { id } = await context.params;
  const idError = validateNotionPageId(id, requestId);
  if (idError) return idError;
  try {
    const template = await getTemplatesRepository().get(id);
    if (authorization.session.role === "staff" && template.status !== "active") {
      return apiError(403, "FORBIDDEN", "Only active agreements are available.", requestId);
    }
    return Response.json({ template }, { headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } });
  } catch (error) { return templateApiError(error, requestId); }
}

export async function PUT(request: Request, context: Context) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const authorization = await authorizeApiRequest(request, requestId, ["owner"]);
  if (authorization.response) return authorization.response;
  const originError = rejectUntrustedOrigin(request, requestId);
  if (originError) return originError;
  const { id } = await context.params;
  const idError = validateNotionPageId(id, requestId);
  if (idError) return idError;
  const json = await readJson(request, requestId);
  if (json.error) return json.error;
  const input = saveDraftInputSchema.safeParse(json.value);
  if (!input.success) return apiError(400, "INVALID_TEMPLATE_CONTENT", input.error.issues[0]?.message ?? "Check the agreement content.", requestId);
  try {
    const template = await getTemplatesRepository().saveDraft(id, input.data);
    return Response.json({ template }, { headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } });
  } catch (error) { return templateApiError(error, requestId); }
}
