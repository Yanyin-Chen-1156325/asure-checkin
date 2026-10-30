import "server-only";

import { isFullDataSource, isFullPage, type Client, type PageObjectResponse } from "@notionhq/client";

import type { Arrival, ContactUpdate, WalkInInput } from "@/lib/arrivals/schema";
import { getNotionClient } from "./client";
import { getNotionConfig } from "./config";
import { NotionServiceError, toNotionServiceError } from "./errors";
import { contactProperties, mapGuestPage, walkInProperties } from "./guest-mapper";
import { resolveGuestSchema, type GuestSchemaMapping } from "./guests-schema";

type NotionGuestsClient = Pick<Client, "dataSources" | "pages">;

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
