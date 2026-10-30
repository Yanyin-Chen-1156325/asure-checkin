import { PageHeading } from "@/components/ui/page-heading";
import { requirePageRole } from "@/lib/auth/current-session";
import { TemplateList } from "@/components/templates/template-list";

export default async function AgreementsPage() {
  await requirePageRole("owner");
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading eyebrow="Owner workspace" title="Agreement templates" description="Create drafts, edit the complete agreement, publish immutable versions, duplicate, preview, and archive." />
      <TemplateList />
    </div>
  );
}
