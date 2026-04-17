"use client";

import axios, { AxiosInstance } from "axios";
import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth-stores";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const BASEURL = process.env.NEXT_PUBLIC_API_BASE_URL;

export function useAxios(): AxiosInstance {
  const accessToken = useAuthStore.getState().accessToken;
  const router = useRouter();

  return useMemo(() => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const instance = axios.create({
      baseURL: BASEURL,
      headers,
      withCredentials: true,
    });

    // Refresh token interceptor
    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Handle 401 unauthorized errors with token refresh.
        // Skip entirely on onboarding pages — no refresh token exists there
        // and a failed refresh attempt would produce a second noisy 401.
        const isOnboardingPath =
          typeof window !== "undefined" &&
          window.location.pathname.includes("/onboarding");

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
            router.replace("/login");
            return Promise.reject(refreshError);
          }
        }
        
        // Only show toast for errors that aren't already handled by the calling code
        // Skip showing toast if the error is already being handled (e.g., in try-catch blocks)
        // Only show for unhandled errors or specific error types
        if (
          error.response?.status !== 401 && // Don't show for 401s (handled above)
          !originalRequest._skipErrorToast && // Allow callers to skip toast
          !originalRequest.url.includes("account-confirmation") &&
          !originalRequest.url.includes("onboardings/pre-fetch")
        ) {
          // Only show error toast if there's a meaningful error message
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message;
          
          if (errorMessage && errorMessage !== "Network Error") {
            toast.error(errorMessage);
          }
        } else if (originalRequest.url.includes("account-confirmation") || originalRequest.url.includes("onboardings/pre-fetch")) {
          // toast.info("onboarding required!, redirecting to Onboarding ");
        }
        
        return Promise.reject(error);
      }
    );

    return instance;
  }, [accessToken, router]);
}
