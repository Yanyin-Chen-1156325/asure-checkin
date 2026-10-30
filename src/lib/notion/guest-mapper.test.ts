import type { PageObjectResponse } from "@notionhq/client";
import { describe, expect, it } from "vitest";

import { mapGuestPage, walkInProperties } from "./guest-mapper";
import type { GuestSchemaMapping } from "./guests-schema";

const rich = (value: string) => [{ type: "text", plain_text: value, href: null, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: "default" }, text: { content: value, link: null } }];

function page(email = "guest@example.com", phone = "021 000 1001", type = "Booking"): PageObjectResponse {
  return { object: "page", id: "11111111-1111-1111-1111-111111111111", url: "https://notion.so/page",
    parent: { type: "data_source_id", data_source_id: "arrivals", database_id: "database" }, properties: {
      "Name": { id: "name", type: "title", title: rich("Guest") }, "Arrival Date": { id: "date", type: "date", date: { start: "2026-10-31", end: null, time_zone: null } },
      "Type": { id: "type", type: "select", select: { id: type, name: type, color: "default" } }, "Email": { id: "email", type: "email", email },
      "Phone": { id: "phone", type: "phone_number", phone_number: phone }, "Vehicle": { id: "vehicle", type: "rich_text", rich_text: [] },
      "Signing Status": { id: "status", type: "status", status: { id: "not-started", name: "Not started", color: "default" } },
    } } as unknown as PageObjectResponse;
}

describe("arrival mapping", () => {
  it("maps Type and hides non-guest contact values", () => {
    expect(mapGuestPage(page("relay@booking.com", "0123456789", "Walk-In"))).toMatchObject({ source: "walk_in", email: "", phone: "" });
  });

  it("creates a walk-in with Name title and Type", () => {
    const mapping: GuestSchemaMapping = { emailType: "email", statusType: "status", initialStatusName: "Not started" };
    const result = walkInProperties({ name: "Walk In", arrivalDate: "2026-10-31", email: "", phone: "", vehicle: "" }, mapping);
    expect(result["Name"]).toEqual({ title: [{ type: "text", text: { content: "Walk In" } }] });
    expect(result["Type"]).toEqual({ select: { name: "Walk-In" } });
  });
});
