import { APIResponseError, isHTTPResponseError } from "@notionhq/client";

export type NotionServiceErrorKind = "configuration" | "schema" | "access" | "not_found" | "unavailable" | "invalid_response";

export class NotionServiceError extends Error {
  constructor(public readonly kind: NotionServiceErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NotionServiceError";
  }
}

export function toNotionServiceError(error: unknown): NotionServiceError {
  if (error instanceof NotionServiceError) return error;
  if (error instanceof Error && error.message.startsWith("Missing required Notion configuration")) {
    return new NotionServiceError("configuration", "Notion is not configured.", { cause: error });
  }
  if (APIResponseError.isAPIResponseError(error)) {
    if (error.status === 401 || error.status === 403) return new NotionServiceError("access", "Notion access is not authorized.", { cause: error });
    if (error.status === 404) return new NotionServiceError("not_found", "The Notion record was not found.", { cause: error });
    if ([409, 429, 500, 502, 503, 504, 529].includes(error.status)) {
      return new NotionServiceError("unavailable", "Notion is temporarily unavailable.", { cause: error });
    }
  }
  if (isHTTPResponseError(error)) return new NotionServiceError("unavailable", "Notion returned an unexpected response.", { cause: error });
  return new NotionServiceError("unavailable", "Notion could not be reached.", { cause: error });
}
