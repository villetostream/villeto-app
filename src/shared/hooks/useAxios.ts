"use client";

import axios, { type AxiosInstance } from "axios";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/store";
import { isConnectionPoolError, CONNECTION_POOL_MESSAGE } from "@/shared/lib/errors/api-errors";

declare module "axios" {
    export interface AxiosRequestConfig {
        _skipErrorToast?: boolean;
        _retry?: boolean;
    }
}

const BASEURL = process.env.NEXT_PUBLIC_API_BASE_URL;

const SKIP_ERROR_TOAST_URLS = ["account-confirmation", "onboardings/pre-fetch"];
const SKIP_REFRESH_URLS = ["auth"];
const SKIP_REFRESH_PATHS = ["/onboarding"];

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
                    SKIP_REFRESH_PATHS.some((p) => window.location.pathname.includes(p));

                const shouldAttemptRefresh =
                    error.response?.status === 401 &&
                    !originalRequest._retry &&
                    !SKIP_REFRESH_URLS.some((url) => originalRequest.url.includes(url)) &&
                    !isOnboardingPath;

                if (shouldAttemptRefresh) {
                    originalRequest._retry = true;
                    try {
                        await axios.post(`${BASEURL}auth/refresh`);
                        return instance(originalRequest);
                    } catch {
                        router.replace("/login");
                        return Promise.reject(error);
                    }
                }

                const shouldShowToast =
                    error.response?.status !== 401 &&
                    !originalRequest._skipErrorToast &&
                    !SKIP_ERROR_TOAST_URLS.some((url) => originalRequest.url.includes(url));

                if (shouldShowToast) {
                    // Replace raw pgBouncer/DB errors with a user-friendly message.
                    // The calling query handles retry; this toast is only shown once
                    // the retry budget is exhausted.
                    const rawMessage =
                        error.response?.data?.message ||
                        error.response?.data?.error ||
                        error.message;

                    const message = isConnectionPoolError(error)
                        ? CONNECTION_POOL_MESSAGE
                        : rawMessage;

                    if (message && message !== "Network Error") {
                        toast.error(message);
                    }
                }

                return Promise.reject(error);
            }
        );

        return instance;
    }, [accessToken, router]);
}
