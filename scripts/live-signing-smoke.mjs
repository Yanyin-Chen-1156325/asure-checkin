import { writeFile } from "node:fs/promises";

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3000";
if (process.env.RUN_LIVE_SIGNING_SMOKE !== "1") throw new Error("Set RUN_LIVE_SIGNING_SMOKE=1 to acknowledge that this test creates a signed [TEST] record in Notion.");

const headers = { origin: baseUrl, accept: "application/json", "content-type": "application/json" };
const requireOk = async (response, step) => {
  if (!response.ok) throw new Error(`${step} failed (${response.status}): ${await response.text()}`);
  return response;
};

const login = await requireOk(await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers, body: JSON.stringify({ username: "staff", password: process.env.E2E_STAFF_PASSWORD || "staff" }) }), "login");
const cookie = login.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) throw new Error("Login did not return a session cookie.");
const authenticated = { ...headers, cookie };

const templatesResponse = await requireOk(await fetch(`${baseUrl}/api/templates`, { headers: { accept: "application/json", cookie } }), "template lookup");
const templates = (await templatesResponse.json()).templates;
const template = templates.find((candidate) => candidate.status === "active");
if (!template) throw new Error("No active agreement template is available.");

const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const name = `[TEST] Signing smoke ${new Date().toISOString()}`;
const sessionResponse = await requireOk(await fetch(`${baseUrl}/api/signing/sessions`, { method: "POST", headers: authenticated, body: JSON.stringify({ arrivalDate: date, templatePageId: template.id }) }), "signing session");
const signingUrl = (await sessionResponse.json()).url;
const token = signingUrl.split("/").at(-1);
const submission = {
  name,
  email: "signing-smoke@example.test",
  phone: "",
  vehicle: "TEST",
  accepted: true,
  signature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Z9er2QAAAABJRU5ErkJggg==",
};
await requireOk(await fetch(`${baseUrl}/api/signing/${token}`, { method: "POST", headers, body: JSON.stringify(submission) }), "first signing submission");
await requireOk(await fetch(`${baseUrl}/api/signing/${token}`, { method: "POST", headers, body: JSON.stringify(submission) }), "idempotent signing submission");

const recordsResponse = await requireOk(await fetch(`${baseUrl}/api/records?name=${encodeURIComponent(name)}`, { headers: { accept: "application/json", cookie } }), "record lookup");
const matching = (await recordsResponse.json()).records.filter((record) => record.name === name);
if (matching.length !== 1 || matching[0].signingStatus !== "signed") throw new Error(`Expected one signed record; received ${matching.length}.`);
const pdf = await requireOk(await fetch(`${baseUrl}/api/records/${matching[0].id}/pdf`, { headers: { cookie } }), "PDF retrieval");
const pdfBytes = Buffer.from(await pdf.arrayBuffer());
if (!pdf.headers.get("content-type")?.startsWith("application/pdf") || pdfBytes.byteLength < 1_000) throw new Error("The signed PDF response is invalid.");
if (process.env.SMOKE_PDF_OUTPUT) await writeFile(process.env.SMOKE_PDF_OUTPUT, pdfBytes);

const testRecordsResponse = await requireOk(await fetch(`${baseUrl}/api/records?name=${encodeURIComponent("[TEST] Signing smoke")}`, { headers: { accept: "application/json", cookie } }), "recovery lookup");
const recoverable = (await testRecordsResponse.json()).records.filter((record) => record.signingStatus === "needs_attention");
for (const record of recoverable) {
  await requireOk(await fetch(`${baseUrl}/api/records/${record.id}/retry`, { method: "POST", headers: authenticated, body: "{}" }), `recovery for ${record.id}`);
}

console.log(JSON.stringify({ ok: true, recordId: matching[0].id, name, idempotent: true, pdf: true, recovered: recoverable.length }));
