import type { DataSourceObjectResponse, PageObjectResponse } from "@notionhq/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({ getNotionClient: vi.fn() }));
vi.mock("./config", () => ({ getNotionTemplatesConfig: vi.fn() }));

import { defaultTemplateContent } from "../templates/content";
import { serializeTemplateContent } from "../templates/serialization";
import { NotionTemplatesRepository } from "./templates-repository";

function schema(): DataSourceObjectResponse["properties"] {
  return {
    "Name": { id: "name", name: "Name", type: "title" },
    "Template ID": { id: "tid", name: "Template ID", type: "rich_text" },
    "Version": { id: "version", name: "Version", type: "number" },
    "Status": { id: "status", name: "Status", type: "select", select: { options: ["draft", "active", "archived"].map((name) => ({ id: name, name, color: "default" })) } },
    "Created/Updated At": { id: "date", name: "Created/Updated At", type: "date" },
  } as unknown as DataSourceObjectResponse["properties"];
}

function page(status: "draft" | "active" | "archived", version: number, id = "11111111-1111-1111-1111-111111111111"): PageObjectResponse {
  const text = (value: string) => [{ type: "text", plain_text: value, href: null, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: "default" }, text: { content: value, link: null } }];
  return {
    object: "page", id, url: `https://notion.so/${id}`, last_edited_time: "2026-10-30T00:00:00.000Z",
    parent: { type: "data_source_id", data_source_id: "templates-source", database_id: "templates-db" },
    properties: {
      "Name": { id: "name", type: "title", title: text("Guest Agreement") },
      "Template ID": { id: "tid", type: "rich_text", rich_text: text("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa") },
      "Version": { id: "version", type: "number", number: version },
      "Status": { id: "status", type: "select", select: { id: status, name: status, color: "default" } },
    },
  } as unknown as PageObjectResponse;
}

function client(pageToRetrieve: PageObjectResponse) {
  return {
    dataSources: {
      retrieve: vi.fn().mockResolvedValue({ object: "data_source", id: "templates-source", title: [], properties: schema() }),
      query: vi.fn().mockResolvedValue({ object: "list", results: [page("active", 1, "22222222-2222-2222-2222-222222222222")], has_more: false, next_cursor: null }),
    },
    pages: {
      retrieve: vi.fn().mockResolvedValue(pageToRetrieve),
      retrieveMarkdown: vi.fn().mockResolvedValue({ markdown: serializeTemplateContent(defaultTemplateContent) }),
      updateMarkdown: vi.fn(),
      update: vi.fn().mockImplementation(({ page_id }: { page_id: string }) => Promise.resolve(page("archived", 1, page_id))),
      create: vi.fn().mockResolvedValue(page("active", 2, "33333333-3333-3333-3333-333333333333")),
    },
  };
}

describe("NotionTemplatesRepository", () => {
  it("reuses the existing default template instead of creating a duplicate", async () => {
    const notion = client(page("active", 1));
    const repository = new NotionTemplatesRepository(notion as never, "templates-source");
    await repository.ensureDefaultTemplate();
    expect(notion.pages.create).not.toHaveBeenCalled();
  });

  it("creates the default template when the data source is empty", async () => {
    const notion = client(page("active", 1));
    notion.dataSources.query.mockResolvedValueOnce({ object: "list", results: [], has_more: false, next_cursor: null });
    const repository = new NotionTemplatesRepository(notion as never, "templates-source");
    await Promise.all([repository.ensureDefaultTemplate(), repository.ensureDefaultTemplate()]);
    expect(notion.pages.create).toHaveBeenCalledTimes(1);
    expect(notion.pages.create).toHaveBeenCalledWith(expect.objectContaining({ markdown: expect.stringContaining("ASURE_TEMPLATE_JSON_V1") }));
  });

  it("never overwrites published content", async () => {
    const notion = client(page("active", 1));
    const repository = new NotionTemplatesRepository(notion as never, "templates-source");
    await expect(repository.saveDraft("11111111-1111-1111-1111-111111111111", { name: "Changed", content: defaultTemplateContent })).rejects.toMatchObject({ kind: "schema" });
    expect(notion.pages.updateMarkdown).not.toHaveBeenCalled();
  });

  it("publishes a new version and archives the previous active metadata", async () => {
    const notion = client(page("draft", 0));
    const repository = new NotionTemplatesRepository(notion as never, "templates-source");
    const published = await repository.publish("11111111-1111-1111-1111-111111111111");
    expect(published.version).toBe(2);
    expect(notion.pages.create).toHaveBeenCalledWith(expect.objectContaining({ parent: { type: "data_source_id", data_source_id: "templates-source" } }));
    expect(notion.pages.update).toHaveBeenCalledWith(expect.objectContaining({ page_id: "22222222-2222-2222-2222-222222222222" }));
    expect(notion.pages.updateMarkdown).not.toHaveBeenCalled();
  });
});
