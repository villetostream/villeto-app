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

    return useMutation<BulkImportResponse, Error, { file: File; duplicateStrategy?: "skip_existing" | "update_existing" }>({
        retry: false,
        mutationFn: async ({ file, duplicateStrategy }) => {
            const formData = new FormData();
            formData.append("file", file);
            const url = API_KEYS.COMPANY.BULK_IMPORT(duplicateStrategy);
            const res = await axiosInstance.post(url, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DIRECTORY_USERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVITED_USERS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.UNINVITED_USERS] });
        },
    });
};
