import type { DataSourceObjectResponse } from "@notionhq/client";

import { NotionServiceError } from "./errors";

const TEMPLATE_PROPERTIES = {
  "Name": "title",
  "Template ID": "rich_text",
  "Version": "number",
  "Status": "select",
} as const;

export function templateSchemaProblems(properties: DataSourceObjectResponse["properties"]): string[] {
  const problems: string[] = [];
  for (const [name, expected] of Object.entries(TEMPLATE_PROPERTIES)) {
    const actual = properties[name]?.type;
    if (!actual) problems.push(`Missing property: ${name}`);
    else if (actual !== expected) problems.push(`${name} must be ${expected}, not ${actual}`);
  }
  const status = properties["Status"];
  if (status?.type === "select") {
    const available = new Set(status.select.options.map((option) => option.name.toLowerCase()));
    const missing = ["draft", "active", "archived"].filter((option) => !available.has(option));
    if (missing.length) problems.push(`Status is missing options: ${missing.join(", ")}`);
  }
  return problems;
}

export function assertTemplateSchema(properties: DataSourceObjectResponse["properties"]): void {
  const problems = templateSchemaProblems(properties);
  if (problems.length) throw new NotionServiceError("schema", `Agreement Templates data source schema mismatch: ${problems.join("; ")}`);
}
