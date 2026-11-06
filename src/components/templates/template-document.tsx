import type { ReactNode } from "react";

import { AGREEMENT_ACKNOWLEDGEMENT, AGREEMENT_GUEST_FIELDS, AGREEMENT_SIGNATURE_HEADING, type InlineNode, type ListNode, type SystemBlockNode, type TableNode, type TemplateBlockNode, type TemplateContent } from "@/lib/templates/content";

export type PlaceholderValues = Partial<Record<"guest.name" | "guest.email" | "guest.phone" | "guest.vehicle" | "signature.image" | "signature.date", ReactNode>>;
export type AgreementSystemSlots = Partial<Record<SystemBlockNode["type"], ReactNode>>;

const sampleValues: PlaceholderValues = {
  "guest.name": "Alex Smith", "guest.email": "alex.smith@example.com", "guest.phone": "021 000 1001",
  "guest.vehicle": "ABC123", "signature.date": "30 October 2026, 7:30 pm",
};

function Inline({ node, values }: Readonly<{ node: InlineNode; values: PlaceholderValues }>) {
  if (node.type === "placeholder") return <span className="template-placeholder">{values[node.attrs.key] ?? ""}</span>;
  let content: ReactNode = node.text;
  if (node.marks?.some((mark) => mark.type === "highlight")) content = <mark className="agreement-highlight-mark">{content}</mark>;
  if (node.marks?.some((mark) => mark.type === "italic")) content = <em>{content}</em>;
  if (node.marks?.some((mark) => mark.type === "bold")) content = <strong>{content}</strong>;
  return content;
}

function Text({ content = [], values }: Readonly<{ content?: InlineNode[]; values: PlaceholderValues }>) {
  return <>{content.map((node, index) => <Inline key={index} node={node} values={values} />)}</>;
}

function hasHighlight(node: TemplateBlockNode): boolean {
  if (node.type === "guestFields" || node.type === "acknowledgement" || node.type === "signature") return false;
  if (node.type === "paragraph" || node.type === "heading") return Boolean(node.content?.some((child) => child.type === "text" && child.marks?.some((mark) => mark.type === "highlight")));
  if (node.type === "table") return node.content.some((row) => row.content.some((cell) => cell.content.some(hasHighlight)));
  return node.content.some((item) => item.content.some((child) => hasHighlight(child as TemplateBlockNode)));
}

function List({ node, values }: Readonly<{ node: ListNode; values: PlaceholderValues }>) {
  const Tag = node.type === "bulletList" ? "ul" : "ol";
  return <Tag>{node.content.map((item, index) => <li key={index}>{item.content.map((child, childIndex) => <Block key={childIndex} node={child as TemplateBlockNode} values={values} />)}</li>)}</Tag>;
}

function Table({ node, values }: Readonly<{ node: TableNode; values: PlaceholderValues }>) {
  return <table><tbody>{node.content.map((row, rowIndex) => <tr key={rowIndex}>{row.content.map((cell, cellIndex) => {
    const Cell = cell.type === "tableHeader" ? "th" : "td";
    return <Cell key={cellIndex}>{cell.content.map((paragraph, index) => <p key={index}><Text content={paragraph.content} values={values} /></p>)}</Cell>;
  })}</tr>)}</tbody></table>;
}

function Block({ node, values }: Readonly<{ node: TemplateBlockNode; values: PlaceholderValues }>) {
  const highlighted = hasHighlight(node);
  if (node.type === "paragraph") return <p className={highlighted ? "agreement-warning-block" : undefined}><Text content={node.content} values={values} /></p>;
  if (node.type === "heading") {
    const className = highlighted ? "agreement-warning-heading" : undefined;
    if (node.attrs.level === 1) return <h1 className={className}><Text content={node.content} values={values} /></h1>;
    if (node.attrs.level === 2) return <h2 className={className}><Text content={node.content} values={values} /></h2>;
    return <h3 className={className}><Text content={node.content} values={values} /></h3>;
  }
  if (node.type === "table") return <Table node={node} values={values} />;
  if (node.type === "bulletList" || node.type === "orderedList") return <div className={highlighted ? "agreement-warning-block agreement-warning-list" : undefined}><List node={node} values={values} /></div>;
  return null;
}

function PreviewGuestFields() {
  return <section className="agreement-system-section"><h2>Guest Information</h2><div className="agreement-form-grid">{AGREEMENT_GUEST_FIELDS.map((field) => <label className="agreement-form-field" key={field.key}><span>{field.label}{field.required ? <b aria-hidden="true"> *</b> : null}</span><input disabled placeholder={field.placeholder} type={field.type} /></label>)}</div></section>;
}

function PreviewAcknowledgement() {
  return <label className="agreement-acknowledgement"><input disabled type="checkbox" /><span>{AGREEMENT_ACKNOWLEDGEMENT} <b aria-hidden="true">*</b></span></label>;
}

function PreviewSignature() {
  return <section className="agreement-signature"><h2>{AGREEMENT_SIGNATURE_HEADING} <b aria-hidden="true">*</b></h2><div>Sign here using your finger or stylus</div><p>Signing date and time will be recorded automatically.</p></section>;
}

export function TemplateDocument({ content, values = sampleValues, systemSlots = {} }: Readonly<{
  content: TemplateContent;
  values?: PlaceholderValues;
  systemSlots?: AgreementSystemSlots;
}>) {
  return <article className="agreement-document">{content.content.map((node, index) => {
    if (node.type === "guestFields") return <div key={index}>{systemSlots.guestFields ?? <PreviewGuestFields />}</div>;
    if (node.type === "acknowledgement") return <div key={index}>{systemSlots.acknowledgement ?? <PreviewAcknowledgement />}</div>;
    if (node.type === "signature") return <div key={index}>{systemSlots.signature ?? <PreviewSignature />}</div>;
    return <Block key={index} node={node} values={values} />;
  })}</article>;
}
