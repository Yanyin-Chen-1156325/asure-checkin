import type { DataSourceObjectResponse } from "@notionhq/client";
import { describe, expect, it } from "vitest";

import { templateSchemaProblems } from "./templates-schema";

function properties(): DataSourceObjectResponse["properties"] {
  return {
    "Name": { id: "name", name: "Name", type: "title" },
    "Template ID": { id: "tid", name: "Template ID", type: "rich_text" },
    "Version": { id: "version", name: "Version", type: "number" },
    "Status": { id: "status", name: "Status", type: "select", select: { options: ["draft", "active", "archived"].map((name) => ({ id: name, name, color: "default" })) } },
    "Created/Updated At": { id: "date", name: "Created/Updated At", type: "date" },
  } as unknown as DataSourceObjectResponse["properties"];
}

describe("Agreement Templates schema", () => {
  it("accepts the documented schema", () => expect(templateSchemaProblems(properties())).toEqual([]));

  it("reports missing status options", () => {
    const value = properties();
    value["Status"] = { id: "status", name: "Status", type: "select", select: { options: [{ id: "draft", name: "draft", color: "default" }] } } as never;
    expect(templateSchemaProblems(value)).toContain("Status is missing options: active, archived");
  });
});
