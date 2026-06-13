import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { RoleFormData } from "@/lib/schemas/schemas";
import { useMutation } from "@tanstack/react-query";

export const useCreateRoleApi = () => {
    const axiosInstance = useAxios();

    return useMutation<Response, Error, RoleFormData>({
        retry: false,
        mutationFn: async (payload: RoleFormData) => {
            const res = await axiosInstance.post(API_KEYS.ROLE.ROLES, payload);
            return res.data;
        },
    });
};
