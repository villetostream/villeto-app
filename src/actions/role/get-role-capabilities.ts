import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { CapabilityGroup } from "./get-all-roles";

interface Response {
    data: CapabilityGroup[];
    message: string;
    status: number;
}

export const SUPPORTED_MODULES = ["expense", "procurement", "company", "vendor", "policy", "department"] as const;
export type SupportedModule = typeof SUPPORTED_MODULES[number];

export const useGetRoleCapabilitiesApi = (
    module: SupportedModule,
    options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();
    return useQuery<Response, Error>({
        queryKey: ["role-capabilities", module],
        queryFn: async () => {
            const response = await axiosInstance.get(API_KEYS.ROLE.ROLES_CAPABILITIES(module));
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};

/**
 * Fetches capabilities for ALL supported modules in one shot.
 * Returns a flat array of all capability groups.
 */
export const useGetAllRoleCapabilitiesApi = (
    modules: SupportedModule[] = [...SUPPORTED_MODULES],
    enabled = true
) => {
    const axiosInstance = useAxios();
    return useQuery<CapabilityGroup[], Error>({
        queryKey: ["role-capabilities-all", modules],
        queryFn: async () => {
            const results = await Promise.all(
                modules.map((mod) =>
                    axiosInstance
                        .get<Response>(API_KEYS.ROLE.ROLES_CAPABILITIES(mod))
                        .then((r) => r.data.data ?? [])
                        .catch(() => [] as CapabilityGroup[])
                )
            );
            return results.flat();
        },
        staleTime: 5 * 60 * 1000,
        enabled,
    });
};
