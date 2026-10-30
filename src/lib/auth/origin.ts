export function isTrustedRequestOrigin(request: Request, configuredBaseUrl: string): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const suppliedOrigin = new URL(origin).origin;
    const requestOrigin = new URL(request.url).origin;
    const configuredOrigin = new URL(configuredBaseUrl).origin;
    return suppliedOrigin === requestOrigin || suppliedOrigin === configuredOrigin;
  } catch {
    return false;
  }
}
