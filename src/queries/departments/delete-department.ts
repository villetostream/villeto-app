import { useMutation } from "@tanstack/react-query";
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

type Payload = number | string

export const useDeleteDepartmentApi = () => {
    const axiosInstance = useAxios();

    return useMutation<Response, Error, Payload>({
        retry: false,
        mutationFn: async (payload: Payload) => {
            const res = await axiosInstance.delete(`${API_KEYS.DEPARTMENT.DEPARTMENTS}${payload}`);
            return res.data;
        },
    });
};