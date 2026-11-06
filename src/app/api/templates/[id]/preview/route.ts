import { authorizeApiRequest } from "@/lib/auth/api-authorization";
import { apiError } from "@/lib/http/api-error";
import { createRequestId, REQUEST_ID_HEADER } from "@/lib/http/request-id";
import { getTemplatesRepository } from "@/lib/notion/templates-repository";
import { templateApiError } from "@/lib/notion/template-api-error";
import { generateSignedPdf } from "@/lib/signing/pdf";
import { SIGNING_CONSENT } from "@/lib/signing/snapshot";
import { validateNotionPageId } from "@/lib/templates/api-helpers";

type Context = { params: Promise<{ id: string }> };

const previewSignature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Z9er2QAAAABJRU5ErkJggg==";

export async function GET(request: Request, context: Context) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const authorization = await authorizeApiRequest(request, requestId);
  if (authorization.response) return authorization.response;
  const { id } = await context.params;
  const idError = validateNotionPageId(id, requestId);
  if (idError) return idError;
  try {
    const template = await getTemplatesRepository().get(id);
    if (authorization.session.role === "staff" && template.status !== "active") return apiError(403, "FORBIDDEN", "Only active agreements are available.", requestId);
    const pdf = await generateSignedPdf({
      content: template.content,
      signatureDataUrl: previewSignature,
      acknowledgement: { accepted: true, acceptedAt: "2026-10-30T08:00:00.000Z" },
      values: {
        "guest.name": "Alex Smith", "guest.email": "alex.smith@example.com", "guest.phone": "021 000 1001",
        "guest.vehicle": "ABC123", "signature.date": "Preview signing date",
      },
      audit: { signingId: "preview", templateName: template.name, templateVersion: template.version, consent: SIGNING_CONSENT },
    });
    const copy = new Uint8Array(pdf.byteLength);
    copy.set(pdf);
    return new Response(copy.buffer as ArrayBuffer, { headers: {
      "cache-control": "no-store",
      "content-disposition": `inline; filename="${template.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "agreement"}-preview.pdf"`,
      "content-type": "application/pdf",
      [REQUEST_ID_HEADER]: requestId,
    } });
  } catch (error) {
    console.error(`Agreement PDF preview failed (${requestId}): ${error instanceof Error ? error.message : "Unknown error"}`);
    return templateApiError(error, requestId);
  }
}
