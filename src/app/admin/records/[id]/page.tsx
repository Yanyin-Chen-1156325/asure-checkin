import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeading } from "@/components/ui/page-heading";
import { RetryButton } from "@/components/records/retry-button";
import { getGuestsRepository } from "@/lib/notion/guests-repository";

export default async function RecordDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) notFound();
  const record = await getGuestsRepository().getRecord(id).catch(() => null);
  if (!record) notFound();
  return <div className="mx-auto max-w-5xl">
    <PageHeading
      action={
        <Link className="flex min-h-11 w-fit shrink-0 items-center gap-2 rounded-lg px-2 font-bold text-[var(--brand)] transition hover:bg-[var(--accent)] hover:text-[var(--brand-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]" href="/admin/records">
          <span aria-hidden="true">←</span>
          Back to records
        </Link>
      }
      eyebrow="Guest record"
      title={record.name}
      description="Completed registration card and guest details."
    />
    <dl className="mt-8 grid gap-4 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm sm:grid-cols-2">
      <Detail label="Arrival date" value={record.arrivalDate} /><Detail label="Status" value={record.signingStatus.replaceAll("_", " ")} />
      <Detail label="Email" value={record.email || "Not supplied"} /><Detail label="Phone" value={record.phone || "Not supplied"} /><Detail label="Vehicle" value={record.vehicle || "Not supplied"} /><Detail label="Guest type" value={record.source === "walk_in" ? "Walk-In" : "Booking"} />
      <Detail label="Signed" value={record.signedAt ? new Intl.DateTimeFormat("en-NZ", { dateStyle: "long", timeStyle: "short" }).format(new Date(record.signedAt)) : "Not completed"} />
      <Detail label="Template version" value={record.templateVersion ? `Version ${record.templateVersion}` : "Not assigned"} />
      <Detail label="Signing ID" value={record.signingId || "Not assigned"} /><Detail label="Agreement hash" value={record.agreementHash || "Not available"} />
      {record.lastError ? <Detail label="Recovery note" value={record.lastError} /> : null}
    </dl>
    <div className="mt-6 flex flex-wrap gap-3">{record.signingStatus === "signed" ? <a className="inline-flex min-h-12 items-center rounded-xl bg-[var(--brand)] px-5 font-bold text-white" href={`/api/records/${record.id}/pdf`} rel="noreferrer" target="_blank">Open signed PDF</a> : null}{record.signingStatus === "needs_attention" ? <RetryButton recordId={record.id} /> : null}</div>
  </div>;
}

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div><dt className="text-sm font-bold text-[var(--muted)]">{label}</dt><dd className="mt-1">{value}</dd></div>;
}
