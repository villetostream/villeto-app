
import { type UseMutationResult, useMutation } from "@tanstack/react-query";

import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";

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

    return useMutation<Response, Error, payload>({
        retry: false,
        mutationFn: async (payload: payload) => {
            const res = await axiosInstance.post(API_KEYS.COMPANY.BULK_IMPORT, payload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return res.data;
        },
    });
};
