# Module delivery stage 07: expenses

Delivered source stages: foundation, people-administration, vendors-policies, procurement, invoice-intake-ap, payments-accounting, expenses.

Current stage: **07 — expenses, local acceptance pending**. Both repositories
use `entity-workspace-07-expenses`. Backend targets `develop`; frontend
targets `main`. Read the latest Stage 7 handoff below before continuing.
Backend contracts deploy before corresponding frontend consumers.

Scope code and local test evidence remain distinct from module acceptance.
Route/helper traces, dynamic consumers, actual authenticated browser workflows,
deployed registrations and company data readiness require recorded review.
Pending checklist rows cannot be considered complete. Workspace rollout remains
disabled; preserve scope enforcement and audit ownership during rollback.

## Stage 5 merge decision — 2026-10-14

The user approved integration after partial local testing; some components are
not yet available. Full authenticated intake, capture, document access, invoice
review, All-mode and entity-isolation acceptance remains pending. This merge does
not certify production rollout readiness. Current main already contains the
Stage 5 frontend consumers; the remaining frontend diff records delivery status.

## Stage 6 session handoff — 2026-10-16

**Stopping point:** local preview prepared; Stage 6 PRs opened for review.

- [Backend PR #221](https://github.com/villetostream/villeto-monolith/pull/221) → `develop`.
- [Frontend PR #254](https://github.com/villetostream/villeto-app/pull/254) → `main` (documentation only).

Neither PR was merged as part of this handoff. The user
explicitly accepts that Stage 6 will not be fully tested at this point. This is
not full module acceptance, merge authorization, or production rollout approval.
Stage 5 was merged with partial acceptance; its outstanding checks remain open.

### Implemented scope

- Backend workspace scoping for payment requests, payments, funding accounts,
  beneficiaries, approval rules, reconciliation, accounting configuration,
  accounts, periods, journals, obligations and trial balances.
- Frontend Payments, payment details, Bill Pay settings and Accounting use
  workspace-aware entity context; accounting queries isolate workspace caches.
  All-entity accounting responses retain entity and currency breakdowns.
- Current frontend `main` already includes these UI consumers. The remaining
  Stage 6 frontend PR is documentation only; do not claim it newly adds screens.

### Verified during local preparation

- Backend: 4 focused suites, 20 tests passed (accounting service, payment workflow
  service, payment workflow entity enforcement and payment workflow policy).
- Frontend: 43 Vitest tests and 1 attachment-download regression passed.
- Frontend TypeScript passed with a temporary type-root directory excluding
  existing duplicate `@types` folders ending in ` 2`. The standard local command
  encounters those duplicate folders; no dependency folders were deleted.
- Inventory checks account for 353 API routes and 18 system entrypoints;
  208 frontend call references were refreshed. Pending reviews remain pending.
- Next dev reported ready on port 3006. The matching API compiled and reported
  successful startup on port 3007 using development configuration (`villeto_test`).
  Startup and focused tests are not authenticated workflow acceptance evidence.

### Local preview at handoff

- Buyer frontend: `http://localhost:3006`; API: `http://localhost:3007`.
- Frontend checkout: `/Users/lanre/Documents/Villeto/villeto-app`.
- Backend checkout: `/Users/lanre/.codex/worktrees/entity-workspace-stage6/villeto-monolith`.
- API container: `api-gateway-workspace`, Compose project
  `villeto-entity-workspace-preview`. Confirm mounts and configuration before reuse.
- Local `entity_workspace` and `entity_scoped_access` are enabled. Keep company
  boundaries, grants and business permissions enforced. Production flags were
  not changed. Never copy secrets into this document.
- Use port 3006 for the frontend and branch names without a `codex/` prefix.
  Preserve unrelated work in the primary backend checkout and the untracked
  frontend file `docs/entity-workspace-implementation 2.md`.

### Resume here

1. Check both PRs, branch heads and running processes; these may have changed.
2. Record which components and fixtures are available. No authenticated Stage 6
   workflow pass is recorded yet; do not infer success from this handoff.
3. Test single-entity reads and actions, forged context and cross-tenant/entity
   denial, nested resources, pagination/counts, All-mode mutation blocking,
   inactive history and record-to-entity transitions.
4. Test payment submission/authorization/rejection, maker-checker and self-approval
   restrictions, funding/beneficiary eligibility, reconciliation/reversal, journals
   and balances. Keep currencies separate; verify totals retain entity breakdowns.
5. Verify frontend switching, stale responses, permission revocation, tab isolation
   and unsaved work. Carry forward Stage 5 intake/AP acceptance and the complete
   PR → PO → invoice → obligation → payment ownership test when components exist.
6. Record actual evidence and remaining blockers in the coverage checklist before
   marking any module complete. Stage 7 (Expenses) and Stage 8 (cross-module audit)
   remain later delivery stages; final rollout/preflight is still outstanding.

## Stage 7 session handoff — 2026-10-16

**Stopping point:** expense workspace branches prepared for local testing; full
acceptance remains pending. Both repositories use `entity-workspace-07-expenses`.
Backend targets `develop`; frontend targets `main`. Backend release PR #222 is
merged into `main` at `37f31a3`; frontend Stage 6 PR #254 is merged at `71eeb5c`.
The incomplete Stage 5 and Stage 6 acceptance work above remains open.

### Changes and verification

- Reconciled Stage 7 with current backend `develop` and frontend `main`, retaining
  split-expense visibility joins and the corrected frontend draft/submit loading
  behavior. Frontend main already contains the expense workspace consumers.
- Fixed expense-review cache invalidation to refresh this actor's workspace-keyed
  expense queries across entity selections. A regression test verifies that other
  users, companies and unrelated query families remain untouched.
- Added submission ownership tests for effective primary assignment independent
  of selected workspace, missing/overlapping assignments, and insufficient grants.
- Nine backend suites passed: 235 tests. Frontend passed 44 Vitest tests and one
  attachment regression. TypeScript passed using temporary type roots excluding
  existing duplicate `@types` directories; no dependency directories were deleted.
- Inventories pass for 354 API routes, 18 system entrypoints and 208 frontend
  references. Pending review statuses were preserved. API watch compilation and
  startup passed. These checks are not PostgreSQL fixture or authenticated browser
  acceptance; no full production-build or production-readiness claim is made.

### Preview and next tests

Use buyer port 3006 and API port 3007. Frontend checkout remains
`/Users/lanre/Documents/Villeto/villeto-app`; the API reuses
`/Users/lanre/.codex/worktrees/entity-workspace-stage6/villeto-monolith` despite
its directory name. The API container is `api-gateway-workspace`, using development
configuration and `villeto_test`. Verify runtime state when resuming.

1. Personal expense history must remain available when switching entities.
2. Company/team review queues must intersect existing permission scope with the
   report's stored reimbursement entity, including counts and pagination.
3. All mode and inactive history must block review mutations. Opening actionable
   records must establish their entity context first.
4. New submissions must use effective primary assignment; test missing assignments
   and employee transfers without relabeling historical reports.
5. Verify split-participant list AND detail access, economic allocation permissions,
   attachments/downloads, self-approval restrictions and permission revocation.
   Split-participant detail authorization remains a specific review item because
   the workspace interceptor distinguishes reporter access from approver access.
6. Run PostgreSQL fixtures and authenticated workflows before completing coverage
   rows. Stage 8 cross-module audit, ownership lifecycle and final preflight remain.

Preserve unrelated edits in the primary backend checkout and the frontend's
untracked `docs/entity-workspace-implementation 2.md`. Production flags and data
were not changed during this preparation.

## Manual acceptance deferral — 2026-10-17

The user requested that all outstanding Stage 5, 6 and 7 manual checks remain
**OPEN — deferred**. See the backend repository checklist: `villeto-monolith/docs/legal-entities/OPEN_MANUAL_ACCEPTANCE_STAGES_5_7.md`.
This is the canonical checklist for both repositories. Continue carrying these
items into Stage 8; merged PRs and automated checks do not close them. Missing
components must be recorded as blocked with a reason, never passed. No new
manual acceptance evidence was recorded in this update.

## Stage 8 frontend walkthrough — 2026-10-17

An authenticated local walkthrough found and locally fixed invoice detail
mapping, invoice-to-PO navigation and unsupported sample payment figures. The
backend repository records the exact checks and open blockers in
`docs/legal-entities/STAGE_8_FRONTEND_WALKTHROUGH_2026_10_17.md`. The full
ownership lifecycle remains unverified because the available PR lacked a
browser-visible PO relationship and the payment ledger had no test record.
