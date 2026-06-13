import { z } from "zod";
import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { loginSchema } from "@/lib/schemas/schemas";
import { User } from "@/stores/auth-stores";


interface Response {
    data: {
        accessToken: string,
        user: User,
    }
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


type payload = z.infer<typeof loginSchema>

export const useLogin = (): UseMutationResult<Response, Error, payload> => {
    const axiosInstance = useAxios();
    return useMutation<Response, Error, payload>({
        retry: false,
        mutationFn: async (payload: payload) => {

            const res = await axiosInstance.post(API_KEYS.AUTH.LOGIN, payload,);
            return res.data;
        },
    });
};
