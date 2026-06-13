// providers/auth-provider.tsx
"use client";

import { useAuthStore, type User } from '@/stores/auth-stores';
import { ReactNode, useEffect } from 'react';

interface AuthProviderProps {
    children: ReactNode;
    initialUser?: User | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
    useEffect(() => {
        useAuthStore.setState({
            user: initialUser ?? null,
            isLoading: false,
        });
    }, [initialUser]);

    return <>{children}</>;
}