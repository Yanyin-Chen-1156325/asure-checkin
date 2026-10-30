import { describe, expect, it } from "vitest";

import { createRequestId } from "./request-id";

describe("createRequestId", () => {
  it("keeps a valid upstream request ID", () => {
    expect(createRequestId("edge_01HZZZZZ-example")).toBe("edge_01HZZZZZ-example");
  });

  it("replaces missing or unsafe values", () => {
    expect(createRequestId()).toMatch(/^[0-9a-f-]{36}$/);
    expect(createRequestId("bad value\nheader")).toMatch(/^[0-9a-f-]{36}$/);
  });
});
