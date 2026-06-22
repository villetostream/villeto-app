import { useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";
import { STALE_TIMES } from "@/lib/constants/stale-times";

export interface ExpenseCategoryDetail {
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    categoryId: string;
    name: string;
    description: string | null;
    isPolicyAttached: boolean;
    source: string;
    templateKey: string | null;
    module: string;
    isActive: boolean;
    sortOrder: number;
    parentCategory: string | null;
    children: unknown[];
    mergedIntoCategory: string | null;
    policies: unknown[];
    createdBy: {
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
        userId: string;
        employeeExternalId: string | null;
        firstName: string;
        lastName: string;
        loginCount: number;
        email: string;
        status: string;
        jobTitle: string | null;
        percentageOfOwnership: string;
        departmentId: string | null;
        managerId: string | null;
        position: string;
    };
}

export interface GetExpenseCategoryDetailResponse {
    message: string;
    status: number;
    data: ExpenseCategoryDetail;
}

export const useGetExpenseCategoryDetailApi = (categoryId: string) => {
    const axiosInstance = useAxios();

    return useQuery<GetExpenseCategoryDetailResponse>({
        queryKey: [QUERY_KEYS.EXPENSE_CATEGORIES, categoryId],
        queryFn: async () => {
            const res = await axiosInstance.get(API_KEYS.EXPENSE.CATEGORY_DETAIL(categoryId));
            return res.data;
        },
        enabled: !!categoryId,
        staleTime: STALE_TIMES.STATIC,
    });
};
