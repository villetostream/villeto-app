import { QueryClient } from "@tanstack/react-query";
import axios from "axios";
import { STALE_TIMES } from "@/lib/constants/stale-times";

const MAX_QUERY_RETRIES = 2;

/**
 * Only retry failures that are plausibly transient. 4xx responses (validation,
 * auth, not-found, forbidden) will fail identically on retry, so retrying them
 * just multiplies backend load. 429/5xx are already retried with Retry-After
 * awareness in the axios layer; we allow React Query one extra attempt on top
 * only for network errors / 5xx.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) return false;
  if (axios.isCancel(error)) return false;
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === undefined) return true; // network error / timeout
    if (status === 408) return true;
    if (status === 429) return false; // already backed off in axios layer
    return status >= 500;
  }
  return false;
}

/** Exponential backoff with full jitter (AWS Architecture Blog recommendation). */
function retryDelay(attempt: number): number {
  const cap = 30_000;
  const base = 1_000;
  return Math.random() * Math.min(cap, base * 2 ** attempt);
}

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // NORMAL (2 min) — used as the default for any query that does not
        // declare its own staleTime. Individual queries override this via
        // the STALE_TIMES constants when they need a different tier.
        staleTime: STALE_TIMES.NORMAL,
        // Keep evicted/inactive data in memory for 10 min so navigating back
        // to a page shows cached data instantly while a background refetch runs.
        gcTime: 10 * 60 * 1000,
        retry: shouldRetry,
        retryDelay,
        // Focus/reconnect only refetch queries that are already STALE, so with
        // sane staleTimes this does not cause a burst of requests.
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        // Polling never runs while the browser tab is hidden.
        refetchIntervalInBackground: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
