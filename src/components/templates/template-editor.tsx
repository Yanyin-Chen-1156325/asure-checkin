"use client";

import Placeholder from "@tiptap/extension-placeholder";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { useEffect, useState } from "react";

import { TemplateDocument } from "./template-document";
import { isTemplateContent, type TemplateContent } from "@/lib/templates/content";
import { AcknowledgementNodeExtension, GuestFieldsNodeExtension, HighlightMarkExtension, SignatureNodeExtension } from "@/lib/templates/system-block-extensions";
import type { TemplateRecord } from "@/lib/templates/schema";

type ApiError = { message?: string; requestId?: string };

async function failure(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({})) as ApiError;
  return `${body.message ?? "The request failed."}${body.requestId ? ` Reference: ${body.requestId}` : ""}`;
}

export function TemplateEditor({ id }: Readonly<{ id: string }>) {
  const [template, setTemplate] = useState<TemplateRecord>();
  const [name, setName] = useState("");
  const [printContent, setPrintContent] = useState<TemplateContent | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }, blockquote: false, code: false, codeBlock: false,
        horizontalRule: false, strike: false, hardBreak: false, link: false, underline: false,
      }),
      TableKit.configure({ table: { resizable: false } }),
      HighlightMarkExtension,
      GuestFieldsNodeExtension,
      AcknowledgementNodeExtension,
      SignatureNodeExtension,
      Placeholder.configure({ placeholder: "Write the complete agreement…" }),
    ],
    content: { type: "doc", content: [{ type: "paragraph" }] },
    onUpdate: () => setDirty(true),
  });

  useEffect(() => {
    let active = true;
    void fetch(`/api/templates/${encodeURIComponent(id)}`, { headers: { accept: "application/json" } })
      .then(async (response) => { if (!response.ok) throw new Error(await failure(response)); return response.json() as Promise<{ template: TemplateRecord }>; })
      .then(({ template: loaded }) => {
        if (!active) return;
        setTemplate(loaded); setName(loaded.name); editor?.commands.setContent(loaded.content); editor?.setEditable(loaded.status === "draft"); setDirty(false);
      })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "The template could not be loaded."); });
    return () => { active = false; };
  }, [editor, id]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function currentContent(): TemplateContent | null {
    const content = editor?.getJSON();
    if (!isTemplateContent(content)) { setError("The document contains unsupported or oversized content."); return null; }
    return content;
  }

  async function save(): Promise<boolean> {
    const content = currentContent();
    if (!content || !template) return false;
    setPending(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/templates/${encodeURIComponent(id)}`, {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, content }),
      });
      if (!response.ok) throw new Error(await failure(response));
      const saved = ((await response.json()) as { template: TemplateRecord }).template;
      setTemplate(saved); setDirty(false); setMessage("Draft saved."); return true;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The draft could not be saved."); return false; }
    finally { setPending(false); }
  }

  async function publish() {
    if (!template || (dirty && !(await save()))) return;
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/templates/${encodeURIComponent(id)}/publish`, { method: "POST" });
      if (!response.ok) throw new Error(await failure(response));
      const published = ((await response.json()) as { template: TemplateRecord }).template;
      setMessage(`Published immutable version ${published.version}. The draft remains available for future edits.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The agreement could not be published."); }
    finally { setPending(false); }
  }

  async function previewPdf() {
    const previewWindow = window.open("about:blank", "_blank");
    if (dirty && !(await save())) { previewWindow?.close(); return; }
    if (previewWindow) previewWindow.location.href = `/api/templates/${encodeURIComponent(id)}/preview`;
  }

  const content = template?.status === "draft" ? null : currentContentForPreview(editor?.getJSON(), template?.content);
  if (error && !template) return <p className="mt-8 rounded-xl bg-red-50 p-4 text-[var(--danger)]">{error}</p>;

  return (
    <div className="mt-8 space-y-5">
      {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-[var(--danger)]" role="alert">{error}</p> : null}
      {message ? <p className="rounded-xl bg-[var(--accent)] p-4 text-sm text-[var(--brand-strong)]" aria-live="polite">{message}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Agreement name" className="min-h-12 min-w-64 flex-1 rounded-xl border border-[var(--border)] px-4 text-lg font-bold" disabled={template?.status !== "draft"} maxLength={200} onChange={(event) => { setName(event.target.value); setDirty(true); }} value={name} />
        {template?.status === "draft" ? <><button className="min-h-12 rounded-xl border border-[var(--brand)] px-5 font-bold text-[var(--brand)]" disabled={pending} onClick={() => void save()} type="button">Save draft</button><button className="min-h-12 rounded-xl bg-[var(--brand)] px-5 font-bold text-white" disabled={pending} onClick={() => void publish()} type="button">Publish version</button></> : null}
      </div>
      {template?.status === "draft" ? <Toolbar editor={editor} /> : <p className="rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">Published and archived versions are read-only.</p>}
      <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-8">
        {template?.status === "draft" ? <EditorContent editor={editor} /> : content ? <TemplateDocument content={content} /> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="min-h-11 rounded-lg border border-[var(--border)] px-4 font-bold" disabled={pending} onClick={() => void previewPdf()} type="button">PDF preview</button>
        <button className="min-h-11 rounded-lg bg-[var(--brand)] px-4 font-bold text-white" onClick={() => {
          const printable = template?.status === "draft" ? currentContent() : content;
          if (!printable) return;
          setPrintContent(printable);
          window.setTimeout(() => window.print(), 0);
        }} type="button">Print</button>
      </div>
      {printContent ? <section className="print-preview mx-auto max-w-[210mm] border border-[var(--border)] bg-white p-6 shadow-sm sm:p-[15mm]"><TemplateDocument content={printContent} /></section> : null}
    </div>
  );
}

function currentContentForPreview(value: unknown, fallback?: TemplateContent): TemplateContent | null {
  return isTemplateContent(value) ? value : fallback ?? null;
}

function Toolbar({ editor }: Readonly<{ editor: Editor | null }>) {
  if (!editor) return null;
  const button = "min-h-10 rounded-lg border border-[var(--border)] px-3 text-sm font-bold aria-pressed:bg-[var(--accent)]";
  return <div aria-label="Formatting" className="flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-white p-3" role="toolbar">
    <button aria-pressed={editor.isActive("heading", { level: 1 })} className={button} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} type="button">Title</button>
    <button aria-pressed={editor.isActive("heading", { level: 2 })} className={button} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} type="button">Heading</button>
    <button aria-pressed={editor.isActive("bold")} className={button} onClick={() => editor.chain().focus().toggleBold().run()} type="button">Bold</button>
    <button aria-pressed={editor.isActive("italic")} className={button} onClick={() => editor.chain().focus().toggleItalic().run()} type="button">Italic</button>
    <button aria-pressed={editor.isActive("highlight")} className={button} onClick={() => editor.chain().focus().toggleMark("highlight").run()} type="button">Warning highlight</button>
    <button aria-pressed={editor.isActive("bulletList")} className={button} onClick={() => editor.chain().focus().toggleBulletList().run()} type="button">Bullets</button>
    <button aria-pressed={editor.isActive("orderedList")} className={button} onClick={() => editor.chain().focus().toggleOrderedList().run()} type="button">Numbered</button>
    <button className={button} onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()} type="button">Insert table</button>
    <button className={button} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} type="button">Undo</button>
    <button className={button} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} type="button">Redo</button>
  </div>;
}
