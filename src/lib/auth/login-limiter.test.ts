import { describe, expect, it } from "vitest";

import { LoginLimiter, loginClientKey } from "./login-limiter";

describe("LoginLimiter", () => {
  it("blocks after the configured number of failures and recovers", () => {
    const limiter = new LoginLimiter(2, 1_000, 2_000);
    expect(limiter.recordFailure("client", 1_000).allowed).toBe(true);
    expect(limiter.recordFailure("client", 1_100)).toEqual({ allowed: false, retryAfterSeconds: 2 });
    expect(limiter.check("client", 3_101).allowed).toBe(true);
  });

  it("does not accept arbitrary forwarded values as keys", () => {
    const request = new Request("https://example.test", { headers: { "x-forwarded-for": "attacker input" } });
    expect(loginClientKey(request)).toBe("unknown");
  });
});
