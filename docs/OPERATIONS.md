# Operations guide

## Deployment checklist

1. Use Node.js 20.9 or newer and deploy only a successful `npm run build` output.
2. Set every variable in `.env.example` as a server-side secret. Generate `AUTH_SECRET` from at least 32 random bytes and use bcrypt costs from 10 through 15.
3. Use an HTTPS hostname and enable platform-level request and abuse protection.
4. Share only Arrivals, Agreement Templates, and Signing Operations with the internal Notion integration.
5. Sign in once as owner and staff, confirm owner-only Agreements access, and perform a synthetic signing before opening the kiosk to guests.
6. Configure monitoring for application 5xx responses and review Records for `Needs Attention` each day.

Never commit `.env.local`, the Notion token, bcrypt hashes, session secrets, signed PDFs, Playwright artifacts, or production exports.

## Front-desk and iPad use

- Keep the iPad on the isolated guest signing screen while it is handed to a guest. Use Guided Access or the equivalent device kiosk feature.
- Return to Arrivals after each signing. The completion screen contains no guest details.
- Do not reuse old signing links. Each link expires after 30 minutes and is tied to one immutable snapshot.
- A guest must supply either a genuine direct email or phone number. OTA relay addresses and obvious placeholder phone numbers are intentionally blanked.

## Recovery

1. Open Records and filter `Needs attention`.
2. Open the affected record and select Retry.
3. The server resumes from the journal’s last durable state and reuses the same walk-in page or upload where possible.
4. If retry still fails, retain the reference/signing ID, verify Notion availability and schema, then retry after service recovery.

Do not change a journal row to `Completed` manually. Do not replace a template while recovering a signature; the journal’s pinned snapshot is authoritative.

## Notion TLS errors on Windows

If the server log reports `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, inspect the certificate issuer for local antivirus or corporate HTTPS inspection. Do not set `NODE_TLS_REJECT_UNAUTHORIZED=0`.

- With Node.js 22.19 or newer, start the server with `NODE_USE_SYSTEM_CA=1` so Node also trusts the Windows certificate store.
- Alternatively, add `https://api.notion.com` as a narrowly scoped exception in the trusted HTTPS inspection product.
- For a project-only local CA, place its PEM certificate at `.local-certs/local-root-ca.pem`. The `dev` and `start` scripts pass it only to this application's Next.js process. The certificate is excluded from Git by the existing `*.pem` rule.
- Restart the terminal and application after changing either setting, then retry the failed request.

## Backup, retention, and privacy

- Use Notion workspace export or an approved backup product on a documented schedule. Test restoration periodically.
- Define a local legal retention period for guest registration cards. Remove expired records and PDFs through a controlled, audited process outside this application.
- Limit Notion workspace membership and application credentials to current motel staff. Rotate passwords and `AUTH_SECRET` promptly after staff departure or suspected compromise.
- Changing a password hash does not revoke an existing cookie; rotate `AUTH_SECRET` for immediate global session revocation.
- The application records direct contact data, a signature, consent, timestamps, template version, and a hash. Do not add payment card, passport, or unrelated booking data.

## Release verification

Run the following before every release:

```text
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Playwright reads optional `E2E_OWNER_PASSWORD` and `E2E_STAFF_PASSWORD`; local defaults match the documented development accounts. Never run browser tests against production if their actions would create or alter real guest data.
