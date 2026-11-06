"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import type { Arrival } from "@/lib/arrivals/schema";
import type { TemplateSummary } from "@/lib/templates/schema";

type ApiFailure = { message?: string; requestId?: string };
async function errorMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({})) as ApiFailure;
  return `${body.message ?? "The request failed."}${body.requestId ? ` Reference: ${body.requestId}` : ""}`;
}
async function arrivalsFor(date: string): Promise<Arrival[]> {
  const response = await fetch(`/api/arrivals?date=${encodeURIComponent(date)}`, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(await errorMessage(response));
  return ((await response.json()) as { arrivals: Arrival[] }).arrivals;
}
async function activeTemplates(): Promise<TemplateSummary[]> {
  const fetchActive = async () => {
    const response = await fetch("/api/templates", { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(await errorMessage(response));
    return ((await response.json()) as { templates: TemplateSummary[] }).templates.filter((template) => template.status === "active");
  };
  const templates = await fetchActive();
  if (templates.length) return templates;
  const ensured = await fetch("/api/templates/default", { method: "POST" });
  if (!ensured.ok) throw new Error(await errorMessage(ensured));
  return fetchActive();
}

export function ArrivalsWorkspace({ initialDate }: Readonly<{ initialDate: string }>) {
  const [date, setDate] = useState(initialDate);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (arrivalDate: string) => {
    setLoading(true); setError("");
    try { setArrivals(await arrivalsFor(arrivalDate)); }
    catch (caught) { setArrivals([]); setError(caught instanceof Error ? caught.message : "Arrivals could not be loaded."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([arrivalsFor(initialDate), activeTemplates()]).then(([loadedArrivals, loadedTemplates]) => {
      if (!active) return;
      setArrivals(loadedArrivals); setTemplates(loadedTemplates); setTemplateId(loadedTemplates[0]?.id ?? "");
    }).catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "The check-in workspace could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [initialDate]);

  async function start(arrivalId?: string) {
    if (!templateId) { setError("Publish an active agreement template before starting check-in."); return; }
    setPending(true); setError("");
    try {
      const response = await fetch("/api/signing/sessions", {
        method: "POST", headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ arrivalId, arrivalDate: date, templatePageId: templateId }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      window.location.assign(((await response.json()) as { url: string }).url);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Signing could not be started."); setPending(false); }
  }

  return <div className="mt-8 space-y-6">
    {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-[var(--danger)]" role="alert">{error}</p> : null}
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event: FormEvent) => { event.preventDefault(); void load(date); }}>
        <div><label className="mb-2 block text-sm font-bold" htmlFor="arrival-date">Arrival date</label><input className="min-h-12 rounded-xl border border-[var(--border)] px-4" id="arrival-date" onChange={(event) => setDate(event.target.value)} type="date" value={date} /></div>
        <button className="min-h-12 rounded-xl border border-[var(--border)] px-5 font-bold" type="submit">Load arrivals</button>
        {templates.length > 1 ? <div className="min-w-64 flex-1"><label className="mb-2 block text-sm font-bold" htmlFor="agreement">Agreement</label><select className="min-h-12 w-full rounded-xl border border-[var(--border)] px-4" id="agreement" onChange={(event) => setTemplateId(event.target.value)} value={templateId}>{templates.map((template) => <option key={template.id} value={template.id}>{template.name} · v{template.version}</option>)}</select></div> : null}
      </form>
    </section>
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Guest arrivals</h2><span className="text-sm text-[var(--muted)]">{arrivals.length} guests</span></div>
      <p className="mt-1 text-sm text-[var(--muted)]">Choose a guest, or choose Walk-In. Guest details are entered on the next screen.</p>
      {loading ? <p className="mt-6 text-[var(--muted)]">Loading arrivals…</p> : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {arrivals.map((arrival) => <button className="min-h-24 rounded-xl border border-[var(--border)] p-4 text-left transition hover:border-[var(--brand)] hover:bg-[var(--accent)] disabled:opacity-50" disabled={pending || arrival.signingStatus === "signed"} key={arrival.id} onClick={() => void start(arrival.id)} type="button"><span className="block text-lg font-bold">{arrival.name}</span><span className="mt-1 block text-sm capitalize text-[var(--muted)]">{arrival.signingStatus.replaceAll("_", " ")}</span></button>)}
        <button className="min-h-24 rounded-xl border-2 border-dashed border-[var(--brand)] p-4 text-left text-[var(--brand)] transition hover:bg-[var(--accent)] disabled:opacity-50" disabled={pending} onClick={() => void start()} type="button"><span className="block text-lg font-bold">+ Walk-In</span><span className="mt-1 block text-sm">Enter the guest name on the next screen</span></button>
      </div>
    </section>
  </div>;
}
