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
        staleTime: STALE_TIMES.STATIC,
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
            const results: CapabilityGroup[] = [];
            for (const mod of modules) {
                try {
                    const r = await axiosInstance.get<Response>(API_KEYS.ROLE.ROLES_CAPABILITIES(mod));
                    results.push(...(r.data.data ?? []));
                } catch (_e) {
                    // fall back to empty array for this module if it fails
                }
            }
            return results;
        },
        staleTime: STALE_TIMES.STATIC,
        enabled,
    });
};
