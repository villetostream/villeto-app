import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";

export interface ApprovePolicyArgs {
  policyId: string;
}

export const useApprovePolicy = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ policyId }: ApprovePolicyArgs) => {
      const response = await axiosInstance.patch(
        API_KEYS.EXPENSE.POLICY_ACTION(policyId, "approve"),
      );
      return response.data;
    },
    onSuccess: (_data, { policyId }) => {
      // Invalidate the list so the table refreshes
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.expenses.policies),
      });
      // Also invalidate the individual policy cache so the modal
      // shows the updated status without requiring a page reload
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.expenses.policy(policyId)),
      });
    },
  });
};
