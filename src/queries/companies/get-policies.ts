import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";
import { STALE_TIMES } from "@/lib/constants/stale-times";

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface PolicyScopeAll {
  type: "all_employees" | "all";
  location?: string;
}

export interface PolicyScopeSpecific {
  type: "specific";
  departments: string[];
  userRoles: string[];
  location?: string;
}

export type PolicyScope = PolicyScopeAll | PolicyScopeSpecific;

export interface SpendLimitRule {
  type: "spend_limit";
  amount: number;
  currency: string;
  enforcementAction: string;
  timeUnit?: string;
  timeframe?: string;
}

export interface ReceiptRequirementRule {
  type: "receipt_requirement";
  receiptNeeded?: boolean;
  receiptAmountThreshold?: number;
  currency: string;
  enforcementAction: string;
}

export type PolicyRule = SpendLimitRule | ReceiptRequirementRule;

export interface Policy {
  policyId: string;
  name: string;
  description?: string;
  status: "active" | "pending" | "draft" | "Inactive" | string;
  isApplicableToAllRoles?: boolean;
  enforcementAction?: string;
  spendLimit?: string;
  spendLimitPeriod?: string;
  scope: PolicyScope;
  rules: PolicyRule[];
  approvers?: (string | Record<string, unknown>)[];
  expenseCategories?: string[];
  applicableRoles?: string[];
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  createdBy?: string;
  version?: number;
}

interface GetPoliciesResponse {
  data: Policy[];
  message: string;
  status: number;
  statusCode: number;
  statusText: string;
  meta?: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}

export interface GetPoliciesParams {
  page?: number;
  limit?: number;
  excludeDrafts?: boolean;
}

/* ─── Hook ───────────────────────────────────────────────────────────────── */

export const useGetPoliciesApi = (
  params?: GetPoliciesParams,
  options?: Omit<UseQueryOptions<GetPoliciesResponse, Error>, "queryKey" | "queryFn">
): UseQueryResult<GetPoliciesResponse, Error> => {
  const axiosInstance = useAxios();

  return useQuery<GetPoliciesResponse, Error>({
    queryKey: [QUERY_KEYS.POLICIES, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append("page", params.page.toString());
      if (params?.limit) searchParams.append("limit", params.limit.toString());
      if (params?.excludeDrafts !== undefined) searchParams.append("excludeDrafts", params.excludeDrafts.toString());
      
      const queryString = searchParams.toString();
      const url = queryString ? `${API_KEYS.EXPENSE.POLICIES}?${queryString}` : API_KEYS.EXPENSE.POLICIES;
      const response = await axiosInstance.get(url);
      return response.data;
    },
    staleTime: STALE_TIMES.SLOW,
    ...options,
  });
};
