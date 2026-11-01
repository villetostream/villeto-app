import { useQuery, type QueryKey } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { STALE_TIMES } from "@/lib/constants/stale-times";

export interface StatisticsBucket {
  status: string;
  currency: string | null;
  count: number;
  totalAmount: number;
}

export function useListStatistics(
  path: string,
  key: QueryKey,
  params: Record<string, unknown>,
  enabled = true,
  refetchInterval?: number,
) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey([...key, "stats", params]),
    enabled,
    refetchInterval,
    staleTime: STALE_TIMES.NORMAL,
    queryFn: async ({ signal }) => {
      const { data } = await axios.get(path, {
        params: { ...params, view: "stats" },
        signal,
      });
      return (data.stats?.buckets ??
        data.data?.stats?.buckets ??
        []) as StatisticsBucket[];
    },
  });
}

export function countStatistics(
  buckets: StatisticsBucket[] | undefined,
  statuses?: string[],
) {
  return (buckets ?? []).reduce(
    (sum, bucket) =>
      sum + (!statuses || statuses.includes(bucket.status) ? bucket.count : 0),
    0,
  );
}

export function amountStatistics(
  buckets: StatisticsBucket[] | undefined,
  currency: string,
  statuses?: string[],
) {
  return (buckets ?? []).reduce(
    (sum, bucket) =>
      sum +
      (bucket.currency === currency &&
      (!statuses || statuses.includes(bucket.status))
        ? bucket.totalAmount
        : 0),
    0,
  );
}

export function useListCount(
  path: string,
  key: QueryKey,
  params: Record<string, unknown>,
  enabled = true,
) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey([...key, "count", params]),
    enabled,
    staleTime: STALE_TIMES.NORMAL,
    queryFn: async ({ signal }) => {
      const { data } = await axios.get(path, {
        params: { ...params, view: "count" },
        signal,
      });
      return Number(data.meta?.totalCount ?? data.data?.meta?.totalCount ?? 0);
    },
  });
}
