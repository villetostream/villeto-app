# Outstanding Backend, Infrastructure & Dependency Security Requirements

> **Purpose:** `villeto-app` is exclusively a Next.js frontend application. Database access, authentication token issuance, authorization enforcement, payment execution, file storage, and server infrastructure live in the external `villeto-monolith` backend API and cloud hosting environment. The controls below **cannot be implemented solely in this frontend repository** and must be verified or implemented in the backend/infrastructure repositories.

---

## 1. Authentication, Session Management & Token Architecture (`villeto-monolith`)

1. **Production BFF Environment Configuration & Server-Side Refresh Cookie Hardening:**
   - **Frontend Status (Completed in `villeto-app`):** `villeto-app` now routes browser API/SSE traffic through the Next.js Route Handler BFF (`src/app/api/bff/[...path]/route.ts`), sealing the backend bearer `accessToken` inside an `HttpOnly; SameSite=Lax` AES-256-GCM cookie (`villeto_access`, `Secure` on HTTPS/production) so browser JavaScript and `sessionStorage` never handle raw JWTs.
   - **Required Hosting / Backend Action:**
     - Provision a cryptographically random `BFF_SESSION_SECRET` (>= 32 bytes / 64 hex chars) in every staging/production Next.js server environment (and `API_BASE_URL` pointing to `villeto-monolith`); the BFF fails closed in `NODE_ENV=production` if `BFF_SESSION_SECRET` is absent.
     - Verify `villeto-monolith` `Set-Cookie` headers on `POST auth/login` and `POST auth/refresh` emit short-lived refresh tokens with `HttpOnly`, `Secure`, and `SameSite=Lax|Strict` and validate refresh token rotation/revocation server-side.
     - If deploying multiple Next.js instances behind a load balancer, share the identical `BFF_SESSION_SECRET` across instances so encrypted `villeto_access` cookies decrypt uniformly.

2. **Server-Side Enforcement of `shouldChangePassword` (Forced Password Rotation):**
   - **Current Observation:** `DashboardModals.tsx` renders the mandatory password update dialog client-side when `shouldChangePassword` is true.
   - **Required Backend Action:** Reject all non-password-change API calls (`403` / dedicated status code) for accounts flagged `shouldChangePassword = true` until `PATCH auth/password` succeeds; rotate/invalidate all prior sessions upon password change or password reset.

3. **Password Policy & Brute-Force / OTP Controls:**
   - **Required Backend Action:** Enforce identical complexity rules (`>= 8` chars, `<= 100`, lowercase, uppercase, number, special character `[^a-zA-Z0-9]`) on `POST users/invitation/verification`, `POST users/password` (`PASSWORD_SET`), `PATCH auth/password`, and `PATCH auth/password-reset/complete`, plus Argon2id / bcrypt hashing, per-IP + per-account rate limiting, short OTP expiry (<= 10 min), max OTP retry limits (e.g., 5 attempts), and generic error messages to prevent account enumeration (`forgot-password`).

---

## 2. Authorization, Multi-Tenant & Multi-Entity Isolation (`villeto-monolith`)

1. **Strict Server-Side RBAC & Ownership Checks (BOLA / BFLA):**
   - **Required Backend Action:** Never rely on frontend `PermissionGuard`, `withPermissions`, `useAuthorizationPolicies`, or `villetoRole.templateKey === "owner"` checks. Every controller/resolver must verify permissions, tenant (`companyId`), and resource ownership server-side.
   - **Specific High-Risk Endpoints to Audit in `villeto-monolith`:**
     - Role management (`roles/*`): ensure non-owners cannot modify/delete `"owner"` roles or grant capabilities beyond their own role.
     - Procurement PRs/POs/Receipts (`purchase-requests/*`, `purchase-orders/*`): enforce maker-checker separation (requester cannot self-approve) and server-side state machine transitions.
     - Bill Pay & Payments (`bill-pay/payment-requests/*`, `bill-pay/payments/*`): enforce authorization limits, dual-approval policies, bank beneficiary verification, idempotency key uniqueness (`Idempotency-Key` / `idempotencyKey`), and strict currency/amount integrity from persisted `FinancialObligation` records (ignore tampered client totals).
     - `spend-program-creator-store.ts` / `rejection-store.ts`: persist creator & rejection metadata server-side rather than trusting client `localStorage` fallback records.

2. **Mandatory `X-Villeto-Legal-Entity` Validation & Read-Only Mode Enforcement:**
   - **Current Observation:** `src/hooks/useAxios.ts` and `src/features/entity-workspace/fetch.ts` attach `X-Villeto-Legal-Entity` and block mutations client-side when `selection === "all"` or `readOnly === true`.
   - **Required Backend Action:** Validate on every request that the authenticated user is authorized for the requested `X-Villeto-Legal-Entity` (and that the entity belongs to the user's `companyId`), reject write operations when entity status is `inactive`/read-only or when entity header is `"all"` / missing on entity-scoped endpoints, and enforce query-level tenant/entity predicates (e.g., Prisma tenant middleware).

---

## 3. File Upload, Attachment Processing & OAuth Integration (`villeto-monolith`)

1. **Server-Side File Inspection, Magic Bytes, Re-Encoding & Malware Scanning:**
   - **Required Backend Action:** On receipt, logo, avatar, and bulk CSV/XLSX upload endpoints (`companies/bulk/import/*`, `expense-receipt-extractions`, company/user profile uploads, vendor evidence uploads):
     - Validate file magic bytes (do not trust client `Content-Type` or extension).
     - Enforce strict size limits server-side (matching or tighter than frontend limits).
     - Reject SVG uploads or sanitize/rasterize server-side; strip EXIF/metadata from uploaded images; scan files via AV/CDR (e.g., ClamAV / cloud scanning) before persisting or serving.
     - Serve user-uploaded documents from an isolated domain/bucket (separate from app origin) with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`.

2. **Mailbox Attachment Proxy (`bill-pay/mailbox-connections/.../attachments/.../download`):**
   - **Required Backend Action:** Always set `X-Content-Type-Options: nosniff` and `Content-Disposition: attachment` for active/untrusted MIME types (`text/html`, `image/svg+xml`, `application/xhtml+xml`, `application/javascript`, `application/xml`), and enforce per-tenant/entity authorization on `tenantMailboxConnectionId` and `messageId`.

3. **Google Mailbox OAuth State & Redirect Security:**
   - **Required Backend Action:** Generate cryptographically random, single-use, session-bound `state` and PKCE parameters when creating `authorizationUrl`, verify callback `state` + `legalEntityId` ownership before storing OAuth tokens, and encrypt Gmail refresh/access tokens at rest (KMS/envelope encryption).

---

## 4. Network, Headers, Logging & CI/CD Security

1. **HTTPS, Strict CORS & Reverse Proxy Headers:**
   - Enforce TLS 1.2+ (prefer TLS 1.3), HTTP-to-HTTPS redirect at edge/load balancer, strict `CORS` origin allowlist (never `*` with `Access-Control-Allow-Credentials: true`), and remove `X-Powered-By` headers.
   - Ensure `public/robots.txt` disallows crawling of authenticated/private routes (`/dashboard`, `/bill-pay`, `/procurement`, `/expenses`, `/people`, `/settings`) once deployed so private routes are not indexed if crawled.

2. **Structured Security Audit Logging & Error Sanitization:**
   - Log all authentication failures, password changes, OTP failures, role/permission modifications, legal-entity switches, payment authorizations/initiations, and bulk imports with immutable actor/timestamp/IP/correlation IDs in `villeto-monolith`.
   - Ensure backend 4xx/5xx error responses never expose SQL/Prisma queries, stack traces, internal hostnames, or raw connection-pool details (`getApiErrorMessage` surfaces backend `message` directly in toast notifications).

3. **Supply Chain & CI Security Gates (Observed via `npm audit --json`):**
   - **Completed in `villeto-app`:** Upgraded `next` & `eslint-config-next` (`^16.4.6`), `axios` (`^1.21.1`), `zod` (`^4.6.7`), `vitest` (`^4.1.12`), and replaced `xlsx@0.18.5` with `read-excel-file@^9.3.17`. `npm audit --omit=dev` now reports **0 vulnerabilities**.
   - **Remaining CI / Dev Tooling Action:** Add `npm audit --omit=dev --audit-level=high`, ESLint gating, and secret scanning to `.github/workflows/entity-workspace.yml`, and monitor dev-only `@typescript-eslint/*` / `brace-expansion` lint dependencies (`8` dev-only advisories remaining) when upgrading `eslint-config-next` / `typescript-eslint`.
