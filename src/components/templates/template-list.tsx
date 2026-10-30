"use client";

import type { Route } from "next";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import type { TemplateSummary } from "@/lib/templates/schema";

type ApiError = { message?: string; requestId?: string };

async function failure(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({})) as ApiError;
  return `${body.message ?? "The request failed."}${body.requestId ? ` Reference: ${body.requestId}` : ""}`;
}

async function fetchTemplates(): Promise<TemplateSummary[]> {
  const response = await fetch("/api/templates", { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(await failure(response));
  return ((await response.json()) as { templates: TemplateSummary[] }).templates;
}

export function TemplateList() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    try {
      setTemplates(await fetchTemplates());
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Templates could not be loaded."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchTemplates().then((loaded) => { if (active) setTemplates(loaded); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Templates could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError("");
    const form = event.currentTarget;
    const name = new FormData(form).get("name");
    try {
      const response = await fetch("/api/templates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
      if (!response.ok) throw new Error(await failure(response));
      form.reset(); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The draft could not be created."); }
    finally { setPending(false); }
  }

  async function action(id: string, operation: "duplicate" | "archive") {
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/templates/${encodeURIComponent(id)}/${operation}`, { method: "POST" });
      if (!response.ok) throw new Error(await failure(response));
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : `The template could not be ${operation}d.`); }
    finally { setPending(false); }
  }

  return (
    <div className="mt-8 space-y-6">
      {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-[var(--danger)]" role="alert">{error}</p> : null}
      <form className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:flex-row" onSubmit={create}>
        <label className="sr-only" htmlFor="template-name">Agreement name</label>
        <input className="min-h-12 flex-1 rounded-xl border border-[var(--border)] px-4" id="template-name" maxLength={200} name="name" placeholder="New agreement name" required />
        <button className="min-h-12 rounded-xl bg-[var(--brand)] px-5 font-bold text-white disabled:opacity-60" disabled={pending} type="submit">Create draft</button>
      </form>
      {loading ? <p className="text-[var(--muted)]">Loading templates…</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {templates.map((template) => (
          <article className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm" key={template.id}>
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-lg font-bold">{template.name}</h2><p className="mt-1 text-sm text-[var(--muted)]">{template.status} · version {template.version}</p></div>
              <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-bold text-[var(--brand)]">{template.status}</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link className="inline-flex min-h-11 items-center rounded-lg bg-[var(--brand)] px-4 font-bold text-white" href={`/admin/agreements/${template.id}` as Route}>{template.status === "draft" ? "Edit" : "View"}</Link>
              <button className="min-h-11 rounded-lg border border-[var(--border)] px-4 font-bold" disabled={pending} onClick={() => void action(template.id, "duplicate")} type="button">Duplicate</button>
              {template.status !== "archived" ? <button className="min-h-11 rounded-lg border border-[var(--border)] px-4 font-bold text-[var(--danger)]" disabled={pending} onClick={() => void action(template.id, "archive")} type="button">Archive</button> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
