"use client";

import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { invalidateAuthorization } from "@/features/auth/authorization";
import { scheduleTokenRefresh } from "@/lib/tokenRefreshService";
import {
  CONNECTION_POOL_MESSAGE,
  isConnectionPoolError,
} from "@/shared/lib/errors/api-errors";
import { useAuthStore } from "@/stores/auth-stores";
import { toast } from "sonner";
import {
  useEntityWorkspaceStore,
  workspaceReadOnly,
} from "@/features/entity-workspace/store";
import {
  workspaceRoute,
  reportReviewRoute,
  optionalWorkspaceDetail,
  stripAllEntityFilter,
} from "@/features/entity-workspace/transport";

declare module "axios" {
  export interface AxiosRequestConfig {
    _skipErrorToast?: boolean;
    _retry?: boolean;
    _workspaceGeneration?: number;
    _workspaceMutation?: boolean;
    _throttleRetryCount?: number;
    _slotHeld?: boolean;
  }
}
type ApiErrorPayload = {
  message?: unknown;
  error?: unknown;
  status?: number;
  statusCode?: number;
  data?: { statusCode?: number };
};

type RefreshResponse = {
  data?: {
    accessToken?: string;
    accessTokenExpiresInMs?: number;
    data?: {
      accessToken?: string;
      accessTokenExpiresInMs?: number;
    };
  };
};

const BASEURL = process.env.NEXT_PUBLIC_API_BASE_URL;
const apiClient = axios.create({
  baseURL: BASEURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

function finishWorkspaceMutation(config?: InternalAxiosRequestConfig) {
  if (!config?._workspaceMutation) return;
  config._workspaceMutation = false;
  useEntityWorkspaceStore.getState().mutationFinished();
}

let refreshPromise: Promise<string> | null = null;

// ── Client-side traffic shaping ─────────────────────────────────────────────────────────
// A bounded concurrency gate (like a token bucket with N tokens) so a page
// that mounts many queries can't fire them all at once and trip the backend
// rate limiter. Excess requests queue in FIFO order.
const MAX_CONCURRENT_REQUESTS = 6;
let inFlight = 0;
const waiters: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (inFlight < MAX_CONCURRENT_REQUESTS) {
    inFlight++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiters.push(() => { inFlight++; resolve(); }));
}

function releaseSlot(config?: InternalAxiosRequestConfig) {
  if (!config?._slotHeld) return;
  config._slotHeld = false;
  inFlight = Math.max(0, inFlight - 1);
  const next = waiters.shift();
  if (next) next();
}

// When the server says "slow down", every request should respect it — not
// just the one that got the 429. Requests started during the cool-down wait.
let coolDownUntil = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MAX_THROTTLE_RETRIES = 3;
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(["get", "head", "options"]);

function parseRetryAfter(header: unknown): number | null {
  if (typeof header !== "string" && typeof header !== "number") return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(String(header));
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

/** Exponential backoff with full jitter, capped at 20s. */
function backoffMs(attempt: number) {
  return Math.random() * Math.min(20_000, 500 * 2 ** attempt);
}

let lastRateLimitToastAt = 0;
function notifyRateLimited() {
  const now = Date.now();
  if (now - lastRateLimitToastAt < 15_000) return;
  lastRateLimitToastAt = now;
  toast.warning("We're getting a lot of requests right now. Retrying shortly…", {
    id: "rate-limited",
  });
}

function redirectToLogin() {
  if (
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/login")
  ) {
    window.location.assign("/login");
  }
}

function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    .post<RefreshResponse["data"]>(
      `${BASEURL}auth/refresh`,
      {},
      { withCredentials: true },
    )
    .then((response) => {
      const accessToken =
        response.data?.data?.accessToken ?? response.data?.accessToken;
      if (!accessToken) {
        throw new Error("No access token returned");
      }

      const expiresInMs =
        response.data?.data?.accessTokenExpiresInMs ??
        response.data?.accessTokenExpiresInMs ??
        3_600_000;

      useAuthStore.getState().setAccessToken(accessToken, expiresInMs);
      scheduleTokenRefresh(expiresInMs);

      // Keep the villeto_auth marker cookie alive
      if (typeof document !== "undefined") {
        document.cookie = `villeto_auth=true; path=/; max-age=${Math.floor(expiresInMs / 1000)}`;
      }

      return accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function readEmbeddedStatus(data: unknown) {
  if (!data || typeof data !== "object") return undefined;
  const payload = data as ApiErrorPayload;
  return payload.status ?? payload.statusCode ?? payload.data?.statusCode;
}

function readEmbeddedMessage(data: unknown) {
  if (!data || typeof data !== "object") return "Unauthorized";
  const payload = data as ApiErrorPayload;
  const message = payload.message ?? payload.error;
  return typeof message === "string" ? message : "Unauthorized";
}

function formatErrorMessage(error: AxiosError<ApiErrorPayload>) {
  if (isConnectionPoolError(error)) return CONNECTION_POOL_MESSAGE;
  const rawMessage =
    error.response?.data?.message ??
    error.response?.data?.error ??
    error.message;

  if (Array.isArray(rawMessage)) {
    return rawMessage
      .map((message) => {
        const text = typeof message === "string" ? message : String(message);
        const parts = text.split(": ");
        const rawError = parts.length > 1 ? parts[1] : parts[0];
        const sentence = rawError.charAt(0).toUpperCase() + rawError.slice(1);
        return sentence.replace(/_/g, " ");
      })
      .join(" • ");
  }

  return typeof rawMessage === "string" ? rawMessage : String(rawMessage);
}

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const waitMs = coolDownUntil - Date.now();
  if (waitMs > 0) await sleep(waitMs);
  await acquireSlot();
  config._slotHeld = true;
  return config;
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const workspace = useEntityWorkspaceStore.getState();
  const optionalDetail = optionalWorkspaceDetail(
    config.url || "",
    config.method,
  );
  const scoped =
    optionalDetail ||
    workspaceRoute(config.url || "", config.method) ||
    reportReviewRoute(config.url || "", config.params);
  if (workspace.snapshot?.enabled && scoped) {
    if (!workspace.selection && !optionalDetail)
      throw new axios.CanceledError(
        "A legal entity assignment or workspace selection is required",
      );
    if (
      config._workspaceGeneration !== undefined &&
      config._workspaceGeneration !== workspace.generation
    )
      throw new axios.CanceledError(
        "Workspace changed before the request could be retried",
      );
    config._workspaceGeneration = workspace.generation;
    if (workspace.selection)
      config.headers.set("X-Villeto-Legal-Entity", workspace.selection);
    const mutation =
      !["get", "head", "options"].includes(config.method || "get") ||
      /notifications\/mark/.test(config.url || "");
    if (mutation && workspaceReadOnly())
      throw new axios.CanceledError(
        "Select an active legal entity before performing this action",
      );
    if (workspace.selection === "all") {
      config.url = stripAllEntityFilter(config.url || "");
      if (config.params?.legalEntityId === "all") {
        config.params = { ...config.params };
        delete config.params.legalEntityId;
      }
    }
    if (mutation && !config._workspaceMutation) {
      config._workspaceMutation = true;
      workspace.mutationStarted();
    }
  }
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    releaseSlot(response.config);
    const workspace = useEntityWorkspaceStore.getState();
    finishWorkspaceMutation(response.config);
    if (
      response.config._workspaceGeneration !== undefined &&
      response.config._workspaceGeneration !== workspace.generation
    )
      return Promise.reject(
        new axios.CanceledError(
          "Workspace changed while the request was running",
        ),
      );

    if (readEmbeddedStatus(response.data) === 401) {
      response.status = 401;
      return Promise.reject(
        new AxiosError(
          readEmbeddedMessage(response.data),
          AxiosError.ERR_BAD_RESPONSE,
          response.config,
          response.request,
          response,
        ),
      );
    }
    return response;
  },
  async (error: unknown) => {
    if (!axios.isAxiosError<ApiErrorPayload>(error)) {
      return Promise.reject(error);
    }

    if (axios.isCancel(error)) {
      releaseSlot(error.config);
      finishWorkspaceMutation(error.config);
      return Promise.reject(error);
    }
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);
    releaseSlot(originalRequest);
    finishWorkspaceMutation(originalRequest);

    // ── Throttling / transient upstream errors ──
    const status = error.response?.status;
    if (status !== undefined && RETRYABLE_STATUSES.has(status)) {
      const retryAfter = parseRetryAfter(error.response?.headers?.["retry-after"]);
      if (status === 429) {
        notifyRateLimited();
        coolDownUntil = Math.max(coolDownUntil, Date.now() + (retryAfter ?? 2_000));
      }
      const attempt = originalRequest._throttleRetryCount ?? 0;
      const method = (originalRequest.method || "get").toLowerCase();
      // Only replay idempotent requests; a POST may already have been applied.
      if (IDEMPOTENT_METHODS.has(method) && attempt < MAX_THROTTLE_RETRIES) {
        originalRequest._throttleRetryCount = attempt + 1;
        await sleep(retryAfter ?? backoffMs(attempt));
        return apiClient(originalRequest);
      }
      if (status === 429) return Promise.reject(error); // already toasted once
    }

    const isOnboardingPath =
      typeof window !== "undefined" &&
      window.location.pathname.includes("onboarding");
    const isAuthRequest = originalRequest.url?.includes("auth") ?? false;

    if (error.response?.status === 401 && !isAuthRequest && !isOnboardingPath) {
      if (originalRequest._retry) {
        useAuthStore.getState().logout();
        redirectToLogin();
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers.set("Authorization", `Bearer ${accessToken}`);
        return apiClient(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 403) {
      // Refresh authorization for subsequent UI decisions, but never replay
      // a denied request because mutations may not be safe to retry.
      invalidateAuthorization();
    }

    const requestUrl = originalRequest.url ?? "";
    const shouldShowToast =
      error.response?.status !== 401 &&
      error.response?.status !== 403 &&
      !originalRequest._skipErrorToast &&
      !requestUrl.includes("account-confirmation") &&
      !requestUrl.includes("onboardings/pre-fetch");

    if (shouldShowToast) {
      const message = formatErrorMessage(error);
      if (message && message !== "Network Error") toast.error(message);
    }

    return Promise.reject(error);
  },
);

/** Returns the singleton API client; interceptors are installed exactly once. */
export function useAxios(): AxiosInstance {
  // NOTE: Do NOT subscribe to workspace generation here. The request interceptor
  // reads useEntityWorkspaceStore.getState() at call time, so React doesn't
  // need to re-render consumers to pick up workspace changes. Subscribing here
  // caused every useAxios() caller to re-render on every generation bump,
  // which in turn triggered unnecessary re-renders of DashboardLayoutContent
  // and contributed to spurious /users/me fetches via refreshUserAndPermissions.
  return apiClient;
}
