import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";

interface RejectPolicyArgs {
  policyId: string;
}

export const useRejectPolicy = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ policyId }: RejectPolicyArgs) => {
      const response = await axiosInstance.patch(`${API_KEYS.EXPENSE.POLICIES}/${policyId}/reject`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate the policies query to instantly refresh the table
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenses.policies });
    },
  });
};
