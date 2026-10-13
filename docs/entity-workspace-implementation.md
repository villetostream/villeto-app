# Legal entity workspace frontend contract

Backend contracts must deploy before these consumers. The backend's
`docs/legal-entities/WORKSPACE_IMPLEMENTATION.md`, route inventory and system
entrypoint inventory are the coordinated delivery/acceptance source.

`GET /legal-entities/workspace` provides current primary assignment, authorized
options, blockers, switching capability, personal-expense submission readiness
and an opaque permission/scope revision. Workspace requests send
`X-Villeto-Legal-Entity: <uuid>|all`; personal owners, shared administration and
supplier paths retain their documented exemptions.

Selection is tab-local and actor/tenant-specific. Sensitive caches also include
workspace and generation. Switching or authorization changes cancel obsolete
requests, reject late responses, restart streams and remount sensitive views.
The header protects unsaved work with keep-editing or discard-and-switch choices
and prevents switching while a scoped mutation is pending.

Transaction entity pickers are replaced by selected-entity summaries. Eligible
purchasing vendors/sites use the selected entity. All and inactive views disable
entity mutations, keep currency and entity breakdowns, and switch to stored
ownership when opening an actionable record. Organization vendor setup is an
explicitly separate, permission-guarded workflow; supplier endpoints do not use
the buyer's browser selection.

Personal expense history remains independent of selection and transfers. New
submissions require an active primary assignment and requester entity access.
Reviewer/finance queues follow stored reimbursement ownership; economic
allocation authorization remains separate.

## Validation

Run `npm test`, `npx tsc --noEmit` and `npm run build`. CI runs these checks.
Workspace tests cover actor/entity cache keys, revocation with unchanged All
selection, business-scope revision changes, tab independence, mutation/unsaved
state, supplier/admin exemptions, readonly policies, fetch cancellation and
stream invalidation. The Node binary attachment regression remains included.

The local browser check uses a controlled loopback fixture; it verifies UI and
request contracts, not live backend authentication, worker delivery or OAuth.
Actual authenticated module workflows remain a separate acceptance gate.

Rollback must retain the shared transport and cache boundaries and keep backend
workspace/entity authorization and persisted ownership. FX conversion,
consolidation and payment execution remain outside this change.
