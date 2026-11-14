import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import type { PaginatedResult } from "@/features/bill-pay/shared/types";

// Approval Rules
export interface CreateApprovalRulePayload {
  legalEntityId: string;
  minimumAmount: string;
  maximumAmount?: string | null;
  requiredApprovals: number;
  requireDistinctFromCreator: boolean;
}

export interface ApprovalRule {
  paymentApprovalRuleId: string;
  minimumAmount: string;
  maximumAmount: string | null;
  requiredApprovals: number;
  requireDistinctFromCreator: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useCreateApprovalRule() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateApprovalRulePayload) => {
      const res = await axios.post(`/bill-pay/approval-rules`, payload);
      return res.data;
    },
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "approval-rules"]),
      }),
  });
}

export function useGetApprovalRules(
  legalEntityId: string,
  page = 1,
  limit = 20,
) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey([
      "bill-pay",
      "approval-rules",
      legalEntityId,
      page,
      limit,
    ]),
    queryFn: async ({ signal }) => {
      const res = await axios.get(
        `/bill-pay/approval-rules?legalEntityId=${legalEntityId}&page=${page}&limit=${limit}`,
        { signal },
      );
      return res.data.data as PaginatedResult<ApprovalRule>;
    },
    staleTime: STALE_TIMES.NORMAL,
    enabled: !!legalEntityId,
  });
}
