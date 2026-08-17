import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";

interface UpdateCapabilitiesPayload {
    roleId: string;
    capabilityGroupKeys: string[];
}

interface Response {
    message: string;
    status: number;
    data: unknown;
}

export const useUpdateRoleCapabilitiesApi = () => {
    const axiosInstance = useAxios();
    const queryClient = useQueryClient();

    return useMutation<Response, Error, UpdateCapabilitiesPayload>({
        retry: false,
        mutationFn: async ({ roleId, capabilityGroupKeys }) => {
            const res = await axiosInstance.patch(
                API_KEYS.ROLE.ROLE_CAPABILITIES(roleId),
                { capabilityGroupKeys }
            );
            return res.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.role(variables.roleId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.roles });
            // Invalidate all capability group queries across modules
            queryClient.invalidateQueries({ queryKey: ["people", "roles", "capabilities"] });
        },
    });
};
