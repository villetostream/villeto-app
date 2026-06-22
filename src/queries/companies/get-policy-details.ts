import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import { Policy } from "./get-policies";

export const useGetPolicyDetailsApi = (
  policyId: string | null,
  options?: Omit<UseQueryOptions<{ data: Policy }, Error>, "queryKey" | "queryFn">
): UseQueryResult<{ data: Policy }, Error> => {
  const axiosInstance = useAxios();

  return useQuery<{ data: Policy }, Error>({
    queryKey: ["policy", policyId],
    queryFn: async () => {
      const response = await axiosInstance.get(`${API_KEYS.EXPENSE.POLICIES}/${policyId}`);
      return response.data;
    },
    enabled: !!policyId,
    staleTime: STALE_TIMES.SLOW,
    ...options,
  });
};
