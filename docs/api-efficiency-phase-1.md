# API efficiency — Phase 1

November 1, 2026. Branch: `fix/api-efficiency-phase-1`, based on `main` at `94fc2b8`.

## Result

The notification panel no longer reloads its list because a response updated its cache. Background profile and permission refreshes use `setProfile`, preserving the last human-activity timestamp; explicit login still records activity. Chat starts directory queries only when the matching tab is open and the actor has the endpoint's permission. Fresh query results remain reusable after reopening.

The organization vendor endpoint now used by this branch, `/vendor-network/vendors`, requires `vendor.read_company`. The chat gate follows that contract. It does not require sensitive-read permission and does not treat directory-only access as company-list access. User-list queries require `user.manage`.

Current main already removed the layout's settings prefetch and the notification panel's second SSE connection, and skips redundant initial profile fetching when authorization is available. This PR preserves those changes. The sidebar derives its initial loading state from the available profile instead of setting redundant state in an effect. Notification stream ownership remains in the existing shared hook; this PR does not add a new stream.

## Regression verification

The focused lifecycle baseline against this main revision had 15 failures and four passes. The failures reproduced repeated notification list reads, closed or unauthorized chat fetching, automatic profile refresh extending idle activity, and silent recovery changing the activity timestamp.

Twenty-two temporary local regression cases verified:

- Empty and populated notification responses during an event-free minute; single-read, mark-all-read, denied-action recovery, and reopening.
- Rejection of old-workspace responses, and no second stream from the panel.
- Explicit login versus background profile updates, permission revocation, idle expiry, actual user activity, deleted-account handling, and silent recovery.
- Bootstrap profile reuse, sidebar readiness, and no settings query from the dashboard layout.
- Closed chat, visible-tab fetching, cached reopening, missing permissions, and removal of contact rows after access is revoked.

The validation run passed all 93 Vitest cases (71 existing and 22 temporary cases) plus one attachment-download test. The four temporary test files and their added `jsdom` dependency are excluded from the final PR; existing tests and test configuration remain unchanged. The temporary checks are retained locally outside the repository and will not become regression coverage on `main`.

After excluding those files and restoring the original dependency manifests, all 71 existing Vitest cases and the attachment-download test pass; TypeScript and diff whitespace checks also pass.

The production build (including TypeScript), changed-file ESLint with zero warnings, and diff whitespace checks passed for the application changes. The local login screen loads successfully. The automated checks used controlled responses and timers; they do not measure live database load or billing.

## Local preview

Use the isolated PR worktree at `/private/tmp/villeto-api-efficiency-phase1`. The original frontend checkout and its existing work are preserved.

Build and start the production-mode preview with:

```sh
NEXT_PUBLIC_API_BASE_URL=http://localhost:3007/ npm run build
NEXT_PUBLIC_API_BASE_URL=http://localhost:3007/ npm run start -- --hostname 127.0.0.1 --port 3006
```

Open `http://localhost:3006`. The existing workspace API on port 3007 uses development configuration (`villeto_test`) and the isolated vendor-preview Redis. No backend restart, migration, or data mutation is part of this change.

## Manual checks and remaining work

Sign in to the local preview and use the browser Network panel to check an idle notification panel, read actions, close/reopen, chat tabs, page refresh, and entity/account changes. Chat should not start directory requests while closed; active tabs should load and reuse authorized results. Verify the configured idle logout separately without generating mouse/keyboard activity.

Authenticated acceptance, deployed revision checks, production network/SQL baselines, and Supabase usage attribution remain open. Smaller response contracts, employee fetch-all removal, shared refresh/cancellation policies, and additional notification recovery work remain in the later phases. No production deployment or monetary saving is claimed.
