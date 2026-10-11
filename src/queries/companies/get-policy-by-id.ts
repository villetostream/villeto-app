
import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import { Policy } from "./get-policies";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface GetPolicyByIdResponse {
  data: Policy;
  message: string;
  status: number;
  statusCode: number;
  statusText: string;
}

/* ─── Hook ───────────────────────────────────────────────────────────────── */

export const useGetPolicyByIdApi = (
  id: string,
  options?: Omit<UseQueryOptions<GetPolicyByIdResponse, Error>, "queryKey" | "queryFn">
): UseQueryResult<GetPolicyByIdResponse, Error> => {
  const axiosInstance = useAxios();

  return useQuery<GetPolicyByIdResponse, Error>({
    queryKey: workspaceQueryKey(QUERY_KEYS.expenses.policy(id)),
    queryFn: async () => {
      const response = await axiosInstance.get(API_KEYS.EXPENSE.POLICY_BY_ID(id));
      return response.data;
    },
    enabled: !!id,
    staleTime: STALE_TIMES.SLOW,
    ...options,
  });
};
