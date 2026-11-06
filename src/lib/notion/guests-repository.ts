import "server-only";

import { isFullDataSource, isFullPage, type Client, type PageObjectResponse } from "@notionhq/client";

import type { Arrival, ContactUpdate, WalkInInput } from "@/lib/arrivals/schema";
import { getNotionClient } from "./client";
import { getNotionConfig } from "./config";
import { NotionServiceError, toNotionServiceError } from "./errors";
import { contactProperties, mapGuestPage, plainProperty, walkInProperties } from "./guest-mapper";
import { resolveGuestSchema, type GuestSchemaMapping } from "./guests-schema";

type NotionGuestsClient = Pick<Client, "dataSources" | "pages" | "fileUploads">;
export type GuestRecord = Arrival & Readonly<{ signedAt: string; templateId: string; templateVersion: number; signingId: string; agreementHash: string; lastError: string }>;
export type SignedRecord = GuestRecord;
export type SigningMetadata = Readonly<{ signingId: string; templateId: string; templateVersion: number; agreementHash: string; signedAt: string }>;
const text = (value: string) => value ? [{ type: "text" as const, text: { content: value.slice(0, 2000) } }] : [];

export class NotionGuestsRepository {
  private schemaCache?: { mapping: GuestSchemaMapping; expiresAt: number };

  constructor(
    private readonly client: NotionGuestsClient,
    private readonly dataSourceId: string,
    private readonly now: () => number = Date.now,
  ) {}

  async listByArrivalDate(arrivalDate: string): Promise<Arrival[]> {
    await this.ensureSchema();
    try {
      const arrivals: Arrival[] = [];
      let cursor: string | undefined;
      do {
        const response = await this.client.dataSources.query({
          data_source_id: this.dataSourceId,
          filter: { property: "Arrival Date", date: { equals: arrivalDate } },
          sorts: [{ property: "Name", direction: "ascending" }],
          page_size: 100,
          start_cursor: cursor,
          result_type: "page",
        });
        for (const result of response.results) {
          if (isFullPage(result)) arrivals.push(mapGuestPage(result));
        }
        cursor = response.has_more && arrivals.length < 500 ? response.next_cursor ?? undefined : undefined;
      } while (cursor);
      return arrivals;
    } catch (error) {
      throw toNotionServiceError(error);
    }
  }

  async listSigned(): Promise<SignedRecord[]> {
    return this.listRecords({ status: "signed" });
  }

  async listRecords(filters: Readonly<{ date?: string; name?: string; status?: Arrival["signingStatus"] }> = {}): Promise<GuestRecord[]> {
    const mapping = await this.ensureSchema();
    try {
      const records: GuestRecord[] = [];
      const conditions: Array<Record<string, unknown>> = [];
      if (filters.date) conditions.push({ property: "Arrival Date", date: { equals: filters.date } });
      if (filters.name) conditions.push({ property: "Name", title: { contains: filters.name } });
      if (filters.status) {
        const status = filters.status === "signed" ? mapping.signedStatusName : filters.status === "pending" ? mapping.initialStatusName : mapping.statusType === "status" ? "Pending" : filters.status;
        conditions.push(mapping.statusType === "status" ? { property: "Signing Status", status: { equals: status } } : { property: "Signing Status", select: { equals: status } });
      }
      let cursor: string | undefined;
      do {
        const response = await this.client.dataSources.query({ data_source_id: this.dataSourceId,
          filter: conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] as never : { and: conditions } as never,
          sorts: [{ timestamp: "last_edited_time", direction: "descending" }], page_size: 100, start_cursor: cursor, result_type: "page" });
        for (const result of response.results) if (isFullPage(result)) records.push(this.mapRecord(result));
        cursor = response.has_more && records.length < 500 ? response.next_cursor ?? undefined : undefined;
      } while (cursor);
      return records;
    } catch (error) { throw toNotionServiceError(error); }
  }

  async getSignedRecord(pageId: string): Promise<SignedRecord> {
    const record = await this.getRecord(pageId);
    if (record.signingStatus !== "signed") throw new NotionServiceError("not_found", "The signed record was not found.");
    return record;
  }

  async getRecord(pageId: string): Promise<GuestRecord> {
    await this.ensureSchema();
    try {
      const page = await this.client.pages.retrieve({ page_id: pageId });
      if (!isFullPage(page) || !this.belongsToGuestsDataSource(page)) throw new NotionServiceError("not_found", "The signed record was not found.");
      return this.mapRecord(page);
    } catch (error) { throw toNotionServiceError(error); }
  }

  private mapRecord(page: PageObjectResponse): GuestRecord {
    return { ...mapGuestPage(page), signedAt: page.properties["Signed At"]?.type === "date" ? page.properties["Signed At"].date?.start ?? "" : "",
      templateId: plainProperty(page.properties["Template ID"]), templateVersion: page.properties["Template Version"]?.type === "number" ? page.properties["Template Version"].number ?? 0 : 0,
      signingId: plainProperty(page.properties["Signing ID"]), agreementHash: plainProperty(page.properties["Agreement Hash"]), lastError: plainProperty(page.properties["Last Error"]) };
  }

  async getSignedPdf(pageId: string): Promise<{ url: string; filename: string }> {
    await this.ensureSchema();
    try {
      const page = await this.client.pages.retrieve({ page_id: pageId });
      if (!isFullPage(page) || !this.belongsToGuestsDataSource(page) || mapGuestPage(page).signingStatus !== "signed") throw new NotionServiceError("not_found", "The signed PDF was not found.");
      const property = page.properties["Signed PDF"];
      const file = property?.type === "files" ? property.files.find((item) => item.type === "file") : undefined;
      if (!file || file.type !== "file" || !file.file.url.startsWith("https://")) throw new NotionServiceError("not_found", "The signed PDF was not found.");
      return { url: file.file.url, filename: file.name || "registration-card.pdf" };
    } catch (error) { throw toNotionServiceError(error); }
  }

  async createWalkIn(input: WalkInInput): Promise<Arrival> {
    const mapping = await this.ensureSchema();
    try {
      const page = await this.client.pages.create({
        parent: { type: "data_source_id", data_source_id: this.dataSourceId },
        properties: walkInProperties(input, mapping),
      });
      if (!isFullPage(page)) throw new NotionServiceError("invalid_response", "Notion returned an incomplete guest page.");
      return mapGuestPage(page);
    } catch (error) {
      throw toNotionServiceError(error);
    }
  }

  async get(pageId: string): Promise<Arrival> {
    await this.ensureSchema();
    try {
      const page = await this.client.pages.retrieve({ page_id: pageId });
      if (!isFullPage(page) || !this.belongsToGuestsDataSource(page)) throw new NotionServiceError("not_found", "The guest record was not found.");
      return mapGuestPage(page);
    } catch (error) {
      throw toNotionServiceError(error);
    }
  }

  async updateContact(pageId: string, input: ContactUpdate): Promise<Arrival> {
    const mapping = await this.ensureSchema();
    try {
      const existing = await this.client.pages.retrieve({ page_id: pageId });
      if (!isFullPage(existing) || !this.belongsToGuestsDataSource(existing)) {
        throw new NotionServiceError("not_found", "The guest record was not found in the configured arrivals data source.");
      }
      const page = await this.client.pages.update({
        page_id: pageId,
        properties: contactProperties(input, mapping.emailType),
      });
      if (!isFullPage(page)) throw new NotionServiceError("invalid_response", "Notion returned an incomplete guest page.");
      return mapGuestPage(page);
    } catch (error) {
      throw toNotionServiceError(error);
    }
  }

  async markSigningStarted(pageId: string, signingId: string): Promise<Arrival> {
    const mapping = await this.ensureSchema();
    try {
      const existing = await this.client.pages.retrieve({ page_id: pageId });
      if (!isFullPage(existing) || !this.belongsToGuestsDataSource(existing)) throw new NotionServiceError("not_found", "The guest record was not found.");
      if (mapGuestPage(existing).signingStatus === "signed") throw new NotionServiceError("schema", "This guest already has a completed registration card.");
      const page = await this.client.pages.update({ page_id: pageId, properties: {
        "Signing ID": { rich_text: text(signingId) }, "Last Error": { rich_text: [] },
        "Signing Status": mapping.statusType === "status" ? { status: { name: "Pending" } } : { select: { name: "in_progress" } },
      } });
      if (!isFullPage(page)) throw new NotionServiceError("invalid_response", "Notion returned an incomplete guest page.");
      return mapGuestPage(page);
    } catch (error) { throw toNotionServiceError(error); }
  }

  async uploadPdf(filename: string, pdf: Uint8Array): Promise<string> {
    await this.ensureSchema();
    try {
      const upload = await this.client.fileUploads.create({ mode: "single_part", filename, content_type: "application/pdf" });
      const pdfCopy = new Uint8Array(pdf.byteLength);
      pdfCopy.set(pdf);
      await this.client.fileUploads.send({
        file_upload_id: upload.id,
        file: { filename, data: new Blob([pdfCopy.buffer], { type: "application/pdf" }) },
      });
      return upload.id;
    } catch (error) { throw toNotionServiceError(error); }
  }

  async attachUploadedPdf(pageId: string, filename: string, uploadId: string, metadata: SigningMetadata): Promise<Arrival> {
    const mapping = await this.ensureSchema();
    try {
      const existing = await this.client.pages.retrieve({ page_id: pageId });
      if (!isFullPage(existing) || !this.belongsToGuestsDataSource(existing)) throw new NotionServiceError("not_found", "The guest record was not found.");
      const existingSigningId = plainProperty(existing.properties["Signing ID"]);
      if (mapGuestPage(existing).signingStatus === "signed") {
        const files = existing.properties["Signed PDF"];
        if (existingSigningId === metadata.signingId && files?.type === "files" && files.files.length > 0) return mapGuestPage(existing);
        if (existingSigningId !== metadata.signingId) throw new NotionServiceError("schema", "This guest already has a different signed registration card.");
      }
      const page = await this.client.pages.update({
        page_id: pageId,
        properties: {
          "Signed PDF": { files: [{ type: "file_upload", name: filename, file_upload: { id: uploadId } }] },
          "Signing Status": mapping.statusType === "status" ? { status: { name: mapping.signedStatusName } } : { select: { name: mapping.signedStatusName } },
          "Signed At": { date: { start: metadata.signedAt } }, "Template ID": { rich_text: text(metadata.templateId) }, "Template Version": { number: metadata.templateVersion },
          "Signing ID": { rich_text: text(metadata.signingId) }, "Agreement Hash": { rich_text: text(metadata.agreementHash) }, "PDF Upload ID": { rich_text: text(uploadId) }, "Last Error": { rich_text: [] },
        },
      });
      if (!isFullPage(page)) throw new NotionServiceError("invalid_response", "Notion returned an incomplete guest page.");
      const verified = await this.client.pages.retrieve({ page_id: pageId });
      const files = isFullPage(verified) ? verified.properties["Signed PDF"] : undefined;
      if (!isFullPage(verified) || mapGuestPage(verified).signingStatus !== "signed" || files?.type !== "files" || files.files.length === 0 || plainProperty(verified.properties["Signing ID"]) !== metadata.signingId) {
        throw new NotionServiceError("invalid_response", "The signed PDF attachment could not be verified.");
      }
      return mapGuestPage(verified);
    } catch (error) {
      throw toNotionServiceError(error);
    }
  }

  async markSigningError(pageId: string, message: string): Promise<void> {
    const mapping = await this.ensureSchema();
    try {
      await this.client.pages.update({ page_id: pageId, properties: {
        "Last Error": { rich_text: text(message.replace(/[\r\n]+/g, " ").slice(0, 500)) },
        "Signing Status": mapping.statusType === "status" ? { status: { name: "Pending" } } : { select: { name: "needs_attention" } },
      } });
    } catch (error) { throw toNotionServiceError(error); }
  }

  private belongsToGuestsDataSource(page: PageObjectResponse): boolean {
    return page.parent.type === "data_source_id" && page.parent.data_source_id === this.dataSourceId;
  }

  private async ensureSchema(): Promise<GuestSchemaMapping> {
    if (this.schemaCache && this.schemaCache.expiresAt > this.now()) return this.schemaCache.mapping;
    try {
      const dataSource = await this.client.dataSources.retrieve({ data_source_id: this.dataSourceId });
      if (!isFullDataSource(dataSource)) throw new NotionServiceError("invalid_response", "Notion returned an incomplete data source schema.");
      const mapping = resolveGuestSchema(dataSource.properties);
      this.schemaCache = { mapping, expiresAt: this.now() + 5 * 60_000 };
      return mapping;
    } catch (error) {
      throw toNotionServiceError(error);
    }
  }
}

let repository: NotionGuestsRepository | undefined;

export function getGuestsRepository(): NotionGuestsRepository {
  if (!repository) repository = new NotionGuestsRepository(getNotionClient(), getNotionConfig().arrivalsDataSourceId);
  return repository;
}
