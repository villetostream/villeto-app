
import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import { AppUser } from "../departments/get-all-departments";

interface Response {
    data: AppUser[]
    meta: Meta;
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

export interface Meta {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
}

export interface UserListParams {
    page?: number;
    limit?: number;
    invited?: boolean;
    status?: string;
    employeeStatus?: string;
    search?: string;
    roleId?: string;
    departmentId?: string;
}

export interface UseUserListOptions extends Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn"> {
    params?: UserListParams;
}

/** Generic base hook — kept for any consumer that still calls it directly */
export const useGetAllUsersApi = (
    options?: UseUserListOptions
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();

    return useQuery<Response, Error>({
        queryKey: [QUERY_KEYS.USERS, options?.params],
        queryFn: async () => {
            const apiUrl = `${API_KEYS.USER.USERS}`;
            const response = await axiosInstance.get(apiUrl, { params: options?.params });
            return response.data;
        },
        staleTime: STALE_TIMES.NORMAL,
        ...options,
    });
};

/** Fetches users where invited=true — used by AllUsersTab (Invited Users) */
export const useGetInvitedUsersApi = (
    options?: UseUserListOptions
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();

    return useQuery<Response, Error>({
        queryKey: [QUERY_KEYS.INVITED_USERS, options?.params],
        queryFn: async () => {
            const response = await axiosInstance.get(API_KEYS.USER.INVITED_USERS, { params: options?.params });
            return response.data;
        },
        staleTime: STALE_TIMES.NORMAL,
        ...options,
    });
};

/** Fetches users where invited=false — used by DirectoryTab */
export const useGetDirectoryUsersApi = (
    options?: UseUserListOptions
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();

    return useQuery<Response, Error>({
        queryKey: [QUERY_KEYS.DIRECTORY_USERS, options?.params],
        queryFn: async () => {
            const response = await axiosInstance.get(API_KEYS.USER.DIRECTORY_USERS, { params: options?.params });
            return response.data;
        },
        staleTime: STALE_TIMES.NORMAL,
        ...options,
    });
};

/** Fetches users where invited=false — used by Invite forms */
export const useGetUninvitedUsersApi = (
    options?: UseUserListOptions
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();

    return useQuery<Response, Error>({
        queryKey: [QUERY_KEYS.UNINVITED_USERS, options?.params],
        queryFn: async () => {
            const response = await axiosInstance.get(API_KEYS.USER.UNINVITED_USERS, { params: options?.params });
            return response.data;
        },
        staleTime: STALE_TIMES.NORMAL,
        ...options,
    });
};