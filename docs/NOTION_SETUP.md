# Notion setup

The application uses Notion API version `2026-03-11` and the official JavaScript SDK. Each database also requires its data source ID.

## Connection

1. Create an internal Notion integration owned by the deployment workspace.
2. Grant only read, insert, and update content capabilities.
3. Share only the three application databases with that integration.
4. Store the token and IDs in `.env.local` or deployment secrets.
5. Restart the application after changing environment variables.

Never expose the token through `NEXT_PUBLIC_*` or public Notion pages.

## Arrivals data source

Set `NOTION_TOKEN`, `NOTION_ARRIVALS_DATABASE_ID`, and `NOTION_ARRIVALS_DATA_SOURCE_ID`.

| Property | Notion type | Required options |
| --- | --- | --- |
| Name | Title | — |
| Arrival Date | Date | — |
| Type | Select | `Walk-In`, `Booking` |
| Email | Email | — |
| Phone | Phone | — |
| Vehicle | Rich text | — |
| Signed PDF | Files & media | — |
| Signing Status | Status | `Not started`, `Pending`, `Done` |
| Signed At | Date | — |
| Template ID | Rich text | — |
| Template Version | Number | — |
| Signing ID | Rich text | — |
| Agreement Hash | Rich text | — |
| PDF Upload ID | Rich text | — |
| Last Error | Rich text | — |

The adapter maps `Not started` to application `pending`, `Pending` to `in_progress`, and `Done` to `signed`. An arrival is a `Booking`; a new front-desk guest is a `Walk-In`.

OTA relay email domains containing common provider names, including Expedia, Booking, and Agoda, are hidden from the guest form. Obvious placeholder phone numbers, including repeated and sequential digits, are also hidden and rejected when written. A guest must provide both a direct email and a genuine phone number before signing.

Arrival queries use the exact local `YYYY-MM-DD` date and return at most 500 records. The server verifies that a page belongs to the configured data source before updating it. The workflow has no booking source, reference, address, room, departure, rate, extras, or total-charge fields.

## Agreement Templates data source

Set `NOTION_TEMPLATES_DATABASE_ID` and `NOTION_TEMPLATES_DATA_SOURCE_ID`.

| Property | Notion type | Required options |
| --- | --- | --- |
| Name | Title | — |
| Template ID | Rich text | — |
| Version | Number | — |
| Status | Select | `Draft`, `Active`, `Archived` |

Use Notion’s built-in `Created time` and `Last edited time` properties. Validated Tiptap JSON is stored in the page body with marker `ASURE_TEMPLATE_JSON_V1`; do not edit that body directly in Notion. The document includes protected guest-information, acknowledgement, and signature blocks plus sanitized bold, italic, and warning-highlight marks. Draft content is replaceable. Publishing creates a monotonically increasing immutable version.

The idempotent initializer creates one active `Default Registration Card` with template ID `7b1e93d4-5477-4d04-a43a-5d413c517e7d`. To revise an active agreement, duplicate it, edit the draft, and publish a new version.

## Signing Operations data source

Set `NOTION_SIGNING_OPERATIONS_DATABASE_ID` and `NOTION_SIGNING_OPERATIONS_DATA_SOURCE_ID`. This is a private recovery journal. Share the database with the same Notion integration used by the application; being able to retrieve its schema does not guarantee that the integration can query its rows.

| Property | Notion type | Required options |
| --- | --- | --- |
| Signing ID | Title | — |
| Guest Page ID | Rich text | — |
| State | Select | `Prepared`, `Accepted`, `PDF Generated`, `PDF Uploaded`, `Completed`, `Needs Attention` |
| Template ID | Rich text | — |
| Template Version | Number | — |
| Snapshot Hash | Rich text | — |
| PDF File Upload ID | Rich text | — |
| Error | Rich text | — |
| Retry Count | Number | — |
| Accepted At | Date | — |
| Completed At | Date | — |

The journal pins the canonical agreement snapshot before a signing link is issued. It temporarily stores the raw signature so an interrupted PDF operation can resume. Completion removes the raw signature. Do not manually edit or delete journal rows during normal operation.

## Signing and signed PDFs

- Links are HS256 tokens scoped to guest, date, template, and signing ID; they expire after 30 minutes and contain no contact data or Notion credential.
- The accepted canonical snapshot is hashed with SHA-256. Its template version, signing ID, consent text, and signing time are placed in the A4 PDF audit footer.
- The acknowledgement status and acknowledgement timestamp are stored inside the immutable signing snapshot; `Signed At` stores the same completed signing time on the guest record.
- PDF upload uses Notion’s direct upload API and is limited to 20 MB.
- The guest row is marked `Done` only after the uploaded file is attached with its audit metadata.
- Staff retrieve PDFs through an authenticated application endpoint; the browser does not receive the stored Notion URL.

## Reliability

- Data source schemas are validated and cached per process for five minutes.
- The SDK honors `Retry-After` and uses bounded retries for eligible Notion failures.
- Durable workflow states make submission idempotent. Retries reuse the walk-in page and uploaded file where possible.
- `Needs Attention` records can be retried by authenticated staff from Records using the original immutable snapshot.
