import { describe, expect, it } from "vitest";

import { defaultTemplateContent, isTemplateContent } from "./content";

describe("restricted agreement content", () => {
  it("accepts the supported document nodes", () => {
    expect(isTemplateContent({
      type: "doc",
      content: [
        ...defaultTemplateContent.content,
        { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Rule", marks: [{ type: "bold" }] }] }] }] },
      ],
    })).toBe(true);
  });

  it("rejects links, arbitrary HTML, and unsupported marks", () => {
    expect(isTemplateContent({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "link", marks: [{ type: "link", attrs: { href: "https://example.test" } }] }] }] })).toBe(false);
    expect(isTemplateContent({ type: "doc", content: [{ type: "html", content: "<script>alert(1)</script>" }] })).toBe(false);
  });

  it("rejects oversized content", () => {
    expect(isTemplateContent({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(100_001) }] }] })).toBe(false);
  });
});
