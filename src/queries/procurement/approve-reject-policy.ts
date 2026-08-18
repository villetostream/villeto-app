import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { PROCUREMENT_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";

export function useApproveProcurementPolicy() {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const response = await axios.patch(PROCUREMENT_KEYS.PROCUREMENT_POLICY_ACTION(id, "approve"));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.policies });
    },
  });
}

export function useRejectProcurementPolicy() {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const response = await axios.patch(PROCUREMENT_KEYS.PROCUREMENT_POLICY_ACTION(id, "reject"));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.policies });
    },
  });
}
