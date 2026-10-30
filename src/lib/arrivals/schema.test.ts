import { describe, expect, it } from "vitest";

import { arrivalDateSchema, contactUpdateSchema, walkInInputSchema } from "./schema";

describe("arrival input schemas", () => {
  it("accepts valid local dates and rejects impossible dates", () => {
    expect(arrivalDateSchema.safeParse("2026-10-30").success).toBe(true);
    expect(arrivalDateSchema.safeParse("2026-02-30").success).toBe(false);
  });

  it("normalizes optional walk-in fields", () => {
    expect(walkInInputSchema.parse({ name: "  Test Guest  ", arrivalDate: "2026-10-30" })).toEqual({
      name: "Test Guest", arrivalDate: "2026-10-30", email: "", phone: "", vehicle: "",
    });
  });

  it("allows only contact fields in an update", () => {
    expect(contactUpdateSchema.safeParse({ email: "guest@example.test", phone: "", vehicle: "ABC123" }).success).toBe(true);
    expect(contactUpdateSchema.safeParse({ email: "", phone: "", vehicle: "", name: "Injected" }).success).toBe(false);
  });
});
