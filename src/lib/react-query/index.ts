import { QueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/constants/stale-times";

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
        retry: 2,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
