import { workspaceQueryKey } from "@/features/entity-workspace/store";
import {
  UseQueryOptions,
  UseQueryResult,
  useQuery,
} from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { STALE_TIMES } from "@/lib/constants/stale-times";

export interface ExpenseCategory {
  categoryId: string;
  name: string;
  description: string | null;
  source: "custom" | "default" | string;
  templateKey: string | null;
  module: "expense" | "both" | string;
  isActive: boolean;
  sortOrder: number;
  parentCategoryId: string | null;
  mergedIntoCategoryId: string | null;
  isPolicyAttached: boolean;
  policyCount: number;
  policies: unknown[];
  createdBy: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    [key: string]: unknown;
  } | null;
  children: ExpenseCategory[];
}

/**
 * Checks whether an individual expense category has at least one active/attached policy.
 */
export function isCategoryWithPolicy(cat: any): boolean {
    if (!cat) return false;
    if (cat.isPolicyAttached === true) return true;
    if (Array.isArray(cat.policies) && cat.policies.length > 0) return true;
    if (typeof cat.policyCount === "number" && cat.policyCount > 0) return true;
    return false;
}

/**
 * Checks whether an array of expense categories contains at least one category with an attached policy.
 */
export function hasCategoryWithPolicy(categories: any[] | undefined | null): boolean {
    if (!Array.isArray(categories) || categories.length === 0) return false;
    return categories.some(isCategoryWithPolicy);
}

interface Response {
  data: ExpenseCategory[];
  error: {
    error: string;
    message?: string;
    success: boolean;
  };
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

export const useGetExpenseCategoriesApi = (
  options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">,
): UseQueryResult<Response, Error> => {
  const axiosInstance = useAxios();

  return useQuery<Response, Error>({
    queryKey: workspaceQueryKey(QUERY_KEYS.expenses.categories),
    queryFn: async () => {
      const response = await axiosInstance.get(API_KEYS.EXPENSE.CATEGORIES);
      return response.data;
    },
    staleTime: STALE_TIMES.STATIC,
    ...options,
  });
};

export const useGetExpenseCategoriesWithPoliciesApi = (
  options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">,
): UseQueryResult<Response, Error> => {
  const axiosInstance = useAxios();
  return useQuery<Response, Error>({
    queryKey: workspaceQueryKey([
      ...QUERY_KEYS.expenses.categories,
      "with-policies",
    ]),
    queryFn: async () => {
      const response = await axiosInstance.get(
        API_KEYS.EXPENSE.CATEGORIES_WITH_POLICIES,
      );
      return response.data;
    },
    staleTime: STALE_TIMES.STATIC,
    ...options,
  });
};

/**
 * Admin-scoped policy coverage endpoint — returns ALL expense categories
 * (including those with 0 policies), with full policy details per category.
 * Used in the Policies page Expense Categories tab and the Policy Creation Modal.
 */
export const useGetExpenseCategoryCoverageAllApi = (
  options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">,
): UseQueryResult<Response, Error> => {
  const axiosInstance = useAxios();
  return useQuery<Response, Error>({
    queryKey: workspaceQueryKey([
      ...QUERY_KEYS.expenses.categories,
      "coverage-admin",
    ]),
    queryFn: async () => {
      const response = await axiosInstance.get(
        API_KEYS.EXPENSE.CATEGORIES_POLICY_COVERAGE_ADMIN,
      );
      return response.data;
    },
    staleTime: STALE_TIMES.STATIC,
    ...options,
  });
};
