import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { defaultTemplateContent, defaultTemplateId, defaultTemplateName } from "../templates/content";
import { createPreparedSnapshot, deserializeJournalBody, serializeJournalBody, SIGNING_CONSENT, snapshotHash } from "./snapshot";

describe("canonical agreement snapshots", () => {
  const snapshot = createPreparedSnapshot({ signingId: "11111111-1111-4111-8111-111111111111", templateId: defaultTemplateId, templateVersion: 1, templateName: defaultTemplateName, content: defaultTemplateContent,
    guest: { name: "Alex Smith", email: "alex@example.com", phone: "", vehicle: "ABC123", arrivalDate: "2026-10-31", source: "arrival" } });

  it("round-trips journal content without executable markup", () => {
    const acceptedAt = "2026-10-30T08:00:00.000Z";
    const body = { snapshot: { ...snapshot, acknowledgement: { accepted: true, acceptedAt }, acceptedAt }, signature: "data:image/png;base64,AAAA" };
    expect(deserializeJournalBody(serializeJournalBody(body))).toEqual(body);
  });

  it("hashes every accepted guest value and consent deterministically", () => {
    const acceptedAt = "2026-10-30T08:00:00.000Z";
    const accepted = { ...snapshot, acknowledgement: { accepted: true, acceptedAt }, acceptedAt };
    expect(accepted.consent).toBe(SIGNING_CONSENT);
    expect(snapshotHash(accepted)).toMatch(/^[a-f0-9]{64}$/);
    expect(snapshotHash({ ...accepted, guest: { ...accepted.guest, phone: "0210001001" } })).not.toBe(snapshotHash(accepted));
  });
});
