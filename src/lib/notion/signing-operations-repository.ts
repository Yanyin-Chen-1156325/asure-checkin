import "server-only";

import { isFullDataSource, isFullPage, type Client, type DataSourceObjectResponse, type PageObjectResponse } from "@notionhq/client";

import { deserializeJournalBody, serializeJournalBody, type AgreementSnapshot, type JournalBody } from "../signing/snapshot";
import { getNotionClient } from "./client";
import { getNotionSigningConfig } from "./config";
import { NotionServiceError, toNotionServiceError } from "./errors";

export type SigningState = "prepared" | "accepted" | "pdf_generated" | "pdf_uploaded" | "completed" | "needs_attention";
export type SigningOperation = Readonly<{
  pageId: string; signingId: string; guestPageId: string; state: SigningState; templateId: string; templateVersion: number;
  snapshotHash: string; pdfUploadId: string; retryCount: number; acceptedAt: string; completedAt: string; error: string; body: JournalBody;
}>;

type SigningClient = Pick<Client, "dataSources" | "pages">;
const statusName: Record<SigningState, string> = { prepared: "Prepared", accepted: "Accepted", pdf_generated: "PDF Generated", pdf_uploaded: "PDF Uploaded", completed: "Completed", needs_attention: "Needs Attention" };
const text = (value: string) => value ? [{ type: "text" as const, text: { content: value.slice(0, 2000) } }] : [];

function plain(property: PageObjectResponse["properties"][string] | undefined): string {
  if (property?.type === "title") return property.title.map((item) => item.plain_text).join("");
  if (property?.type === "rich_text") return property.rich_text.map((item) => item.plain_text).join("");
  return "";
}

function schemaProblems(properties: DataSourceObjectResponse["properties"]): string[] {
  const required = { "Signing ID": "title", "Guest Page ID": "rich_text", State: "select", "Template ID": "rich_text", "Template Version": "number", "Snapshot Hash": "rich_text", "PDF File Upload ID": "rich_text", Error: "rich_text", "Retry Count": "number", "Accepted At": "date", "Completed At": "date" } as const;
  return Object.entries(required).flatMap(([name, type]) => !properties[name] ? [`Missing property: ${name}`] : properties[name].type !== type ? [`${name} must be ${type}`] : []);
}

export class NotionSigningOperationsRepository {
  private schemaExpiresAt = 0;
  constructor(private readonly client: SigningClient, private readonly dataSourceId: string, private readonly now: () => number = Date.now) {}

  async createPrepared(snapshot: AgreementSnapshot): Promise<SigningOperation> {
    await this.ensureSchema();
    const existing = await this.find(snapshot.signingId);
    if (existing) return existing;
    try {
      const page = await this.client.pages.create({ parent: { type: "data_source_id", data_source_id: this.dataSourceId }, properties: {
        "Signing ID": { title: text(snapshot.signingId) }, "Guest Page ID": { rich_text: [] }, State: { select: { name: statusName.prepared } },
        "Template ID": { rich_text: text(snapshot.templateId) }, "Template Version": { number: snapshot.templateVersion }, "Snapshot Hash": { rich_text: [] },
        "PDF File Upload ID": { rich_text: [] }, Error: { rich_text: [] }, "Retry Count": { number: 0 }, "Accepted At": { date: null }, "Completed At": { date: null },
      }, markdown: serializeJournalBody({ snapshot }), markdown_version: "v2" });
      if (!isFullPage(page)) throw new NotionServiceError("invalid_response", "Notion returned an incomplete signing operation.");
      return this.readPage(page);
    } catch (error) { throw toNotionServiceError(error); }
  }

  async get(signingId: string): Promise<SigningOperation> {
    await this.ensureSchema();
    const operation = await this.find(signingId);
    if (!operation) throw new NotionServiceError("not_found", "The signing operation was not found.");
    return operation;
  }

  async setGuestPageId(operation: SigningOperation, guestPageId: string): Promise<SigningOperation> {
    return this.update(operation, { "Guest Page ID": { rich_text: text(guestPageId) } });
  }

  async accept(operation: SigningOperation, snapshot: AgreementSnapshot, signature: string, hash: string): Promise<SigningOperation> {
    await this.client.pages.updateMarkdown({ page_id: operation.pageId, markdown_version: "v2", type: "replace_content", replace_content: { new_str: serializeJournalBody({ snapshot, signature }), allow_deleting_content: true } });
    return this.update(operation, { State: { select: { name: statusName.accepted } }, "Snapshot Hash": { rich_text: text(hash) }, "Accepted At": { date: { start: snapshot.acceptedAt! } }, Error: { rich_text: [] } });
  }

  async advance(operation: SigningOperation, state: SigningState, options: Readonly<{ pdfUploadId?: string; error?: string; incrementRetry?: boolean }> = {}): Promise<SigningOperation> {
    return this.update(operation, {
      State: { select: { name: statusName[state] } },
      ...(options.pdfUploadId !== undefined ? { "PDF File Upload ID": { rich_text: text(options.pdfUploadId) } } : {}),
      ...(options.error !== undefined ? { Error: { rich_text: text(options.error.replace(/[\r\n]+/g, " ").slice(0, 500)) } } : {}),
      ...(options.incrementRetry ? { "Retry Count": { number: operation.retryCount + 1 } } : {}),
    });
  }

  async complete(operation: SigningOperation, completedAt: string): Promise<SigningOperation> {
    await this.client.pages.updateMarkdown({ page_id: operation.pageId, markdown_version: "v2", type: "replace_content", replace_content: { new_str: serializeJournalBody({ snapshot: operation.body.snapshot }), allow_deleting_content: true } });
    return this.update(operation, { State: { select: { name: statusName.completed } }, "Completed At": { date: { start: completedAt } }, Error: { rich_text: [] } });
  }

  private async update(operation: SigningOperation, properties: Parameters<SigningClient["pages"]["update"]>[0]["properties"]): Promise<SigningOperation> {
    try {
      await this.client.pages.update({ page_id: operation.pageId, properties });
      return this.get(operation.signingId);
    } catch (error) { throw toNotionServiceError(error); }
  }

  private async find(signingId: string): Promise<SigningOperation | null> {
    try {
      const response = await this.client.dataSources.query({ data_source_id: this.dataSourceId, filter: { property: "Signing ID", title: { equals: signingId } }, page_size: 1, result_type: "page" });
      const page = response.results.find(isFullPage);
      return page ? this.readPage(page) : null;
    } catch (error) { throw toNotionServiceError(error); }
  }

  private async readPage(page: PageObjectResponse): Promise<SigningOperation> {
    const markdown = await this.client.pages.retrieveMarkdown({ page_id: page.id, markdown_version: "v2" });
    const state = Object.entries(statusName).find(([, name]) => name === (page.properties.State?.type === "select" ? page.properties.State.select?.name : ""))?.[0] as SigningState | undefined;
    if (!state) throw new NotionServiceError("invalid_response", "Signing operation has an unknown state.");
    try {
      return { pageId: page.id, signingId: plain(page.properties["Signing ID"]), guestPageId: plain(page.properties["Guest Page ID"]), state,
        templateId: plain(page.properties["Template ID"]), templateVersion: page.properties["Template Version"]?.type === "number" ? page.properties["Template Version"].number ?? 0 : 0,
        snapshotHash: plain(page.properties["Snapshot Hash"]), pdfUploadId: plain(page.properties["PDF File Upload ID"]), retryCount: page.properties["Retry Count"]?.type === "number" ? page.properties["Retry Count"].number ?? 0 : 0,
        acceptedAt: page.properties["Accepted At"]?.type === "date" ? page.properties["Accepted At"].date?.start ?? "" : "", completedAt: page.properties["Completed At"]?.type === "date" ? page.properties["Completed At"].date?.start ?? "" : "",
        error: plain(page.properties.Error), body: deserializeJournalBody(markdown.markdown) };
    } catch (error) { throw new NotionServiceError("invalid_response", "Signing operation content is invalid.", { cause: error }); }
  }

  private async ensureSchema(): Promise<void> {
    if (this.schemaExpiresAt > this.now()) return;
    try {
      const source = await this.client.dataSources.retrieve({ data_source_id: this.dataSourceId });
      if (!isFullDataSource(source)) throw new NotionServiceError("invalid_response", "Notion returned an incomplete signing schema.");
      const problems = schemaProblems(source.properties);
      if (problems.length) throw new NotionServiceError("schema", `Signing Operations schema mismatch: ${problems.join("; ")}`);
      this.schemaExpiresAt = this.now() + 5 * 60_000;
    } catch (error) { throw toNotionServiceError(error); }
  }
}

let repository: NotionSigningOperationsRepository | undefined;
export function getSigningOperationsRepository(): NotionSigningOperationsRepository {
  if (!repository) repository = new NotionSigningOperationsRepository(getNotionClient(), getNotionSigningConfig().signingDataSourceId);
  return repository;
}
