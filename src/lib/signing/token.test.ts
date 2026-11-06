import { describe, expect, it } from "vitest";

import { createSigningToken, verifySigningToken } from "./token";

describe("signing tokens", () => {
  it("binds a short-lived token to the guest, date, and immutable template page", async () => {
    const secret = "a-secure-test-secret-that-is-at-least-32-bytes";
    const token = await createSigningToken({ signingId: crypto.randomUUID(), arrivalId: "guest-page", arrivalDate: "2026-10-31", templatePageId: "template-page" }, secret);
    const claims = await verifySigningToken(token, secret);
    expect(claims).toMatchObject({ arrivalId: "guest-page", arrivalDate: "2026-10-31", templatePageId: "template-page" });
    expect(claims!.exp - claims!.iat).toBe(1_800);
    await expect(verifySigningToken(token, "wrong-secret-that-is-also-long-enough")).resolves.toBeNull();
  });
});
