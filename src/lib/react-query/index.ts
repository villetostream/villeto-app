import { QueryClient } from "@tanstack/react-query";

const STALE_TIME = 2 * 60 * 1000; // 2 min — data is fresh for this long

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME,
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
