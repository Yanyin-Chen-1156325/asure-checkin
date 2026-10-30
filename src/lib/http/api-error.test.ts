import { describe, expect, it } from "vitest";

import { apiError } from "./api-error";

describe("apiError", () => {
  it("returns the shared safe error contract", async () => {
    const response = apiError(400, "INVALID_INPUT", "Check the supplied fields.", "request_test_123");

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      code: "INVALID_INPUT",
      message: "Check the supplied fields.",
      requestId: "request_test_123",
    });
  });
});
