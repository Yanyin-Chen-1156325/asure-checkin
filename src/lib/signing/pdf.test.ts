import { writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { defaultTemplateContent } from "../templates/content";
import { generateSignedPdf } from "./pdf";

describe("signed PDF", () => {
  it("creates an A4 PDF from the immutable template snapshot and signature", async () => {
    const signature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Z9er2QAAAABJRU5ErkJggg==";
    const bytes = await generateSignedPdf({ content: defaultTemplateContent, signatureDataUrl: signature, acknowledgement: { accepted: true, acceptedAt: "2026-10-30T08:00:00.000Z" }, values: {
      "guest.name": "Hineātea Smith", "guest.email": "alex@example.com", "guest.phone": "0210001001", "guest.vehicle": "ABC123", "signature.date": "30 October 2026 at 7:30 pm",
    }, audit: { signingId: "11111111-1111-4111-8111-111111111111", templateName: "Default Registration Card", templateVersion: 1, consent: "I accept this agreement." } });
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
    if (process.env.PDF_TEST_OUTPUT) await writeFile(process.env.PDF_TEST_OUTPUT, bytes);
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeGreaterThan(0);
    const { width, height } = document.getPage(0).getSize();
    expect(width).toBeCloseTo(595.28, 1); expect(height).toBeCloseTo(841.89, 1);
  });
});
