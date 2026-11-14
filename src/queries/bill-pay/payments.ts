import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import { invalidateInvoiceLists } from "@/features/bill-pay/shared/query-utils";
import type { Payment, PaginatedResult } from "@/features/bill-pay/shared/types";

// Payments

export function useGetPayments(legalEntityId: string, page = 1, limit = 20) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey([
      "bill-pay",
      "payments",
      "paginated",
      legalEntityId,
      page,
      limit,
    ]),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (legalEntityId !== "all") params.set("legalEntityId", legalEntityId);
      const res = await axios.get(`/bill-pay/payments?${params.toString()}`, {
        signal,
      });
      return res.data.data as PaginatedResult<Payment>;
    },
    staleTime: STALE_TIMES.LIVE,
    enabled: !!legalEntityId,
  });
}

export function useGetPaymentById(paymentId: string) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey(["bill-pay", "payments", paymentId]),
    queryFn: async ({ signal }) => {
      const res = await axios.get(`/bill-pay/payments/${paymentId}`, {
        signal,
      });
      return res.data as { data: Payment };
    },
    enabled: !!paymentId,
  });
}

export function useReconcilePayment() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: { bankTransactionId: string };
    }) => {
      const res = await axios.post(
        `/bill-pay/payments/${id}/reconcile`,
        payload,
      );
      return res.data;
    },
    onSuccess: (_, { id }) => {
      invalidateInvoiceLists(client);
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "payments"]),
      });
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "payments", id]),
      });
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "bank"]),
      });
    },
  });
}

export function useReversePaymentReconciliation() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: { reason: string };
    }) => {
      const res = await axios.post(
        `/bill-pay/payments/${id}/reconciliation/reverse`,
        payload,
      );
      return res.data;
    },
    onSuccess: (_, { id }) => {
      invalidateInvoiceLists(client);
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "payments"]),
      });
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "payments", id]),
      });
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "bank"]),
      });
    },
  });
}
