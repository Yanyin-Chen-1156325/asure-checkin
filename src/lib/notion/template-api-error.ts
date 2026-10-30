import { apiError } from "../http/api-error";
import { NotionServiceError, toNotionServiceError } from "./errors";

const mapping = {
  configuration: [503, "TEMPLATES_NOT_CONFIGURED", "Agreement template storage is not configured."],
  schema: [409, "TEMPLATE_STATE_OR_SCHEMA_ERROR", "The template state or Notion schema does not allow this operation."],
  access: [503, "NOTION_ACCESS_DENIED", "Agreement template storage is unavailable."],
  not_found: [404, "TEMPLATE_NOT_FOUND", "The agreement template was not found."],
  unavailable: [503, "NOTION_UNAVAILABLE", "Agreement template storage is temporarily unavailable."],
  invalid_response: [502, "NOTION_INVALID_RESPONSE", "Agreement template storage returned invalid data."],
} as const;

export function templateApiError(error: unknown, requestId: string): Response {
  const notionError = error instanceof NotionServiceError ? error : toNotionServiceError(error);
  const [status, code, message] = mapping[notionError.kind];
  console.error("Notion template operation failed", { requestId, kind: notionError.kind });
  return apiError(status, code, message, requestId);
}
