import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import { Permission } from "../auth/auth-permissions";
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
export const useGetAllRolesApi = (
    { page = 1, limit = 20 }: GetRolesParams = {},
    options?: Omit<UseQueryOptions<PaginatedRolesResponse, Error>, "queryKey" | "queryFn">
): UseQueryResult<PaginatedRolesResponse, Error> => {
    const axiosInstance = useAxios();

    return useQuery<PaginatedRolesResponse, Error>({
        queryKey: [QUERY_KEYS.ROLES, { page, limit }],
        queryFn: async () => {
            const response = await axiosInstance.get(API_KEYS.ROLE.ROLES_LIST(page, limit));
            return response.data;
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
        queryKey: [QUERY_KEYS.ROLES, { page, limit }],
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