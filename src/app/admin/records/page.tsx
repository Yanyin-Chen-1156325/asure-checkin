import { PageHeading } from "@/components/ui/page-heading";

export default function RecordsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading eyebrow="Records" title="Signed guest records" description="Authenticated search and PDF retrieval will be implemented in Step 6." />
      <div className="mt-8 min-h-72 rounded-2xl border border-dashed border-[var(--border)] bg-white p-8 text-center text-[var(--muted)]">No guest records are queried in the project foundation.</div>
    </div>
  );
}
