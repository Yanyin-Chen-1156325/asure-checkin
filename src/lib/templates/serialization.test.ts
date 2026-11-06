import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { defaultTemplateContent } from "./content";
import { canonicalTemplateJson, deserializeTemplateContent, serializeTemplateContent } from "./serialization";

describe("Notion agreement serialization", () => {
  it("round-trips Unicode content exactly", () => {
    const content = { ...defaultTemplateContent, content: [...defaultTemplateContent.content, { type: "paragraph" as const, content: [{ type: "text" as const, text: "Kia ora — welcome 🌿" }] }] };
    expect(deserializeTemplateContent(serializeTemplateContent(content))).toEqual(content);
  });

  it("produces deterministic canonical JSON", () => {
    expect(canonicalTemplateJson(defaultTemplateContent)).toBe(canonicalTemplateJson(structuredClone(defaultTemplateContent)));
  });

  it("upgrades a legacy stored document in memory without overwriting its agreement text", () => {
    const legacy = { type: "doc", content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Legacy agreement" }] }, { type: "paragraph", content: [{ type: "text", text: "Keep this wording." }] }] };
    const encoded = Buffer.from(JSON.stringify(legacy), "utf8").toString("base64url");
    const upgraded = deserializeTemplateContent(`ASURE_TEMPLATE_JSON_V1\n${encoded}`);
    expect(upgraded.content.map((block) => block.type)).toEqual(["heading", "guestFields", "paragraph", "acknowledgement", "signature"]);
    expect(JSON.stringify(upgraded)).toContain("Keep this wording.");
  });

  it("rejects body content without the application marker", () => {
    expect(() => deserializeTemplateContent("# Manually edited")).toThrow("marker");
  });
});
