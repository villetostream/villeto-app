import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface DeletePolicyResponse {
  message: string;
  status: number;
  statusCode: number;
  statusText: string;
}

/* ─── Hook ───────────────────────────────────────────────────────────────── */

export const useDeletePolicyApi = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation<DeletePolicyResponse, Error, string>({
    retry: false,
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(API_KEYS.EXPENSE.POLICY_BY_ID(id));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.POLICIES] });
    },
  });
};
