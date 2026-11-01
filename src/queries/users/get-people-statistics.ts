import { useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import { API_KEYS } from "@/lib/constants/apis";

export interface PeopleStatistics {
  totalUsers?: number;
  activeUsers?: number;
  directoryUsers?: number;
  roles?: number;
}

export function usePeopleStatistics(enabled: boolean) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey(QUERY_KEYS.people.statistics),
    queryFn: async ({ signal }): Promise<PeopleStatistics> => {
      const response = await axios.get(`${API_KEYS.USER.USERS}/statistics`, { signal });
      return response.data.data;
    },
    enabled,
    staleTime: STALE_TIMES.NORMAL,
  });
}
