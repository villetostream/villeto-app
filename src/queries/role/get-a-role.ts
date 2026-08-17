import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import { Role } from "./get-all-roles";

interface Response {
    data: Role
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
type Payload = string | number;

export const useGetARoleApi = (
    payload: Payload,
    options?: Omit<UseQueryOptions<Response, Error>, "queryKey" | "queryFn">
): UseQueryResult<Response, Error> => {
    const axiosInstance = useAxios();

    return useQuery<Response, Error>({
        queryKey: QUERY_KEYS.people.role(payload as string),
        queryFn: async () => {
            const apiUrl = API_KEYS.ROLE.ROLE_DETAIL(payload.toString());
            const response = await axiosInstance.get(apiUrl);
            return response.data;
        },
        staleTime: STALE_TIMES.STATIC,
        ...options,
    });
};