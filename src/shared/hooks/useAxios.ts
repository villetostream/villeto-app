"use client";

import axios, { type AxiosInstance } from "axios";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/store";
import { isConnectionPoolError, CONNECTION_POOL_MESSAGE } from "@/shared/lib/errors/api-errors";
import { scheduleTokenRefresh } from "@/lib/tokenRefreshService";

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
                        router.replace("/login");
                        return Promise.reject(error);
                    } finally {
                        isRefreshing = false;
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
