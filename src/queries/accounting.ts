import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useListStatistics, useListCount } from "@/queries/list-summary";
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
  lines?: JournalLine[];
  lineCount?: number;
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

export function useAccountingData(
  legalEntityId?: string,
  options: {
    journalPage?: number;
    obligationPage?: number;
    activeTab?: string;
  } = {},
) {
  const axios = useAxios();
  const enabled = Boolean(legalEntityId);
  const get = async <T>(path: string) =>
    unwrap<T>((await axios.get(path, { params: { legalEntityId } })).data);
  const getPage = async <T>(path: string, params: Record<string, unknown>) => {
    let result = (
      await axios.get(path, { params: { legalEntityId, ...params } })
    ).data;
    for (let depth = 0; depth < 3 && result?.data && !result?.meta; depth++)
      result = result.data;
    return result as {
      data: T[];
      meta: {
        totalCount: number;
        totalPages: number;
        currentPage: number;
        limit: number;
      };
    };
  };
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
      queryKey: workspaceQueryKey([
        "accounting",
        "journals",
        legalEntityId,
        "summary",
        options.journalPage ?? 1,
      ]),
      queryFn: () =>
        getPage<Journal>("accounting/journals", {
          view: "summary",
          page: options.journalPage ?? 1,
          limit: 20,
        }),
      enabled: enabled && options.activeTab === "journals",
    }),
    journalCount: useListCount(
      "accounting/journals",
      ["accounting", "journals"],
      { legalEntityId, status: "posted" },
      enabled,
    ),
    obligationStatistics: useListStatistics(
      "accounting/obligations",
      ["accounting", "obligations"],
      { legalEntityId },
      enabled,
    ),
    obligations: useQuery({
      queryKey: workspaceQueryKey([
        "accounting",
        "obligations",
        legalEntityId,
        options.obligationPage ?? 1,
      ]),
      queryFn: () =>
        getPage<Obligation>("accounting/obligations", {
          page: options.obligationPage ?? 1,
          limit: 20,
        }),
      enabled: enabled && options.activeTab === "obligations",
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
