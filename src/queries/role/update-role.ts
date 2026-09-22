import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { invalidateAuthorization } from "@/features/auth/authorization";

export interface UpdateRolePayload {
    name?: string;
    description?: string;
    isActive?: boolean;
}

export const useUpdateRoleApi = () => {
    const axiosInstance = useAxios();
    const queryClient = useQueryClient();

    return useMutation<Response, Error, { id: string; data: UpdateRolePayload }>({
        retry: false,
        mutationFn: async ({ id, data }) => {
            const res = await axiosInstance.patch(API_KEYS.ROLE.ROLE_DETAIL(id), data);
            return res.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.role(variables.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.roles });
            invalidateAuthorization();
        },
    });
};
