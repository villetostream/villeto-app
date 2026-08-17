import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import type { Permission } from "@/features/auth/types";
import { AppUser } from "../departments/get-all-departments";

// ── Shared types ───────────────────────────────────────────────────────────

export interface PaginationMeta {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
}

export interface CapabilityGroupPermission {
    permissionId: string;
    name: string;
    description: string;
    resource: string;
    action: string;
}

export interface CapabilityGroup {
    capabilityGroupId: string;
    key: string;
    name: string;
    description: string;
    module: string;
    sortOrder: number;
    isActive: boolean;
    permissions: CapabilityGroupPermission[];
}

export interface CapabilitiesByModule {
    [module: string]: {
        capabilityGroups: CapabilityGroup[];
    };
}

export interface Role {
    roleId: string;
    name: string;
    description?: string;
    isActive: boolean;
    permissions: Permission[];
    createdAt: Date;
    updatedAt: Date;
    totalAssignedUsers?: number;
    createdBy?: AppUser;
    templateKey?: string | null;
    source?: string;
    isDefault?: boolean;
    capabilityGroupKeys?: string[];
    capabilitiesByModule?: CapabilitiesByModule;
}

// ── Response shape ─────────────────────────────────────────────────────────

interface PaginatedRolesResponse {
    data: Role[];
    meta: PaginationMeta;
    message: string;
    status: number;
    statusCode: number;
    statusText: string;
}

// ── Params ─────────────────────────────────────────────────────────────────

export interface GetRolesParams {
    page?: number;
    limit?: number;
}

// ── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Fetches a paginated list of all roles.
 * GET /roles?page=1&limit=20
 */
async function fetchAllRolesLoop(axiosInstance: any, apiUrl: string, page: number, limit: number) {
    if (limit !== 1000) {
        const response = await axiosInstance.get(apiUrl);
        return response.data;
    }

    // Intercept limit=1000 and fetch all pages
    const firstUrl = API_KEYS.ROLE.ROLES_LIST(1, 100);
    const response = await axiosInstance.get(firstUrl);
    const firstPageData = response.data;
    
    const totalPages = firstPageData?.meta?.totalPages || 1;
    let allData = firstPageData?.data || [];
    
    if (totalPages > 1) {
        const promises = [];
        for (let i = 2; i <= totalPages; i++) {
            promises.push(axiosInstance.get(API_KEYS.ROLE.ROLES_LIST(i, 100)));
        }
        const results = await Promise.all(promises);
        results.forEach(res => {
            if (res.data?.data) {
                allData = [...allData, ...res.data.data];
            }
        });
    }
    
    return {
        ...firstPageData,
        data: allData,
        meta: {
            ...firstPageData.meta,
            totalCount: allData.length,
            limit: allData.length,
            totalPages: 1,
            currentPage: 1
        }
    };
}

export const useGetAllRolesApi = (
    { page = 1, limit = 20 }: GetRolesParams = {},
    options?: Omit<UseQueryOptions<PaginatedRolesResponse, Error>, "queryKey" | "queryFn">
): UseQueryResult<PaginatedRolesResponse, Error> => {
    const axiosInstance = useAxios();

    return useQuery<PaginatedRolesResponse, Error>({
        queryKey: [...QUERY_KEYS.people.roles, { page, limit }],
        queryFn: async () => {
            return fetchAllRolesLoop(axiosInstance, API_KEYS.ROLE.ROLES_LIST(page, limit), page, limit);
        },
        staleTime: STALE_TIMES.STATIC,
        ...options,
    });
};

/**
 * Fetches a paginated list of company-specific roles.
 * GET /roles?page=1&limit=100&type=company
 *
 * Uses a high limit (100) by default since this list feeds dropdowns —
 * callers that need real pagination can pass explicit page/limit.
 */
export const useGetCompanyRolesApi = (
    { page = 1, limit = 100 }: GetRolesParams = {},
    options?: Omit<UseQueryOptions<PaginatedRolesResponse, Error>, "queryKey" | "queryFn">
): UseQueryResult<PaginatedRolesResponse, Error> => {
    const axiosInstance = useAxios();

    return useQuery<PaginatedRolesResponse, Error>({
        queryKey: [...QUERY_KEYS.people.roles, { page, limit }],
        queryFn: async () => {
            const response = await axiosInstance.get(API_KEYS.ROLE.ROLES_COMPANY(page, limit));
            return response.data;
        },
        staleTime: STALE_TIMES.STATIC,
        ...options,
    });
};

/**
 * @deprecated  Use useGetCompanyRolesApi instead.
 * Kept for backward compatibility while callers are migrated.
 */
export const useGetVilletoRolesApi = (
    params: GetRolesParams = {},
    options?: Omit<UseQueryOptions<PaginatedRolesResponse, Error>, "queryKey" | "queryFn">
): UseQueryResult<PaginatedRolesResponse, Error> => {
    return useGetCompanyRolesApi(params, options);
};