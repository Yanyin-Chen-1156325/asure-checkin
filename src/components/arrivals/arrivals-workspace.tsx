"use client";

import { type FormEvent, type InputHTMLAttributes, useCallback, useEffect, useState } from "react";

import type { Arrival } from "@/lib/arrivals/schema";

type ApiFailure = { message?: string; requestId?: string };

function ErrorNotice({ message }: Readonly<{ message: string }>) {
  return message ? <p className="rounded-xl bg-red-50 p-4 text-sm text-[var(--danger)]" role="alert">{message}</p> : null;
}

async function responseError(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({})) as ApiFailure;
  const reference = body.requestId ? ` Reference: ${body.requestId}` : "";
  return `${body.message ?? "The request failed."}${reference}`;
}

async function fetchArrivals(arrivalDate: string): Promise<Arrival[]> {
  const response = await fetch(`/api/arrivals?date=${encodeURIComponent(arrivalDate)}`, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(await responseError(response));
  const body = await response.json() as { arrivals: Arrival[] };
  return body.arrivals;
}

export function ArrivalsWorkspace({ initialDate }: Readonly<{ initialDate: string }>) {
  const [date, setDate] = useState(initialDate);
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const selected = arrivals.find((arrival) => arrival.id === selectedId);

  const load = useCallback(async (arrivalDate: string) => {
    setLoading(true);
    setError("");
    try {
      const loaded = await fetchArrivals(arrivalDate);
      setArrivals(loaded);
      setSelectedId((current) => loaded.some((arrival) => arrival.id === current) ? current : undefined);
    } catch (caught) {
      setArrivals([]);
      setSelectedId(undefined);
      setError(caught instanceof Error ? caught.message : "Arrivals could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchArrivals(initialDate).then((loaded) => {
      if (active) setArrivals(loaded);
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : "Arrivals could not be loaded.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [initialDate]);

  async function createWalkIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/arrivals/walk-in", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          name: data.get("name"), arrivalDate: date, email: data.get("email"),
          phone: data.get("phone"), vehicle: data.get("vehicle"),
        }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const body = await response.json() as { arrival: Arrival };
      setArrivals((current) => [...current, body.arrival].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedId(body.arrival.id);
      form.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The walk-in could not be created.");
    } finally {
      setSaving(false);
    }
  }

  async function updateContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/arrivals/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ email: data.get("email"), phone: data.get("phone"), vehicle: data.get("vehicle") }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const body = await response.json() as { arrival: Arrival };
      setArrivals((current) => current.map((arrival) => arrival.id === body.arrival.id ? body.arrival : arrival));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Contact details could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <ErrorNotice message={error} />
      <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
        <label className="text-sm font-bold" htmlFor="arrival-date">Arrival date</label>
        <form className="mt-2 flex flex-wrap gap-3" onSubmit={(event) => { event.preventDefault(); void load(date); }}>
          <input className="min-h-12 rounded-xl border border-[var(--border)] px-4" id="arrival-date" onChange={(event) => setDate(event.target.value)} type="date" value={date} />
          <button className="min-h-12 rounded-xl border border-[var(--border)] px-5 font-bold hover:bg-[var(--background)]" type="submit">Load arrivals</button>
        </form>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Arriving guests</h2>
            <span className="text-sm text-[var(--muted)]">{arrivals.length} guests</span>
          </div>
          {loading ? <p className="mt-6 text-[var(--muted)]" aria-live="polite">Loading arrivals…</p> : null}
          {!loading && !arrivals.length ? <p className="mt-6 rounded-xl bg-[var(--background)] p-5 text-[var(--muted)]">No arrivals found for this date.</p> : null}
          <ul className="mt-4 space-y-2">
            {arrivals.map((arrival) => (
              <li key={arrival.id}>
                <button
                  className={`w-full rounded-xl border p-4 text-left transition ${selectedId === arrival.id ? "border-[var(--brand)] bg-[var(--accent)]" : "border-[var(--border)] hover:bg-[var(--background)]"}`}
                  onClick={() => setSelectedId(arrival.id)}
                  type="button"
                >
                  <span className="font-bold">{arrival.name}</span>
                  <span className="mt-1 block text-sm text-[var(--muted)]">{arrival.source === "walk_in" ? "Walk-in" : "Arrival"} · {arrival.signingStatus.replaceAll("_", " ")}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold">Add walk-in</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Creates a pending guest for {date}.</p>
            <form className="mt-5 space-y-4" onSubmit={createWalkIn}>
              <Field idPrefix="walk-in" label="Guest name" name="name" required maxLength={200} />
              <Field idPrefix="walk-in" label="Email" name="email" type="email" maxLength={254} />
              <Field idPrefix="walk-in" label="Phone" name="phone" type="tel" maxLength={50} />
              <Field idPrefix="walk-in" label="Vehicle registration" name="vehicle" maxLength={100} />
              <button className="min-h-12 w-full rounded-xl bg-[var(--brand)] px-5 font-bold text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving…" : "Add walk-in"}</button>
            </form>
          </section>

          {selected ? (
            <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-bold">{selected.name}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Edit contact details only.</p>
              <form className="mt-5 space-y-4" key={selected.id} onSubmit={updateContact}>
                <Field idPrefix="contact" defaultValue={selected.email} label="Email" name="email" type="email" maxLength={254} />
                <Field idPrefix="contact" defaultValue={selected.phone} label="Phone" name="phone" type="tel" maxLength={50} />
                <Field idPrefix="contact" defaultValue={selected.vehicle} label="Vehicle registration" name="vehicle" maxLength={100} />
                <button className="min-h-12 w-full rounded-xl border border-[var(--brand)] px-5 font-bold text-[var(--brand)] disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving…" : "Save contact details"}</button>
              </form>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({ idPrefix, label, name, ...input }: Readonly<{ idPrefix: string; label: string; name: string } & InputHTMLAttributes<HTMLInputElement>>) {
  const id = `${idPrefix}-${name}`;
  return (
    <div>
      <label className="mb-2 block text-sm font-bold" htmlFor={id}>{label}</label>
      <input className="min-h-12 w-full rounded-xl border border-[var(--border)] px-4" id={id} name={name} {...input} />
    </div>
  );
}
