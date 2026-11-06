# Motel Guest Agreement

Responsive motel arrival, Registration Card, iPad signing, and signed-record application backed by Notion.

## Local development

Requirements: Node.js 20.9 or newer and npm.

1. Copy `.env.example` to `.env.local` and keep only the values needed for the current milestone.
2. Run `npm install`.
3. Run `npm run dev` and open `http://localhost:3000`.

## Verification

```text
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## Authentication configuration

Step 2 uses exactly two deployment-managed accounts. Set distinct bcrypt password hashes (cost 12 or higher is recommended) in `OWNER_PASSWORD_HASH` and `STAFF_PASSWORD_HASH`; never place plaintext passwords in an environment file. `AUTH_SECRET` must contain at least 32 cryptographically random bytes. The usernames, hashes, and signing secret are server-only and must never use a `NEXT_PUBLIC_` prefix.

Sessions are HMAC-signed JWTs with an eight-hour default maximum age, stored in `Secure`, `HttpOnly`, `SameSite=Strict` cookies in production. Rotating `AUTH_SECRET` immediately invalidates all existing sessions. Changing a password hash does not revoke an already-issued session, so rotate `AUTH_SECRET` at the same time when emergency revocation is required.

Login attempts are conservatively limited per proxy-provided client address. The limiter is process-local because this MVP does not add a distributed database or rate-limit service; deployments must also enable platform-level abuse protection. State-changing authenticated endpoints validate the request origin.

No traditional database or Google Drive integration is used.

## Notion arrivals

Step 3 uses the current data-source API for arrival-date filtering, walk-in creation, and contact updates. Complete the property and least-privilege connection setup in [`docs/NOTION_SETUP.md`](docs/NOTION_SETUP.md). Notion access remains server-only; browser code calls authenticated application endpoints and never receives the integration token or Notion page URLs.

The owner-only restricted Tiptap editor supports headings, paragraphs, bold, italic, lists, simple tables, and allowlisted guest/signature placeholders. Scripts, links, arbitrary HTML/CSS, and embeds are rejected at the server boundary. Publishing creates immutable versions.

Arrivals displays guest names plus a Walk-In choice. A short-lived signing token opens an isolated form for direct contact details, agreement review, and touch signature. The server creates an A4 PDF from the immutable template version, embeds the signature and timestamp, uploads it to the guest's `Signed PDF` property, and marks the record `Done`. Authenticated Records pages proxy PDF access without exposing the Notion token or stored file URL.

The default template intentionally excludes booking source/reference, address, room, departure date, rate details, extras, and total charges.

## Production operations

Configure all variables documented in `.env.example`, use HTTPS, and keep every secret in the hosting provider’s encrypted server-side settings. The application validates all three Notion schemas when they are used. See [`docs/NOTION_SETUP.md`](docs/NOTION_SETUP.md) for exact properties and [`docs/OPERATIONS.md`](docs/OPERATIONS.md) for deployment, recovery, retention, and iPad guidance.

The Signing Operations journal makes accepted signings recoverable and idempotent. Staff can retry `Needs Attention` records without asking the guest to sign again. The raw signature is removed from the journal after completion; the signed PDF and audit metadata remain in the Arrivals record.
