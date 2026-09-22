import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import { CapabilityGroup } from "./get-all-roles";

interface Response {
    data: CapabilityGroup[];
    message: string;
    status: number;
}

export const useGetRoleCapabilitiesApi = (
    module: string,
    options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();
    return useQuery<Response, Error>({
        queryKey: ["role-capabilities", module],
        queryFn: async () => {
            const response = await axiosInstance.get(API_KEYS.ROLE.ROLES_CAPABILITIES(module));
            return response.data;
        },
        staleTime: STALE_TIMES.STATIC,
        ...options,
    });
};

/**
 * Fetches capabilities for ALL supported modules in one shot.
 * Returns a flat array of all capability groups.
 */
export const useGetAllRoleCapabilitiesApi = (
    enabled = true
) => {
    const axiosInstance = useAxios();
    return useQuery<CapabilityGroup[], Error>({
        queryKey: ["role-capabilities-all"],
        queryFn: async () => {
            const response = await axiosInstance.get<Response>(API_KEYS.ROLE.ROLES_CAPABILITY_CATALOG);
            return (response.data.data as CapabilityGroup[]) ?? [];
        },
        staleTime: STALE_TIMES.STATIC,
        enabled: !!enabled,
    });
};
