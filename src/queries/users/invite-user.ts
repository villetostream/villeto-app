import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { UserFormData } from "@/lib/schemas/schemas";
import { QUERY_KEYS } from "@/shared/lib/query/keys";




interface Response {
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

export const useInviteUserApi = () => {
    const axiosInstance = useAxios();
    const queryClient = useQueryClient();

    return useMutation<Response, Error, UserFormData>({
        retry: false,
        mutationFn: async (payload: UserFormData) => {
            const res = await axiosInstance.post(API_KEYS.COMPANY.ADMIN_INVITES, {
                admins: [{
                    email: payload.email,
                    roleIds: payload.roleIds,
                }],
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.users() });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.directoryUsers });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.invitedUsers });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.uninvitedUsers });
        }
    });
};
