import { describe, expect, it } from "vitest";

import { isLikelyPlaceholderPhone, isOtaRelayEmail, publicEmail, publicPhone } from "./contact-hygiene";

describe("contact hygiene", () => {
  it.each(["guest@expedia.com", "relay@booking.example", "x@agoda-mail.com", "x@hotels.com"])("hides OTA email %s", (email) => {
    expect(isOtaRelayEmail(email)).toBe(true);
    expect(publicEmail(email)).toBe("");
  });

  it("keeps a direct guest email", () => expect(publicEmail("guest@example.com")).toBe("guest@example.com"));

  it.each(["0123456789", "1234567890", "9876543210", "1111111111"])("hides placeholder phone %s", (phone) => {
    expect(isLikelyPlaceholderPhone(phone)).toBe(true);
    expect(publicPhone(phone)).toBe("");
  });

  it("keeps a plausible phone", () => expect(publicPhone("021 000 1001")).toBe("021 000 1001"));
});
