import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useAxios } from '@/shared/hooks/useAxios';
import { API_KEYS } from '@/lib/constants/apis';
import type { ApiResponse } from '@/shared/types/api';

export const useLogout = (): UseMutationResult<ApiResponse<null>, Error, void> => {
    const axios = useAxios();
    return useMutation({
        retry: false,
        mutationFn: async () => {
            const res = await axios.post(API_KEYS.AUTH.LOGIN.replace('login', 'logout'));
            return res.data;
        },
    });
};
