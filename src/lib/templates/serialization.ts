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

function upgradeLegacyContent(value: unknown): unknown {
  if (typeof value !== "object" || value === null || !("type" in value) || !("content" in value) || value.type !== "doc" || !Array.isArray(value.content)) return value;
  const types = value.content.map((block) => typeof block === "object" && block !== null && "type" in block ? block.type : undefined);
  if (types.includes("guestFields") || types.includes("acknowledgement") || types.includes("signature")) return value;
  const content = value.content.filter((block) => {
    const serialized = JSON.stringify(block);
    return !serialized.includes('"key":"guest.') && !serialized.includes('"key":"signature.');
  });
  const titleIndex = content.findIndex((block) => typeof block === "object" && block !== null && "type" in block && block.type === "heading");
  content.splice(titleIndex < 0 ? 0 : titleIndex + 1, 0, { type: "guestFields" });
  content.push({ type: "acknowledgement" }, { type: "signature" });
  return { ...value, content };
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
  return templateContentSchema.parse(upgradeLegacyContent(JSON.parse(json) as unknown));
}
