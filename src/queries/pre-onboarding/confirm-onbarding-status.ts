import type { z } from "zod";
import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { Onboarding } from "./get-onboarding-details";
import { emailSchema } from "@/lib/schemas/schemas";


interface Response {
    data: Onboarding
}

type payload = z.infer<typeof emailSchema>

export const useConfirmationOnboardingApi = (): UseMutationResult<Response, Error, payload> => {
    const axiosInstance = useAxios();

    return useMutation<Response, Error, payload>({
        retry: false,
        mutationFn: async (payload: payload) => {
            const res = await axiosInstance.post(API_KEYS.ONBOARDING.ACCOUNT_CONFIRMATION, payload,);
            return res.data;
        },
    });
};
