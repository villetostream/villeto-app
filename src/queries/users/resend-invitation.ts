import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";

interface ResendInvitationPayload {
    email: string;
    employeeId?: string;
}

interface Response {
    data: any;
    error: any;
    message: string;
    status: number;
    statusCode: number;
    statusText: string;
}

export const useResendInvitationApi = () => {
    const axiosInstance = useAxios();
    const queryClient = useQueryClient();

    return useMutation<Response, Error, ResendInvitationPayload>({
        retry: false,
        mutationFn: async (payload: ResendInvitationPayload) => {
            const res = await axiosInstance.post(API_KEYS.USER.RESEND_INVITATION, payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.invitedUsers });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.uninvitedUsers });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.directoryUsers });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.users() });
        },
    });
};
