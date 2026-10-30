import { PageHeading } from "@/components/ui/page-heading";
import { ArrivalsWorkspace } from "@/components/arrivals/arrivals-workspace";

function todayInAuckland(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export default function ArrivalsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading eyebrow="Arrivals" title="Guest arrivals" description="Choose an arrival date, select a guest, update contact details, or register a walk-in." />
      <ArrivalsWorkspace initialDate={todayInAuckland()} />
    </div>
  );
}
