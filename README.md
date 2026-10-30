# Motel Guest Agreement

Step 1 project foundation for a responsive, secure motel guest agreement web application.

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
npm run build
```

## Authentication configuration

Step 2 uses exactly two deployment-managed accounts. Set distinct bcrypt password hashes (cost 12 or higher is recommended) in `OWNER_PASSWORD_HASH` and `STAFF_PASSWORD_HASH`; never place plaintext passwords in an environment file. `AUTH_SECRET` must contain at least 32 cryptographically random bytes. The usernames, hashes, and signing secret are server-only and must never use a `NEXT_PUBLIC_` prefix.

Sessions are HMAC-signed JWTs with an eight-hour default maximum age, stored in `Secure`, `HttpOnly`, `SameSite=Strict` cookies in production. Rotating `AUTH_SECRET` immediately invalidates all existing sessions. Changing a password hash does not revoke an already-issued session, so rotate `AUTH_SECRET` at the same time when emergency revocation is required.

Login attempts are conservatively limited per proxy-provided client address. The limiter is process-local because this MVP does not add a distributed database or rate-limit service; deployments must also enable platform-level abuse protection. State-changing authenticated endpoints validate the request origin.

Template and signing-operation Notion variables remain reserved for later milestones. No traditional database or Google Drive integration is used.

## Notion arrivals

Step 3 uses the current data-source API for arrival-date filtering, walk-in creation, and contact updates. Complete the property and least-privilege connection setup in [`docs/NOTION_SETUP.md`](docs/NOTION_SETUP.md). Notion access remains server-only; browser code calls authenticated application endpoints and never receives the integration token or Notion page URLs.

Step 4 adds the owner-only restricted Tiptap editor and immutable template publishing. Template content supports headings, paragraphs, bold, italic, bullets, and numbered lists. Scripts, links, arbitrary HTML/CSS, embeds, images, and complex tables are rejected at the server boundary. The same validated document renderer powers iPad and printable preview layouts; guest details and signature blocks remain system-generated.
