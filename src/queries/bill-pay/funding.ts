import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import type { FundingAccount, PaginatedResult } from "@/features/bill-pay/shared/types";

// Funding Accounts
export interface CreateFundingAccountPayload {
  legalEntityId: string;
  name: string;
  accountType: string;
  maskedIdentifier: string;
  externalReference: string;
  currency: string;
}

export function useCreateFundingAccount() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateFundingAccountPayload) => {
      const res = await axios.post(`/bill-pay/funding-accounts`, payload);
      return res.data;
    },
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "funding"]),
      }),
  });
}

export function useGetFundingAccounts(
  legalEntityId: string,
  page = 1,
  limit = 20,
) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey([
      "bill-pay",
      "funding",
      legalEntityId,
      page,
      limit,
    ]),
    queryFn: async ({ signal }) => {
      const res = await axios.get(
        `/bill-pay/funding-accounts?legalEntityId=${legalEntityId}&page=${page}&limit=${limit}`,
        { signal },
      );
      return res.data.data as PaginatedResult<FundingAccount>;
    },
    staleTime: STALE_TIMES.SLOW,
    enabled: !!legalEntityId,
  });
}
