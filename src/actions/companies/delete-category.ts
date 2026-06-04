import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { PROCUREMENT_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";

interface Response {
    message: string;
    status: number;
    data: any;
}

export const useDeleteCategoryApi = () => {
    const axiosInstance = useAxios();
    const qc = useQueryClient();

    return useMutation<Response, Error, { categoryId: string }>({
        mutationFn: async ({ categoryId }) => {
            const res = await axiosInstance.delete(PROCUREMENT_KEYS.CATEGORY(categoryId));
            return res.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [QUERY_KEYS.EXPENSE_CATEGORIES] });
            qc.invalidateQueries({ queryKey: [QUERY_KEYS.PROCUREMENT_CATEGORIES] });
        },
    });
};
