import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";


export interface Permission {
    createdAt: Date,
    updatedAt?: Date,
    deletedAt?: Date | null,
    permissionId: string,
    name: string,
    description: string,
    resource: string,
    action: string,
    enabled?: boolean
}



interface Response {
    data: Permission[]
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


export const useGetAllPermissionsApi = (

    options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios(); // 

    return useQuery<Response, Error>({
        queryKey: [QUERY_KEYS.PERMISSIONS],
        queryFn: async () => {
            const apiUrl = `${API_KEYS.AUTH.PERMISSIONS}`;
            const response = await axiosInstance.get(apiUrl);
            return response.data;
        },
        staleTime: 0,
        ...options,
    });
};