import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { useAxios } from '@/shared/hooks/useAxios';
import { API_KEYS } from '@/lib/constants/apis';
import { QUERY_KEYS } from '@/shared/lib/query/keys';
import { isRetryableError } from '@/shared/lib/errors/api-errors';
import type { PaginatedResponse } from '@/shared/types/api';
import type { Role } from '@/features/people/types';

const PEOPLE_RETRY = (failureCount: number, error: Error) =>
    failureCount < 3 && isRetryableError(error);

type RoleListResponse = UseQueryResult<PaginatedResponse<Role>, Error>;
type RoleListOptions = Omit<UseQueryOptions<PaginatedResponse<Role>, Error>, 'queryKey' | 'queryFn'>;

export const useGetAllRolesApi = (options?: RoleListOptions): RoleListResponse => {
    const axios = useAxios();
    return useQuery({
        queryKey: QUERY_KEYS.people.roles,
        queryFn: async () => {
            const res = await axios.get(API_KEYS.ROLE.ROLES);
            return res.data;
        },
        staleTime: 0,
        retry: PEOPLE_RETRY,
        ...options,
    });
};

export const useGetCompanyRolesApi = (options?: RoleListOptions): RoleListResponse => {
    const axios = useAxios();
    return useQuery({
        queryKey: [...QUERY_KEYS.people.roles, 'company'] as const,
        queryFn: async () => {
            const res = await axios.get(API_KEYS.ROLE.ROLES_COMPANY);
            return res.data;
        },
        staleTime: 0,
        retry: PEOPLE_RETRY,
        ...options,
    });
};

export const useGetVilletoRolesApi = (options?: RoleListOptions): RoleListResponse => {
    const axios = useAxios();
    return useQuery({
        queryKey: [...QUERY_KEYS.people.roles, 'villeto'] as const,
        queryFn: async () => {
            const res = await axios.get(API_KEYS.ROLE.ROLES_COMPANY);
            return res.data;
        },
        staleTime: 0,
        retry: PEOPLE_RETRY,
        ...options,
    });
};
