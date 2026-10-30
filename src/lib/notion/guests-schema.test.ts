import type { DataSourceObjectResponse } from "@notionhq/client";
import { describe, expect, it } from "vitest";

import { guestSchemaProblems, resolveGuestSchema } from "./guests-schema";

function properties(): DataSourceObjectResponse["properties"] {
  return {
    "Name": { id: "name", name: "Name", type: "title" }, "Arrival Date": { id: "date", name: "Arrival Date", type: "date" },
    "Type": { id: "type", name: "Type", type: "select", select: { options: ["Walk-In", "Booking"].map((name) => ({ id: name, name, color: "default", description: null })) } },
    "Email": { id: "email", name: "Email", type: "email" }, "Phone": { id: "phone", name: "Phone", type: "phone_number" },
    "Vehicle": { id: "vehicle", name: "Vehicle", type: "rich_text" },
    "Signing Status": { id: "status", name: "Signing Status", type: "status", status: { options: ["Not started", "Pending", "Done"].map((name) => ({ id: name, name, color: "default", description: null })), groups: [] } },
  } as unknown as DataSourceObjectResponse["properties"];
}

describe("Arrivals schema", () => {
  it("accepts Name title and Type options", () => {
    expect(guestSchemaProblems(properties())).toEqual([]);
    expect(resolveGuestSchema(properties())).toEqual({ emailType: "email", statusType: "status", initialStatusName: "Not started" });
  });

  it("requires both Type options", () => {
    const value = properties();
    value["Type"] = { id: "type", name: "Type", type: "select", select: { options: [{ id: "Booking", name: "Booking", color: "default", description: null }] } } as never;
    expect(guestSchemaProblems(value)).toContain("Type is missing options: Walk-In");
  });
});
