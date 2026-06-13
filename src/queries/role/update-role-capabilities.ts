import { useMutation } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";

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

    return useMutation<Response, Error, UpdateCapabilitiesPayload>({
        retry: false,
        mutationFn: async ({ roleId, capabilityGroupKeys }) => {
            const res = await axiosInstance.patch(
                API_KEYS.ROLE.ROLE_CAPABILITIES(roleId),
                { capabilityGroupKeys }
            );
            return res.data;
        },
    });
};
