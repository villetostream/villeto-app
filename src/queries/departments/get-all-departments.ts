import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import { User } from "@/features/auth/types";


interface Response {
    data: Department[]
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

export interface AppUser {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    status?: string;
    loginCount?: number;
    department?: any;
    departmentId?: string;
    position?: string;
    jobTitle?: string;
    manager?: any;
    villetoRole?: any;
    role?: any;
    companyRole?: any;
    companyRoles?: any[];
    employeeExternalId?: string;
    businessUnit?: string;
    location?: string;
    managementLevel?: string;
    jobGrade?: string;
    employmentType?: string;
    employeeStatus?: string;
    cardIssued?: boolean;
}

export interface Meta {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
}
export interface Department {
    name: string;
    departmentName?: string;
    departmentId: string;
    description: string;
    isActive: boolean;
    totalAssignedUsers: number;
    departmentHead: User;
    createdAt: Date;
    updatedAt: Date;
    code?: string;
    head?: any;
    manager?: any;
    members?: any[];
}

export const useGetAllDepartmentsApi = (
    options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();

    return useQuery<Response, Error>({
        queryKey: QUERY_KEYS.people.departments,
        queryFn: async () => {
            const apiUrl = `${API_KEYS.DEPARTMENT.DEPARTMENTS}`;
            const response = await axiosInstance.get(apiUrl);
            return response.data;
        },
        staleTime: STALE_TIMES.SLOW,
        ...options,
    });
};
