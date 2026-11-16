# Security Testing & Verification Record (`villeto-app`)

This record documents all static analysis, dependency auditing, automated security regression tests, type checking, linting, and production build verification executed during the security assessment and remediation of `villeto-app`.

---

## 1. Environment & Tooling Inventory

| Tool / Runtime | Observed Version / Details | Notes |
|---|---|---|
| **Node.js** | `v24.14.0` | Built-in `node:test` runner and native TypeScript type-stripping |
| **Next.js** | `16.4.6` (Turbopack, `package.json` `^16.4.6`) | Verified during `npm run build` |
| **TypeScript** | `tsc --noEmit` (`tsconfig.json` `strict: true`) | Excludes `**/*.test.ts`, `**/*.test.tsx`, `vitest.config.ts` |
| **ESLint** | `eslint . --max-warnings 0` (`eslint.config.mjs`) | Next.js core-web-vitals + typescript + unused-imports |
| **Vitest** | `v4.1.12` (`^4.1.12` in `devDependencies`) | Installed on disk; all 14 `.test.ts`/`.test.tsx` suites (81 tests) run and pass via `npm test` |
| **Microsoft Threat Modeling Tool (TMT)** | Not available | Headless CLI Windows environment without TMT; equivalent Mermaid DFDs & STRIDE register created in [THREAT_MODEL.md](./THREAT_MODEL.md) |
| **Dynamic / Intrusive Testing Scope** | Local static + unit/build checks only | No live staging/production servers or external third-party APIs were probed or attacked |

---

## 2. Executed Checks & Verified Results

### 2.1 Automated Unit & Security Regression Tests (`npm test`)
- **Command:** `npm test` (`vitest run && node --test src/lib/mailbox-attachment-download.test.mjs src/lib/security/security.test.mjs`)
- **Post-Upgrade & BFF Migration Result:** **PASSED — 14 Vitest test files (`81` passed, `0` failed) + 2 `node:test` suites (`11` passed, `0` failed) = `92` automated tests passing.**
  - `src/lib/security/bff.test.ts` (`9` tests): AES-256-GCM sealed cookie roundtrip, tamper/wrong-key/expiry rejection, fail-closed missing `BFF_SESSION_SECRET` in production, SSRF path/scheme rejection, CSRF cross-origin/`null` origin rejection, upstream `Set-Cookie` host-only rewriting, `accessToken` stripping from login/refresh payloads, end-to-end BFF login -> Bearer injection proxy check, and `/api/bff/` legal-entity workspace route matching.
  - `13` existing Vitest domain suites (`72` tests): `policies.test.ts` (15), `end-site-assignment.test.ts` (15), `store.test.ts` (12), `authorization.test.ts` (5), `role-capability-form.test.ts` (5), `fetch.test.ts` (4), `cache.test.ts` (3), `relationship-controls.test.ts` (3), `EndAssignmentForm.test.tsx` (3), `purchase-order-permissions.test.ts` (2), `read-only-policies.test.ts` (2), `date-only.test.ts` (2), `expense-cache.test.ts` (1).
  - `src/lib/mailbox-attachment-download.test.mjs` (`1` test): filename sanitization and binary attachment preservation.
  - `src/lib/security/security.test.mjs` (`10` tests):
    1. OAuth authorization URL allowlist (`accounts.google.com`), credential rejection, and `sanitizeNavigationHref` blocking (`javascript:`, `data:`, `//`, `/\`).
    2. `createSafeAttachmentPreviewBlob` & `isSafeInlinePreviewMime` downgrading `text/html`, `image/svg+xml`, `application/xhtml+xml`, and `.svg` filenames to `application/octet-stream` while allowing `application/pdf` and raster images.
    3. `sanitizeImageSrc` & `normalizeReceiptSrc` blocking `data:image/svg+xml`, `data:text/html`, and `javascript:` URIs.
    4. `openSafeUrlInNewTab` enforcing `noopener,noreferrer` and blocking `javascript:`.
    5. `buildAuthMarkerCookie` & `buildClearAuthMarkerCookie` emitting `SameSite=Lax` and `; Secure` (on HTTPS).
    6. `validateRasterImageFile`, `validateSpreadsheetFile`, and `sanitizePlainObjectRow` rejecting SVG/oversized/malicious files and stripping `__proto__`/`constructor`/`prototype`.
    7. `escapeCSVValue` prefixing `=`, `+`, `-`, `@` (and whitespace-prefixed formulas) with `'`.
    8. `unflatten` blocking `__proto__.polluted` and `constructor.prototype.pwned` prototype pollution.
    9. `passwordSchema` enforcing length bounds (`8..100`) and special characters (`[^a-zA-Z0-9]`).
    10. `buildContentSecurityPolicy` & `getSecurityHeaders` removing `'unsafe-eval'` in production, enforcing `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `Permissions-Policy`, and `Cache-Control: no-store, private` on authenticated routes.
- **Note on `.xls` Legacy Spreadsheets:** Browser preview parsing for `.xlsx` uses `read-excel-file/browser`; legacy binary `.xls` uploads display a browser preview conversion toast rather than invoking unpatched SheetJS (`xlsx`). End-to-end live browser testing against `villeto-monolith` remains required in staging/QA.

### 2.2 TypeScript Type Checking (`npm run typecheck`)
- **Command:** `npm run typecheck` (`tsc --noEmit`)
- **Post-Remediation Result:** **PASSED — exited `0` (0 errors).**

### 2.3 Next.js Production Build (`npm run build`)
- **Command:** `npm run build` (`next build`)
- **Post-Upgrade & BFF Result:** **PASSED — exited `0` (`Next.js 16.4.6` Turbopack, compiled in 58s, TypeScript finished in 2.0min, 66/66 static/dynamic pages + `ƒ /api/bff/[...path]` + `ƒ Proxy (Middleware)`).**

### 2.4 ESLint (`npx eslint --max-warnings 0 ...`)
- **Baseline Repo-Wide Run (`npm run lint`):** Pre-existing codebase contains `1,272` unrelated lint problems across untouched files.
- **Post-BFF Run across New/Modified Core Modules (`task-590`):** Passed with **exit code `0` (0 errors, 0 warnings)** across all `15` checked files (`src/lib/security/{bff-session.ts, bff-proxy.ts, bff.test.ts}`, `src/app/api/bff/[...path]/route.ts`, `src/stores/auth-stores.ts`, `src/lib/{tokenRefreshService.ts, api-url.ts}`, `src/components/dashboard/layout/{SilentRefreshGate.tsx, DashboardLayoutContent.tsx}`, `src/features/entity-workspace/{fetch.ts, transport.ts}`, `src/features/auth/use-authorization-refresh.ts`, `src/hooks/useNotificationCount.ts`, `src/proxy.ts`, `next.config.ts`). Pre-existing lint issues in legacy modified pages (`login/page.tsx` unused `router` + 2 warnings; `useAxios.ts` 1 pre-existing navigation warning) were left untouched to preserve unrelated code outside security scope.

### 2.5 Software Composition Analysis (`npm audit`)
- **Production Runtime Audit (`npm audit --omit=dev --json`):** **PASSED — `0` vulnerabilities (`0` critical, `0` high, `0` moderate, `0` low)** after upgrading `next@16.4.6`, `axios@^1.21.1`, `zod@^4.6.7`, replacing `xlsx@0.18.5` with `read-excel-file@^9.3.17`, and running `npm audit fix`.
- **Full Audit Including `devDependencies` (`npm audit`):** Dropped from `26` advisories (`3` critical, `12` high, `11` moderate) down to **`8` dev-only lint tooling advisories (`1` high `brace-expansion <=1.1.20`, `7` moderate `@typescript-eslint/*` / `minimatch`)**; `0` critical advisories remain anywhere in the tree.
