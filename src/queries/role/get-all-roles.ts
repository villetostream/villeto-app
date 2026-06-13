
import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";
import { Permission } from "../auth/auth-permissions";
import { AppUser } from "../departments/get-all-departments";
import { Meta } from "../users/get-all-users";


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
    roleId: string,
    name: string,
    description?: string,
    isActive: boolean,
    permissions: Permission[],
    createdAt: Date,
    updatedAt: Date,
    totalAssignedUsers?: number,
    createdBy?: AppUser,
    // New fields from roles?type=company
    templateKey?: string | null,
    source?: string,
    isDefault?: boolean,
    capabilityGroupKeys?: string[],
    capabilitiesByModule?: CapabilitiesByModule,
}
interface Response {
    data: Role[]
    meta: Meta
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


export const useGetAllRolesApi = (

    options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios(); // 

    return useQuery<Response, Error>({
        queryKey: [QUERY_KEYS.ROLES],
        queryFn: async () => {
            const apiUrl = `${API_KEYS.ROLE.ROLES}`;
            const response = await axiosInstance.get(apiUrl);
            return response.data;
        },
        staleTime: 0,
        ...options,
    });
};

export const useGetCompanyRolesApi = (
    options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();
    return useQuery<Response, Error>({
        queryKey: [QUERY_KEYS.ROLES, "company"],
        queryFn: async () => {
            const response = await axiosInstance.get(API_KEYS.ROLE.ROLES_COMPANY);
            return response.data;
        },
        staleTime: 0,
        ...options,
    });
};

export const useGetVilletoRolesApi = (
    options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();
    return useQuery<Response, Error>({
        queryKey: [QUERY_KEYS.ROLES, "company"], // align cache key with the new endpoint logic if needed
        queryFn: async () => {
            const response = await axiosInstance.get(API_KEYS.ROLE.ROLES_COMPANY); // Changed from ROLES_VILLETO
            return response.data;
        },
        staleTime: 0,
        ...options,
    });
};