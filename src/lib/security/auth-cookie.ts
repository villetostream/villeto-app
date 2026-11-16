/**
 * Centralized management for the UX routing marker cookie (`villeto_auth`).
 * Applies SameSite=Lax and Secure (when served over HTTPS) consistently across
 * login, silent refresh, proactive refresh, axios interceptor, and logout.
 */

export const AUTH_MARKER_COOKIE_NAME = "villeto_auth";

export function buildAuthMarkerCookie(
  expiresInMs: number,
  isHttps: boolean,
): string {
  const maxAgeSeconds = Math.max(
    0,
    Math.floor((Number.isFinite(expiresInMs) ? expiresInMs : 0) / 1000),
  );
  const secureFlag = isHttps ? "; Secure" : "";
  return `${AUTH_MARKER_COOKIE_NAME}=true; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secureFlag}`;
}

export function buildClearAuthMarkerCookie(isHttps: boolean): string {
  const secureFlag = isHttps ? "; Secure" : "";
  return `${AUTH_MARKER_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax${secureFlag}`;
}

function isCurrentOriginHttps(): boolean {
  return (
    typeof window !== "undefined" && window.location?.protocol === "https:"
  );
}

export function setAuthMarkerCookie(expiresInMs: number): void {
  if (typeof document === "undefined") return;
  document.cookie = buildAuthMarkerCookie(expiresInMs, isCurrentOriginHttps());
}

export function clearAuthMarkerCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = buildClearAuthMarkerCookie(isCurrentOriginHttps());
}
