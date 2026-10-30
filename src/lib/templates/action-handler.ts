import "server-only";

import { authorizeApiRequest } from "../auth/api-authorization";
import { rejectUntrustedOrigin } from "../http/request-origin";
import { createRequestId, REQUEST_ID_HEADER } from "../http/request-id";
import { templateApiError } from "../notion/template-api-error";
import { getTemplatesRepository } from "../notion/templates-repository";
import { validateNotionPageId } from "./api-helpers";

type TemplateAction = "publish" | "duplicate" | "archive";

export async function handleTemplateAction(request: Request, id: string, action: TemplateAction): Promise<Response> {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const authorization = await authorizeApiRequest(request, requestId, ["owner"]);
  if (authorization.response) return authorization.response;
  const originError = rejectUntrustedOrigin(request, requestId);
  if (originError) return originError;
  const idError = validateNotionPageId(id, requestId);
  if (idError) return idError;
  try {
    const repository = getTemplatesRepository();
    const template = action === "publish" ? await repository.publish(id)
      : action === "duplicate" ? await repository.duplicate(id)
      : await repository.archive(id);
    return Response.json({ template }, { headers: { "cache-control": "no-store", [REQUEST_ID_HEADER]: requestId } });
  } catch (error) { return templateApiError(error, requestId); }
}
