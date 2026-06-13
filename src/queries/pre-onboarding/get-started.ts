import type { z } from "zod";
import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { registrationSchema } from "@/lib/schemas/schemas";


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

type payload = z.infer<typeof registrationSchema>

export const useStartOnboardingApi = (): UseMutationResult<Response, Error, payload> => {
    const axiosInstance = useAxios();

    return useMutation<Response, Error, payload>({
        retry: false,
        mutationFn: async (payload: payload) => {
            const res = await axiosInstance.post(API_KEYS.ONBOARDING.START_ONBOARDING, payload,);
            return res.data;
        },
    });
};
