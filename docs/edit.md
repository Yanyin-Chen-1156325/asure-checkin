# Refactor the Agreement Template and Guest Signing System

Please review the existing codebase and refactor the Agreement Template Editor, Guest Signing Form, and PDF/Print functionality.

The current implementation does not meet the expected user experience. I want a consistent, professional, and user-friendly digital registration card system for a motel.

**Important:** I have deleted the existing database data. Please inspect the current database schema, migrations, and integrations before making changes. Do not assume the old records still exist.

Reuse the existing technology stack and project architecture wherever possible.

## 1. Single Source of Truth for the Agreement

The most important requirement is consistency.

The Agreement Template, Guest Signing Form, PDF Preview, and printed document must use the same document structure, content, formatting, and visual hierarchy.

Do not maintain separate hardcoded versions of the agreement for different views.

Use a shared document schema and reusable rendering components wherever possible.

The only differences should be:
- Admin Template Editor: editable content and configurable formatting.
- Guest Signing Form: actual input fields, acknowledgement checkbox, and signature pad.
- PDF/Print: completed guest information, acknowledgement status, and captured signature.

All views must preserve the same section order, headings, highlighted warnings, spacing, and overall document layout.

## 2. Guest Information Fields

The registration card must contain exactly these four guest information fields:

- Name (required)
- Email (required)
- Phone (required)
- Vehicle Registration (optional)

Do not add booking details, room numbers, arrival dates, departure dates, or other reservation information.

### Guest Form Requirements

All fields must be visually recognizable as editable input fields.

Use:
- Visible labels above each input.
- Clear input borders and sufficient padding.
- Helpful placeholders.
- An asterisk (*) next to required field labels.
- Appropriate input types and validation.
- Clear validation error messages.
- A touch-friendly layout suitable for tablets.

Example:

Name *
[Enter your full name]

Email *
[Enter your email address]

Phone *
[Enter your phone number]

Vehicle Registration
[Enter your vehicle registration (optional)]

The guest must immediately understand where to enter their information.

Do not display template variables such as `{{guest.name}}` to guests.

In the Admin Template Editor, display a realistic preview of the input fields rather than raw placeholder variables.

## 3. Remove iPad Preview

Remove the separate iPad Preview feature completely.

Keep:
- PDF Preview
- Print

The guest signing interface must already be responsive and suitable for tablets, so a separate iPad Preview mode is unnecessary.

PDF Preview must display the actual document layout, not an independently designed approximation.

Print must use a clean print layout without navigation menus, buttons, or administrative UI elements.

## 4. Highlight Important Agreement Terms

Important agreement terms should be visually emphasized so guests can easily identify them.

Use a professional visual design with:
- Soft red backgrounds for important warnings.
- Dark red text or borders for critical policies.
- Bold text for important amounts, times, or restrictions.
- Sufficient contrast and readable font sizes.

Avoid excessive highlighting. Only important information should stand out.

For the current registration card, emphasize at least:

- Check-out time: 10:00 AM.
- Lost key fee: $100 per key.
- No smoking policy.
- No pets policy.
- Responsibility for damage.
- Non-refundable accommodation.
- Payment and Damage Authorisation.

Keep the existing policy wording unless a content change is explicitly required.

### Template Editor Requirements

Administrators should be able to:
- Edit agreement text.
- Apply bold formatting.
- Apply warning/highlight formatting.
- Create or edit headings.
- Maintain bullet lists.
- Preview the actual guest-facing document.

Use structured, sanitized content rather than allowing unrestricted HTML.

Highlight formatting must be preserved consistently in the Guest Signing Form and PDF/Print output.

## 5. Guest Acknowledgement Checkbox

Add a mandatory acknowledgement checkbox near the end of the agreement, before the signature section.

Suggested text:

"I confirm that I have read and understood the terms and conditions above, and I agree to comply with them."

Requirements:
- The checkbox must be unchecked by default.
- Guests must manually check it.
- Guests cannot submit the agreement without checking it.
- Show a clear validation message if it is not checked.
- Store the acknowledgement status and timestamp with the signed record.
- Include the acknowledgement statement and checked status in the final PDF.

Do not preselect the checkbox.

## 6. Signature Section

Place the signature section after the acknowledgement checkbox.

Requirements:
- Provide a clear signature pad.
- Support touch, mouse, and stylus input.
- Include a Clear Signature button.
- Require a valid, non-empty signature before submission.
- Display the signing date/time.
- Store the captured signature with the completed agreement.
- Embed the actual signature image in the final PDF.

Do not use placeholder text such as "Signature captured at signing" in the completed PDF.

## 7. Template and Signing Form Must Match

This is a critical acceptance requirement.

The Template Editor must provide a WYSIWYG-like document preview.

The guest-facing agreement should look like the same document, except that guests can interact with input fields, checkbox, and signature pad.

The PDF must preserve:
- Document title.
- Guest information section.
- All agreement headings.
- Bullet lists.
- Warning highlights.
- Text formatting.
- Acknowledgement statement.
- Signature.
- Signing date/time.

Avoid separate HTML templates that could drift apart over time.

Use shared components and a consistent print stylesheet or equivalent PDF rendering strategy.

Minor pagination differences are acceptable, but content, formatting, and visual hierarchy must remain consistent.

## 8. Database and Version Management

The database has been cleared, so please inspect and initialize the required structure.

Requirements:
- Create or update the necessary schema and migrations.
- Create a default Registration Card template if no template exists.
- Avoid creating duplicate default templates.
- Support draft and published template versions.
- Published and archived versions must be read-only.
- Store the exact template version used for each signed agreement.
- Save a snapshot of the agreement content at signing time.
- Ensure future template changes do not modify previously signed records.
- Store guest information, acknowledgement, signature, and signing timestamp.
- Preserve compatibility with the existing storage integration where applicable.

Do not silently delete or overwrite existing records if any are found.

## 9. User Experience and Responsive Design

Use a clean, modern, professional design suitable for a motel reception desk.

The interface should work well on:
- Desktop
- iPad/tablet
- Mobile

Prioritize the tablet signing experience.

Requirements:
- Comfortable touch targets.
- Readable typography.
- Clear section spacing.
- Consistent field alignment.
- Visible required indicators.
- Clear validation messages.
- No unnecessary UI complexity.

The document should look like a professional registration card rather than an administrative data table.

## 10. Testing and Acceptance Criteria

Please verify the following:

1. A new default template is created successfully when the database is empty.
2. Admin can edit and publish the template.
3. Guest sees four clearly editable information fields.
4. Name, Email, and Phone are required.
5. Vehicle Registration is optional.
6. Important policies are visually highlighted.
7. Guest must check the acknowledgement checkbox.
8. Guest must provide a signature.
9. Submission is blocked when required information is missing.
10. The completed PDF includes actual guest information and signature.
11. The Template, Guest Form, PDF Preview, and Print use consistent content and styling.
12. Updating the template does not change previously signed agreements.
13. The interface works on desktop and tablet.
14. iPad Preview has been removed.
15. Existing functionality outside the agreement workflow remains unaffected.

## Implementation Instructions

Before coding:
1. Inspect the existing project structure.
2. Identify the current template rendering and PDF generation approach.
3. Identify the database schema and storage integration.
4. Explain briefly which components need to change.

Then implement the changes.

Prefer reusing existing components and dependencies instead of introducing unnecessary libraries.

After implementation:
- Run relevant tests, linting, and build checks.
- Fix any issues introduced by the refactor.
- Summarize the files changed.
- Explain any required database migration or environment configuration.
- Clearly identify anything that remains incomplete.

Do not stop at planning. Implement the complete workflow.