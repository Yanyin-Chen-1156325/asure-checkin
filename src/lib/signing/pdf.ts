import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";

import { AGREEMENT_ACKNOWLEDGEMENT, AGREEMENT_GUEST_FIELDS, AGREEMENT_SIGNATURE_HEADING, type HeadingNode, type InlineNode, type ListNode, type ParagraphNode, type TableNode, type TemplateBlockNode, type TemplateContent, type TemplatePlaceholderKey } from "../templates/content";

export type PdfValues = Readonly<Record<Exclude<TemplatePlaceholderKey, "signature.image">, string>>;

const PAGE: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const TEXT_WIDTH = PAGE[0] - MARGIN * 2;

const fontDirectory = join(process.cwd(), "node_modules", "@expo-google-fonts", "noto-sans");
const fontFiles = {
  regular: join(fontDirectory, "400Regular", "NotoSans_400Regular.ttf"),
  bold: join(fontDirectory, "700Bold", "NotoSans_700Bold.ttf"),
  italic: join(fontDirectory, "400Regular_Italic", "NotoSans_400Regular_Italic.ttf"),
};

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.normalize("NFC").split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width || !line) line = candidate;
      else { lines.push(line); line = word; }
    }
    lines.push(line);
  }
  return lines;
}

function inlineText(nodes: readonly InlineNode[] | undefined, values: PdfValues): string {
  return (nodes ?? []).map((node) => node.type === "text" ? node.text : node.attrs.key === "signature.image" ? "" : values[node.attrs.key]).join("");
}

function highlighted(nodes: readonly InlineNode[] | undefined): boolean {
  return Boolean(nodes?.some((node) => node.type === "text" && node.marks?.some((mark) => mark.type === "highlight")));
}

export async function generateSignedPdf(input: Readonly<{
  content: TemplateContent;
  values: PdfValues;
  signatureDataUrl: string;
  acknowledgement: Readonly<{ accepted: boolean; acceptedAt: string | null }>;
  audit?: Readonly<{ signingId: string; templateName: string; templateVersion: number; consent: string }>;
}>): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  document.setTitle("Signed Registration Card");
  document.setProducer("ASURE Motel Check-in");
  const [regularBytes, boldBytes, italicBytes] = await Promise.all([
    readFile(/* turbopackIgnore: true */ fontFiles.regular),
    readFile(/* turbopackIgnore: true */ fontFiles.bold),
    readFile(/* turbopackIgnore: true */ fontFiles.italic),
  ]);
  const [regular, bold, italic] = await Promise.all([document.embedFont(regularBytes, { subset: false }), document.embedFont(boldBytes, { subset: false }), document.embedFont(italicBytes, { subset: false })]);
  const signatureBytes = Uint8Array.from(Buffer.from(input.signatureDataUrl.split(",")[1] ?? "", "base64"));
  const signature = await document.embedPng(signatureBytes);
  let page = document.addPage(PAGE);
  let y = PAGE[1] - MARGIN;

  const newPage = () => { page = document.addPage(PAGE); y = PAGE[1] - MARGIN; };
  const room = (height: number) => { if (y - height < MARGIN) newPage(); };
  const line = (text: string, options: { size?: number; font?: PDFFont; indent?: number; gap?: number; warning?: boolean; align?: "left" | "center" } = {}) => {
    const size = options.size ?? 10.5;
    const font = options.font ?? regular;
    const indent = options.indent ?? 0;
    const padding = 0;
    const leading = size * 1.35;
    const lines = wrap(text, font, size, TEXT_WIDTH - indent - padding * 2);
    const height = lines.length * leading + (options.gap ?? 4) + padding * 2;
    room(height);
    for (const item of lines) {
      const availableWidth = TEXT_WIDTH - indent - padding * 2;
      const x = options.align === "center" ? MARGIN + indent + padding + (availableWidth - font.widthOfTextAtSize(item, size)) / 2 : MARGIN + indent + padding;
      page.drawText(item, { x, y: y - size, size, font, color: rgb(0.08, 0.12, 0.1) });
      y -= leading;
    }
    y -= (options.gap ?? 4) + padding;
  };

  const renderGuestFields = () => {
    line("Guest Information", { size: 15, font: bold, gap: 7 });
    const fields = AGREEMENT_GUEST_FIELDS.map((field) => [field.label, input.values[`guest.${field.key}` as "guest.name" | "guest.email" | "guest.phone" | "guest.vehicle"]] as const);
    const gap = 10;
    const cellWidth = (TEXT_WIDTH - gap) / 2;
    const cellHeight = 48;
    room(cellHeight * 2 + gap + 14);
    fields.forEach(([label, value], index) => {
      const x = MARGIN + (index % 2) * (cellWidth + gap);
      const top = y - Math.floor(index / 2) * (cellHeight + gap);
      page.drawRectangle({ x, y: top - cellHeight, width: cellWidth, height: cellHeight, borderWidth: 0.8, borderColor: rgb(0.67, 0.72, 0.7), color: rgb(0.99, 1, 0.99) });
      page.drawText(label, { x: x + 10, y: top - 15, size: 8.5, font: bold });
      page.drawText(wrap(value || "—", regular, 10, cellWidth - 20)[0] ?? "—", { x: x + 10, y: top - 34, size: 10, font: regular });
    });
    y -= cellHeight * 2 + gap + 16;
  };

  const renderAcknowledgement = () => {
    const statement = input.audit?.consent ?? AGREEMENT_ACKNOWLEDGEMENT;
    const size = 10;
    const lines = wrap(statement, bold, size, TEXT_WIDTH - 38);
    const height = Math.max(42, lines.length * 14 + 20);
    room(height + 10);
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE[0] - MARGIN, y }, thickness: 0.7, color: rgb(0.75, 0.78, 0.76) });
    const boxX = MARGIN + 4;
    const boxY = y - 27;
    page.drawRectangle({ x: boxX, y: boxY, width: 14, height: 14, borderWidth: 1, borderColor: rgb(0.08, 0.12, 0.1), color: rgb(1, 1, 1) });
    if (input.acknowledgement.accepted) {
      page.drawLine({ start: { x: boxX + 2, y: boxY + 7 }, end: { x: boxX + 6, y: boxY + 3 }, thickness: 1.6, color: rgb(0.02, 0.4, 0.33) });
      page.drawLine({ start: { x: boxX + 6, y: boxY + 3 }, end: { x: boxX + 12, y: boxY + 12 }, thickness: 1.6, color: rgb(0.02, 0.4, 0.33) });
    }
    lines.forEach((item, index) => page.drawText(item, { x: MARGIN + 30, y: y - 17 - index * 14, size, font: bold }));
    y -= height;
  };

  const renderSignature = () => {
    line(AGREEMENT_SIGNATURE_HEADING, { size: 15, font: bold, gap: 6 });
    const dimensions = signature.scaleToFit(220, 76);
    room(dimensions.height + 38);
    page.drawRectangle({ x: MARGIN, y: y - 86, width: TEXT_WIDTH, height: 86, borderWidth: 0.8, borderColor: rgb(0.67, 0.72, 0.7), color: rgb(1, 1, 1) });
    page.drawImage(signature, { x: MARGIN + 14, y: y - dimensions.height - 5, width: dimensions.width, height: dimensions.height });
    y -= 96;
    line(`Signed at: ${input.values["signature.date"]}`, { size: 9, font: regular, gap: 8 });
  };

  const renderTable = (table: TableNode) => {
    const columns = Math.max(...table.content.map((row) => row.content.length));
    const width = TEXT_WIDTH / columns;
    for (const row of table.content) {
      const texts = row.content.map((cell) => cell.content.map((paragraph) => inlineText(paragraph.content, input.values)).join("\n"));
      const height = Math.max(30, ...texts.map((text, index) => wrap(text, row.content[index]?.type === "tableHeader" ? bold : regular, 9.5, width - 12).length * 13 + 10));
      room(height);
      row.content.forEach((cell, index) => {
        const x = MARGIN + index * width;
        page.drawRectangle({ x, y: y - height, width, height, borderWidth: 0.7, borderColor: rgb(0.75, 0.78, 0.76), color: cell.type === "tableHeader" ? rgb(0.95, 0.96, 0.95) : rgb(1, 1, 1) });
        const font = cell.type === "tableHeader" ? bold : regular;
        wrap(texts[index] ?? "", font, 9.5, width - 12).forEach((item, lineIndex) => page.drawText(item, { x: x + 6, y: y - 13 - lineIndex * 13, size: 9.5, font }));
      });
      y -= height;
    }
    y -= 8;
  };

  const renderList = (list: ListNode, depth = 0) => list.content.forEach((item, index) => item.content.forEach((child) => {
    if (child.type === "paragraph") {
      const allBold = child.content?.length && child.content.every((node) => node.type === "placeholder" || node.marks?.some((mark) => mark.type === "bold"));
      const warning = highlighted(child.content);
      line(`${list.type === "orderedList" ? `${index + 1}.` : "•"} ${inlineText(child.content, input.values)}`, { indent: 12 + depth * 10, gap: 2, font: allBold && !warning ? bold : regular, warning });
    } else renderList(child, depth + 1);
  }));

  const renderBlock = (block: TemplateBlockNode, index: number) => {
    if (block.type === "guestFields") { renderGuestFields(); return; }
    if (block.type === "acknowledgement") { renderAcknowledgement(); return; }
    if (block.type === "signature") { renderSignature(); return; }
    if (block.type === "table") { renderTable(block); return; }
    if (block.type === "bulletList" || block.type === "orderedList") { renderList(block); return; }
    const textBlock = block as ParagraphNode | HeadingNode;
    const text = inlineText(textBlock.content, input.values);
    const allBold = textBlock.content?.length && textBlock.content.every((node) => node.type === "placeholder" || node.marks?.some((mark) => mark.type === "bold"));
    const allItalic = textBlock.content?.length && textBlock.content.every((node) => node.type === "placeholder" || node.marks?.some((mark) => mark.type === "italic"));
    if (textBlock.type === "heading") {
      const sizes = { 1: 22, 2: 15, 3: 12 } as const;
      line(text, { size: sizes[textBlock.attrs.level], font: bold, gap: textBlock.attrs.level === 1 ? 12 : 6, warning: highlighted(textBlock.content), align: index === 0 && textBlock.attrs.level === 1 ? "center" : "left" });
      return;
    }
    const warning = highlighted(textBlock.content);
    line(text, { font: allBold && !warning ? bold : allItalic ? italic : regular, warning, align: index === 1 ? "center" : "left" });
  };

  input.content.content.forEach(renderBlock);
  if (input.audit) {
    room(48);
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE[0] - MARGIN, y }, thickness: 0.7, color: rgb(0.75, 0.78, 0.76) });
    y -= 12;
    line(`Template: ${input.audit.templateName} · version ${input.audit.templateVersion}`, { size: 8.5, gap: 2 });
    line(`Signing ID: ${input.audit.signingId}`, { size: 8.5, gap: 2 });
  }
  page.drawText(`Signed electronically ${input.values["signature.date"].normalize("NFC")}`, { x: MARGIN, y: 22, size: 8, font: regular, color: rgb(0.35, 0.4, 0.38) });
  return document.save();
}
