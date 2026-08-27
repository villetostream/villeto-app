"use client";

import axios, { AxiosError, AxiosInstance } from "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    _skipErrorToast?: boolean;
    _retry?: boolean;
  }
}
import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth-stores";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { refreshAccessToken } from "@/lib/tokenRefreshService";

const BASEURL = process.env.NEXT_PUBLIC_API_BASE_URL;

type ApiErrorBody = {
  message?: string | string[];
  error?: string | string[];
  statusCode?: number;
  data?: { statusCode?: number };
};

export function useAxios(): AxiosInstance {
  const accessToken = useAuthStore((state) => state.accessToken);
  const router = useRouter();

  return useMemo(() => {
    const instance = axios.create({
      baseURL: BASEURL,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

    instance.interceptors.response.use(
      (response) => {
        // If the backend returned a 2xx HTTP status but the JSON payload indicates a 401 error
        const data = response.data;
        if (data && (data.status === 401 || data.statusCode === 401 || data.data?.statusCode === 401)) {
          return Promise.reject(
            new AxiosError(
              data.message || "Unauthorized",
              AxiosError.ERR_BAD_RESPONSE,
              response.config,
              response.request,
              { ...response, status: 401 },
            ),
          );
        }
        return response;
      },
      async (error: AxiosError<ApiErrorBody>) => {
        const originalRequest = error.config;
        if (!originalRequest) return Promise.reject(error);
        const requestUrl = originalRequest.url ?? "";

        const isOnboardingPath =
          typeof window !== "undefined" &&
          window.location.pathname.includes("onboarding");

        const isAuthRequest = requestUrl.includes("auth");

        if (error.response?.status === 401 && !isAuthRequest && !isOnboardingPath) {
          if (!originalRequest._retry) {
            originalRequest._retry = true;

            try {
              const { accessToken: newToken } = await refreshAccessToken();
              originalRequest.headers.set(
                "Authorization",
                `Bearer ${newToken}`,
              );
              return instance(originalRequest);
            } catch (refreshError) {
              useAuthStore.getState().logout();
              router.replace("/login");
              return Promise.reject(refreshError);
            }
          } else {
            // We already retried and still got 401, or something else is wrong.
            useAuthStore.getState().logout();
            router.replace("/login");
            return Promise.reject(error);
          }
        }

        if (
          error.response?.status !== 401 &&
          !originalRequest._skipErrorToast &&
          !requestUrl.includes("account-confirmation") &&
          !requestUrl.includes("onboardings/pre-fetch")
        ) {
          let errorMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message;

          if (Array.isArray(errorMessage)) {
             errorMessage = errorMessage.map((msg: unknown) => {
                if (typeof msg !== 'string') return String(msg);
                const parts = msg.split(': ');
                let rawError = parts.length > 1 ? parts[1] : parts[0];
                rawError = rawError.charAt(0).toUpperCase() + rawError.slice(1);
                return rawError.replace(/_/g, ' ');
            }).join(" • ");
          }

          if (errorMessage && errorMessage !== "Network Error") {
            toast.error(String(errorMessage));
          }
        }

        return Promise.reject(error);
      }
    );

    return instance;
  }, [accessToken, router]);
}
