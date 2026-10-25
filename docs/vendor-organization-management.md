# Organization vendor management

Management → Vendors opens the organization-wide directory. Search, status filters, sorting, counts and pagination come from `/vendor-management`. The transaction workspace selector does not filter this directory.

The Add vendor dialog finds an existing organization supplier by exact email before inviting. Opening an existing supplier allows an authorized administrator to add a legal-entity relationship, reuse shared sites, approve the entity relationship, and configure terms, tax and purpose controls. Server-side invitation retries also reuse the existing supplier. Suppliers complete one organization onboarding; entity adoption does not send another invitation.

Directory-only users receive a safe summary. Full supplier profiles remain behind company-read and sensitive-read permissions. Entity configuration requires Vendor Entity Configuration Manager and effective grants for the target entity. The picker uses `/vendor-management/legal-entities`, independently of the global transaction workspace. All-mode transaction mutation restrictions remain unchanged.

Bulk imports call the same invitation endpoint and retain failed rows for retry. The supplier profile no longer infers payment methods from the first available entity or automatically enables payments on activation. Payment eligibility remains in entity controls and Bill Pay. Sample vendor transactions have been replaced with financial-workspace navigation.

Vendor changes invalidate this actor's supplier queries across entity selections. Other actors, tenants and unrelated query families are unaffected.

Deploy the companion monolith changes before this frontend. The backend implementation and API contracts are documented in `docs/vendor-organization-management.md` in villeto-monolith. No flags or grants are enabled by these source changes.

Validation uses the existing frontend tests plus organization request-boundary, cache and permission regression tests. Source TypeScript passes using clean temporary type roots because local dependencies contain duplicate type folders. Webpack bundles compile. Full Next build remains blocked by the pre-existing invalid helper exports in `src/app/onboarding/leadership/page.tsx`; the page is unchanged. Live browser, PostgreSQL concurrency and email-delivery acceptance are separate checks.
