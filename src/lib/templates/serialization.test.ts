import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { defaultTemplateContent } from "./content";
import { canonicalTemplateJson, deserializeTemplateContent, serializeTemplateContent } from "./serialization";

describe("Notion agreement serialization", () => {
  it("round-trips Unicode content exactly", () => {
    const content = { type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: "Kia ora — 中文測試 🏨" }] }] };
    expect(deserializeTemplateContent(serializeTemplateContent(content))).toEqual(content);
  });

  it("produces deterministic canonical JSON", () => {
    expect(canonicalTemplateJson(defaultTemplateContent)).toBe(canonicalTemplateJson(structuredClone(defaultTemplateContent)));
  });

  it("rejects body content without the application marker", () => {
    expect(() => deserializeTemplateContent("# Manually edited")).toThrow("marker");
  });
});
