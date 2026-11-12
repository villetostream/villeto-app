import axios from "axios";
import { apiUrl } from "@/lib/api-url";

const EARLY_REFRESH_MS = 5 * 60 * 1000;
let timer: ReturnType<typeof setTimeout> | null = null;
let dueAt = 0;
let epoch = 0;
let pending: Promise<string> | null = null;
let controller: AbortController | null = null;
let visibilityListener: (() => void) | null = null;

type AuthStore = typeof import("@/stores/auth-stores").useAuthStore;
function identity(store: AuthStore) {
  const user = store.getState().user;
  return user ? `${user.companyId ?? user.company?.companyId ?? ""}:${user.userId}` : null;
}
function cancelTimer() {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  if (visibilityListener && typeof document !== "undefined") document.removeEventListener("visibilitychange", visibilityListener);
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

/** One renewal for startup, the proactive timer and concurrent 401 responses. */
export function refreshAccessToken(rejectedToken?: string): Promise<string> {
  if (pending) return pending;
  const startedEpoch = epoch;
  const abortController = new AbortController();
  controller = abortController;
  const work = (async () => {
    const { useAuthStore: store } = await import("@/stores/auth-stores");
    const initial = store.getState();
    const account = identity(store);
    const assertCurrent = () => {
      if (epoch !== startedEpoch || identity(store) !== account || abortController.signal.aborted) throw new axios.CanceledError("Session changed during token renewal");
    };
    const install = (token: string, expiresInMs: number) => {
      assertCurrent();
      store.getState().setAccessToken(token, expiresInMs);
      if (typeof document !== "undefined") document.cookie = `villeto_auth=true; path=/; max-age=${Math.floor(expiresInMs / 1000)}`;
      scheduleTokenRefresh(expiresInMs);
      return token;
    };
    // The channel only lives for the renewal. Tokens never enter localStorage.
    // Unknown sessions bootstrap themselves rather than adopting another tab's identity.
    let peer: { token: string; expiresAt: number } | null = null;
    const channel = typeof window !== "undefined" && typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("villeto:token-renewal") : null;
    if (channel) channel.onmessage = ({ data }) => {
      if (account && data?.account === account && typeof data.token === "string" && Number.isFinite(data.expiresAt) && data.expiresAt > Date.now() + 30_000) peer = data;
    };
    const renew = async () => {
      assertCurrent();
      const current = store.getState();
      if ((current.accessTokenExpiresAt ?? 0) > Date.now() + 30_000 && current.accessToken &&
          ((rejectedToken && current.accessToken !== rejectedToken) || current.accessToken !== initial.accessToken)) return current.accessToken;
      if (peer) return install(peer.token, peer.expiresAt - Date.now());
      const response = await axios.post(apiUrl("auth/refresh"), {}, { withCredentials: true, signal: abortController.signal, timeout: 20_000 });
      assertCurrent();
      // A separate login can update the store while the network request is running.
      if (store.getState().accessToken !== initial.accessToken) throw new axios.CanceledError("Token replaced during renewal");
      const data = response.data?.data ?? response.data;
      if (typeof data?.accessToken !== "string" || !data.accessToken) throw new Error("No access token returned");
      const lifetime = Number(data.accessTokenExpiresInMs ?? 3_600_000);
      if (!Number.isFinite(lifetime) || lifetime <= 0) throw new Error("Invalid access token lifetime");
      // The cookie can belong to a different login in another tab. Never mix its
      // token with this tab's already-loaded user/company profile.
      if (initial.user) {
        const payload = JSON.parse(atob(data.accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.sub !== initial.user.userId) throw new Error("Refresh session belongs to a different user");
      }
      const token = install(data.accessToken, lifetime);
      channel?.postMessage({ account, token, expiresAt: Date.now() + lifetime });
      return token;
    };
    try {
      // Serialize cookie rotation between tabs when the browser supports Web Locks.
      return typeof navigator !== "undefined" && navigator.locks
        ? await navigator.locks.request("villeto:token-renewal", { signal: abortController.signal }, renew)
        : await renew();
    } finally { channel?.close(); }
  })();
  pending = work;
  void work.finally(() => {
    if (pending === work) { pending = null; controller = null; }
  }).catch(() => {});
  return work;
}

/** Keep the normal 55-minute cadence; short-lived tokens renew at 80% of life. */
export function scheduleTokenRefresh(expiresInMs: number) {
  cancelTimer();
  if (!Number.isFinite(expiresInMs) || expiresInMs <= 0) return;
  dueAt = Date.now() + Math.max(1000, expiresInMs - Math.min(EARLY_REFRESH_MS, expiresInMs * 0.2));
  const run = () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
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
