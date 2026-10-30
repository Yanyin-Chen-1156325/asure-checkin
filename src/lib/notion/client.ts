import "server-only";

import { Client } from "@notionhq/client";

import { getNotionToken, NOTION_API_VERSION } from "./config";

let client: Client | undefined;

export function getNotionClient(): Client {
  if (!client) {
    client = new Client({
      auth: getNotionToken(),
      notionVersion: NOTION_API_VERSION,
      timeoutMs: 15_000,
      retry: { maxRetries: 2, initialRetryDelayMs: 750, maxRetryDelayMs: 60_000 },
    });
  }
  return client;
}
