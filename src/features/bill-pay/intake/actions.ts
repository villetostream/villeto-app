import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { invalidateInvoiceLists, unwrap } from "../shared/query-utils";

export interface BillPayIntakePayload {
  legalEntityId: string;
  source: string;
  externalReference?: string;
  senderType?: string;
  senderName?: string;
  senderEmail?: string;
  messageSubject?: string;
  messageBody?: string;
  structuredInput?: Record<string, unknown>;
}

export function useCreateBillPayIntake() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BillPayIntakePayload) => {
      // Generate a UUID for Idempotency-Key. If crypto.randomUUID is not available (older browsers), fallback to a pseudo-random string
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);

      const res = await axios.post("/bill-pay/intakes", payload, {
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
      });
      return res.data;
    },
    onSuccess: () =>
      client.invalidateQueries({ queryKey: workspaceQueryKey(["bill-pay"]) }),
  });
}
export interface SubmitBillPayIntakeResult {
  submitted: boolean;
  blockers: Array<{ code: string; message: string }>;
}

export function useSubmitBillPayIntake() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.post(`/bill-pay/intakes/${id}/invoice/submit`);
      return unwrap<SubmitBillPayIntakeResult>(res.data);
    },
    onSuccess: (_, id) => {
      void client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay"]),
      });
      invalidateInvoiceLists(client);
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "intakes"]),
      });
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "intakes", id]),
      });
    },
  });
}

export function useRetryBillPayIntake() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.post(`/bill-pay/intakes/${id}/retry`);
      return res.data;
    },
    onSuccess: (_, id) => {
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "intakes"]),
      });
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "intakes", id]),
      });
    },
  });
}

export function useCancelBillPayIntake() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.post(`/bill-pay/intakes/${id}/cancel`);
      return res.data;
    },
    onSuccess: (_, id) => {
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "intakes"]),
      });
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "intakes", id]),
      });
    },
  });
}

export function useUpdateBillPayIntake() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Record<string, unknown>;
    }) => {
      const res = await axios.put(`/bill-pay/intakes/${id}/invoice`, payload);
      return res.data;
    },
    onSuccess: (_, { id }) => {
      invalidateInvoiceLists(client);
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "intakes"]),
      });
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "intakes", id]),
      });
    },
  });
}

export function useUploadBillPayIntake() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await axios.post(`/bill-pay/intakes/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return res.data;
    },
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "intakes"]),
      });
    },
  });
}
