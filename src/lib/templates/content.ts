import { z } from "zod";

export type TextMark = Readonly<{ type: "bold" | "italic" }>;
export type TextNode = Readonly<{ type: "text"; text: string; marks?: TextMark[] }>;
export type ParagraphNode = Readonly<{ type: "paragraph"; content?: TextNode[] }>;
export type HeadingNode = Readonly<{ type: "heading"; attrs: { level: 1 | 2 | 3 }; content?: TextNode[] }>;
export type ListItemNode = Readonly<{ type: "listItem"; content: Array<ParagraphNode | ListNode> }>;
export type ListNode = Readonly<{ type: "bulletList" | "orderedList"; content: ListItemNode[] }>;
export type TemplateBlockNode = ParagraphNode | HeadingNode | ListNode;
export type TemplateContent = Readonly<{ type: "doc"; content: TemplateBlockNode[] }>;

const MAX_SERIALIZED_BYTES = 200_000;
const MAX_TEXT_CHARACTERS = 100_000;
const MAX_NODES = 2_000;
const MAX_DEPTH = 10;

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isTemplateContent(value: unknown): value is TemplateContent {
  let nodes = 0;
  let characters = 0;

  function inline(node: unknown, depth: number): boolean {
    if (!isObject(node) || depth > MAX_DEPTH || node.type !== "text" || typeof node.text !== "string") return false;
    if (!exactKeys(node, ["type", "text", "marks"])) return false;
    nodes += 1;
    characters += node.text.length;
    if (nodes > MAX_NODES || characters > MAX_TEXT_CHARACTERS) return false;
    if (node.marks === undefined) return true;
    if (!Array.isArray(node.marks) || node.marks.length > 2) return false;
    const types = new Set<string>();
    return node.marks.every((mark) => {
      if (!isObject(mark) || !exactKeys(mark, ["type"]) || (mark.type !== "bold" && mark.type !== "italic") || types.has(mark.type)) return false;
      types.add(mark.type);
      return true;
    });
  }

  function block(node: unknown, depth: number, insideListItem = false): boolean {
    if (!isObject(node) || depth > MAX_DEPTH || typeof node.type !== "string") return false;
    nodes += 1;
    if (nodes > MAX_NODES) return false;
    if (node.type === "paragraph") {
      if (!exactKeys(node, ["type", "content"]) || (node.content !== undefined && !Array.isArray(node.content))) return false;
      return (node.content ?? []).every((child) => inline(child, depth + 1));
    }
    if (node.type === "heading") {
      if (insideListItem || !exactKeys(node, ["type", "attrs", "content"]) || !isObject(node.attrs) || !exactKeys(node.attrs, ["level"])) return false;
      if (![1, 2, 3].includes(node.attrs.level as number) || (node.content !== undefined && !Array.isArray(node.content))) return false;
      return (node.content ?? []).every((child) => inline(child, depth + 1));
    }
    if (node.type === "bulletList" || node.type === "orderedList") {
      if (!exactKeys(node, ["type", "content"]) || !Array.isArray(node.content) || node.content.length === 0) return false;
      return node.content.every((item) => {
        if (!isObject(item) || item.type !== "listItem" || !exactKeys(item, ["type", "content"]) || !Array.isArray(item.content) || item.content.length === 0) return false;
        nodes += 1;
        return item.content.every((child) => block(child, depth + 2, true));
      });
    }
    return false;
  }

  if (!isObject(value) || value.type !== "doc" || !exactKeys(value, ["type", "content"]) || !Array.isArray(value.content) || value.content.length === 0) return false;
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > MAX_SERIALIZED_BYTES) return false;
  return value.content.every((node) => block(node, 1));
}

export const templateContentSchema = z.custom<TemplateContent>(isTemplateContent, "Agreement content contains unsupported or oversized nodes.");

export const defaultTemplateContent: TemplateContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Guest Agreement" }] },
    { type: "paragraph", content: [{ type: "text", text: "Enter the owner-approved agreement terms here." }] },
  ],
};
