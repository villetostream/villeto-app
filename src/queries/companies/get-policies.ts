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
  requiredAboveAmount: number;
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
}

/* ─── Hook ───────────────────────────────────────────────────────────────── */

export const useGetPoliciesApi = (
  options?: Omit<UseQueryOptions<GetPoliciesResponse, Error>, "queryKey" | "queryFn">
): UseQueryResult<GetPoliciesResponse, Error> => {
  const axiosInstance = useAxios();

  return useQuery<GetPoliciesResponse, Error>({
    queryKey: [QUERY_KEYS.POLICIES],
    queryFn: async () => {
      const response = await axiosInstance.get(API_KEYS.EXPENSE.POLICIES);
      return response.data;
    },
    staleTime: STALE_TIMES.SLOW,
    ...options,
  });
};
