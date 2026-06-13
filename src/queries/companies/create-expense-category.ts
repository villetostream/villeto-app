import { useMutation } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";

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

    return useMutation<Response, Error, CreateExpenseCategoryPayload>({
        retry: false,
        mutationFn: async (payload: CreateExpenseCategoryPayload) => {
            const res = await axiosInstance.post(API_KEYS.EXPENSE.CATEGORIES, payload);
            return res.data;
        },
    });
};
