import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { invalidateInvoiceLists } from "@/features/bill-pay/shared/query-utils";

// Payment Request Lifecycle Hooks

export function useSubmitPaymentRequest() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.post(`/bill-pay/payment-requests/${id}/submit`);
      return res.data;
    },
    onSuccess: (_, id) => {
      invalidateInvoiceLists(client);
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "requests"]),
      });
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "requests", id]),
      });
    },
  });
}

export function useAuthorizePaymentRequest() {
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
        `/bill-pay/payment-requests/${id}/authorize`,
        payload,
      );
      return res.data;
    },
    onSuccess: (_, { id }) => {
      invalidateInvoiceLists(client);
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "requests"]),
      });
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "requests", id]),
      });
    },
  });
}

export function useRejectPaymentRequest() {
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
        `/bill-pay/payment-requests/${id}/reject`,
        payload,
      );
      return res.data;
    },
    onSuccess: (_, { id }) => {
      invalidateInvoiceLists(client);
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "requests"]),
      });
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "requests", id]),
      });
    },
  });
}

export function useSchedulePaymentRequest() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: { executionDate: string };
    }) => {
      const res = await axios.post(
        `/bill-pay/payment-requests/${id}/schedule`,
        payload,
      );
      return res.data;
    },
    onSuccess: (_, { id }) => {
      invalidateInvoiceLists(client);
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "requests"]),
      });
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "requests", id]),
      });
    },
  });
}

export interface RecordExternalPaymentPayload {
  fundingAccountId: string;
  beneficiaryId: string;
  executionDate: string;
  amount: string;
  bankReference: string;
  idempotencyKey: string;
}

export function useRecordExternalPayment() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: RecordExternalPaymentPayload;
    }) => {
      const res = await axios.post(
        `/bill-pay/payment-requests/${id}/record-external`,
        payload,
      );
      return res.data;
    },
    onSuccess: (_, { id }) => {
      invalidateInvoiceLists(client);
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "requests"]),
      });
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "requests", id]),
      });
    },
  });
}

export function useInitiatePaymentRequest() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.post(`/bill-pay/payment-requests/${id}/initiate`);
      return res.data;
    },
    onSuccess: (_, id) => {
      invalidateInvoiceLists(client);
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "requests"]),
      });
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "requests", id]),
      });
    },
  });
}
