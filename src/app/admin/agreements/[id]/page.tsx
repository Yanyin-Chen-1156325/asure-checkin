import { PageHeading } from "@/components/ui/page-heading";
import { requirePageRole } from "@/lib/auth/current-session";
import { TemplateEditor } from "@/components/templates/template-editor";

export default async function AgreementDetailPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await requirePageRole("owner");
  const { id } = await params;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeading eyebrow="Agreement" title="Template editor" description="Edit the agreement, apply warning highlights, and preview the same document guests will sign." />
      <TemplateEditor id={id} />
    </div>
  );
}
