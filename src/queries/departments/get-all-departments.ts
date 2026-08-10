
import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import { Role } from "../role/get-all-roles";
import { Meta } from "../users/get-all-users";


import { User } from "@/features/auth/types";

export type AppUser = User;

export interface Department {
    departmentId: string;
    departmentExternalId?: string | null;
    departmentName: string;
    description?: string | null;
    departmentHeadId?: string | null;
    departmentHeadName?: string | null;
    parentDepartmentId?: string | null;
    isActive: string;
    head?: AppUser | null;
    manager?: AppUser | null;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    
    // Optional legacy fields to avoid breaking changes
    code?: string | null;
    company?: string | null;
    members?: AppUser[];
}
interface Response {
    data: Department[]
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


export const useGetAllDepartmentsApi = (

    options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios(); // 

    return useQuery<Response, Error>({
        queryKey: [QUERY_KEYS.DEPARTMENTS],
        queryFn: async () => {
            const apiUrl = `${API_KEYS.DEPARTMENT.DEPARTMENTS}`;
            const response = await axiosInstance.get(apiUrl);
            return response.data;
        },
        staleTime: STALE_TIMES.SLOW,
        ...options,
    });
};