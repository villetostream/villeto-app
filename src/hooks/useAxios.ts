"use client";

import axios, { AxiosInstance } from "axios";

declare module "axios" {
  export interface AxiosRequestConfig {
    _skipErrorToast?: boolean;
    _retry?: boolean;
    _retry403?: boolean;
  }
}
import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth-stores";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { scheduleTokenRefresh } from "@/lib/tokenRefreshService";
import { getEffectiveCompanyPermissions } from "@/features/auth/role-access";

const BASEURL = process.env.NEXT_PUBLIC_API_BASE_URL;

let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (error: any) => void }[] = [];

let isRefreshingPermissions = false;
let permissionQueue: { resolve: () => void; reject: (error: any) => void }[] = [];

const processPermissionQueue = (error: any) => {
    permissionQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve();
        }
    });
    permissionQueue = [];
};

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token as string);
        }
    });
    failedQueue = [];
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
           const error: any = new Error(data.message || "Unauthorized");
           error.response = response;
           error.config = response.config;
           error.response.status = 401;
           return Promise.reject(error);
        }
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        const isOnboardingPath =
          typeof window !== "undefined" &&
          window.location.pathname.includes("onboarding");

        const isAuthRequest = originalRequest.url?.includes("auth");

        if (error.response?.status === 401 && !isAuthRequest && !isOnboardingPath) {
          if (!originalRequest._retry) {
            if (isRefreshing) {
              return new Promise(function(resolve, reject) {
                  failedQueue.push({ resolve, reject });
              }).then(token => {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                  return instance(originalRequest);
              }).catch(err => {
                  return Promise.reject(err);
              });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
              const refreshResponse = await axios.post(
                `${BASEURL}auth/refresh`,
                {},
                { withCredentials: true }
              );
              // Store the new token if the backend returns one in the body
              const newToken =
                refreshResponse.data?.data?.accessToken ||
                refreshResponse.data?.accessToken ||
                null;
              if (newToken) {
                useAuthStore.getState().setAccessToken(newToken);
                originalRequest.headers = {
                  ...originalRequest.headers,
                  Authorization: `Bearer ${newToken}`,
                };
                // Restart proactive refresh with the new token's lifetime
                const newExpiresInMs =
                  refreshResponse.data?.data?.accessTokenExpiresInMs ??
                  refreshResponse.data?.accessTokenExpiresInMs ??
                  3600000;
                scheduleTokenRefresh(newExpiresInMs);

                processQueue(null, newToken);
              } else {
                processQueue(new Error("No token returned"), null);
              }
              return instance(originalRequest);
            } catch (refreshError) {
              processQueue(refreshError, null);
              useAuthStore.getState().logout();
              if (
                typeof window !== "undefined" &&
                !window.location.pathname.startsWith("/login")
              ) {
                window.location.href = "/login";
              }
              return Promise.reject(refreshError);
            } finally {
              isRefreshing = false;
            }
          } else {
            // We already retried and still got 401, or something else is wrong.
            useAuthStore.getState().logout();
            if (
              typeof window !== "undefined" &&
              !window.location.pathname.startsWith("/login")
            ) {
              window.location.href = "/login";
            }
            return Promise.reject(error);
          }
        }

        if (error.response?.status === 403 && !originalRequest._retry403) {
            if (isRefreshingPermissions) {
                return new Promise<void>(function(resolve, reject) {
                    permissionQueue.push({ resolve, reject });
                }).then(() => {
                    return instance(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry403 = true;
            isRefreshingPermissions = true;

            try {
                const me = await instance.get("/users/me");
                const responseData = me?.data?.data || me?.data;
                const { _company, companyId, ...userData } = responseData || {};

                if (userData) {
                    const store = useAuthStore.getState();
                    store.login({
                        ...store.user,
                        ...userData,
                        companyId: companyId || userData.companyId || store.user?.companyId,
                    } as any);
                }

                useAuthStore.getState().setCompanyPermissions(
                    getEffectiveCompanyPermissions(responseData),
                );

                processPermissionQueue(null);
                return instance(originalRequest);
            } catch (refreshErr) {
                processPermissionQueue(refreshErr);
                return Promise.reject(error);
            } finally {
                isRefreshingPermissions = false;
            }
        }

        if (
          error.response?.status !== 401 &&
          error.response?.status !== 403 &&
          !originalRequest._skipErrorToast &&
          !originalRequest.url.includes("account-confirmation") &&
          !originalRequest.url.includes("onboardings/pre-fetch")
        ) {
          let errorMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message;

          if (Array.isArray(errorMessage)) {
             errorMessage = errorMessage.map((msg: any) => {
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
