import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { useAxios } from '@/shared/hooks/useAxios';
import { API_KEYS } from '@/lib/constants/apis';
import { QUERY_KEYS } from '@/shared/lib/query/keys';
import { isRetryableError } from '@/shared/lib/errors/api-errors';
import type { PaginatedResponse } from '@/shared/types/api';
import type { AppUser } from '@/features/people/types';

// Retry up to 3 times, but only for transient errors (pool exhaustion, 503, 429).
// Permanent errors (404, 403, 422) fail immediately without burning retry budget.
const PEOPLE_RETRY = (failureCount: number, error: Error) =>
    failureCount < 3 && isRetryableError(error);

type UserListResponse = UseQueryResult<PaginatedResponse<AppUser>, Error>;
type UserListOptions = Omit<UseQueryOptions<PaginatedResponse<AppUser>, Error>, 'queryKey' | 'queryFn'>;

export const useGetAllUsersApi = (options?: UserListOptions): UserListResponse => {
    const axios = useAxios();
    return useQuery({
        queryKey: QUERY_KEYS.people.users(),
        queryFn: async () => {
            const res = await axios.get(API_KEYS.USER.USERS);
            return res.data;
        },
        staleTime: 0,
        retry: PEOPLE_RETRY,
        ...options,
    });
};

export const useGetInvitedUsersApi = (options?: UserListOptions): UserListResponse => {
    const axios = useAxios();
    return useQuery({
        queryKey: QUERY_KEYS.people.invitedUsers,
        queryFn: async () => {
            const res = await axios.get(API_KEYS.USER.INVITED_USERS);
            return res.data;
        },
        staleTime: 0,
        retry: PEOPLE_RETRY,
        ...options,
    });
};

export const useGetDirectoryUsersApi = (options?: UserListOptions): UserListResponse => {
    const axios = useAxios();
    return useQuery({
        queryKey: QUERY_KEYS.people.directoryUsers,
        queryFn: async () => {
            const res = await axios.get(API_KEYS.USER.DIRECTORY_USERS);
            return res.data;
        },
        staleTime: 0,
        retry: PEOPLE_RETRY,
        ...options,
    });
};

export const useGetUninvitedUsersApi = (options?: UserListOptions): UserListResponse => {
    const axios = useAxios();
    return useQuery({
        queryKey: QUERY_KEYS.people.uninvitedUsers,
        queryFn: async () => {
            const res = await axios.get(API_KEYS.USER.UNINVITED_USERS);
            return res.data;
        },
        staleTime: 0,
        retry: PEOPLE_RETRY,
        ...options,
    });
};
