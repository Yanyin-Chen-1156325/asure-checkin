import "server-only";

import { serverEnvironment } from "@/lib/env/server";

export const NOTION_API_VERSION = "2026-03-11";

export type NotionConfig = Readonly<{
  token: string;
  arrivalsDataSourceId: string;
  arrivalsDatabaseId?: string;
}>;

export type NotionTemplatesConfig = Readonly<{
  token: string;
  templatesDataSourceId: string;
  templatesDatabaseId?: string;
}>;

export type NotionSigningConfig = Readonly<{
  signingDataSourceId: string;
  signingDatabaseId?: string;
}>;

function requireValue(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required Notion configuration: ${name}`);
  return value;
}

export function getNotionConfig(): NotionConfig {
  return {
    token: requireValue("NOTION_TOKEN", serverEnvironment.NOTION_TOKEN),
    arrivalsDataSourceId: requireValue(
      "NOTION_ARRIVALS_DATA_SOURCE_ID",
      serverEnvironment.NOTION_ARRIVALS_DATA_SOURCE_ID,
    ),
    arrivalsDatabaseId: serverEnvironment.NOTION_ARRIVALS_DATABASE_ID || undefined,
  };
}

export function getNotionToken(): string {
  return requireValue("NOTION_TOKEN", serverEnvironment.NOTION_TOKEN);
}

export function getNotionTemplatesConfig(): NotionTemplatesConfig {
  return {
    token: getNotionToken(),
    templatesDataSourceId: requireValue("NOTION_TEMPLATES_DATA_SOURCE_ID", serverEnvironment.NOTION_TEMPLATES_DATA_SOURCE_ID),
    templatesDatabaseId: serverEnvironment.NOTION_TEMPLATES_DATABASE_ID || undefined,
  };
}

export function getNotionSigningConfig(): NotionSigningConfig {
  return {
    signingDataSourceId: requireValue("NOTION_SIGNING_OPERATIONS_DATA_SOURCE_ID", serverEnvironment.NOTION_SIGNING_OPERATIONS_DATA_SOURCE_ID),
    signingDatabaseId: serverEnvironment.NOTION_SIGNING_OPERATIONS_DATABASE_ID || undefined,
  };
}
