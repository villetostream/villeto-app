import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";

interface DeleteUserResponse {
    message: string;
    status: number;
}

export const useDeleteUserApi = () => {
    const axiosInstance = useAxios();
    const queryClient = useQueryClient();

    return useMutation<DeleteUserResponse, Error, string>({
        retry: false,
        mutationFn: async (userId: string) => {
            const res = await axiosInstance.delete(API_KEYS.USER.DELETE_USER(userId));
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.users() });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.directoryUsers });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.invitedUsers });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.uninvitedUsers });
        },
    });
};
