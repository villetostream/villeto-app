import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useAxios } from '@/shared/hooks/useAxios';
import { API_KEYS } from '@/lib/constants/apis';
import type { ApiResponse } from '@/shared/types/api';
import type { User } from '@/features/auth/types';
import type { LoginFormData } from '@/features/auth/schemas';

interface LoginData {
    accessToken: string;
    user: User;
}

export const useLogin = (): UseMutationResult<ApiResponse<LoginData>, Error, LoginFormData> => {
    const axios = useAxios();
    return useMutation({
        retry: false,
        mutationFn: async (payload) => {
            const res = await axios.post(API_KEYS.AUTH.LOGIN, payload);
            return res.data;
        },
    });
};
