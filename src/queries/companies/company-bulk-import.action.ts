
import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";

interface Response {
    data: {
        [key: string]: string | number | boolean;
    };
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

type payload = FormData;

export const useCompanyBulkImportApi = (): UseMutationResult<Response, Error, payload> => {
    const axiosInstance = useAxios();
    const queryClient = useQueryClient();

    return useMutation<Response, Error, payload>({
        retry: false,
        mutationFn: async (payload: payload) => {
            const res = await axiosInstance.post(API_KEYS.COMPANY.BULK_IMPORT(), payload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.users() });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.directoryUsers });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.invitedUsers });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.uninvitedUsers });
        },
    });
};
