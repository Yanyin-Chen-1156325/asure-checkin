import { NotionServiceError, toNotionServiceError } from "./errors";
import { apiError } from "@/lib/http/api-error";

const mapping = {
  configuration: [503, "NOTION_NOT_CONFIGURED", "Arrival storage is not configured."],
  schema: [503, "NOTION_SCHEMA_MISMATCH", "The arrivals data source schema needs attention."],
  access: [503, "NOTION_ACCESS_DENIED", "The arrivals data source is unavailable."],
  not_found: [404, "GUEST_NOT_FOUND", "The guest record was not found."],
  unavailable: [503, "NOTION_UNAVAILABLE", "Arrival storage is temporarily unavailable. Try again."],
  invalid_response: [502, "NOTION_INVALID_RESPONSE", "Arrival storage returned invalid data."],
} as const;

export function notionApiError(error: unknown, requestId: string): Response {
  const notionError = error instanceof NotionServiceError ? error : toNotionServiceError(error);
  const [status, code, message] = mapping[notionError.kind];
  console.error("Notion arrivals operation failed", { requestId, kind: notionError.kind });
  return apiError(status, code, message, requestId);
}
