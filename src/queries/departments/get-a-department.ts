
import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";
import { Department } from "./get-all-departments";


interface Response {
    data: Department
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
type Payload = number | string;

export const useGetADepartmentApi = (
    payload: Payload,
    options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios(); // 

    return useQuery<Response, Error>({
        queryKey: [QUERY_KEYS.DEPARTMENT, payload],
        queryFn: async () => {
            const apiUrl = `${API_KEYS.DEPARTMENT.DEPARTMENTS}${payload}`;
            const response = await axiosInstance.get(apiUrl);
            return response.data;
        },
        staleTime: 0,
        ...options,
    });
};