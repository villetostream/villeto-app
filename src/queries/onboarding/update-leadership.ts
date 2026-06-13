import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { useOnboardingStore } from "@/stores/useVilletoStore";


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


export type LeaderShipPayload = {
    "businessOwners":
    {
        "firstName": string,
        "lastName": string,
        "email": string,
        phone?: string | null,
        "ownershipPercentage": number
    }[]
    ,
    "officers"?:
    {
        "firstName": string,
        "lastName": string,
        "email": string,
        phone?: string | null,

    }[]

}


export const useUpdateOnboardingLeadersApi = (): UseMutationResult<Response, Error, LeaderShipPayload> => {
    const axiosInstance = useAxios();

    return useMutation<Response, Error, LeaderShipPayload>({
        retry: false,
        mutationFn: async (payload: LeaderShipPayload) => {
            const { onboardingId } = useOnboardingStore.getState();
            const res = await axiosInstance.patch(API_KEYS.ONBOARDING.ONBOARDING_LEADERS(onboardingId), payload,);
            return res.data;
        },
    });
};
