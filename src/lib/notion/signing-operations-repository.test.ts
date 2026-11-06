import type { DataSourceObjectResponse, PageObjectResponse } from "@notionhq/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({ getNotionClient: vi.fn() }));
vi.mock("./config", () => ({ getNotionSigningConfig: vi.fn() }));

import { createPreparedSnapshot, serializeJournalBody } from "../signing/snapshot";
import { defaultTemplateContent, defaultTemplateId, defaultTemplateName } from "../templates/content";
import { NotionSigningOperationsRepository } from "./signing-operations-repository";

const rich = (value: string) => [{ type: "text", plain_text: value, href: null, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: "default" }, text: { content: value, link: null } }];
const schema = Object.fromEntries(Object.entries({
  "Signing ID": "title", "Guest Page ID": "rich_text", State: "select", "Template ID": "rich_text", "Template Version": "number",
  "Snapshot Hash": "rich_text", "PDF File Upload ID": "rich_text", Error: "rich_text", "Retry Count": "number", "Accepted At": "date", "Completed At": "date",
}).map(([name, type]) => [name, { type }])) as unknown as DataSourceObjectResponse["properties"];

describe("NotionSigningOperationsRepository", () => {
  it("creates one prepared operation and reuses it by signing ID", async () => {
    const snapshot = createPreparedSnapshot({ signingId: "11111111-1111-4111-8111-111111111111", templateId: defaultTemplateId, templateVersion: 1, templateName: defaultTemplateName, content: defaultTemplateContent,
      guest: { name: "Alex Smith", email: "alex@example.com", phone: "", vehicle: "", arrivalDate: "2026-10-31", source: "arrival" } });
    const page = { object: "page", id: "22222222-2222-4222-8222-222222222222", url: "https://notion.so/operation", parent: { type: "data_source_id", data_source_id: "operations" }, properties: {
      "Signing ID": { type: "title", title: rich(snapshot.signingId) }, "Guest Page ID": { type: "rich_text", rich_text: [] }, State: { type: "select", select: { name: "Prepared" } },
      "Template ID": { type: "rich_text", rich_text: rich(snapshot.templateId) }, "Template Version": { type: "number", number: 1 }, "Snapshot Hash": { type: "rich_text", rich_text: [] },
      "PDF File Upload ID": { type: "rich_text", rich_text: [] }, Error: { type: "rich_text", rich_text: [] }, "Retry Count": { type: "number", number: 0 }, "Accepted At": { type: "date", date: null }, "Completed At": { type: "date", date: null },
    } } as unknown as PageObjectResponse;
    const query = vi.fn().mockResolvedValueOnce({ results: [], has_more: false }).mockResolvedValue({ results: [page], has_more: false });
    const create = vi.fn().mockResolvedValue(page);
    const client = { dataSources: { retrieve: vi.fn().mockResolvedValue({ object: "data_source", title: [], properties: schema }), query }, pages: {
      create, retrieveMarkdown: vi.fn().mockResolvedValue({ markdown: serializeJournalBody({ snapshot }) }), update: vi.fn(), updateMarkdown: vi.fn(),
    } };
    const repository = new NotionSigningOperationsRepository(client as never, "operations");

    await expect(repository.createPrepared(snapshot)).resolves.toMatchObject({ signingId: snapshot.signingId, state: "prepared", templateVersion: 1 });
    await expect(repository.createPrepared(snapshot)).resolves.toMatchObject({ signingId: snapshot.signingId });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ parent: { type: "data_source_id", data_source_id: "operations" } }));
  });
});
