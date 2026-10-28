import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { PROCUREMENT_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";

export function useApproveProcurementPolicy() {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const response = await axios.patch(
        PROCUREMENT_KEYS.PROCUREMENT_POLICY_ACTION(id, "approve"),
      );
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.policies),
      });
      // Invalidate individual cache so the detail view reflects the new status
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.policy(id)),
      });
    },
  });
}

export function useRejectProcurementPolicy() {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await axios.patch(
        PROCUREMENT_KEYS.PROCUREMENT_POLICY_ACTION(id, "reject"),
        reason ? { reason: reason.trim() } : {},
      );
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.policies),
      });
      // Invalidate individual cache so the detail view reflects the new status
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.policy(id)),
      });
    },
  });
}
