import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useAxios } from '@/shared/hooks/useAxios';
import { API_KEYS } from '@/lib/constants/apis';
import type { ApiResponse } from '@/shared/types/api';

export const useAuthCheck = (): UseMutationResult<ApiResponse<Record<string, string | number | boolean>>, Error, string> => {
    const axios = useAxios();
    return useMutation({
        retry: false,
        mutationFn: async (userId: string) => {
            const res = await axios.get(`${API_KEYS.AUTH.CHECK}${userId}`);
            return res.data;
        },
    });
};
