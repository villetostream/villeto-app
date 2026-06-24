import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";

interface ExpenseCategory {
    name: string;
    description?: string;
    module?: string;
    parentCategoryId?: string;
}

interface CreateExpenseCategoryPayload {
    categories: ExpenseCategory[];
}

interface Response {
    data: unknown;
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

export const useCreateExpenseCategoryApi = () => {
    const axiosInstance = useAxios();
    const queryClient = useQueryClient();

    return useMutation<Response, Error, CreateExpenseCategoryPayload>({
        retry: false,
        mutationFn: async (payload: CreateExpenseCategoryPayload) => {
            const res = await axiosInstance.post(API_KEYS.EXPENSE.CATEGORIES, payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXPENSE_CATEGORIES] });
        }
    });
};
