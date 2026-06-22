/**
 * Centralised staleTime constants for React Query.
 *
 * Rule of thumb used across this app:
 *
 *  STATIC     – Data that almost never changes (roles, capabilities, permissions,
 *               expense categories). Safe to cache for a full user session.
 *               Re-fetched only when the user mutates the resource.
 *
 *  SLOW       – Data that changes occasionally (departments, company settings,
 *               policies). One fetch per 10 minutes is plenty.
 *
 *  NORMAL     – Semi-live data (user lists, invited / uninvited users, expense
 *               reports). Refresh every 2 minutes to stay reasonably fresh
 *               without hammering the API.
 *
 *  LIVE       – Data where staleness matters (single-record detail views that
 *               could be updated by another user). Refresh on every mount but
 *               use the cache while the window is focused.
 *
 *  REALTIME   – Always re-fetch (staleTime: 0). Use sparingly — only for data
 *               that MUST be up-to-the-second (e.g. a pending-approval count).
 *
 *  SESSION    – Data that is effectively immutable for the duration of a login
 *               session (e.g. company branding, logo URL). Cache for 1 hour.
 *
 * How to invalidate manually after a mutation:
 *   queryClient.invalidateQueries({ queryKey: [...] });
 * This bypasses staleTime and triggers an immediate background refetch.
 */

const SECOND = 1_000;
const MINUTE = 60 * SECOND;

export const STALE_TIMES = {
  /** ~30 minutes. Roles, permissions, capabilities, expense categories. */
  STATIC: 30 * MINUTE,

  /** 10 minutes. Departments, policies, company settings. */
  SLOW: 10 * MINUTE,

  /** 2 minutes. User lists, invited/uninvited users, expense list views. */
  NORMAL: 2 * MINUTE,

  /** 30 seconds. Single-record detail pages (purchase request, expense detail). */
  LIVE: 30 * SECOND,

  /** 0. Always re-fetch on every mount. Use only when truly necessary. */
  REALTIME: 0,

  /** 60 minutes. Session-level data: company branding, logo. Immutable until re-login. */
  SESSION: 60 * MINUTE,
} as const;
