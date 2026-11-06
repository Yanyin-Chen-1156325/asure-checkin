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

  it("accepts the default attributes emitted by Tiptap ordered lists", () => {
    expect(isTemplateContent({
      ...defaultTemplateContent,
      content: [
        ...defaultTemplateContent.content,
        {
          type: "orderedList",
          attrs: { start: 1, type: null },
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "First" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Second" }] }] },
          ],
        },
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

  it("requires the guest fields, acknowledgement, and signature blocks in document order", () => {
    const types = defaultTemplateContent.content.map((block) => block.type);
    expect(types.filter((type) => ["guestFields", "acknowledgement", "signature"].includes(type))).toEqual(["guestFields", "acknowledgement", "signature"]);
    expect(isTemplateContent({ ...defaultTemplateContent, content: defaultTemplateContent.content.filter((block) => block.type !== "acknowledgement") })).toBe(false);
  });

  it("preserves warning highlights as a supported structured mark", () => {
    expect(JSON.stringify(defaultTemplateContent)).toContain('"type":"highlight"');
    expect(isTemplateContent(defaultTemplateContent)).toBe(true);
  });
});
