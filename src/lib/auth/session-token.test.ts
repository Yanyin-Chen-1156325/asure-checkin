import { describe, expect, it } from "vitest";

import { createSessionToken, verifySessionToken } from "./session-token";

const secret = "test-secret-that-is-at-least-thirty-two-bytes";

describe("session tokens", () => {
  it("round-trips the minimal authenticated identity", async () => {
    const token = await createSessionToken({ username: "owner", role: "owner" }, secret, 3_600);
    const session = await verifySessionToken(token, secret);
    expect(session).toMatchObject({ username: "owner", role: "owner" });
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken({ username: "staff", role: "staff" }, secret, 3_600);
    await expect(verifySessionToken(token, `${secret}-different`)).resolves.toBeNull();
  });

  it("rejects an expired token", async () => {
    const yesterday = new Date(Date.now() - 86_400_000);
    const token = await createSessionToken({ username: "staff", role: "staff" }, secret, 60, yesterday);
    await expect(verifySessionToken(token, secret)).resolves.toBeNull();
  });
});
