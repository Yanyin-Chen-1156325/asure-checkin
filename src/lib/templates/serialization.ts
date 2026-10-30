import "server-only";

import { templateContentSchema, type TemplateContent } from "./content";

const FORMAT_MARKER = "ASURE_TEMPLATE_JSON_V1";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalize(item)]));
  }
  return value;
}

export function canonicalTemplateJson(content: TemplateContent): string {
  return JSON.stringify(canonicalize(templateContentSchema.parse(content)));
}

export function serializeTemplateContent(content: TemplateContent): string {
  const encoded = Buffer.from(canonicalTemplateJson(content), "utf8").toString("base64url");
  return `# Application-managed agreement content\n\n> Do not edit this page body directly. Use the motel application.\n\n\`\`\`text\n${FORMAT_MARKER}\n${encoded}\n\`\`\``;
}

export function deserializeTemplateContent(markdown: string): TemplateContent {
  const match = new RegExp(`${FORMAT_MARKER}\\s+([A-Za-z0-9_-]+)`).exec(markdown);
  if (!match?.[1]) throw new Error("Agreement content marker is missing.");
  const json = Buffer.from(match[1], "base64url").toString("utf8");
  return templateContentSchema.parse(JSON.parse(json) as unknown);
}
