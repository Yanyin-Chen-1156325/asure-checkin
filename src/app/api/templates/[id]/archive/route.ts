import { handleTemplateAction } from "@/lib/templates/action-handler";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleTemplateAction(request, (await context.params).id, "archive");
}
