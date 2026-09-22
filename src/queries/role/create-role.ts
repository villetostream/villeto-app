import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import type { RoleCapabilityInput } from "./get-all-roles";

export interface CreateRolePayload {
    name: string;
    description?: string;
    capabilities: RoleCapabilityInput[];
}

export const useCreateRoleApi = () => {
    const axiosInstance = useAxios();
    const queryClient = useQueryClient();

    return useMutation<Response, Error, CreateRolePayload>({
        retry: false,
        mutationFn: async (payload: CreateRolePayload) => {
            const res = await axiosInstance.post(API_KEYS.ROLE.ROLES, payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.roles });
        },
    });
};
