import type { z } from "zod";
import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { otpVerificationSchema } from "@/lib/schemas/schemas";
import { Onboarding } from "./get-onboarding-details";

interface Response {
    data: Onboarding;
}

type Payload = z.infer<typeof otpVerificationSchema>;

export const useVerifyOtpApi = (): UseMutationResult<Response, Error, Payload> => {
    const axiosInstance = useAxios();

    return useMutation<Response, Error, Payload>({
        retry: false,
        mutationFn: async (payload: Payload) => {
            const res = await axiosInstance.post(API_KEYS.ONBOARDING.EXISTING_ONBOARDING, payload, { _skipErrorToast: true });
            return res.data;
        },
    });
};
