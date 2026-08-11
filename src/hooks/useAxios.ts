"use client";

import axios, { AxiosInstance } from "axios";

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
import { scheduleTokenRefresh } from "@/lib/tokenRefreshService";

const BASEURL = process.env.NEXT_PUBLIC_API_BASE_URL;

let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (error: any) => void }[] = [];

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
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        const isOnboardingPath =
          typeof window !== "undefined" &&
          window.location.pathname.includes("onboarding");

        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url.includes("auth") &&
          !isOnboardingPath
        ) {
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
              router.replace("/login");
            }
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }

        if (
          error.response?.status !== 401 &&
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
