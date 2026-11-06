import type { CreatePageParameters, PageObjectResponse, UpdatePageParameters } from "@notionhq/client";

import type { Arrival, ContactUpdate, WalkInInput } from "../arrivals/schema";
import { arrivalSchema } from "../arrivals/schema";
import { publicEmail, publicPhone } from "../arrivals/contact-hygiene";
import { NotionServiceError } from "./errors";
import type { GuestSchemaMapping } from "./guests-schema";

type CreateProperties = NonNullable<CreatePageParameters["properties"]>;
type UpdateProperties = NonNullable<UpdatePageParameters["properties"]>;
type Property = PageObjectResponse["properties"][string];

function plainText(property: Property | undefined): string {
  if (!property) return "";
  if (property.type === "title") return property.title.map((item) => item.plain_text).join("");
  if (property.type === "rich_text") return property.rich_text.map((item) => item.plain_text).join("");
  return "";
}

export function plainProperty(property: Property | undefined): string { return plainText(property); }

function email(property: Property | undefined): string {
  if (!property) return "";
  if (property.type === "email") return property.email ?? "";
  return plainText(property);
}

export function mapGuestPage(page: PageObjectResponse): Arrival {
  const properties = page.properties;
  const date = properties["Arrival Date"];
  const phone = properties["Phone"];
  const type = properties["Type"];
  const status = properties["Signing Status"];
  const lastError = plainText(properties["Last Error"]);
  const statusName = status?.type === "select" ? status.select?.name : status?.type === "status" ? status.status?.name : undefined;
  const mappedStatus = statusName === "Not started" || statusName === "pending" ? "pending"
    : statusName === "Pending" ? (lastError ? "needs_attention" : "in_progress")
    : statusName === "in_progress" ? "in_progress"
    : statusName === "Done" || statusName === "signed" ? "signed"
    : statusName === "upload_pending" ? "upload_pending"
    : statusName === "needs_attention" ? "needs_attention" : undefined;
  const candidate = {
    id: page.id,
    name: plainText(properties["Name"]),
    arrivalDate: date?.type === "date" ? date.date?.start.slice(0, 10) ?? "" : "",
    email: publicEmail(email(properties["Email"])),
    phone: publicPhone(phone?.type === "phone_number" ? phone.phone_number ?? "" : ""),
    vehicle: plainText(properties["Vehicle"]),
    source: type?.type === "select" && type.select?.name === "Walk-In" ? "walk_in" : "arrival",
    signingStatus: mappedStatus,
  };
  const parsed = arrivalSchema.safeParse(candidate);
  if (!parsed.success) throw new NotionServiceError("invalid_response", `Guest page ${page.id} contains invalid required fields.`);
  return parsed.data;
}

const text = (content: string) => content ? [{ type: "text" as const, text: { content } }] : [];

export function walkInProperties(input: WalkInInput, mapping: GuestSchemaMapping): CreateProperties {
  const properties: CreateProperties = {
    "Name": { title: text(input.name) },
    "Arrival Date": { date: { start: input.arrivalDate } },
    "Type": { select: { name: "Walk-In" } },
    "Email": mapping.emailType === "email" ? { email: input.email || null } : { rich_text: text(input.email) },
    "Phone": { phone_number: input.phone || null },
    "Vehicle": { rich_text: text(input.vehicle) },
    "Signing Status": mapping.statusType === "status" ? { status: { name: mapping.initialStatusName } } : { select: { name: mapping.initialStatusName } },
  };
  return properties;
}

export function contactProperties(input: ContactUpdate, emailType: "email" | "rich_text"): UpdateProperties {
  return {
    "Email": emailType === "email" ? { email: input.email || null } : { rich_text: text(input.email) },
    "Phone": { phone_number: input.phone || null },
    "Vehicle": { rich_text: text(input.vehicle) },
  };
}
