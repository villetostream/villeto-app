import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { PROCUREMENT_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";

interface Response {
    message: string;
    status: number;
    data: unknown;
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
            qc.invalidateQueries({ queryKey: QUERY_KEYS.expenses.categories });
            qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.categories });
        },
    });
};
