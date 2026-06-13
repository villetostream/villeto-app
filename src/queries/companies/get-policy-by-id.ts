import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";
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
    queryKey: [QUERY_KEYS.POLICIES, id],
    queryFn: async () => {
      const response = await axiosInstance.get(API_KEYS.EXPENSE.POLICY_BY_ID(id));
      return response.data;
    },
    enabled: !!id,
    staleTime: 0,
    ...options,
  });
};
