import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";

interface ApprovePolicyArgs {
  policyId: string;
}

export const useApprovePolicy = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ policyId }: ApprovePolicyArgs) => {
      const response = await axiosInstance.patch(`${API_KEYS.EXPENSE.POLICIES}/${policyId}/approve`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate the policies query to instantly refresh the table
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenses.policies });
    },
  });
};
