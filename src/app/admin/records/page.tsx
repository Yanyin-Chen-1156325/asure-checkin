import type { Route } from "next";
import Link from "next/link";

import { PageHeading } from "@/components/ui/page-heading";
import { signingStatusSchema } from "@/lib/arrivals/schema";
import { getGuestsRepository, type GuestRecord } from "@/lib/notion/guests-repository";

export default async function RecordsPage({ searchParams }: Readonly<{ searchParams: Promise<{ date?: string; name?: string; status?: string }> }>) {
  const query = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(query.date ?? "") ? query.date : undefined;
  const name = (query.name ?? "").trim().slice(0, 200) || undefined;
  const parsedStatus = signingStatusSchema.safeParse(query.status);
  const status = parsedStatus.success ? parsedStatus.data : undefined;
  const result = await getGuestsRepository().listRecords({ date, name, status }).then((records) => ({ records, error: "" })).catch(() => ({ records: [] as GuestRecord[], error: "Guest records could not be loaded." }));
  return <div className="mx-auto max-w-6xl">
    <PageHeading eyebrow="Records" title="Guest records" description="Search signing progress, recover failures, and open immutable signed PDFs." />
    <form className="mt-8 grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm sm:grid-cols-4" method="get">
      <Field label="Arrival date"><input className="min-h-11 w-full rounded-lg border border-[var(--border)] px-3" defaultValue={date} name="date" type="date" /></Field>
      <Field label="Guest name"><input className="min-h-11 w-full rounded-lg border border-[var(--border)] px-3" defaultValue={name} maxLength={200} name="name" /></Field>
      <Field label="Status"><select className="min-h-11 w-full rounded-lg border border-[var(--border)] px-3" defaultValue={status ?? ""} name="status"><option value="">All statuses</option><option value="pending">Not started</option><option value="in_progress">In progress</option><option value="needs_attention">Needs attention</option><option value="signed">Signed</option></select></Field>
      <button className="min-h-11 self-end rounded-lg bg-[var(--brand)] px-4 font-bold text-white" type="submit">Search</button>
    </form>
    {result.error ? <p className="mt-6 rounded-xl bg-red-50 p-4 text-[var(--danger)]">{result.error}</p> : null}
    <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      {!result.records.length && !result.error ? <p className="p-8 text-center text-[var(--muted)]">No matching guest records.</p> : null}
      <ul className="divide-y divide-[var(--border)]">{result.records.map((record) => <li className="flex flex-wrap items-center justify-between gap-4 p-5" key={record.id}><div><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{record.name}</p><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${record.signingStatus === "signed" ? "bg-emerald-100 text-emerald-800" : record.signingStatus === "needs_attention" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{record.signingStatus.replaceAll("_", " ")}</span></div><p className="mt-1 text-sm text-[var(--muted)]">Arrival {record.arrivalDate}{record.signedAt ? ` · signed ${new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(record.signedAt))}` : ""}</p></div><div className="flex gap-2"><Link className="rounded-lg border border-[var(--border)] px-4 py-2 font-bold" href={`/admin/records/${record.id}` as Route}>Details</Link>{record.signingStatus === "signed" ? <a className="rounded-lg bg-[var(--brand)] px-4 py-2 font-bold text-white" href={`/api/records/${record.id}/pdf`} rel="noreferrer" target="_blank">PDF</a> : null}</div></li>)}</ul>
    </div>
  </div>;
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) { return <label className="text-sm font-bold">{label}<span className="mt-2 block font-normal">{children}</span></label>; }
