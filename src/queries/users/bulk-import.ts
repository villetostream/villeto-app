import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";

interface BulkImportResponse {
    message: string;
    status: number;
    data: unknown;
}

export const useBulkImportApi = () => {
    const axiosInstance = useAxios();
    const queryClient = useQueryClient();

    return useMutation<BulkImportResponse, Error, File>({
        retry: false,
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            const res = await axiosInstance.post(API_KEYS.COMPANY.BULK_IMPORT, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
        },
    });
};
