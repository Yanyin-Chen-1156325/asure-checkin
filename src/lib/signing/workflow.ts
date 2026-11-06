import "server-only";

import type { SigningSubmission } from "../arrivals/schema";
import { serverEnvironment } from "../env/server";
import { getGuestsRepository } from "../notion/guests-repository";
import { getSigningOperationsRepository, type SigningOperation } from "../notion/signing-operations-repository";
import { generateSignedPdf } from "./pdf";
import { agreementSnapshotSchema, snapshotHash } from "./snapshot";
import type { SigningClaims } from "./token";

const processing = new Set<string>();

export class SigningWorkflowError extends Error {
  constructor(readonly code: "in_progress" | "invalid_state" | "guest_mismatch" | "too_large", message: string) { super(message); }
}

export async function completeSigning(claims: SigningClaims, submission?: SigningSubmission): Promise<void> {
  if (processing.has(claims.jti)) throw new SigningWorkflowError("in_progress", "The registration card is already being processed.");
  processing.add(claims.jti);
  const operations = getSigningOperationsRepository();
  const guests = getGuestsRepository();
  let operation: SigningOperation | undefined;
  let recoveryUploadId = "";
  try {
    operation = await operations.get(claims.jti);
    if (operation.body.snapshot.signingId !== claims.jti || operation.body.snapshot.templateName.length === 0 || operation.body.snapshot.templateVersion < 1) throw new SigningWorkflowError("invalid_state", "The signing operation does not match this link.");
    if (operation.state === "completed") return;

    if (operation.state === "prepared") {
      if (!submission) throw new SigningWorkflowError("invalid_state", "Guest details and a signature are required.");
      let guestPageId = operation.guestPageId;
      if (guestPageId) {
        const arrival = await guests.get(guestPageId);
        if (arrival.arrivalDate !== claims.arrivalDate || (claims.arrivalId && arrival.name !== submission.name)) throw new SigningWorkflowError("guest_mismatch", "The guest record no longer matches this signing link.");
      } else {
        const arrival = await guests.createWalkIn({ name: submission.name, arrivalDate: claims.arrivalDate, email: submission.email, phone: submission.phone, vehicle: submission.vehicle });
        guestPageId = arrival.id;
        operation = await operations.setGuestPageId(operation, guestPageId);
      }
      await guests.updateContact(guestPageId, { email: submission.email, phone: submission.phone, vehicle: submission.vehicle });
      await guests.markSigningStarted(guestPageId, claims.jti);
      const acceptedAt = new Date().toISOString();
      const snapshot = agreementSnapshotSchema.parse({ ...operation.body.snapshot, guest: { name: submission.name, email: submission.email, phone: submission.phone, vehicle: submission.vehicle, arrivalDate: claims.arrivalDate, source: claims.arrivalId ? operation.body.snapshot.guest.source : "walk_in" }, acknowledgement: { accepted: submission.accepted, acceptedAt }, acceptedAt });
      operation = await operations.accept(operation, snapshot, submission.signature, snapshotHash(snapshot));
    }

    const snapshot = operation.body.snapshot;
    const signature = operation.body.signature;
    if (!snapshot.acceptedAt || !signature || !operation.guestPageId) throw new SigningWorkflowError("invalid_state", "The accepted signing snapshot is incomplete.");
    let uploadId = operation.pdfUploadId;
    if (!uploadId) {
      const signedAtText = new Intl.DateTimeFormat("en-NZ", { dateStyle: "long", timeStyle: "short", timeZone: serverEnvironment.APP_TIMEZONE }).format(new Date(snapshot.acceptedAt));
      const pdf = await generateSignedPdf({ content: snapshot.content, signatureDataUrl: signature,
        values: { "guest.name": snapshot.guest.name, "guest.email": snapshot.guest.email, "guest.phone": snapshot.guest.phone, "guest.vehicle": snapshot.guest.vehicle, "signature.date": signedAtText },
        acknowledgement: snapshot.acknowledgement,
        audit: { signingId: snapshot.signingId, templateName: snapshot.templateName, templateVersion: snapshot.templateVersion, consent: snapshot.consent } });
      if (pdf.byteLength > 20 * 1024 * 1024) throw new SigningWorkflowError("too_large", "The signed PDF exceeds Notion's 20 MB direct-upload limit.");
      operation = await operations.advance(operation, "pdf_generated");
      const safeName = snapshot.guest.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || "guest";
      uploadId = await guests.uploadPdf(`${safeName}-registration-card-${snapshot.acceptedAt.slice(0, 10)}.pdf`, pdf);
      recoveryUploadId = uploadId;
      operation = await operations.advance(operation, "pdf_uploaded", { pdfUploadId: uploadId });
    }
    const safeName = snapshot.guest.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || "guest";
    await guests.attachUploadedPdf(operation.guestPageId, `${safeName}-registration-card-${snapshot.acceptedAt.slice(0, 10)}.pdf`, uploadId, {
      signingId: snapshot.signingId, templateId: snapshot.templateId, templateVersion: snapshot.templateVersion, agreementHash: operation.snapshotHash || snapshotHash(snapshot), signedAt: snapshot.acceptedAt,
    });
    await operations.complete(operation, new Date().toISOString());
  } catch (error) {
    if (operation && operation.state !== "prepared" && operation.state !== "completed") {
      const message = error instanceof SigningWorkflowError ? error.message : "The signing workflow needs attention.";
      await operations.advance(operation, "needs_attention", {
        error: message,
        incrementRetry: true,
        pdfUploadId: recoveryUploadId || operation.pdfUploadId || undefined,
      }).catch(() => undefined);
      if (operation.guestPageId) await guests.markSigningError(operation.guestPageId, message).catch(() => undefined);
    }
    throw error;
  } finally {
    processing.delete(claims.jti);
  }
}

export async function retrySigning(signingId: string): Promise<void> {
  const operation = await getSigningOperationsRepository().get(signingId);
  if (operation.state === "prepared") throw new SigningWorkflowError("invalid_state", "The guest has not accepted this agreement yet.");
  await completeSigning({ jti: signingId, arrivalId: operation.guestPageId || undefined, arrivalDate: operation.body.snapshot.guest.arrivalDate, templatePageId: "recovery", iat: 0, exp: Number.MAX_SAFE_INTEGER });
}
