import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import type { PaymentRequest, PaginatedResult } from "@/features/bill-pay/shared/types";

// Payment Requests
export interface CreatePaymentRequestPayload {
  legalEntityId: string;
  fundingAccountId: string;
  beneficiaryId: string;
  vendorSiteId: string;
  currency: string;
  amount: string;
  paymentMethod: string;
  requestedExecutionDate: string;
  idempotencyKey: string;
  allocations: {
    financialObligationId: string;
    amount: string;
  }[];
}

export function useCreatePaymentRequest() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePaymentRequestPayload) => {
      const res = await axios.post(`/bill-pay/payment-requests`, payload, {
        headers: {
          "Idempotency-Key": payload.idempotencyKey,
        },
      });
      return res.data;
    },
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "requests"]),
      }),
  });
}

export function useGetPaymentRequests(
  legalEntityId: string,
  page = 1,
  limit = 20,
) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey([
      "bill-pay",
      "requests",
      "paginated",
      legalEntityId,
      page,
      limit,
    ]),
    queryFn: async ({ signal }) => {
      const res = await axios.get(
        `/bill-pay/payment-requests?legalEntityId=${legalEntityId}&page=${page}&limit=${limit}`,
        { signal },
      );
      return res.data.data as PaginatedResult<PaymentRequest>;
    },
    staleTime: STALE_TIMES.LIVE,
    enabled: !!legalEntityId,
  });
}

export function useGetPaymentRequestById(paymentRequestId: string) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey(["bill-pay", "requests", paymentRequestId]),
    queryFn: async ({ signal }) => {
      const res = await axios.get(
        `/bill-pay/payment-requests/${paymentRequestId}`,
        { signal },
      );
      return res.data as { data: PaymentRequest };
    },
    enabled: !!paymentRequestId,
  });
}
