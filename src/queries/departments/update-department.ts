import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { CreateDepartmentPayload } from "./create-department";
import { QUERY_KEYS } from "@/shared/lib/query/keys";


export interface Response {
    data: {
        [key: string]: string | number | boolean;
    };
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

export const useUpdateDepartmentApi = () => {
    const axiosInstance = useAxios();
    const queryClient = useQueryClient();

    return useMutation<Response, Error, CreateDepartmentPayload>({
        retry: false,
        mutationFn: async (payload: CreateDepartmentPayload) => {
            const { id, ...latestPayload } = payload;
            const res = await axiosInstance.patch(`${API_KEYS.DEPARTMENT.DEPARTMENTS}${id}`, latestPayload);
            return res.data;
        },
        onSuccess: (_data, variables) => {
            if (variables.id) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.department(variables.id) });
            }
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.departments });
        }
    });
};