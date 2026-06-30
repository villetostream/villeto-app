/**
 * Proactive Token Refresh Service
 *
 * Schedules a silent token refresh 5 minutes before the access token expires.
 * This prevents users from being logged out mid-session.
 *
 * Usage:
 *   scheduleTokenRefresh(3600000) // called after login or after a reactive refresh
 *   clearTokenRefresh()           // called on logout
 */

import axios from "axios";

const BASEURL = process.env.NEXT_PUBLIC_API_BASE_URL;
/** Refresh 5 minutes before expiry */
const EARLY_REFRESH_MS = 5 * 60 * 1000;

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedule a proactive token refresh.
 * @param expiresInMs — the token's lifetime in milliseconds (e.g. 3600000 for 1 hour)
 */
export function scheduleTokenRefresh(expiresInMs: number) {
  clearTokenRefresh();

  const delay = Math.max(expiresInMs - EARLY_REFRESH_MS, 0);

  refreshTimer = setTimeout(async () => {
    try {
      const response = await axios.post(
        `${BASEURL}auth/refresh`,
        {},
        { withCredentials: true }
      );

      const newToken =
        response.data?.data?.accessToken ||
        response.data?.accessToken ||
        null;

      const newExpiresInMs =
        response.data?.data?.accessTokenExpiresInMs ||
        response.data?.accessTokenExpiresInMs ||
        3600000; // default 1 hour

      if (newToken) {
        // Import dynamically to avoid circular deps
        const { useAuthStore } = await import("@/stores/auth-stores");
        useAuthStore.getState().setAccessToken(newToken);
        // Schedule the next refresh
        scheduleTokenRefresh(newExpiresInMs);
      }
    } catch {
      // Proactive refresh failed — the reactive interceptor in useAxios
      // will handle the 401 when the next request fires.
    }
  }, delay);
}

/** Cancel any pending proactive refresh timer (call on logout). */
export function clearTokenRefresh() {
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}
