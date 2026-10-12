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
  workspaceDetailRoute,
  reportReviewRoute,
  optionalWorkspaceDetail,
  stripAllEntityFilter,
  responseEntity,
} from "@/features/entity-workspace/transport";

declare module "axios" {
  export interface AxiosRequestConfig {
    _skipErrorToast?: boolean;
    _retry?: boolean;
    _workspaceGeneration?: number;
    _workspaceMutation?: boolean;
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
    if (
      workspace.snapshot?.enabled &&
      workspace.selection === "all" &&
      workspaceDetailRoute(response.config.url || "")
    ) {
      const entityId = responseEntity(
        response.data,
        useAuthStore.getState().user?.userId,
      );
      if (entityId) {
        workspace.select(entityId);
        return Promise.reject(
          new axios.CanceledError("Switched to the record's legal entity"),
        );
      }
    }
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
      finishWorkspaceMutation(error.config);
      return Promise.reject(error);
    }
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);
    finishWorkspaceMutation(originalRequest);

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
  useEntityWorkspaceStore((state) => state.generation);
  return apiClient;
}
