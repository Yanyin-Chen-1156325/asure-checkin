import type { CreatePageParameters, PageObjectResponse, UpdatePageParameters } from "@notionhq/client";

import { templateSummarySchema, type TemplateSummary } from "../templates/schema";
import type { TemplateStatus } from "./template-types";

type CreateProperties = NonNullable<CreatePageParameters["properties"]>;
type UpdateProperties = NonNullable<UpdatePageParameters["properties"]>;

const text = (content: string) => [{ type: "text" as const, text: { content } }];
const notionStatusName = (status: TemplateStatus) => status.charAt(0).toUpperCase() + status.slice(1);

export function mapTemplateSummary(page: PageObjectResponse): TemplateSummary {
  const name = page.properties["Name"];
  const templateId = page.properties["Template ID"];
  const version = page.properties["Version"];
  const status = page.properties["Status"];
  return templateSummarySchema.parse({
    id: page.id,
    name: name?.type === "title" ? name.title.map((item) => item.plain_text).join("") : "",
    templateId: templateId?.type === "rich_text" ? templateId.rich_text.map((item) => item.plain_text).join("") : "",
    version: version?.type === "number" ? version.number : null,
    status: status?.type === "select" ? status.select?.name.toLowerCase() : undefined,
    updatedAt: page.last_edited_time,
  });
}

export function createTemplateProperties(name: string, templateId: string, version: number, status: TemplateStatus): CreateProperties {
  return {
    "Name": { title: text(name) },
    "Template ID": { rich_text: text(templateId) },
    "Version": { number: version },
    "Status": { select: { name: notionStatusName(status) } },
  };
}

export function updateDraftProperties(name: string): UpdateProperties {
  return { "Name": { title: text(name) } };
}

export function updateStatusProperties(status: TemplateStatus): UpdateProperties {
  return { "Status": { select: { name: notionStatusName(status) } } };
}
