
import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
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

async function fetchAllUsersLoop(axiosInstance: any, apiUrl: string, params: any) {
    if (params?.limit !== 1000) {
        const response = await axiosInstance.get(apiUrl, { params });
        return response.data;
    }

    // Intercept limit=1000 and fetch all pages
    const fetchParams = { ...params, page: 1, limit: 100 };
    const response = await axiosInstance.get(apiUrl, { params: fetchParams });
    const firstPageData = response.data;
    
    const totalPages = firstPageData?.meta?.totalPages || 1;
    let allData = firstPageData?.data || [];
    
    if (totalPages > 1) {
        const promises = [];
        for (let i = 2; i <= totalPages; i++) {
            promises.push(axiosInstance.get(apiUrl, { params: { ...fetchParams, page: i } }));
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

/** Generic base hook — kept for any consumer that still calls it directly */
export const useGetAllUsersApi = (
    options?: UseUserListOptions
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();

    return useQuery<Response, Error>({
        queryKey: [...QUERY_KEYS.people.users(), options?.params],
        queryFn: async () => {
            const apiUrl = `${API_KEYS.USER.USERS}`;
            return fetchAllUsersLoop(axiosInstance, apiUrl, options?.params);
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
        queryKey: [...QUERY_KEYS.people.invitedUsers, options?.params],
        queryFn: async () => {
            return fetchAllUsersLoop(axiosInstance, API_KEYS.USER.INVITED_USERS, options?.params);
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
        queryKey: [...QUERY_KEYS.people.directoryUsers, options?.params],
        queryFn: async () => {
            return fetchAllUsersLoop(axiosInstance, API_KEYS.USER.DIRECTORY_USERS, options?.params);
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
        queryKey: [...QUERY_KEYS.people.uninvitedUsers, options?.params],
        queryFn: async () => {
            return fetchAllUsersLoop(axiosInstance, API_KEYS.USER.UNINVITED_USERS, options?.params);
        },
        staleTime: STALE_TIMES.NORMAL,
        ...options,
    });
};

/** Fetches users for the split expense flow */
export const useGetSplitExpenseUsersApi = (
    options?: UseUserListOptions
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();

    return useQuery<Response, Error>({
        queryKey: [...QUERY_KEYS.people.users(), "split-expense", options?.params],
        queryFn: async () => {
            return fetchAllUsersLoop(axiosInstance, API_KEYS.USER.SPLIT_EXPENSE_USERS, options?.params);
        },
        staleTime: STALE_TIMES.NORMAL,
        ...options,
    });
};