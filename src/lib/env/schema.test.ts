import { describe, expect, it } from "vitest";

import { serverEnvironmentSchema } from "./schema";

describe("serverEnvironmentSchema", () => {
  it("provides safe local defaults without requiring later-step secrets", () => {
    const environment = serverEnvironmentSchema.parse({ NODE_ENV: "test" });
    expect(environment.APP_BASE_URL).toBe("http://localhost:3000");
    expect(environment.APP_TIMEZONE).toBe("Pacific/Auckland");
  });

  it("rejects an invalid application URL", () => {
    expect(() => serverEnvironmentSchema.parse({ APP_BASE_URL: "not a URL" })).toThrow();
  });

  it("bounds the authentication session lifetime", () => {
    expect(() => serverEnvironmentSchema.parse({ AUTH_SESSION_TTL_SECONDS: 60 })).toThrow();
    expect(serverEnvironmentSchema.parse({ AUTH_SESSION_TTL_SECONDS: 3_600 }).AUTH_SESSION_TTL_SECONDS).toBe(3_600);
  });
});
