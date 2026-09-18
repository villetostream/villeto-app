"use client";

/**
 * SilentRefreshGate
 * ─────────────────────────────────────────────────────────────────────
 * Runs on every page mount (including hard refresh).
 *
 * Flow:
 *  1. If the store already has a valid, non-expired access token (e.g.,
 *     same-tab navigation) — do nothing, skip straight to the app.
 *  2. Otherwise, attempt a silent token refresh using the httpOnly
 *     refresh-token cookie the server set at login.
 *     a. Success → hydrate the store with the new access token and let
 *        the app render normally.
 *     b. Failure → the refresh cookie is gone/expired; redirect to login.
 *
 * This keeps the access token in sessionStorage / memory only (never
 * localStorage) while still surviving hard refreshes.
 * ─────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from "react";
import axios from "axios";
import { useAuthStore } from "@/stores/auth-stores";
import { scheduleTokenRefresh } from "@/lib/tokenRefreshService";
import { parseAuthorizationSnapshot } from "@/features/auth/authorization";

const BASEURL = process.env.NEXT_PUBLIC_API_BASE_URL;

/** Milliseconds of buffer — consider a token expired 30 s early */
const EXPIRY_BUFFER_MS = 30_000;

/** Renew the villeto_auth marker cookie so middleware stays in sync */
function renewAuthCookie(expiresInMs: number) {
  if (typeof document !== "undefined") {
    document.cookie = `villeto_auth=true; path=/; max-age=${Math.floor(expiresInMs / 1000)}`;
  }
}

export default function SilentRefreshGate({ onDone }: { onDone?: () => void }) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const { accessToken, accessTokenExpiresAt, setAccessToken, login, user } =
      useAuthStore.getState();

    // Token is still alive — nothing to do.
    const tokenAlive =
      accessToken &&
      accessTokenExpiresAt &&
      accessTokenExpiresAt - Date.now() > EXPIRY_BUFFER_MS;

    if (tokenAlive) {
      onDone?.();
      return;
    }

    // Attempt silent refresh via the httpOnly refresh-token cookie.
    // Use raw axios (not apiClient) to avoid triggering the 401 interceptor
    // which would itself try to refresh and fight this call.
    void (async () => {
      try {
        const response = await axios.post(
          `${BASEURL}auth/refresh`,
          {},
          { withCredentials: true }
        );

        const data = response.data?.data ?? response.data ?? {};
        const newToken: string | undefined =
          data.accessToken ?? response.data?.accessToken;
        const expiresInMs: number =
          data.accessTokenExpiresInMs ??
          response.data?.accessTokenExpiresInMs ??
          3_600_000;

        if (!newToken) {
          // Server responded but gave no token — treat as expired session.
          // Don't call logoutAndRedirect() here — just signal done.
          // DashboardLayoutContent will handle the redirect after seeing no user.
          onDone?.();
          return;
        }

        // Persist the fresh token and reschedule the proactive refresh timer.
        setAccessToken(newToken, expiresInMs);
        scheduleTokenRefresh(expiresInMs);
        renewAuthCookie(expiresInMs);

        // If user profile is missing (e.g., hard refresh cleared sessionStorage),
        // fetch it now so the rest of the app has full user context.
        if (!user) {
          try {
            const me = await axios.get(`${BASEURL}users/me`, {
              headers: { Authorization: `Bearer ${newToken}` },
              withCredentials: true,
            });
            const responseData = me?.data?.data ?? me?.data;
            const { _company, companyId, ...userData } = responseData ?? {};
            if (userData) {
              const authorization = parseAuthorizationSnapshot(
                userData.authorization
              );
              login({
                ...userData,
                companyId: companyId ?? userData.companyId,
                authorization,
              });
            }
          } catch {
            // Profile fetch failed but we have a token — the dashboard will
            // re-attempt via its own refreshUserAndPermissions on mount.
          }
        }
      } catch {
        // Refresh failed — session is truly expired.
        // Don't call logoutAndRedirect() here — just signal done.
        // DashboardLayoutContent will see user=null and handle the redirect.
      } finally {
        onDone?.();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
