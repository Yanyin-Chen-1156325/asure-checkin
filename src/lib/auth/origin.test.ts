import { describe, expect, it } from "vitest";

import { isTrustedRequestOrigin } from "./origin";

describe("request origin validation", () => {
  it("accepts same-origin requests", () => {
    const request = new Request("https://motel.example/api/auth/logout", { headers: { origin: "https://motel.example" } });
    expect(isTrustedRequestOrigin(request, "https://motel.example")).toBe(true);
  });

  it("rejects missing and cross-site origins", () => {
    expect(isTrustedRequestOrigin(new Request("https://motel.example/api/auth/logout"), "https://motel.example")).toBe(false);
    const crossSite = new Request("https://motel.example/api/auth/logout", { headers: { origin: "https://evil.example" } });
    expect(isTrustedRequestOrigin(crossSite, "https://motel.example")).toBe(false);
  });
});
