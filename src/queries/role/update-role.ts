import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { RoleFormData } from "@/lib/schemas/schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { useAuthStore } from "@/stores/auth-stores";

export const useUpdateRoleApi = () => {
    const axiosInstance = useAxios();
    const queryClient = useQueryClient();

    return useMutation<Response, Error, { id: string; data: RoleFormData }>({
        retry: false,
        mutationFn: async ({ id, data }) => {
            const res = await axiosInstance.patch(API_KEYS.ROLE.ROLE_DETAIL(id), data);
            return res.data;
        },
        onSuccess: async (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.role(variables.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.roles });
            
            // Reactively update current user's permissions if they modified their own role
            const { user, login, setCompanyPermissions } = useAuthStore.getState();
            if (!user) return;
            
            const currentUserRoleId = (user.companyRole as any)?.id || user.companyRole?.roleId;
            if (currentUserRoleId === variables.id) {
                try {
                    const me = await axiosInstance.get(API_KEYS.USER.ME);
                    const responseData = me?.data?.data || me?.data;
                    if (responseData) {
                        const { role, _company, companyId, ...userData } = responseData;
                        const newCompanyRole = role || userData.companyRole || user.companyRole;
                        const newCompanyRolePermissions = newCompanyRole?.permissions || [];
                        
                        login({
                            ...user,
                            ...userData,
                            companyRole: newCompanyRole
                        });
                        setCompanyPermissions(newCompanyRolePermissions);
                    }
                } catch (error) {
                    console.error("Failed to refresh user profile after role update:", error);
                }
            }
        },
    });
};