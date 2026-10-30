import type { DataSourceObjectResponse } from "@notionhq/client";

import { NotionServiceError } from "./errors";

type Properties = DataSourceObjectResponse["properties"];

export type GuestSchemaMapping = Readonly<{
  emailType: "email" | "rich_text";
  statusType: "select" | "status";
  initialStatusName: string;
}>;

export function guestSchemaProblems(properties: Properties): string[] {
  const problems: string[] = [];
  const required: Array<[string, readonly string[]]> = [
    ["Name", ["title"]], ["Arrival Date", ["date"]], ["Type", ["select"]],
    ["Email", ["email", "rich_text"]], ["Phone", ["phone_number"]], ["Vehicle", ["rich_text"]],
    ["Signing Status", ["status", "select"]],
  ];
  for (const [name, expected] of required) {
    const actual = properties[name]?.type;
    if (!actual) problems.push(`Missing property: ${name}`);
    else if (!expected.includes(actual)) problems.push(`${name} must be ${expected.join(" or ")}, not ${actual}`);
  }
  const type = properties["Type"];
  if (type?.type === "select") {
    const available = new Set(type.select.options.map((option) => option.name));
    const missing = ["Walk-In", "Booking"].filter((option) => !available.has(option));
    if (missing.length) problems.push(`Type is missing options: ${missing.join(", ")}`);
  }
  const status = properties["Signing Status"];
  if (status?.type === "status" && !status.status.options.some((option) => option.name === "Not started")) {
    problems.push("Signing Status is missing option: Not started");
  }
  if (status?.type === "select" && !status.select.options.some((option) => option.name === "pending")) {
    problems.push("Signing Status is missing option: pending");
  }
  return problems;
}

export function resolveGuestSchema(properties: Properties): GuestSchemaMapping {
  const problems = guestSchemaProblems(properties);
  if (problems.length) throw new NotionServiceError("schema", `Arrivals data source schema mismatch: ${problems.join("; ")}`);
  const statusType = properties["Signing Status"]?.type === "status" ? "status" : "select";
  return {
    emailType: properties["Email"]?.type === "rich_text" ? "rich_text" : "email",
    statusType,
    initialStatusName: statusType === "status" ? "Not started" : "pending",
  };
}
