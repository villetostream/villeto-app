# Module delivery stage 06: payments-accounting

Delivered source stages: foundation, people-administration, vendors-policies, procurement, invoice-intake-ap, payments-accounting.

Current stage: **06 — payments and accounting, review pending**. Both repositories
use `entity-workspace-06-payments-accounting`. Backend targets `develop`; frontend
targets `main`. Read the Stage 6 handoff below before continuing.
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

**Stopping point:** local preview prepared; PR creation requested. The user
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
