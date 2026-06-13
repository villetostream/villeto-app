import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { useAxios } from '@/shared/hooks/useAxios';
import { API_KEYS } from '@/lib/constants/apis';
import { QUERY_KEYS } from '@/shared/lib/query/keys';
import type { ApiResponse } from '@/shared/types/api';
import type { Permission } from '@/features/auth/types';

export const useGetAllPermissionsApi = (
    options?: Omit<UseQueryOptions<ApiResponse<Permission[]>, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<ApiResponse<Permission[]>, Error> => {
    const axios = useAxios();
    return useQuery({
        queryKey: QUERY_KEYS.auth.permissions,
        queryFn: async () => {
            const res = await axios.get(API_KEYS.AUTH.PERMISSIONS);
            return res.data;
        },
        staleTime: 0,
        ...options,
    });
};
