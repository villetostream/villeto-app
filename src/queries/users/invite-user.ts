import { useMutation } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { UserFormData } from "@/lib/schemas/schemas";




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

export const useInviteUserApi = () => {
    const axiosInstance = useAxios();

    return useMutation<Response, Error, UserFormData>({
        retry: false,
        mutationFn: async (payload: UserFormData) => {
            const res = await axiosInstance.post(API_KEYS.USER.INVITEUSER, payload);
            return res.data;
        },
    });
};