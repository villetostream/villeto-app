import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { unwrapPaginatedList } from "@/queries/pagination";

export interface LedgerAccount { ledgerAccountId: string; code: string; name: string; accountType: string; purpose: string; isActive: boolean; }
export interface FiscalPeriod { fiscalPeriodId: string; name: string; startDate: string; endDate: string; status: string; }
export interface JournalLine { journalLineId: string; debitAmount: string; creditAmount: string; ledgerAccount: LedgerAccount; }
export interface Journal { journalEntryId: string; entryNumber: string; postingDate: string; description: string; status: string; currency: string; lines: JournalLine[]; }
export interface Obligation { financialObligationId: string; currency: string; originalAmount: string; outstandingAmount: string; dueDate?: string; status: string; vendor?: { displayName?: string; legalName?: string }; }

const unwrap = <T,>(value: { data?: T } | T): T => value && typeof value === "object" && "data" in value ? (value as { data: T }).data : value as T;

export function useAccountingData(legalEntityId?: string) {
  const axios = useAxios();
  const enabled = Boolean(legalEntityId);
  const get = async <T,>(path: string) => unwrap<T>((await axios.get(path, { params: { legalEntityId } })).data);
  return {
    accounts: useQuery({ queryKey: ["accounting", "accounts", legalEntityId], queryFn: () => get<LedgerAccount[]>("accounting/accounts"), enabled }),
    periods: useQuery({ queryKey: ["accounting", "periods", legalEntityId], queryFn: () => get<FiscalPeriod[]>("accounting/fiscal-periods"), enabled }),
    journals: useQuery({ queryKey: ["accounting", "journals", legalEntityId], queryFn: () => get<Journal[]>("accounting/journals"), enabled }),
    obligations: useQuery({ queryKey: ["accounting", "obligations", legalEntityId], queryFn: () => get<Obligation[]>("accounting/obligations"), enabled }),
    trialBalance: useQuery({ queryKey: ["accounting", "trial-balance", legalEntityId], queryFn: () => get<Array<{ ledgerAccountId: string; code: string; name: string; debitTotal: string; creditTotal: string }>>("accounting/trial-balance"), enabled }),
  };
}

export function useObligations(legalEntityId?: string) {
  const axios = useAxios();
  const page = useQuery({
    queryKey: ["accounting", "obligations", legalEntityId, 1, 100],
    queryFn: async () =>
      unwrapPaginatedList<Obligation>(
        (
          await axios.get("accounting/obligations", {
            params: { legalEntityId, page: 1, limit: 100 },
          })
        ).data,
      ),
    enabled: Boolean(legalEntityId),
  });

  return {
    ...page,
    data: page.data?.items,
    pagination: page.data?.meta,
  };
}

export function useProvisionAccounting() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (legalEntityId: string) => (await axios.post("accounting/configuration/provision", { legalEntityId })).data,
    onSuccess: () => client.invalidateQueries({ queryKey: ["accounting"] }),
  });
}
