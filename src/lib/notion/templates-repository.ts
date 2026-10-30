import "server-only";

import { isFullDataSource, isFullPage, type Client, type PageObjectResponse } from "@notionhq/client";

import { defaultTemplateContent, type TemplateContent } from "../templates/content";
import type { SaveDraftInput, TemplateRecord, TemplateSummary } from "../templates/schema";
import { deserializeTemplateContent, serializeTemplateContent } from "../templates/serialization";
import { getNotionClient } from "./client";
import { getNotionTemplatesConfig } from "./config";
import { NotionServiceError, toNotionServiceError } from "./errors";
import { createTemplateProperties, mapTemplateSummary, updateDraftProperties, updateStatusProperties } from "./template-mapper";
import { assertTemplateSchema } from "./templates-schema";

type TemplatesClient = Pick<Client, "dataSources" | "pages">;

export class NotionTemplatesRepository {
  private schemaExpiresAt = 0;

  constructor(
    private readonly client: TemplatesClient,
    private readonly dataSourceId: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(includeInactive: boolean): Promise<TemplateSummary[]> {
    await this.ensureSchema();
    try {
      const results: TemplateSummary[] = [];
      let cursor: string | undefined;
      do {
        const response = await this.client.dataSources.query({
          data_source_id: this.dataSourceId,
          filter: includeInactive ? undefined : { property: "Status", select: { equals: "active" } },
          sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
          page_size: 100,
          start_cursor: cursor,
          result_type: "page",
        });
        for (const item of response.results) if (isFullPage(item)) results.push(mapTemplateSummary(item));
        cursor = response.has_more && results.length < 500 ? response.next_cursor ?? undefined : undefined;
      } while (cursor);
      return results;
    } catch (error) {
      throw toNotionServiceError(error);
    }
  }

  async get(pageId: string): Promise<TemplateRecord> {
    await this.ensureSchema();
    try {
      const page = await this.retrieveOwnedPage(pageId);
      const summary = mapTemplateSummary(page);
      const markdown = await this.client.pages.retrieveMarkdown({ page_id: pageId, markdown_version: "v2" });
      let content: TemplateContent;
      try { content = deserializeTemplateContent(markdown.markdown); }
      catch (error) { throw new NotionServiceError("invalid_response", "Agreement content could not be decoded.", { cause: error }); }
      return { ...summary, content };
    } catch (error) {
      throw toNotionServiceError(error);
    }
  }

  async createDraft(name: string, content: TemplateContent = defaultTemplateContent): Promise<TemplateRecord> {
    await this.ensureSchema();
    return this.createPage(name, crypto.randomUUID(), 0, "draft", content);
  }

  async saveDraft(pageId: string, input: SaveDraftInput): Promise<TemplateRecord> {
    const existing = await this.get(pageId);
    if (existing.status !== "draft") throw new NotionServiceError("schema", "Published or archived agreement content is immutable.");
    try {
      await this.client.pages.updateMarkdown({
        page_id: pageId,
        markdown_version: "v2",
        type: "replace_content",
        replace_content: { new_str: serializeTemplateContent(input.content), allow_deleting_content: true },
      });
      await this.client.pages.update({ page_id: pageId, properties: updateDraftProperties(input.name) });
      return this.get(pageId);
    } catch (error) {
      throw toNotionServiceError(error);
    }
  }

  async duplicate(pageId: string): Promise<TemplateRecord> {
    const source = await this.get(pageId);
    return this.createDraft(`${source.name} Copy`, source.content);
  }

  async publish(pageId: string): Promise<TemplateRecord> {
    const draft = await this.get(pageId);
    if (draft.status !== "draft") throw new NotionServiceError("schema", "Only a draft can be published.");
    const family = await this.queryTemplateFamily(draft.templateId);
    const nextVersion = Math.max(0, ...family.map((item) => item.version)) + 1;
    const published = await this.createPage(draft.name, draft.templateId, nextVersion, "active", draft.content);
    for (const previous of family.filter((item) => item.status === "active")) {
      await this.client.pages.update({ page_id: previous.id, properties: updateStatusProperties("archived") });
    }
    return published;
  }

  async archive(pageId: string): Promise<TemplateSummary> {
    await this.ensureSchema();
    try {
      await this.retrieveOwnedPage(pageId);
      const page = await this.client.pages.update({ page_id: pageId, properties: updateStatusProperties("archived") });
      if (!isFullPage(page)) throw new NotionServiceError("invalid_response", "Notion returned an incomplete agreement page.");
      return mapTemplateSummary(page);
    } catch (error) {
      throw toNotionServiceError(error);
    }
  }

  private async createPage(name: string, templateId: string, version: number, status: "draft" | "active", content: TemplateContent): Promise<TemplateRecord> {
    try {
      const page = await this.client.pages.create({
        parent: { type: "data_source_id", data_source_id: this.dataSourceId },
        properties: createTemplateProperties(name, templateId, version, status),
        markdown: serializeTemplateContent(content),
        markdown_version: "v2",
      });
      if (!isFullPage(page)) throw new NotionServiceError("invalid_response", "Notion returned an incomplete agreement page.");
      return { ...mapTemplateSummary(page), content };
    } catch (error) {
      throw toNotionServiceError(error);
    }
  }

  private async queryTemplateFamily(templateId: string): Promise<TemplateSummary[]> {
    try {
      const response = await this.client.dataSources.query({
        data_source_id: this.dataSourceId,
        filter: { property: "Template ID", rich_text: { equals: templateId } },
        page_size: 100,
        result_type: "page",
      });
      return response.results.filter(isFullPage).map(mapTemplateSummary);
    } catch (error) {
      throw toNotionServiceError(error);
    }
  }

  private async retrieveOwnedPage(pageId: string): Promise<PageObjectResponse> {
    const page = await this.client.pages.retrieve({ page_id: pageId });
    if (!isFullPage(page) || page.parent.type !== "data_source_id" || page.parent.data_source_id !== this.dataSourceId) {
      throw new NotionServiceError("not_found", "The agreement template was not found.");
    }
    return page;
  }

  private async ensureSchema(): Promise<void> {
    if (this.schemaExpiresAt > this.now().getTime()) return;
    try {
      const source = await this.client.dataSources.retrieve({ data_source_id: this.dataSourceId });
      if (!isFullDataSource(source)) throw new NotionServiceError("invalid_response", "Notion returned an incomplete template schema.");
      assertTemplateSchema(source.properties);
      this.schemaExpiresAt = this.now().getTime() + 5 * 60_000;
    } catch (error) {
      throw toNotionServiceError(error);
    }
  }
}

let repository: NotionTemplatesRepository | undefined;

export function getTemplatesRepository(): NotionTemplatesRepository {
  if (!repository) repository = new NotionTemplatesRepository(getNotionClient(), getNotionTemplatesConfig().templatesDataSourceId);
  return repository;
}
