import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import type { Beneficiary, PaginatedResult } from "@/features/bill-pay/shared/types";

// Beneficiaries
export interface CreateBeneficiaryPayload {
  legalEntityId: string;
  vendorId: string;
  name: string;
  maskedIdentifier: string;
  externalReference: string;
  currency: string;
}

export function useCreateBeneficiary() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBeneficiaryPayload) => {
      const res = await axios.post(`/bill-pay/beneficiaries`, payload);
      return res.data;
    },
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "beneficiaries"]),
      }),
  });
}

export function useGetBeneficiaries(
  legalEntityId: string,
  page = 1,
  limit = 20,
) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey([
      "bill-pay",
      "beneficiaries",
      legalEntityId,
      page,
      limit,
    ]),
    queryFn: async ({ signal }) => {
      const res = await axios.get(
        `/bill-pay/beneficiaries?legalEntityId=${legalEntityId}&page=${page}&limit=${limit}`,
        { signal },
      );
      return res.data.data as PaginatedResult<Beneficiary>;
    },
    staleTime: STALE_TIMES.SLOW,
    enabled: !!legalEntityId,
  });
}
