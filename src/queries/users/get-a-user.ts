
import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";
import { AppUser } from "../departments/get-all-departments";

interface Response {
    data: AppUser
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
type Payload = string | number


export const useGetAUsersApi = (
    payload: Payload,
    options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();

    return useQuery<Response, Error>({
        queryKey: [QUERY_KEYS.USER, payload],
        queryFn: async () => {
            const apiUrl = `${API_KEYS.USER.USERS}${payload}`;
            const response = await axiosInstance.get(apiUrl);
            return response.data;
        },
        staleTime: 0,
        ...options,
    });
};