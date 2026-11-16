import axios from "axios";
import { apiUrl } from "@/lib/api-url";
import { setAuthMarkerCookie } from "@/lib/security/auth-cookie";

const EARLY_REFRESH_MS = 5 * 60 * 1000;
let timer: ReturnType<typeof setTimeout> | null = null;
let dueAt = 0;
let epoch = 0;
let pending: Promise<void> | null = null;
let controller: AbortController | null = null;
let visibilityListener: (() => void) | null = null;

type AuthStore = typeof import("@/stores/auth-stores").useAuthStore;

function identity(store: AuthStore) {
  const user = store.getState().user;
  return user
    ? `${user.companyId ?? user.company?.companyId ?? ""}:${user.userId}`
    : null;
}

function cancelTimer() {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  if (visibilityListener && typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", visibilityListener);
  }
  visibilityListener = null;
}

/** Logout/login cancels an old refresh, so its response cannot restore a session. */
export function clearTokenRefresh() {
  epoch++;
  cancelTimer();
  dueAt = 0;
  controller?.abort();
  controller = null;
  pending = null;
}

/**
 * Singleflight renewal shared across startup (`SilentRefreshGate`),
 * proactive timer, and concurrent 401 responses via BFF `HttpOnly` cookies.
 */
export function refreshAccessToken(): Promise<void> {
  if (pending) return pending;
  const startedEpoch = epoch;
  const abortController = new AbortController();
  controller = abortController;

  const work = (async () => {
    const { useAuthStore: store } = await import("@/stores/auth-stores");
    const initial = store.getState();
    const account = identity(store);

    const assertCurrent = () => {
      if (
        epoch !== startedEpoch ||
        identity(store) !== account ||
        abortController.signal.aborted
      ) {
        throw new axios.CanceledError("Session changed during token renewal");
      }
    };

    const install = (expiresInMs: number) => {
      assertCurrent();
      store.getState().setAuthenticated(true, expiresInMs);
      setAuthMarkerCookie(expiresInMs);
      scheduleTokenRefresh(expiresInMs);
    };

    // Coordinate HttpOnly cookie rotation across tabs using Web Locks + non-secret metadata.
    let peerExpiresAt: number | null = null;
    const channel =
      typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("villeto:token-renewal")
        : null;

    if (channel) {
      channel.onmessage = ({ data }) => {
        if (
          account &&
          data?.account === account &&
          typeof data.expiresAt === "number" &&
          Number.isFinite(data.expiresAt) &&
          data.expiresAt > Date.now() + 30_000
        ) {
          peerExpiresAt = data.expiresAt;
        }
      };
    }

    const renew = async () => {
      assertCurrent();
      const current = store.getState();
      if (
        current.isAuthenticated &&
        (current.accessTokenExpiresAt ?? 0) > Date.now() + 30_000 &&
        current.accessTokenExpiresAt !== initial.accessTokenExpiresAt
      ) {
        return;
      }

      if (peerExpiresAt !== null) {
        install(peerExpiresAt - Date.now());
        return;
      }

      const response = await axios.post(
        apiUrl("auth/refresh"),
        {},
        { withCredentials: true, signal: abortController.signal, timeout: 20_000 },
      );
      assertCurrent();

      const data = response.data?.data ?? response.data ?? {};
      const authenticated = Boolean(
        data?.authenticated ??
          response.data?.authenticated ??
          (response.status >= 200 && response.status < 300),
      );
      if (!authenticated) {
        throw new Error("Session refresh failed");
      }

      const lifetime = Number(
        data?.accessTokenExpiresInMs ??
          response.data?.accessTokenExpiresInMs ??
          3_600_000,
      );
      if (!Number.isFinite(lifetime) || lifetime <= 0) {
        throw new Error("Invalid access token lifetime");
      }

      // The cookie can belong to a different login in another tab. Never mix its
      // session with this tab's already-loaded user/company profile.
      if (
        initial.user &&
        typeof data?.userId === "string" &&
        data.userId !== initial.user.userId
      ) {
        throw new Error("Refresh session belongs to a different user");
      }

      install(lifetime);
      channel?.postMessage({ account, expiresAt: Date.now() + lifetime });
    };

    try {
      // Serialize cookie rotation between tabs when the browser supports Web Locks.
      if (typeof navigator !== "undefined" && navigator.locks) {
        await navigator.locks.request(
          "villeto:token-renewal",
          { signal: abortController.signal },
          renew,
        );
      } else {
        await renew();
      }
    } finally {
      channel?.close();
    }
  })();

  pending = work;
  void work
    .finally(() => {
      if (pending === work) {
        pending = null;
        controller = null;
      }
    })
    .catch(() => {});

  return work;
}

/** Keep the normal 55-minute cadence; short-lived tokens renew at 80% of life. */
export function scheduleTokenRefresh(expiresInMs: number) {
  cancelTimer();
  if (!Number.isFinite(expiresInMs) || expiresInMs <= 0) return;

  dueAt =
    Date.now() +
    Math.max(1000, expiresInMs - Math.min(EARLY_REFRESH_MS, expiresInMs * 0.2));

  const run = () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    const remaining = dueAt - Date.now();
    if (remaining > 0) {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(run, remaining);
    } else {
      cancelTimer();
      // A failed scheduled renewal falls back to the next request's 401 handler.
      void refreshAccessToken().catch(() => {});
    }
  };

  if (typeof document !== "undefined") {
    visibilityListener = run;
    document.addEventListener("visibilitychange", run);
  }
  run();
}
