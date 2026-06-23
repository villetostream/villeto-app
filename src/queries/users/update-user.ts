import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";

/**
 * Partial payload for PATCH /users/{userId}.
 * Only include fields that have actually changed — the API applies a
 * sparse merge on the server side.
 *
 * NOTE: This is intentionally looser than UserFormData so that both
 * the admin "edit profile" modal AND the add-user form can call the
 * same mutation without fighting over required/optional fields.
 */
export interface UserUpdatePayload {
    id: string;
    roleId?: string;
    jobTitle?: string;
    departmentId?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    location?: string;
    cardIssued?: boolean;
    [key: string]: unknown;   // allow any extra fields the add-user form sends
}

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

export const useUpdateUserApi = () => {
    const axiosInstance = useAxios();
    const queryClient = useQueryClient();

    return useMutation<Response, Error, UserUpdatePayload>({
        retry: false,
        mutationFn: async (payload: UserUpdatePayload) => {
            const { id, ...latestPayload } = payload;
            const res = await axiosInstance.patch(`${API_KEYS.USER.USERS}${id}`, latestPayload);
            return res.data;
        },
        onSuccess: (_data, variables) => {
            // Refresh the individual user record and the invited users list
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USER, variables.id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INVITED_USERS] });
        },
    });
};