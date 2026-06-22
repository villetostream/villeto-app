import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { useAxios } from '@/shared/hooks/useAxios';
import { API_KEYS } from '@/lib/constants/apis';
import { QUERY_KEYS } from '@/shared/lib/query/keys';
import { STALE_TIMES } from '@/lib/constants/stale-times';
import { isRetryableError } from '@/shared/lib/errors/api-errors';
import type { PaginatedResponse } from '@/shared/types/api';
import type { Role } from '@/features/people/types';

const PEOPLE_RETRY = (failureCount: number, error: Error) =>
    failureCount < 3 && isRetryableError(error);

type RoleListResponse = UseQueryResult<PaginatedResponse<Role>, Error>;
type RoleListOptions = Omit<UseQueryOptions<PaginatedResponse<Role>, Error>, 'queryKey' | 'queryFn'>;

export interface GetRolesParams {
    page?: number;
    limit?: number;
}

export const useGetAllRolesApi = (
    { page = 1, limit = 20 }: GetRolesParams = {},
    options?: RoleListOptions
): RoleListResponse => {
    const axios = useAxios();
    return useQuery({
        queryKey: [...QUERY_KEYS.people.roles, { page, limit }],
        queryFn: async () => {
            const res = await axios.get(API_KEYS.ROLE.ROLES_LIST(page, limit));
            return res.data;
        },
        staleTime: STALE_TIMES.STATIC,
        retry: PEOPLE_RETRY,
        ...options,
    });
};

export const useGetCompanyRolesApi = (
    { page = 1, limit = 100 }: GetRolesParams = {},
    options?: RoleListOptions
): RoleListResponse => {
    const axios = useAxios();
    return useQuery({
        queryKey: [...QUERY_KEYS.people.roles, { page, limit }],
        queryFn: async () => {
            const res = await axios.get(API_KEYS.ROLE.ROLES_COMPANY(page, limit));
            return res.data;
        },
        staleTime: STALE_TIMES.STATIC,
        retry: PEOPLE_RETRY,
        ...options,
    });
};

export const useGetVilletoRolesApi = (
    params: GetRolesParams = {},
    options?: RoleListOptions
): RoleListResponse => {
    return useGetCompanyRolesApi(params, options);
};
