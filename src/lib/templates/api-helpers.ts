import { apiError } from "../http/api-error";

export function validateNotionPageId(id: string, requestId: string): Response | null {
  return /^[0-9a-f-]{32,36}$/i.test(id) ? null : apiError(400, "INVALID_TEMPLATE_ID", "The template ID is invalid.", requestId);
}

export async function readJson(request: Request, requestId: string): Promise<{ value: unknown; error?: never } | { value?: never; error: Response }> {
  try { return { value: await request.json() }; }
  catch { return { error: apiError(400, "INVALID_JSON", "The request body must be valid JSON.", requestId) }; }
}
