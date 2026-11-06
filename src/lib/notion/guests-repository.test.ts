import type { DataSourceObjectResponse, PageObjectResponse } from "@notionhq/client";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({ getNotionClient: vi.fn() }));
vi.mock("./config", () => ({ getNotionConfig: vi.fn() }));

import { NotionGuestsRepository } from "./guests-repository";

const rich = (value: string) => [{ type: "text", plain_text: value, href: null, annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false, color: "default" }, text: { content: value, link: null } }];
const schema = { "Name": { type: "title" }, "Arrival Date": { type: "date" }, "Type": { type: "select", select: { options: ["Walk-In", "Booking"].map((name) => ({ name })) } }, "Email": { type: "email" }, "Phone": { type: "phone_number" }, "Vehicle": { type: "rich_text" }, "Signed PDF": { type: "files", files: {} }, "Signed At": { type: "date" }, "Template ID": { type: "rich_text" }, "Template Version": { type: "number" }, "Signing ID": { type: "rich_text" }, "Agreement Hash": { type: "rich_text" }, "PDF Upload ID": { type: "rich_text" }, "Last Error": { type: "rich_text" }, "Signing Status": { type: "status", status: { options: [{ name: "Not started" }, { name: "Done" }] } } } as unknown as DataSourceObjectResponse["properties"];
const page = { object: "page", id: "11111111-1111-1111-1111-111111111111", url: "https://notion.so/page", parent: { type: "data_source_id", data_source_id: "arrivals" }, properties: { "Name": { type: "title", title: rich("Guest") }, "Arrival Date": { type: "date", date: { start: "2026-10-31" } }, "Type": { type: "select", select: { name: "Booking" } }, "Email": { type: "email", email: "guest@example.com" }, "Phone": { type: "phone_number", phone_number: "0210001001" }, "Vehicle": { type: "rich_text", rich_text: [] }, "Signing Status": { type: "status", status: { name: "Not started" } } } } as unknown as PageObjectResponse;

describe("NotionGuestsRepository", () => {
  it("queries and creates with the updated schema", async () => {
    const client = { dataSources: { retrieve: vi.fn().mockResolvedValue({ object: "data_source", title: [], properties: schema }), query: vi.fn().mockResolvedValue({ results: [page], has_more: false }) }, pages: { create: vi.fn().mockResolvedValue(page) } };
    const repository = new NotionGuestsRepository(client as never, "arrivals");
    await expect(repository.listByArrivalDate("2026-10-31")).resolves.toHaveLength(1);
    await repository.createWalkIn({ name: "Walk In", arrivalDate: "2026-10-31", email: "", phone: "", vehicle: "" });
    expect(client.pages.create).toHaveBeenCalledWith(expect.objectContaining({ properties: expect.objectContaining({ "Type": { select: { name: "Walk-In" } } }) }));
  });
});
