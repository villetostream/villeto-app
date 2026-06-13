import {
    useQuery,
    UseQueryOptions,
    type UseQueryResult,
} from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";
import { API_KEYS } from "@/lib/constants/apis";

interface Company {
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    companyId: string;
    contactEmail: string;
    contactPhone: string;
    contactFirstName: string;
    contactLastName: string;
    companyName: string;
    businessName: string | null;
    taxId: string | null;
    registrationId: string | null;
    websiteUrl: string | null;
    address: string | null;
    accountType: "demo" | "enterprise";
    description: string | null;
    logo?: string | null;
    logoUrl?: string | null;
    owners?:
    {
        "createdAt": "2025-11-10T22:37:30.363Z",
        "updatedAt": "2025-11-10T22:37:31.555Z",
        "deletedAt": null,
        "ownerId": "854df350-45b9-48c3-a240-16bb029e8b1d",
        "ownershipPercentage": 24,
        user: {
            createdAt: "2025-11-10T22:37:30.363Z",
            updatedAt: "2025-11-10T22:37:30.363Z",
            deletedAt?: Date,
            userId: string,
            firstName: string,
            lastName: string,
            email: string,
            password?: string,
            loginCount: number,
            isActive: boolean,
            phone?: string,
            role: string
        }
    }[],
    controllingOfficers?: {
        "createdAt": "2025-11-10T22:37:30.363Z",
        "updatedAt": "2025-11-10T22:37:31.555Z",
        "deletedAt": null,
        "controllingOfficerId": "854df350-45b9-48c3-a240-16bb029e8b1d",
        user: {
            createdAt: "2025-11-10T22:37:30.363Z",
            updatedAt: "2025-11-10T22:37:30.363Z",
            deletedAt?: Date,
            userId: string,
            firstName: string,
            lastName: string,
            email: string,
            password?: string,
            loginCount: number,
            isActive: boolean,
            phone?: string,
            role: string
        }
    }[]
    "productModules"?: string[],
    "spendLimit"?: {
        "lower": number,
        "upper": number
    },
    "countryOfRegistration": string | null,
}

export interface Onboarding {
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    onboardingId: string;
    status: boolean;
    step: number;
    company: Company;
}

type Response = { data: Onboarding };



type Payload = string
export const useGetOnboardingDetailsApi = (
    payload: Payload,
    options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios(); // 

    return useQuery<Response, Error>({
        queryKey: [QUERY_KEYS.ONBOARDINGDETAILS, payload],
        queryFn: async () => {
            const apiUrl = `${API_KEYS.ONBOARDING.ONBOARDING}/${payload}`;
            const response = await axiosInstance.get(apiUrl);
            return response.data;
        },
        staleTime: 0,
        ...options,
    });
};

