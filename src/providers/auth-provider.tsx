// providers/auth-provider.tsx
"use client";

import { useAuthStore, type User } from '@/stores/auth-stores';
import { parseAuthorizationSnapshot } from '@/features/auth/authorization';
import { ReactNode, useEffect } from 'react';

interface AuthProviderProps {
    children: ReactNode;
    initialUser?: User | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
    useEffect(() => {
        const authorization = initialUser?.authorization
            ? parseAuthorizationSnapshot(initialUser.authorization)
            : null;
        useAuthStore.setState({
            user: initialUser ?? null,
            authorization,
            isLoading: false,
        });
        useAuthStore.getState().hydrate();
    }, [initialUser]);

    return <>{children}</>;
}
