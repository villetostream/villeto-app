import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { RoleFormData } from "@/lib/schemas/schemas";
import { useMutation } from "@tanstack/react-query";

export const useUpdateRoleApi = () => {
    const axiosInstance = useAxios();

    return useMutation<Response, Error, { id: string; data: RoleFormData }>({
        retry: false,
        mutationFn: async ({ id, data }) => {
            const res = await axiosInstance.patch(`${API_KEYS.ROLE.ROLES}${id}`, data);
            return res.data;
        },
    });
};