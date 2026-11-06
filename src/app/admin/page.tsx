import { FeatureCard } from "@/components/ui/feature-card";
import { PageHeading } from "@/components/ui/page-heading";
import { serverEnvironment } from "@/lib/env/server";
import { getGuestsRepository } from "@/lib/notion/guests-repository";

export default async function AdminPage() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: serverEnvironment.APP_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const data = await Promise.all([getGuestsRepository().listByArrivalDate(today), getGuestsRepository().listRecords()])
    .then(([arrivals, records]) => ({ arrivals, records }))
    .catch(() => ({ arrivals: [], records: [] }));
  const attention = data.records.filter((record) => record.signingStatus === "needs_attention").length;
  const signed = data.records.filter((record) => record.signingStatus === "signed").length;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading title="Good morning" description="Use Arrivals to start guest signing, Agreements to manage immutable versions, and Records to retrieve signed PDFs." />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <FeatureCard title="Today’s arrivals"><span className="text-3xl font-bold text-[var(--foreground)]">{data.arrivals.length}</span><span className="mt-2 block">Guests scheduled for {today}.</span></FeatureCard>
        <FeatureCard title="Needs attention"><span className="text-3xl font-bold text-[var(--foreground)]">{attention}</span><span className="mt-2 block">Recoverable signing operations.</span></FeatureCard>
        <FeatureCard title="Signed records"><span className="text-3xl font-bold text-[var(--foreground)]">{signed}</span><span className="mt-2 block">Completed registration cards in Notion.</span></FeatureCard>
      </div>
    </div>
  );
}
