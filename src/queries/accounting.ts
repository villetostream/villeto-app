import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";

export interface AccountingEntity {
  legalEntityId: string;
  legalName: string;
  code?: string;
  baseCurrency: string;
}
export interface TrialBalanceRow {
  ledgerAccountId: string;
  code: string;
  name: string;
  debitTotal: string;
  creditTotal: string;
  legalEntity?: AccountingEntity;
}
export type TrialBalanceResponse =
  | TrialBalanceRow[]
  | {
      scope: "all";
      readOnly: true;
      entityBreakdowns: Array<{
        legalEntity: AccountingEntity;
        accounts: TrialBalanceRow[];
      }>;
    };

export interface LedgerAccount {
  legalEntity?: AccountingEntity;
  ledgerAccountId: string;
  code: string;
  name: string;
  accountType: string;
  purpose: string;
  isActive: boolean;
}
export interface FiscalPeriod {
  legalEntity?: AccountingEntity;
  fiscalPeriodId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}
export interface JournalLine {
  journalLineId: string;
  debitAmount: string;
  creditAmount: string;
  ledgerAccount: LedgerAccount;
}
export interface Journal {
  legalEntity?: AccountingEntity;
  journalEntryId: string;
  entryNumber: string;
  postingDate: string;
  description: string;
  status: string;
  currency: string;
  lines: JournalLine[];
}
export interface Obligation {
  legalEntity?: AccountingEntity;
  financialObligationId: string;
  currency: string;
  originalAmount: string;
  outstandingAmount: string;
  dueDate?: string;
  status: string;
  vendor?: { displayName?: string; legalName?: string };
}

const unwrap = <T>(value: unknown): T => {
  let result = value;
  // Financial obligations are paginated inside the ordinary API envelope.
  for (
    let depth = 0;
    depth < 3 &&
    result &&
    typeof result === "object" &&
    !Array.isArray(result) &&
    "data" in result;
    depth++
  )
    result = (result as { data: unknown }).data;
  return result as T;
};

export function useAccountingData(legalEntityId?: string) {
  const axios = useAxios();
  const enabled = Boolean(legalEntityId);
  const get = async <T>(path: string) =>
    unwrap<T>((await axios.get(path, { params: { legalEntityId } })).data);
  return {
    accounts: useQuery({
      queryKey: workspaceQueryKey(["accounting", "accounts", legalEntityId]),
      queryFn: () => get<LedgerAccount[]>("accounting/accounts"),
      enabled,
    }),
    periods: useQuery({
      queryKey: workspaceQueryKey(["accounting", "periods", legalEntityId]),
      queryFn: () => get<FiscalPeriod[]>("accounting/fiscal-periods"),
      enabled,
    }),
    journals: useQuery({
      queryKey: workspaceQueryKey(["accounting", "journals", legalEntityId]),
      queryFn: () => get<Journal[]>("accounting/journals"),
      enabled,
    }),
    obligations: useQuery({
      queryKey: workspaceQueryKey(["accounting", "obligations", legalEntityId]),
      queryFn: () => get<Obligation[]>("accounting/obligations"),
      enabled,
    }),
    trialBalance: useQuery({
      queryKey: workspaceQueryKey([
        "accounting",
        "trial-balance",
        legalEntityId,
      ]),
      queryFn: () => get<TrialBalanceResponse>("accounting/trial-balance"),
      enabled,
    }),
  };
}

export function useProvisionAccounting() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (legalEntityId: string) =>
      (
        await axios.post("accounting/configuration/provision", {
          legalEntityId,
        })
      ).data,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: workspaceQueryKey(["accounting"]) }),
  });
}
