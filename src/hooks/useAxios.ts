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

const BASEURL = process.env.NEXT_PUBLIC_API_BASE_URL;

export function useAxios(): AxiosInstance {
  const accessToken = useAuthStore((state) => state.accessToken);
  const router = useRouter();

  return useMemo(() => {
    const instance = axios.create({
      baseURL: BASEURL,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
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
          originalRequest._retry = true;
          try {
            await axios.post(`${BASEURL}auth/refresh`);
            return instance(originalRequest);
          } catch (refreshError) {
            useAuthStore.getState().logout();
            if (
              typeof window !== "undefined" &&
              !window.location.pathname.startsWith("/login")
            ) {
              router.replace("/login");
            }
            return Promise.reject(refreshError);
          }
        }

        if (
          error.response?.status !== 401 &&
          !originalRequest._skipErrorToast &&
          !originalRequest.url.includes("account-confirmation") &&
          !originalRequest.url.includes("onboardings/pre-fetch")
        ) {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message;

          if (errorMessage && errorMessage !== "Network Error") {
            toast.error(errorMessage);
          }
        }

        return Promise.reject(error);
      }
    );

    return instance;
  }, [accessToken, router]);
}
