import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";

import { AGREEMENT_ACKNOWLEDGEMENT, templateContentSchema, type TemplateContent } from "../templates/content";

export const SIGNING_CONSENT = AGREEMENT_ACKNOWLEDGEMENT;

const acknowledgementSchema = z.object({ accepted: z.boolean(), acceptedAt: z.iso.datetime().nullable() }).strict();

const guestSnapshotSchema = z.object({
  name: z.string().max(200), email: z.string().max(254), phone: z.string().max(50), vehicle: z.string().max(100),
  arrivalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), source: z.enum(["arrival", "walk_in"]),
}).strict();

export const agreementSnapshotSchema = z.object({
  signingId: z.string().uuid(), templateId: z.string().uuid(), templateVersion: z.number().int().positive(), templateName: z.string().min(1).max(200),
  content: templateContentSchema, guest: guestSnapshotSchema, consent: z.literal(SIGNING_CONSENT),
  acknowledgement: acknowledgementSchema.optional().default({ accepted: false, acceptedAt: null }), acceptedAt: z.iso.datetime().nullable(),
}).strict().superRefine((value, context) => {
  const prepared = value.acceptedAt === null && !value.acknowledgement.accepted && value.acknowledgement.acceptedAt === null;
  const accepted = value.acceptedAt !== null && value.acknowledgement.accepted && value.acknowledgement.acceptedAt === value.acceptedAt;
  if (!prepared && !accepted) context.addIssue({ code: "custom", message: "Acknowledgement status and timestamp must match the signing state.", path: ["acknowledgement"] });
});

export type AgreementSnapshot = z.infer<typeof agreementSnapshotSchema>;
export type GuestSnapshot = z.infer<typeof guestSnapshotSchema>;

const journalBodySchema = z.object({ snapshot: agreementSnapshotSchema, signature: z.string().max(750_000).optional() }).strict();
export type JournalBody = z.infer<typeof journalBodySchema>;

const MARKER = "ASURE_SIGNING_OPERATION_V1";

export function serializeJournalBody(body: JournalBody): string {
  const parsed = journalBodySchema.parse(body);
  const encoded = Buffer.from(JSON.stringify(parsed), "utf8").toString("base64url");
  return `# Application-managed signing operation\n\n> Do not edit this page body directly. Use the motel application.\n\n\`\`\`text\n${MARKER}\n${encoded}\n\`\`\``;
}

export function deserializeJournalBody(markdown: string): JournalBody {
  const match = new RegExp(`${MARKER}\\s+([A-Za-z0-9_-]+)`).exec(markdown);
  if (!match?.[1]) throw new Error("Signing journal content has an invalid format.");
  const value = JSON.parse(Buffer.from(match[1], "base64url").toString("utf8")) as Record<string, unknown>;
  if (value.snapshot && typeof value.snapshot === "object") {
    const snapshot = value.snapshot as Record<string, unknown>;
    if (!("acknowledgement" in snapshot)) snapshot.acknowledgement = { accepted: Boolean(snapshot.acceptedAt), acceptedAt: snapshot.acceptedAt ?? null };
    delete snapshot.acknowledgements;
  }
  return journalBodySchema.parse(value);
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

export function snapshotHash(snapshot: AgreementSnapshot): string {
  return createHash("sha256").update(canonical(agreementSnapshotSchema.parse(snapshot)), "utf8").digest("hex");
}

export function createPreparedSnapshot(input: Readonly<{
  signingId: string; templateId: string; templateVersion: number; templateName: string; content: TemplateContent; guest: GuestSnapshot;
}>): AgreementSnapshot {
  return agreementSnapshotSchema.parse({ ...input, consent: SIGNING_CONSENT, acknowledgement: { accepted: false, acceptedAt: null }, acceptedAt: null });
}
