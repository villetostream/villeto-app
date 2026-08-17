import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { RoleFormData } from "@/lib/schemas/schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/lib/query/keys";

export const useCreateRoleApi = () => {
    const axiosInstance = useAxios();
    const queryClient = useQueryClient();

    return useMutation<Response, Error, RoleFormData>({
        retry: false,
        mutationFn: async (payload: RoleFormData) => {
            const res = await axiosInstance.post(API_KEYS.ROLE.ROLES, payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.roles });
        },
    });
};
