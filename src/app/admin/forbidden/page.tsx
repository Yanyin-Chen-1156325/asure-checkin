import { ButtonLink } from "@/components/ui/button-link";
import { PageHeading } from "@/components/ui/page-heading";

export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeading eyebrow="Access denied" title="Owner access is required" description="Your account does not have permission to open this area." />
      <div className="mt-7"><ButtonLink href="/admin">Return to overview</ButtonLink></div>
    </div>
  );
}
