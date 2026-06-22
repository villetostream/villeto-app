import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { useAxios } from '@/shared/hooks/useAxios';
import { API_KEYS } from '@/lib/constants/apis';
import { QUERY_KEYS } from '@/shared/lib/query/keys';
import { STALE_TIMES } from '@/lib/constants/stale-times';
import { isRetryableError } from '@/shared/lib/errors/api-errors';
import type { PaginatedResponse } from '@/shared/types/api';
import type { Department } from '@/features/people/types';

const PEOPLE_RETRY = (failureCount: number, error: Error) =>
    failureCount < 3 && isRetryableError(error);

type DeptListResponse = UseQueryResult<PaginatedResponse<Department>, Error>;
type DeptListOptions = Omit<UseQueryOptions<PaginatedResponse<Department>, Error>, 'queryKey' | 'queryFn'>;

export const useGetAllDepartmentsApi = (options?: DeptListOptions): DeptListResponse => {
    const axios = useAxios();
    return useQuery({
        queryKey: QUERY_KEYS.people.departments,
        queryFn: async () => {
            const res = await axios.get(API_KEYS.DEPARTMENT.DEPARTMENTS);
            return res.data;
        },
        staleTime: STALE_TIMES.SLOW,
        retry: PEOPLE_RETRY,
        ...options,
    });
};
