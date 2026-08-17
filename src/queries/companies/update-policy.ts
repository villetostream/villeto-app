import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { Policy, PolicyRule, PolicyScope } from "./get-policies";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface UpdatePolicyPayload {
  name?: string;
  description?: string;
  rules?: PolicyRule[];
  scope?: PolicyScope;
  expenseCategories?: string[];
  status?: "active" | "draft";
  override_policy?: boolean;
  policyId?: string;
}

interface UpdatePolicyResponse {
  data: Policy;
  message: string;
  status: number;
  statusCode: number;
  statusText: string;
}

/* ─── Hook ───────────────────────────────────────────────────────────────── */

export const useUpdatePolicyApi = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation<UpdatePolicyResponse, Error, { id: string; payload: UpdatePolicyPayload }>({
    retry: false,
    mutationFn: async ({ id, payload }) => {
      const response = await axiosInstance.patch(API_KEYS.EXPENSE.POLICY_BY_ID(id), payload);
      return response.data;
    },
    onSuccess: (_data, { id }) => {
      // Invalidate both list and the specific policy cache
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenses.policies });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenses.policy(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenses.categories });
    },
  });
};
