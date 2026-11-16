import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";

export interface BillPayDashboardSummary {
  scope?: "all";
  readOnly?: boolean;
  entityBreakdowns?: BillPayDashboardSummary[];
  totalsByCurrency?: {
    currency: string;
    metrics: Record<
      string,
      {
        count: number;
        amount: string;
        previousCount: number;
        previousAmount: string;
      }
    >;
  }[];
  legalEntity: {
    legalEntityId: string;
    code: string;
    legalName: string;
    baseCurrency: string;
    timezone: string;
  };
  period: {
    current: { start: string; end: string };
    previous: { start: string; end: string };
  };
  metrics: {
    totalBills: {
      count: number;
      amount: string;
      previousCount: number;
      previousAmount: string;
      countPercentageChange: string;
      amountPercentageChange: string;
    };
    awaitingApproval?: {
      count: number;
      amount: string;
      previousCount: number;
      previousAmount: string;
      countPercentageChange: string;
      amountPercentageChange: string;
    };
    readyForPayment?: {
      count: number;
      amount: string;
      previousCount: number;
      previousAmount: string;
      countPercentageChange: string;
      amountPercentageChange: string;
    };
    completed?: {
      count: number;
      amount: string;
      previousCount: number;
      previousAmount: string;
      countPercentageChange: string;
      amountPercentageChange: string;
    };
  };
}

export function useGetBillPayDashboardSummary(
  legalEntityId: string,
  periodStart?: string,
  periodEnd?: string,
  options?: Omit<
    UseQueryOptions<BillPayDashboardSummary, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey([
      "bill-pay",
      "dashboard",
      "summary",
      legalEntityId,
      periodStart,
      periodEnd,
    ]),
    queryFn: async ({ signal }) => {
      const searchParams = new URLSearchParams();
      if (legalEntityId) searchParams.append("legalEntityId", legalEntityId);
      if (periodStart) searchParams.append("periodStart", periodStart);
      if (periodEnd) searchParams.append("periodEnd", periodEnd);

      const res = await axios.get(
        `/bill-pay/dashboard/summary?${searchParams.toString()}`,
        { signal },
      );
      return res.data.data as BillPayDashboardSummary;
    },
    enabled: !!legalEntityId,
    ...options,
  });
}
