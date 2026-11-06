import { z } from "zod";

export const templatePlaceholderKeys = ["guest.name", "guest.email", "guest.phone", "guest.vehicle", "signature.image", "signature.date"] as const;
export type TemplatePlaceholderKey = (typeof templatePlaceholderKeys)[number];
export type TextMark = Readonly<{ type: "bold" | "italic" | "highlight" }>;
export type TextNode = Readonly<{ type: "text"; text: string; marks?: TextMark[] }>;
export type PlaceholderNode = Readonly<{ type: "placeholder"; attrs: { key: TemplatePlaceholderKey } }>;
export type InlineNode = TextNode | PlaceholderNode;
export type ParagraphNode = Readonly<{ type: "paragraph"; content?: InlineNode[] }>;
export type HeadingNode = Readonly<{ type: "heading"; attrs: { level: 1 | 2 | 3 }; content?: InlineNode[] }>;
export type ListItemNode = Readonly<{ type: "listItem"; content: Array<ParagraphNode | ListNode> }>;
export type ListNode = Readonly<{ type: "bulletList" | "orderedList"; attrs?: { start: 1; type: null }; content: ListItemNode[] }>;
export type TableCellNode = Readonly<{ type: "tableCell" | "tableHeader"; attrs?: Record<string, unknown>; content: ParagraphNode[] }>;
export type TableRowNode = Readonly<{ type: "tableRow"; content: TableCellNode[] }>;
export type TableNode = Readonly<{ type: "table"; content: TableRowNode[] }>;
export type GuestFieldsNode = Readonly<{ type: "guestFields" }>;
export type AcknowledgementNode = Readonly<{ type: "acknowledgement" }>;
export type SignatureNode = Readonly<{ type: "signature" }>;
export type SystemBlockNode = GuestFieldsNode | AcknowledgementNode | SignatureNode;
export type TemplateBlockNode = ParagraphNode | HeadingNode | ListNode | TableNode | SystemBlockNode;
export type TemplateContent = Readonly<{ type: "doc"; content: TemplateBlockNode[] }>;

export const AGREEMENT_ACKNOWLEDGEMENT = "I confirm that I have read and understood the terms and conditions above, and I agree to comply with them.";
export const AGREEMENT_GUEST_FIELDS = [
  { key: "name", label: "Name", placeholder: "Enter your full name", required: true, type: "text" },
  { key: "email", label: "Email", placeholder: "Enter your email address", required: true, type: "email" },
  { key: "phone", label: "Phone", placeholder: "Enter your phone number", required: true, type: "tel" },
  { key: "vehicle", label: "Vehicle Registration", placeholder: "Enter your vehicle registration (optional)", required: false, type: "text" },
] as const;
export const AGREEMENT_SIGNATURE_HEADING = "Guest Signature";

const MAX_SERIALIZED_BYTES = 200_000;
const MAX_TEXT_CHARACTERS = 100_000;
const MAX_NODES = 2_000;
const MAX_DEPTH = 10;
const PLACEHOLDERS = new Set<string>(templatePlaceholderKeys);

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isTemplateContent(value: unknown): value is TemplateContent {
  let nodes = 0;
  let characters = 0;
  const count = () => ++nodes <= MAX_NODES;

  function inline(node: unknown, depth: number): boolean {
    if (!isObject(node) || depth > MAX_DEPTH || !count()) return false;
    if (node.type === "placeholder") {
      return exactKeys(node, ["type", "attrs"]) && isObject(node.attrs) && exactKeys(node.attrs, ["key"])
        && typeof node.attrs.key === "string" && PLACEHOLDERS.has(node.attrs.key);
    }
    if (node.type !== "text" || typeof node.text !== "string" || !exactKeys(node, ["type", "text", "marks"])) return false;
    characters += node.text.length;
    if (characters > MAX_TEXT_CHARACTERS) return false;
    if (node.marks === undefined) return true;
    if (!Array.isArray(node.marks) || node.marks.length > 3) return false;
    const types = new Set<string>();
    return node.marks.every((mark) => {
      if (!isObject(mark) || !exactKeys(mark, ["type"]) || !["bold", "italic", "highlight"].includes(mark.type as string) || types.has(mark.type as string)) return false;
      types.add(mark.type as string);
      return true;
    });
  }

  function paragraph(node: unknown, depth: number): boolean {
    return isObject(node) && node.type === "paragraph" && exactKeys(node, ["type", "content"])
      && (node.content === undefined || (Array.isArray(node.content) && node.content.every((child) => inline(child, depth + 1))));
  }

  function table(node: Record<string, unknown>, depth: number): boolean {
    if (!exactKeys(node, ["type", "content"]) || !Array.isArray(node.content) || node.content.length === 0) return false;
    return node.content.every((row) => {
      if (!isObject(row) || row.type !== "tableRow" || !exactKeys(row, ["type", "content"]) || !Array.isArray(row.content) || row.content.length === 0 || !count()) return false;
      return row.content.every((cell) => {
        if (!isObject(cell) || (cell.type !== "tableCell" && cell.type !== "tableHeader") || !exactKeys(cell, ["type", "attrs", "content"]) || !Array.isArray(cell.content) || !count()) return false;
        if (cell.attrs !== undefined && (!isObject(cell.attrs) || !exactKeys(cell.attrs, ["colspan", "rowspan", "colwidth"]))) return false;
        return cell.content.length > 0 && cell.content.every((child) => paragraph(child, depth + 3));
      });
    });
  }

  function block(node: unknown, depth: number, insideListItem = false): boolean {
    if (!isObject(node) || depth > MAX_DEPTH || typeof node.type !== "string" || !count()) return false;
    if (node.type === "guestFields" || node.type === "acknowledgement" || node.type === "signature") {
      return !insideListItem && exactKeys(node, ["type"]);
    }
    if (node.type === "paragraph") return paragraph(node, depth);
    if (node.type === "heading") {
      return !insideListItem && exactKeys(node, ["type", "attrs", "content"]) && isObject(node.attrs) && exactKeys(node.attrs, ["level"])
        && [1, 2, 3].includes(node.attrs.level as number)
        && (node.content === undefined || (Array.isArray(node.content) && node.content.every((child) => inline(child, depth + 1))));
    }
    if (node.type === "bulletList" || node.type === "orderedList") {
      const allowedKeys = node.type === "orderedList" ? ["type", "attrs", "content"] : ["type", "content"];
      if (!exactKeys(node, allowedKeys) || !Array.isArray(node.content) || node.content.length === 0) return false;
      if (node.type === "orderedList" && node.attrs !== undefined
        && (!isObject(node.attrs) || !exactKeys(node.attrs, ["start", "type"]) || node.attrs.start !== 1 || node.attrs.type !== null)) return false;
      return node.content.every((item) => {
        if (!isObject(item) || item.type !== "listItem" || !exactKeys(item, ["type", "content"]) || !Array.isArray(item.content) || item.content.length === 0 || !count()) return false;
        return item.content.every((child) => block(child, depth + 2, true));
      });
    }
    return !insideListItem && node.type === "table" && table(node, depth);
  }

  if (!isObject(value) || value.type !== "doc" || !exactKeys(value, ["type", "content"]) || !Array.isArray(value.content) || value.content.length === 0) return false;
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > MAX_SERIALIZED_BYTES) return false;
  const systemOrder = value.content.map((node) => isObject(node) ? node.type : undefined).filter((type) => type === "guestFields" || type === "acknowledgement" || type === "signature");
  if (systemOrder.join(",") !== "guestFields,acknowledgement,signature") return false;
  return value.content.every((node) => block(node, 1));
}

export const templateContentSchema = z.custom<TemplateContent>(isTemplateContent, "Agreement content contains unsupported or oversized nodes.");
const marked = (text: string, ...types: TextMark["type"][]): TextNode => ({ type: "text", text, marks: types.map((type) => ({ type })) });
const bold = (text: string): TextNode => marked(text, "bold");

export const defaultTemplateId = "7b1e93d4-5477-4d04-a43a-5d413c517e7d";
export const systemSigningJournalContainerId = "aa68565f-89fd-4ba1-b515-9e26c24344ae";
export const defaultTemplateName = "Default Registration Card";
export const defaultTemplateContent: TemplateContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Registration Card" }] },
    { type: "paragraph", content: [marked("Guest Information & Agreement", "italic")] },
    { type: "guestFields" },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Check-out" }] },
    { type: "paragraph", content: [marked("Check out time is 10:00 AM.", "bold", "highlight")] },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "I understand:" }] },
    { type: "bulletList", content: [
      { type: "listItem", content: [{ type: "paragraph", content: [marked("Lost keys will incur a fee of $100.00 per key. (Please return key to reception before leaving.)", "bold", "highlight")] }] },
      { type: "listItem", content: [{ type: "paragraph", content: [marked("All units and balcony areas are No Smoking.", "bold", "highlight")] }] },
      { type: "listItem", content: [{ type: "paragraph", content: [marked("No pets allowed in the complex.", "bold", "highlight")] }] },
      { type: "listItem", content: [{ type: "paragraph", content: [marked("I am responsible for all damages, if any within the unit/s.", "bold", "highlight")] }] },
      { type: "listItem", content: [{ type: "paragraph", content: [marked("The accommodation is non-refundable.", "bold", "highlight")] }] },
    ] },
    { type: "heading", attrs: { level: 2 }, content: [marked("Payment and Damage Authorisation", "highlight")] },
    { type: "paragraph", content: [marked("I give authorization to debit my credit card for any unpaid charges, damages, loss of properties or costs incurred as a direct result of us causing this said damage or for not following the policies above.", "highlight")] },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Housekeeping" }] },
    { type: "paragraph", content: [{ type: "text", text: "Rooms will be serviced daily, windows will be opened and any heating/cooling will be turned off to save power costs & the environment." }] },
    { type: "paragraph", content: [bold("Thanking you for staying with us at ASURE Centrepoint Motel, we hope you enjoy your stay.")] },
    { type: "acknowledgement" },
    { type: "signature" },
  ],
};
