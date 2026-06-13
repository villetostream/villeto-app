
import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";
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
    totalCount: number,
    totalPages: number,
    currentPage: number,
    limit: number
}

/** Generic base hook — kept for any consumer that still calls it directly */
export const useGetAllUsersApi = (
    options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();

    return useQuery<Response, Error>({
        queryKey: [QUERY_KEYS.USERS],
        queryFn: async () => {
            const apiUrl = `${API_KEYS.USER.USERS}`;
            const response = await axiosInstance.get(apiUrl);
            return response.data;
        },
        staleTime: 0,
        ...options,
    });
};

/** Fetches users where invited=true — used by AllUsersTab (Invited Users) */
export const useGetInvitedUsersApi = (
    options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();

    return useQuery<Response, Error>({
        queryKey: [QUERY_KEYS.INVITED_USERS],
        queryFn: async () => {
            const response = await axiosInstance.get(API_KEYS.USER.INVITED_USERS);
            return response.data;
        },
        staleTime: 0,
        ...options,
    });
};

/** Fetches users where invited=false — used by DirectoryTab */
export const useGetDirectoryUsersApi = (
    options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();

    return useQuery<Response, Error>({
        queryKey: [QUERY_KEYS.DIRECTORY_USERS],
        queryFn: async () => {
            const response = await axiosInstance.get(API_KEYS.USER.DIRECTORY_USERS);
            return response.data;
        },
        staleTime: 0,
        ...options,
    });
};

/** Fetches users where invited=false — used by Invite forms */
export const useGetUninvitedUsersApi = (
    options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();

    return useQuery<Response, Error>({
        queryKey: [QUERY_KEYS.UNINVITED_USERS],
        queryFn: async () => {
            const response = await axiosInstance.get(API_KEYS.USER.UNINVITED_USERS);
            return response.data;
        },
        staleTime: 0,
        ...options,
    });
};