import { FeatureCard } from "@/components/ui/feature-card";
import { PageHeading } from "@/components/ui/page-heading";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading title="Good morning" description="The operational dashboard will connect to authenticated Notion data in later milestones." />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <FeatureCard title="Today’s arrivals">Arrival data begins in Step 3.</FeatureCard>
        <FeatureCard title="Pending signatures">Signing workflows begin in Step 5.</FeatureCard>
        <FeatureCard title="Recent records">Signed records begin in Step 6.</FeatureCard>
      </div>
    </div>
  );
}
