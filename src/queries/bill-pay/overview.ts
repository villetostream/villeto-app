import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import { unwrap } from "@/features/bill-pay/shared/query-utils";
import type {
  BankTransaction,
  Beneficiary,
  FundingAccount,
  Payment,
  PaymentRequest,
} from "@/features/bill-pay/shared/types";

export function useBillPayData(legalEntityId?: string) {
  const axios = useAxios();
  const enabled = Boolean(legalEntityId);
  const get = async <T>(path: string, signal: AbortSignal) =>
    unwrap<T>(
      (await axios.get(path, { params: { legalEntityId }, signal })).data,
    );
  return {
    requests: useQuery({
      queryKey: workspaceQueryKey(["bill-pay", "requests", legalEntityId]),
      queryFn: ({ signal }) =>
        get<PaymentRequest[]>("bill-pay/payment-requests", signal),
      staleTime: STALE_TIMES.LIVE,
      enabled,
    }),
    payments: useQuery({
      queryKey: workspaceQueryKey(["bill-pay", "payments", legalEntityId]),
      queryFn: ({ signal }) => get<Payment[]>("bill-pay/payments", signal),
      staleTime: STALE_TIMES.LIVE,
      enabled,
    }),
    funding: useQuery({
      queryKey: workspaceQueryKey(["bill-pay", "funding", legalEntityId]),
      queryFn: ({ signal }) =>
        get<FundingAccount[]>("bill-pay/funding-accounts", signal),
      staleTime: STALE_TIMES.SLOW,
      enabled,
    }),
    beneficiaries: useQuery({
      queryKey: workspaceQueryKey(["bill-pay", "beneficiaries", legalEntityId]),
      queryFn: ({ signal }) =>
        get<Beneficiary[]>("bill-pay/beneficiaries", signal),
      staleTime: STALE_TIMES.SLOW,
      enabled,
    }),
    bankTransactions: useQuery({
      queryKey: workspaceQueryKey(["bill-pay", "bank", legalEntityId]),
      queryFn: ({ signal }) =>
        get<BankTransaction[]>("bill-pay/bank-transactions", signal),
      staleTime: STALE_TIMES.LIVE,
      enabled,
    }),
  };
}

export function useBillPayAction() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      path,
      body = {},
    }: {
      path: string;
      body?: Record<string, unknown>;
    }) => (await axios.post(path, body)).data,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: workspaceQueryKey(["bill-pay"]) }),
  });
}
