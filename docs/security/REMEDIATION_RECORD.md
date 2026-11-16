# Security Remediation Record (`villeto-app`)

This document records every code-level security remediation implemented in `villeto-app` during this assessment, including root cause, exact files changed, new shared security utilities, and verification results.

---

## 1. Summary of New Security Primitives (`src/lib/security/`)

| Module | Purpose | Key Exported Functions |
|---|---|---|
| [`src/lib/security/url.ts`](../../src/lib/security/url.ts) | URL scheme & host allowlist validation (prevents open redirects, protocol-relative redirects, `javascript:`/`data:` URI navigation) | `sanitizeExternalHttpUrl`, `isSafeOAuthAuthorizationUrl`, `sanitizeNavigationHref` |
| [`src/lib/security/blob-preview.ts`](../../src/lib/security/blob-preview.ts) | Passive media MIME allowlist for `blob:` previews & `data:image/*` sanitization | `isSafeInlinePreviewMime`, `isSafeRasterImageMime`, `createSafeAttachmentPreviewBlob`, `openSafeUrlInNewTab`, `sanitizeImageSrc` |
| [`src/lib/security/auth-cookie.ts`](../../src/lib/security/auth-cookie.ts) | Centralized UX auth marker cookie flags (`SameSite=Lax`, `Secure` on HTTPS) | `buildAuthMarkerCookie`, `buildClearAuthMarkerCookie`, `setAuthMarkerCookie`, `clearAuthMarkerCookie` |
| [`src/lib/security/file-upload.ts`](../../src/lib/security/file-upload.ts) | Raster image & spreadsheet validation + prototype-key row sanitization | `validateRasterImageFile`, `validateSpreadsheetFile`, `sanitizePlainObjectRow`, `DANGEROUS_OBJECT_KEYS` |
| [`src/lib/security/headers.ts`](../../src/lib/security/headers.ts) | Hardened CSP and security header construction used by Edge Proxy | `buildContentSecurityPolicy`, `getSecurityHeaders` |
| [`src/lib/security/bff-session.ts`](../../src/lib/security/bff-session.ts) | AES-256-GCM sealed `HttpOnly` session cookie helper (`villeto_access`) with HKDF key derivation & prod fail-closed secret check | `sealBffSession`, `unsealBffSession`, `serializeAccessSessionCookie`, `serializeClearAccessSessionCookie`, `shouldUseSecureCookie` |
| [`src/lib/security/bff-proxy.ts`](../../src/lib/security/bff-proxy.ts) | Next.js BFF server proxy enforcing SSRF/path guards, CSRF same-origin validation, JWT stripping, and cookie/SSE streaming relay | `handleBffProxyRequest`, `buildUpstreamUrl`, `isTrustedSameOriginRequest`, `rewriteUpstreamSetCookie`, `stripAccessTokenFromPayload` |
| [`src/app/api/bff/[...path]/route.ts`](../../src/app/api/bff/[...path]/route.ts) | Node.js Next.js App Router BFF catch-all route handler bridging all browser API calls and SSE streams | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS` |
| [`src/lib/security/security.test.mjs`](../../src/lib/security/security.test.mjs) | Automated security regression test suite (10 security test cases) | Node `node:test` assertions |
| [`src/lib/security/bff.test.ts`](../../src/lib/security/bff.test.ts) | Automated BFF session sealing, CSRF/SSRF/cookie-rewriting, JWT stripping, and entity-route tests (9 test cases) | Vitest assertions |

---

## 2. Detailed Remediation Log

### REM-01 — Stored XSS Prevention in Mailbox Blob Previews, Chat, Receipt & Inspection Media
- **Root Cause:** `useViewTenantMailboxAttachment` (`src/queries/bill-pay-mailboxes.ts`) created same-origin `blob:` URLs using unvalidated `mimeType` values (including active `text/html`, `image/svg+xml`, `application/xhtml+xml`), and `src/app/(dashboard)/bill-pay/mailbox/page.tsx` opened them via `window.open(attachmentViewer.url, "_blank")` without `noopener,noreferrer`. Additionally, `src/components/chat/chat-utils.ts` classified `.svg` as inline images, `ChatMessageBubble.tsx` and `CompanyFinalDecisionModal.tsx` rendered unvalidated `href`/`src` links with `target="_blank" rel="noreferrer"`, and `src/lib/utils/receipt-image.ts` accepted arbitrary `data:` URLs (`data:image/svg+xml`, `data:text/html`).
- **Changes Applied:**
  - `src/queries/bill-pay-mailboxes.ts`: Switched attachment preview Blob creation to `createSafeAttachmentPreviewBlob()`, downgrading active/unknown MIME types to `application/octet-stream` and returning `canPreviewInline` and `mimeType: safeMimeType`.
  - `src/app/(dashboard)/bill-pay/mailbox/page.tsx`: Restricted inline image preview via `isSafeRasterImageMime()`, replaced `window.open(..., "_blank")` with `openSafeUrlInNewTab()` (which enforces `noopener,noreferrer`) for safely previewable PDFs/raster images, and triggers safe download (`saveMailboxAttachment`) for non-previewable files.
  - `src/components/chat/chat-utils.ts`: Removed `.svg` from `isImageFile()`.
  - `src/components/chat/ChatMessageBubble.tsx`: Added `sanitizeNavigationHref` / `sanitizeImageSrc` filtering and `rel="noopener noreferrer"`.
  - `src/components/procurement/modals/CompanyFinalDecisionModal.tsx`: Sanitized `previewPhoto.url` with `sanitizeNavigationHref` & `sanitizeImageSrc` and enforced `rel="noopener noreferrer"`.
  - `src/lib/utils/receipt-image.ts`: Delegated `normalizeReceiptSrc()` to `sanitizeImageSrc()` (allows only safe raster `data:image/(png|jpe?g|gif|webp|bmp);base64,...`, `http(s):`, `blob:`, safe relative `/`, and strict raw base64).

### REM-02 — OAuth Redirect & Notification Navigation URL Validation
- **Root Cause:** `src/components/bill-pay/MailboxConnectionsSettings.tsx` directly navigated `window.location.href = res.authorizationUrl`, and `src/app/(dashboard)/inbox/page.tsx` rendered `n.actionUrl` / `selected.actionUrl` directly into `<a href>`.
- **Changes Applied:**
  - `src/components/bill-pay/MailboxConnectionsSettings.tsx`: Validated `res.authorizationUrl` via `isSafeOAuthAuthorizationUrl()` (`https:` + Google OAuth host allowlist `accounts.google.com` / `oauth2.googleapis.com`, rejecting embedded credentials or dangerous schemes) before redirecting.
  - `src/app/(dashboard)/inbox/page.tsx`: Wrapped `actionUrl` in `sanitizeNavigationHref(...) ?? "#"` to reject `javascript:`, `data:`, and `//` protocol-relative URLs.

### REM-03 — Auth Cookie Flags & Logout Storage Cleanup
- **Root Cause:** `villeto_auth=true` marker cookies in `login/page.tsx`, `useAxios.ts`, `tokenRefreshService.ts`, `SilentRefreshGate.tsx`, and `logout.ts` omitted `SameSite=Lax` and `Secure`. `src/lib/cookies.ts` lacked safe `sameSite`/`secure` defaults. `src/lib/logout.ts` cleared `villeto_*` and staging prefixes but left `personal-expenses` in `localStorage`.
- **Changes Applied:**
  - Centralized `setAuthMarkerCookie()` and `clearAuthMarkerCookie()` in `src/lib/security/auth-cookie.ts` and updated all 5 callers (`src/app/login/page.tsx`, `src/hooks/useAxios.ts`, `src/lib/tokenRefreshService.ts`, `src/components/dashboard/layout/SilentRefreshGate.tsx`, `src/lib/logout.ts`).
  - Updated `src/lib/cookies.ts` (`setCookie`, `removeCookie`) to default `sameSite: "lax"` and `secure` when running over `https:`.
  - Updated `src/lib/logout.ts` to also purge `"personal-expenses"` on logout.

### REM-04 — Forced Password Rotation Bypass & Client Password Strength Alignment
- **Root Cause:** `src/components/dashboard/layout/DashboardModals.tsx` gated forced password change on `isFirstLogin && (isCompanyFounder || mustChangePassword)` (`loginCount === 0`) and honored `sessionStorage` guard even when `mustChangePassword` was true. `src/components/invitation/SetPasswordModal.tsx` and `src/app/forgot-password/reset/page.tsx` omitted the special-character (`[^a-zA-Z0-9]`) and max-length (`100`) rules defined in `src/lib/validation/common.ts`'s `passwordSchema`.
- **Changes Applied:**
  - `src/components/dashboard/layout/DashboardModals.tsx`: Enforced `mustChangePassword || (isFirstLogin && isCompanyFounder)` and prevented `sessionStorage` from bypassing `mustChangePassword`.
  - `src/components/invitation/SetPasswordModal.tsx` & `src/app/forgot-password/reset/page.tsx`: Wired `passwordSchema.safeParse(...)`, added the `"Special Character"` validation badge, trimmed/lowercased email payloads, and used `getApiErrorMessage()` on password reset error handling.

### REM-05 — CSV Formula Injection, Prototype Pollution & ObjectURL Leak (`exportCSV.ts`)
- **Root Cause:** `exportToCSV` in `src/lib/exportCSV.ts` did not neutralize spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`), leaked blob ObjectURLs, and allowed unsanitized filenames; `unflatten()` copied raw keys directly onto objects without guarding against `__proto__`, `constructor`, or `prototype`.
- **Changes Applied:**
  - Extracted `escapeCSVValue()` prefixing dangerous formula triggers with `'`, handled `\r` quoting, sanitized download filenames, and added `URL.revokeObjectURL(url)` cleanup.
  - Hardened `unflatten()` using `Object.keys()`, `Object.prototype.hasOwnProperty.call()`, `DANGEROUS_OBJECT_KEYS` checks, and bounded array indices (`0 <= index < 10_000`).

### REM-06 — File Upload Validation & Prototype-Safe Row Sanitization
- **Root Cause:** Avatar/company logo/receipt uploaders (`personal-settings/page.tsx`, `formFieldLogoUpload.tsx`, `ReceiptPreviewModal.tsx`) permitted `.svg` or lacked runtime size/MIME checks; bulk import pages (`people/invite/employees/page.tsx`, `vendors/bulk-invite-page/page.tsx`) lacked pre-parse file validation and prototype-key filtering on parsed rows.
- **Changes Applied:**
  - Enforced `validateRasterImageFile()` (blocking `.svg`/`image/svg+xml` and invalid MIME/size) in `personal-settings/page.tsx`, `formFieldLogoUpload.tsx`, and `ReceiptPreviewModal.tsx`.
  - Enforced `validateSpreadsheetFile()` in `people/invite/employees/page.tsx` and `vendors/bulk-invite-page/page.tsx`, plus `sanitizePlainObjectRow()` on XLSX/CSV parsed employee rows.

### REM-07 — CSP, Browser Security Headers & Payment Idempotency PRNG
- **Root Cause:** `src/proxy.ts` always included `'unsafe-eval'` in `script-src`, omitted `frame-ancestors`, `object-src`, `base-uri`, `form-action`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `X-Permitted-Cross-Domain-Policies`, and `Cache-Control: no-store` on authenticated routes. `src/app/(dashboard)/bill-pay/payments/[id]/page.tsx` used `Math.random().toString(36)` for payment idempotency keys.
- **Changes Applied:**
  - Extracted `getSecurityHeaders()` and `buildContentSecurityPolicy()` in `src/lib/security/headers.ts` and wired them into `src/proxy.ts` (removes `'unsafe-eval'` in `production`, adds strict directives and `Cache-Control: no-store, private` on non-public routes).
  - `src/app/(dashboard)/bill-pay/payments/[id]/page.tsx` to use `crypto.randomUUID()` for `idempotencyKey`.

### REM-08 — Dependency Upgrades & Removal of Unpatched `xlsx@0.18.5`
- **Root Cause:** Lockfile/SCA audit (`npm audit --json`) reported 26 advisories (`3` critical, `12` high, `11` moderate) including Next.js `16.2.9`, `axios@^1.12.2`, `zod@^4.4.3`, `vitest@^3.2.4` / `tinypool` (missing on disk), and unpatched `xlsx@0.18.5` (`GHSA-4r6h-8v6p-xvw6` / `GHSA-5pgg-2g8v-p4x9`).
- **Changes Applied:**
  - Uninstalled `xlsx` and migrated client-side `.xlsx` preview parsing in `src/app/(dashboard)/people/invite/employees/page.tsx` to `read-excel-file/browser` (`^9.3.17`) while preserving prototype-key guards (`__proto__`, `constructor`, `prototype`) and explicit rejection of legacy binary `.xls` previews.
  - Upgraded `package.json` and `package-lock.json`: `next` & `eslint-config-next` -> `^16.4.6` (removed deprecated `experimental.viewTransition` in `next.config.ts`), `axios` -> `^1.21.1`, `zod` -> `^4.6.7`, and installed/upgraded `vitest` -> `^4.1.12` (restoring `npm test` execution across all 14 Vitest suites + `node:test` security/attachment suites via `package.json`), followed by `npm audit fix`.
  - Confirmed `npm audit --omit=dev` now reports **0 vulnerabilities** (`0` critical/high/moderate/low in production dependencies); only `8` dev-only lint tooling advisories (`@typescript-eslint/*`, `minimatch`, `brace-expansion`) remain in `devDependencies`.

### REM-09 — Migration of Bearer Access Tokens Off `sessionStorage` via Next.js BFF (`HttpOnly` Session Cookie)
- **Root Cause:** `useAuthStore` (`src/stores/auth-stores.ts`) stored raw `accessToken` JWTs in `sessionStorage` (`auth-storage`), and browser Axios/`workspaceFetch`/SSE callers injected `Authorization: Bearer ${accessToken}` directly from JavaScript.
- **Changes Applied:**
  - Added server-side BFF route [`src/app/api/bff/[...path]/route.ts`](../../src/app/api/bff/[...path]/route.ts), [`src/lib/security/bff-session.ts`](../../src/lib/security/bff-session.ts), and [`src/lib/security/bff-proxy.ts`](../../src/lib/security/bff-proxy.ts):
    - Seals upstream `accessToken` and expiry in an AES-256-GCM `HttpOnly; SameSite=Lax` cookie (`villeto_access`, `Secure` enforced in HTTPS/production) using `BFF_SESSION_SECRET` (failing closed in production if missing).
    - Strips `accessToken` from `auth/login` and `auth/refresh` JSON payloads before returning to the browser (`authenticated: true` instead of raw JWT), rewrites upstream refresh `Set-Cookie` attributes (`Domain=` stripped to host-only) for reliable forwarding, clears cookies on `auth/logout`, enforces strict SSRF path/scheme validation and same-origin CSRF checks on `POST`/`PUT`/`PATCH`/`DELETE`, and streams non-auth/Blob/SSE payloads (`events/notifications`) while attaching `Authorization: Bearer` server-side.
  - Updated client transports (`src/lib/api-url.ts`, `src/hooks/useAxios.ts`, `src/features/entity-workspace/fetch.ts`, `src/features/entity-workspace/transport.ts`, `src/lib/tokenRefreshService.ts`, `src/components/dashboard/layout/SilentRefreshGate.tsx`, `src/components/dashboard/layout/DashboardLayoutContent.tsx`, `src/app/login/page.tsx`, `src/stores/auth-stores.ts`, `src/features/auth/use-authorization-refresh.ts`, `src/lib/react-query/expenses.ts`, `src/hooks/useNotificationCount.ts`, `src/app/(dashboard)/inbox/page.tsx`, `src/components/notifications/notification.tsx`, `src/queries/auth/auth-login.ts`, `src/features/auth/queries/login.ts`) to route through `/api/bff`, track non-secret `isAuthenticated` boolean state (and scrub any legacy `accessToken` key on hydration), and remove all browser JS `Bearer` header injection.
  - Updated `src/proxy.ts` to check `villeto_auth` or `villeto_access` cookies.
