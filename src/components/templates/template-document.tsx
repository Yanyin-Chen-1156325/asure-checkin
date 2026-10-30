import type { ReactNode } from "react";

import type { ListNode, TemplateBlockNode, TemplateContent, TextNode } from "@/lib/templates/content";

function Inline({ node }: Readonly<{ node: TextNode }>) {
  let content: ReactNode = node.text;
  if (node.marks?.some((mark) => mark.type === "italic")) content = <em>{content}</em>;
  if (node.marks?.some((mark) => mark.type === "bold")) content = <strong>{content}</strong>;
  return content;
}

function Text({ content = [] }: Readonly<{ content?: TextNode[] }>) {
  return <>{content.map((node, index) => <Inline key={index} node={node} />)}</>;
}

function List({ node }: Readonly<{ node: ListNode }>) {
  const Tag = node.type === "bulletList" ? "ul" : "ol";
  return <Tag>{node.content.map((item, index) => <li key={index}>{item.content.map((child, childIndex) => <Block key={childIndex} node={child as TemplateBlockNode} />)}</li>)}</Tag>;
}

function Block({ node }: Readonly<{ node: TemplateBlockNode }>) {
  if (node.type === "paragraph") return <p><Text content={node.content} /></p>;
  if (node.type === "heading") {
    if (node.attrs.level === 1) return <h1><Text content={node.content} /></h1>;
    if (node.attrs.level === 2) return <h2><Text content={node.content} /></h2>;
    return <h3><Text content={node.content} /></h3>;
  }
  return <List node={node} />;
}

export function TemplateDocument({ content }: Readonly<{ content: TemplateContent }>) {
  return <article className="agreement-document">{content.content.map((node, index) => <Block key={index} node={node} />)}</article>;
}
