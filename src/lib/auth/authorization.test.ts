import { describe, expect, it } from "vitest";

import { isRoleAllowed } from "./authorization";

describe("role authorization", () => {
  it("allows both fixed roles on shared operations", () => {
    expect(isRoleAllowed("owner", ["owner", "staff"])).toBe(true);
    expect(isRoleAllowed("staff", ["owner", "staff"])).toBe(true);
  });

  it("denies staff on owner-only operations", () => {
    expect(isRoleAllowed("staff", ["owner"])).toBe(false);
  });
});
