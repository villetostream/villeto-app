
import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";
import { Role } from "../role/get-all-roles";
import { Meta } from "../users/get-all-users";


export interface Department {
    departmentId: string;
    departmentName: string;
    description?: string | null;
    code?: string | null;
    isActive?: boolean | null;
    company?: string | null;
    head?: AppUser;
    manager?: AppUser;
    members?: AppUser[];
    createdAt?: string | null;
    updatedAt?: string | null;
    deletedAt?: string | null;
}

export interface AppUser {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    password?: string | null;
    loginCount?: number | null;
    isActive?: boolean | null;
    status?: string | null;
    phone?: string | null;
    ownershipPercentage?: number | null;
    company?: string | null;
    companyId?: string | null;
    department?: string | null;
    departmentId?: string | null;
    villetoRole?: Role
    role?: Role
    position?: string | null;
    cardIssued?: boolean
    jobTitle?: string
    manager?: AppUser | null;
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
        staleTime: 0,
        ...options,
    });
};