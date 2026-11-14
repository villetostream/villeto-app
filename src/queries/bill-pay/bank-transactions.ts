import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { invalidateInvoiceLists } from "@/features/bill-pay/shared/query-utils";
import type { BankTransaction, PaginatedResult } from "@/features/bill-pay/shared/types";

// Bank Transactions

export function useGetBankTransactions(
  legalEntityId: string,
  page = 1,
  limit = 20,
) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey([
      "bill-pay",
      "bank",
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
      const res = await axios.get(
        `/bill-pay/bank-transactions?${params.toString()}`,
        { signal },
      );
      return res.data.data as PaginatedResult<BankTransaction>;
    },
    enabled: !!legalEntityId,
  });
}

export function useGetBankTransactionById(bankTransactionId: string) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey(["bill-pay", "bank", bankTransactionId]),
    queryFn: async ({ signal }) => {
      const res = await axios.get(
        `/bill-pay/bank-transactions/${bankTransactionId}`,
        { signal },
      );
      return res.data as { data: BankTransaction };
    },
    enabled: !!bankTransactionId,
  });
}

export interface ImportBankTransactionsPayload {
  legalEntityId: string;
  fundingAccountId: string;
  csv: string;
}

export function useImportBankTransactions() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ImportBankTransactionsPayload) => {
      const res = await axios.post(
        `/bill-pay/bank-transactions/import`,
        payload,
      );
      return res.data;
    },
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "bank"]),
      }),
  });
}

export function useMatchBankTransaction() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: { paymentId: string };
    }) => {
      const res = await axios.post(
        `/bill-pay/bank-transactions/${id}/match`,
        payload,
      );
      return res.data;
    },
    onSuccess: (_, { id }) => {
      invalidateInvoiceLists(client);
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "bank"]),
      });
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "bank", id]),
      });
      client.invalidateQueries({
        queryKey: workspaceQueryKey(["bill-pay", "payments"]),
      });
    },
  });
}
