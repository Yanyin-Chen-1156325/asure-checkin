const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$/;

export const REQUEST_ID_HEADER = "x-request-id";

export function createRequestId(candidate?: string | null): string {
  if (candidate && REQUEST_ID_PATTERN.test(candidate)) {
    return candidate;
  }

  return crypto.randomUUID();
}
