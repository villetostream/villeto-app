import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { RoleFormData } from "@/lib/schemas/schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/lib/query/keys";

export const useUpdateRoleApi = () => {
    const axiosInstance = useAxios();
    const queryClient = useQueryClient();

    return useMutation<Response, Error, { id: string; data: RoleFormData }>({
        retry: false,
        mutationFn: async ({ id, data }) => {
            const res = await axiosInstance.patch(API_KEYS.ROLE.ROLE_DETAIL(id), data);
            return res.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.role(variables.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.roles });
        },
    });
};