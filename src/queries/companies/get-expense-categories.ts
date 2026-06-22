import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";
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
}

export const useGetExpenseCategoriesApi = (
    options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();

    return useQuery<Response, Error>({
        queryKey: [QUERY_KEYS.EXPENSE_CATEGORIES],
        queryFn: async () => {
            const response = await axiosInstance.get(API_KEYS.EXPENSE.CATEGORIES);
            return response.data;
        },
        staleTime: STALE_TIMES.STATIC,
        ...options,
    });
};

export const useGetExpenseCategoriesWithPoliciesApi = (
    options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();
    return useQuery<Response, Error>({
        queryKey: [QUERY_KEYS.EXPENSE_CATEGORIES, "with-policies"],
        queryFn: async () => {
            const response = await axiosInstance.get(API_KEYS.EXPENSE.CATEGORIES_WITH_POLICIES);
            return response.data;
        },
        staleTime: STALE_TIMES.STATIC,
        ...options,
    });
};
