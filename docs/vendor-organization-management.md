# Organization vendor management

Management → Vendors opens the organization-wide directory. Search, status filters, sorting, counts and pagination come from `/vendor-management`. The transaction workspace selector does not filter this directory.

Add vendor opens a required directory-search step before showing invitation fields. Users search by name, email or public registration number, review server-paginated results, and choose an existing supplier or explicitly continue to a new invitation. An invitation option appears only after a successful search for the current input; editing the query, loading, or a search error prevents continuing until the directory is checked. Opening an existing supplier allows an authorized administrator to add a legal-entity relationship, reuse shared sites, approve the entity relationship, and configure terms, tax and purpose controls. Server-side invitation retries also reuse the existing supplier. Suppliers complete one organization onboarding; entity adoption does not send another invitation.

Directory-only users receive a safe summary. Full supplier profiles remain behind company-read and sensitive-read permissions. Entity configuration requires Vendor Entity Configuration Manager and effective grants for the target entity. The picker uses `/vendor-management/legal-entities`, independently of the global transaction workspace. All-mode transaction mutation restrictions remain unchanged.

Bulk imports call the same invitation endpoint and retain failed rows for retry. The supplier profile no longer infers payment methods from the first available entity or automatically enables payments on activation. Payment eligibility remains in entity controls and Bill Pay. The dedicated vendor transactions page directs users to the financial workspace.

Vendor changes invalidate this actor's supplier queries across entity selections. Other actors, tenants and unrelated query families are unaffected.

Deploy the companion monolith changes before this frontend. The backend implementation and API contracts are documented in `docs/vendor-organization-management.md` in villeto-monolith. No flags or grants are enabled by these source changes.

Validation uses the existing frontend tests plus organization request-boundary, cache and permission regression tests. Source TypeScript passes using clean temporary type roots because local dependencies contain duplicate type folders. Webpack bundles compile. Full Next build remains blocked by the pre-existing invalid helper exports in `src/app/onboarding/leadership/page.tsx`; the page is unchanged. Authenticated local browser checks verified directory visibility across workspaces, existing-vendor reuse, search focus during loading, suspended terms edits and partial bulk retry. A bounded PostgreSQL pool probe passed; the user chose existing suppliers, so new supplier SMTP/onboarding was not exercised. Restricted-user browser acceptance remains a separate check.


Review follow-up: the controls dialog sends only changed fields (including explicit nulls for cleared terms/tax); list loading leaves the search input mounted; a partial bulk summary returns to the existing preview with failed rows selected. Validation: 53 Vitest tests plus the attachment regression, focused ESLint, and source TypeScript passed. The pre-existing shared-profile sample transaction/risk cards are outside this review fix and are not acceptance evidence.

Additional authenticated checks verified rejection of purchasing without a site and an independent Canary terms edit from All mode without changing Primary. Terms and the original workspace were restored; audit/version history retains the test actions.


Current-target merge preserves vendor resubmission labels, shared organization payment-term review and expense read-only controls. Supplier payment terms are matched by vendor ID and successful decisions refresh this actor's vendor caches across entity selections. Backend shared-term approval never approves/enables entity relationships or overwrites their terms. Merged source TypeScript and 53 frontend tests pass; final backend evidence is 299 tests in 14 suites plus the API build.


Search-first UI follow-up: Add vendor opens the search dialog directly; Bulk invite is a separate secondary action. Using an existing supplier opens entity configuration for authorized entity managers, otherwise its permission-appropriate profile. The invitation step retains exact-email lookup and server-side idempotency, supports returning to the search results, and carries a searched email into the form. Closing and reopening starts with a new directory check.

Local authenticated browser verification covered: no invitation action before searching; name search returning an existing supplier; existing selection opening entity configuration; changed search hiding the invite option; completed no-match search revealing the separate invitation form; email prefill (confirmed by form validation); back navigation; and reset on reopen. No invitation was submitted or sent. Existing 53 frontend tests, source TypeScript and focused UI lint passed.
