"use client";

import Placeholder from "@tiptap/extension-placeholder";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";

import { TemplateDocument } from "./template-document";
import { isTemplateContent, type TemplateContent } from "@/lib/templates/content";
import type { TemplateRecord } from "@/lib/templates/schema";

type ApiError = { message?: string; requestId?: string };

async function failure(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({})) as ApiError;
  return `${body.message ?? "The request failed."}${body.requestId ? ` Reference: ${body.requestId}` : ""}`;
}

export function TemplateEditor({ id }: Readonly<{ id: string }>) {
  const [template, setTemplate] = useState<TemplateRecord>();
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<"ipad" | "print" | null>(null);
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

  const content = currentContentForPreview(editor?.getJSON(), template?.content);
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
      <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-8"><EditorContent editor={editor} /></div>
      <div className="flex flex-wrap gap-2">
        <button className="min-h-11 rounded-lg border border-[var(--border)] px-4 font-bold" onClick={() => setPreview(preview === "ipad" ? null : "ipad")} type="button">iPad preview</button>
        <button className="min-h-11 rounded-lg border border-[var(--border)] px-4 font-bold" onClick={() => setPreview(preview === "print" ? null : "print")} type="button">PDF/print preview</button>
        {preview === "print" ? <button className="min-h-11 rounded-lg bg-[var(--brand)] px-4 font-bold text-white" onClick={() => window.print()} type="button">Print preview</button> : null}
      </div>
      {preview && content ? <section className={`print-preview mx-auto border border-[var(--border)] bg-white shadow-sm ${preview === "ipad" ? "max-w-3xl rounded-3xl p-6 sm:p-10" : "max-w-[210mm] p-[15mm]"}`}><TemplateDocument content={content} /><div className="mt-10 border-t pt-6 text-sm text-[var(--muted)]"><p><strong>Guest details and signature</strong></p><p className="mt-2">System-generated during signing; template authors cannot remove this block.</p></div></section> : null}
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
    <button aria-pressed={editor.isActive("bulletList")} className={button} onClick={() => editor.chain().focus().toggleBulletList().run()} type="button">Bullets</button>
    <button aria-pressed={editor.isActive("orderedList")} className={button} onClick={() => editor.chain().focus().toggleOrderedList().run()} type="button">Numbered</button>
    <button className={button} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} type="button">Undo</button>
    <button className={button} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} type="button">Redo</button>
  </div>;
}
