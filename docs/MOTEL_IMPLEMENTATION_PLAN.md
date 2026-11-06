# Motel Paperless Guest Agreement System — Implementation Plan

**Version:** 2.0 (Notion-only MVP)  
**Status:** Ready for incremental implementation with Codex  
**Primary devices:** macOS browser (owner/admin), iPad Safari (staff-assisted guest signing)  
**Language:** English for code, UI labels, technical documentation, and code comments  
**Development strategy:** Seven sequential milestones with independently testable exit criteria

## 1. Objective

Build a responsive, secure, small-motel guest registration and electronic agreement signing application. The owner can freely compose and maintain entire agreement documents using a rich-text editor; staff can select arriving guests or register walk-ins and hand an iPad to the guest; the guest reviews the exact agreement, enters contact details, and signs; the system generates an immutable signed PDF, attaches it to the corresponding Notion record, and allows authorized staff to search and preview signed records.

**Key change:** Notion is the only persistent external data/file service for the MVP. **Do not implement Google Drive or a SQL database.** The application is a web app, not a native macOS/iPadOS app. Optional PWA support can follow the MVP.

## 2. Technology and deployment

| Layer | Choice |
| --- | --- |
| Frontend | React, Next.js App Router, TypeScript |
| Styling/UI | Tailwind CSS, shadcn/ui (or equivalent accessible components) |
| Rich-text editor | Tiptap with a restricted, well-defined extension set |
| Signature | Touch/pointer-enabled signature canvas; support clear and redraw |
| Server | Next.js Route Handlers / server-only services |
| Authentication | Two fixed accounts; password hashes in deployment secrets; signed JWT sessions in Secure, HttpOnly, SameSite cookies |
| Authorization | Server-enforced Owner/Staff RBAC |
| Persistence | Notion databases/pages + Notion-hosted PDF file attachments |
| PDF | Server-side PDF generation from validated, versioned agreement content; deterministic supported formatting |
| Hosting | Vercel, with an appropriate plan for commercial use |
| Tests | Vitest/unit, integration tests with mocked Notion API, Playwright E2E |

Never expose the Notion integration token or password hashes to browser bundles. All Notion reads/writes and PDF file retrieval must be performed through authenticated server endpoints.

## 3. MVP scope

### Included

1. Owner can create, freely edit, preview, duplicate, activate/deactivate, and version full agreement templates using a Word-like Tiptap editor.
2. Owner and Staff have separate fixed login accounts and role-specific access.
3. Arrival List is stored in Notion; staff can filter by arrival date, choose a guest, and create a walk-in.
4. iPad guest signing mode only shows the selected guest and agreement; the guest provides at least one of email or phone, optionally vehicle registration, acknowledges terms, and signs.
5. The app captures an immutable snapshot of the exact agreement accepted, signing time (UTC and displayed local timezone), guest fields, template version, and signature; generates a signed PDF and uploads it to Notion.
6. Owner/Staff can search guest records, view signing status, and securely preview/download signed PDFs.
7. Validation, upload retries, idempotency, restricted guest sessions, auditing metadata, and basic operational safeguards.

### Excluded

- Booking/PMS integration, room/rate/booking source management.
- Payment or credit card capture.
- Guest ID photo capture.
- Self-service account creation or password reset UI.
- Native Mac/iPad apps, offline-first signing, complex document layout, bulk email, and automatic retention/deletion jobs.

## 4. Roles and permissions

| Operation | Owner | Staff | Guest session |
| --- | :---: | :---: | :---: |
| Log in | Yes | Yes | No |
| Create/edit/publish agreement templates | Yes | No | No |
| View arrival list and guest details | Yes | Yes | Selected guest only |
| Add/edit walk-in or guest contact details | Yes | Yes | Selected guest only, limited fields |
| Start a guest signing session | Yes | Yes | No |
| Read and sign selected agreement | No special requirement | No special requirement | Yes |
| View signed records and PDFs | Yes | Yes | No |
| Manage fixed credentials via deployment | Operator only | No | No |

The owner/staff login page uses two fixed credentials supplied as **password hashes** in environment variables. Changing these credentials is an operator/deployment task in the MVP. No account-management database or user-management UI is required. Authorization must be checked in every server route, not merely hidden in the UI.

## 5. Notion data model

Create three Notion databases (or equivalent Notion data sources supported by the installed API version). Store IDs in environment variables. Preserve stable property names or implement a validated property mapping layer.

### A. Guests / Arrivals

| Property | Type | Notes |
| --- | --- | --- |
| Name | Title | Required; staff preselects guest; walk-in enters name |
| Arrival Date | Date | Required; local date for arrival filtering |
| Email | Email or rich text | Optional individually; either email or phone is required before signing |
| Phone | Phone | Optional individually |
| Vehicle | Rich text | Optional |
| Source | Select | `arrival` or `walk_in` |
| Signing Status | Select | `pending`, `in_progress`, `upload_pending`, `signed`, `needs_attention` |
| Signed At | Date | UTC timestamp when accepted |
| Template ID | Rich text | Stable template identifier |
| Template Version | Number | Snapshot version |
| Signing ID | Rich text | UUID; unique logical signing operation |
| Agreement Hash | Rich text | SHA-256 of canonical signed content/snapshot |
| Signed PDF | Files | Notion-hosted uploaded file |
| PDF Upload ID | Rich text | Optional internal recovery metadata, never a temporary download URL |
| Last Error | Rich text | Sanitized error summary; no credentials or signature bytes |

Notion page ID is the stable guest record ID. The app must not reveal other guests to an unauthenticated signing session. Do not include room, booking price, booking source, or departure date.

### B. Agreement Templates

| Property | Type | Notes |
| --- | --- | --- |
| Name | Title | Human-friendly name |
| Template ID | Rich text | Stable identifier across versions |
| Version | Number | Monotonically increasing published version |
| Status | Select | `draft`, `active`, `archived` |
| Editor Content | Page body or rich text storage strategy | Structured Tiptap JSON, serialized with a documented size-safe method |
| Created/Updated At | Date | Audit metadata |

**Important:** Notion property size limits may make storing a large Tiptap JSON document in one property unsuitable. Prefer a dedicated template page body with a deterministic serialization format, or split content into bounded chunks. Define read/write adapters and verify round-trip fidelity before building the full editor. Do not use Notion as a WYSIWYG editor; Tiptap is the UI. Publish new versions rather than overwriting historical versions. Maintain a stable default template.

### C. Signing Operations (recovery journal)

| Property | Type | Notes |
| --- | --- | --- |
| Signing ID | Title | UUID and idempotency key |
| Guest Page ID | Rich text | Target guest record |
| State | Select | `prepared`, `accepted`, `pdf_generated`, `pdf_uploaded`, `completed`, `needs_attention` |
| Template ID / Version | Rich text / number | Version accepted |
| Snapshot Hash | Rich text | SHA-256 |
| Snapshot Content | Page body or chunked content | Immutable content needed to recover/rebuild PDF |
| Guest Details Snapshot | Page body / bounded fields | Values accepted at signing |
| Signature Data | Protected page body / attachment | Necessary to retry PDF generation; tightly restricted |
| PDF File Upload ID | Rich text | Stable Notion upload identifier where supported |
| Error / Retry Count | Rich text / number | Operational recovery |
| Accepted At / Completed At | Date | Audit trail |

**Notion is not transactional.** The signing journal is a practical recovery mechanism, not an ACID database. Build reconciliation for partial success. Consider whether sensitive signature data should be retained only until completion, then removed after PDF confirmation; signed PDF and audit metadata remain. Notion has API size, rate, and file-upload limitations; validate against the current API version. Confirm the Free plan's per-file size limit before rollout.

## 6. User experience and pages

| Route | Audience | Purpose |
| --- | --- | --- |
| `/login` | Owner/Staff | Secure login |
| `/admin` | Owner/Staff | Dashboard with arrivals, pending signings, recent records |
| `/admin/arrivals` | Owner/Staff | Filter by arrival date, select existing guest, add walk-in |
| `/admin/agreements` | Owner | List, create, duplicate, activate/archive templates |
| `/admin/agreements/[id]` | Owner | Tiptap full-document editor, preview, save draft, publish version |
| `/admin/records` | Owner/Staff | Search/filter signed and pending records |
| `/admin/records/[id]` | Owner/Staff | Guest details, signing metadata, authenticated PDF preview/download |
| `/sign/[token]` | Short-lived guest token | Isolated guest form, agreement review, acknowledgment, signature |
| `/sign/complete` | Guest | Minimal completion screen; no admin navigation or other guest data |

### Editor

- Full agreement is editable, including title, sections, paragraphs, headings, bold, italic, bullets, and numbered lists.
- Provide autosave warning or explicit unsaved-change guard; explicit Save Draft and Publish actions.
- Preview both iPad reading layout and printable PDF output.
- Restrict unsupported HTML, scripts, external embeds, arbitrary CSS, and complex tables.
- Render from a safe, validated Tiptap JSON schema. Sanitize any imported HTML.
- Guest information and signature blocks are **system-generated**, not removable editor nodes.
- Every signing references an immutable published version; edits create a new version.

### Guest signing

- Staff selects a guest and a published template; generates a short-lived, single-purpose guest token and enters guest mode before handing over the iPad.
- Guest can edit only their own Name (for walk-ins), Email, Phone, and Vehicle. At least one valid Email or Phone is required.
- Show complete agreement, an explicit consent checkbox, signature canvas, Clear Signature, and Submit.
- Disable double-submit; display `Saving…`, `Completed`, or an actionable retry state.
- Guest token must not grant access to admin APIs, Notion URLs, or other guest records.
- Guest session must expire; after completion clear visible sensitive form/signature state and invalidate token.
- For a shared iPad, recommend iPad Guided Access; app-level route guards alone do not lock the entire device.

## 7. Signing integrity and PDF rules

1. Resolve a **published, immutable template version** on the server.
2. Create a canonical agreement snapshot (content, template/version, guest details, consent text, local date display conventions).
3. Compute a SHA-256 hash of canonical content; preserve snapshot and hash in the signing journal.
4. Require acknowledgment and nonempty signature; capture acceptance time on the server in UTC, with `Pacific/Auckland` for display.
5. Render the PDF from the exact accepted snapshot, with the guest details, signature, consent statement, signing timestamp, and signing ID.
6. Upload the PDF via Notion's supported file-upload API and attach it to the corresponding guest page's Files property.
7. Confirm attachment and update guest status to `signed`; mark the journal `completed` only after verification.
8. Never silently replace an existing signed PDF when a template is edited or a retry occurs.

PDF preview and the signed PDF should have equivalent textual content and supported formatting. Test long agreements, Unicode, page breaks, signatures, and mobile layout. Store stable Notion IDs, **not expiring Notion file download URLs**. Authorized preview endpoints must resolve fresh file URLs server-side or stream the file through an authenticated proxy.

## 8. API contract (suggested)

All endpoints return consistent JSON errors `{ code, message, requestId }`; server-side logs contain request IDs and sanitized diagnostic details.

### Authentication

- `POST /api/auth/login` — username/password; sets HttpOnly session cookie.
- `POST /api/auth/logout` — clears session.
- `GET /api/auth/me` — role and minimal profile.

### Arrivals

- `GET /api/arrivals?date=YYYY-MM-DD` — Owner/Staff; returns only necessary guest fields.
- `POST /api/arrivals/walk-in` — Owner/Staff; creates a Notion guest page.
- `PATCH /api/arrivals/:id` — Owner/Staff; allowed contact fields only.

### Templates

- `GET /api/templates` — Owner/Staff list of active templates; owner may list drafts.
- `GET /api/templates/:id` — Owner for edit; staff gets published read-only selection metadata.
- `POST /api/templates` — Owner creates draft.
- `PUT /api/templates/:id/draft` — Owner saves validated draft content.
- `POST /api/templates/:id/publish` — Owner creates immutable published version.
- `POST /api/templates/:id/duplicate` — Owner duplicates to new draft.
- `POST /api/templates/:id/archive` — Owner archives; cannot invalidate existing signed records.

### Signing

- `POST /api/signing-sessions` — Owner/Staff selects guest and published template; returns short-lived token/URL.
- `GET /api/signing-sessions/:token` — token-only; returns selected guest fields and immutable agreement snapshot, no other data.
- `POST /api/signing-sessions/:token/submit` — token-only; validates consent and signature; idempotent by Signing ID; persists acceptance and advances upload workflow.
- `GET /api/signing-sessions/:token/status` — token-only; minimal status for safe retry/recovery.

### Records

- `GET /api/records?date=&name=&status=` — Owner/Staff search.
- `GET /api/records/:id` — Owner/Staff record and audit metadata.
- `GET /api/records/:id/pdf` — Owner/Staff authenticated PDF stream or safe short-lived redirect.
- `POST /api/records/:id/retry` — Owner/Staff; retry a recoverable signing operation without duplicating a PDF.

Use server-side schema validation (e.g. Zod) on every input and output boundary. Enforce authorization inside handlers and service methods.

## 9. Security and privacy

- Passwords: Argon2id or bcrypt hashes in Vercel environment variables; no plaintext passwords or account database.
- Sessions: signed JWT in Secure, HttpOnly, SameSite cookies; short bounded TTL; logout; role checked server-side; session invalidation strategy documented.
- Login: rate limiting / abuse protection and generic invalid-credential errors. A truly persistent distributed limiter may require an external service; if strictly Notion-only, document the limitation and use platform-level protection plus conservative controls.
- CSRF: protect cookie-authenticated state-changing requests using origin validation and appropriate CSRF defenses.
- Guest tokens: cryptographically random, scoped to one signing operation, expiring, one-time on completion, not logged or leaked in analytics/referrers.
- No raw Notion credentials, signature bytes, sensitive guest data, or JWTs in client logs, URLs, monitoring payloads, or analytics.
- Use least-privilege Notion integration access to only the required databases/pages.
- Do not expose public Notion pages or public signed-document links.
- Keep an audit trail for signing/publishing and critical failures; restrict access to owner/staff.
- Demo with synthetic guest records and dummy signatures, not actual motel guest data in a developer's personal workspace.
- Before production, confirm New Zealand privacy requirements, approved terms, storage/retention policy, access rights, and electronic-signature suitability with the motel owner and, if necessary, professional advice.
- Confirm commercial hosting eligibility and costs; do not assume Vercel Hobby is suitable for business production use.

## 10. Reliability and failure recovery

| Failure | Required behavior |
| --- | --- |
| Notion unavailable before signing | Block start, show recoverable error; do not issue misleading completion |
| Connection drops during submit | Keep UI state while possible; show retry; use same Signing ID |
| PDF generation fails | Preserve accepted snapshot and signature in restricted recovery journal; mark `needs_attention` |
| PDF uploaded but attachment fails | Store upload identifier, retry attachment; do not upload a duplicate blindly |
| PDF attached but guest status update fails | Reconcile by Signing ID and attached file; update status on retry |
| Browser reload after acceptance | Recover status by token while valid; avoid duplicate signing |
| Token expired before acceptance | Return to staff to initiate a new session |
| Template changes mid-session | Continue using pinned published version; no silent content changes |
| PDF exceeds Notion plan limit | Fail clearly; enforce PDF size threshold and preflight checks |
| Notion rate limit / transient 5xx | Respect Retry-After; exponential backoff with jitter and bounded attempts |

**No claim of guaranteed offline durability:** A browser-only signature not yet accepted by the server can be lost on device/browser failure. The MVP should retain unsent data in memory while the page remains open and provide a clear retry path; full offline durability is a later enhancement. Avoid storing signature or guest PII in persistent browser storage without a separate privacy design.

## 11. Configuration

```env
# Authentication: store hashes, never plaintext passwords
OWNER_USERNAME=owner
OWNER_PASSWORD_HASH=
STAFF_USERNAME=staff
STAFF_PASSWORD_HASH=
AUTH_SECRET=

# Notion
NOTION_TOKEN=
NOTION_GUESTS_DATABASE_ID=
NOTION_TEMPLATES_DATABASE_ID=
NOTION_SIGNING_OPERATIONS_DATABASE_ID=

# App
APP_BASE_URL=http://localhost:3000
APP_TIMEZONE=Pacific/Auckland
NODE_ENV=development
```

Use the current Notion API version and document exact capabilities for file uploads, files properties, and page content. Do not commit `.env.local` or credentials. For demo use a developer-controlled Notion workspace; production should use a motel-owned workspace and new credentials.

## 12. Implementation milestones — seven steps

### Step 1 — Project foundation and responsive UI

**Build:** Next.js App Router + TypeScript project; Tailwind/shadcn UI; layouts, routing, form validation conventions, environment validation, error boundaries, request IDs, shared types, test scaffolding. Mac admin layout and iPad-friendly responsive signing shell.

**Done when:** App runs locally; routes render on Mac/iPad viewports; lint, typecheck, unit-test, and build commands pass; no secrets exposed to client.

### Step 2 — Fixed accounts, authentication, and RBAC

**Build:** Owner/Staff credential verification using password hashes; JWT cookie session, logout, session expiry, middleware/route guards, server authorization, login abuse controls. No account management page.

**Done when:** Both roles can log in; Owner can reach template management; Staff is denied owner-only routes and APIs; guests cannot reach admin routes; logout and expiry work.

### Step 3 — Notion setup, arrivals, and walk-ins

**Build:** Notion integration client, data-source/database schema checks, date filtering, guest selection, walk-in creation, contact editing, Notion error handling and rate-limit backoff.

**Done when:** Arrival records load by selected date; walk-ins persist; guest fields are correct; missing Notion permissions/schema produce useful errors; no booking-related fields appear.

### Step 4 — Full agreement editor and immutable templates

**Build:** Tiptap editor, template list, create/duplicate/edit/preview/publish/archive, Notion serialization adapter, versioned published snapshots, PDF preview proof of concept.

**Done when:** Owner can edit the entire document and save/reopen without formatting loss; Staff cannot edit; publishing creates a new immutable version; a previously published version stays unchanged.

### Step 5 — iPad guest mode and signing

**Build:** Staff selects guest/template; creates scoped guest session; isolated guest form; contact validation (email OR phone), agreement reading, acknowledgment, signature canvas, clear/retry, completion screen.

**Done when:** A guest sees only their own agreement; cannot navigate to admin or another guest; touch signature works; incomplete/invalid forms are rejected; repeated submit does not create a second signing.

### Step 6 — Signed PDF, Notion upload, and records

**Build:** Canonical agreement snapshot and hash; server PDF generation; Notion file upload + attach; signing operation journal; guest signed status; search records; authenticated PDF preview/download.

**Done when:** A valid signature results in a PDF attached to the correct guest; PDF contains accepted text, guest data, signature, timestamp, version, and Signing ID; records are searchable; old PDFs remain unchanged after template edits.

### Step 7 — Recovery, security, QA, and deployment

**Build:** Idempotent retries and reconciliation for partial Notion failures; structured sanitized logs; rate-limit handling; access/security tests; E2E flows; performance and iPad usability checks; deployment instructions; synthetic demo data; backup/retention operating notes.

**Done when:** Simulated failures at each upload/attach/update stage can recover without losing or duplicating records; Owner/Staff/Guest authorization tests pass; deployment succeeds; demo works end-to-end on Mac and iPad.

## 13. Cross-cutting acceptance criteria

- [ ] No Google Drive code, credentials, or integration remains.
- [ ] No traditional database is required.
- [ ] Owner can freely edit entire agreement content using Tiptap.
- [ ] Published versions are immutable and can be tied to signed records.
- [ ] Staff cannot edit/publish templates.
- [ ] Notion Arrival List supports date selection and walk-ins.
- [ ] Guest must provide at least one of email or phone; vehicle is optional.
- [ ] Guest mode reveals only one selected guest and one agreement.
- [ ] Guest acknowledges and signs on iPad with touch input.
- [ ] PDF contains the accepted snapshot and signature, not a later template revision.
- [ ] Signed PDF is attached to the correct Notion guest record and retrievable securely.
- [ ] Signed records can be searched and PDFs previewed by authorized staff.
- [ ] A retry does not create duplicate logical signings or duplicate attached PDFs.
- [ ] Notion outages, expired URLs, oversized files, and partial updates are handled explicitly.
- [ ] All sensitive server secrets remain server-side.
- [ ] Demo uses synthetic data; production readiness requires privacy/terms review.
- [ ] Automated tests, typecheck, lint, and production build pass.

## 14. Suggested Codex workflow

Implement **one milestone at a time**. Before coding, inspect the repository, confirm the current Notion API/file upload behavior and relevant package versions, then propose file changes. After each milestone:

1. Run lint, typecheck, unit tests, and build.
2. Add/extend tests for new behavior, including role enforcement and failure cases.
3. Summarize changed files, environment variables, manual Notion setup, and known limitations.
4. Stop for review before starting the next milestone.

**Starter prompt:**

> Read `MOTEL_IMPLEMENTATION_PLAN.md` completely. Implement **Step 1 only**. Follow the architecture and security constraints, use TypeScript throughout, and do not add Google Drive or a SQL database. Add the specified test/build scripts, run them, and report results. Do not start Step 2 until I approve.

## 15. Open decisions before production

- Confirm actual motel name and owner-approved agreement wording; do not copy another motel's branding from an example form.
- Confirm Notion workspace ownership and the exact plan's file-size/API limits.
- Decide signed PDF retention, deletion requests, access logging, and backup policy.
- Confirm who can download signed PDFs and whether staff should have that permission.
- Confirm the precise user-facing timezone and format for signatures and arrival dates.
- Confirm supported agreement formatting; complex tables/images are not MVP requirements.
- Confirm deployment plan and recurring commercial hosting costs.

**End of plan.**
