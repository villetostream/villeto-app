import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
    buildAuthorizationIndexes,
    hasAllPermissions,
    hasAnyPermission,
    hasPermission,
    toPermissionName,
    uniqueCapabilityScopes,
} from '@/features/auth/authorization';
import type {
    AuthorizationCapabilityGrant,
    AuthorizationSnapshot,
    CapabilityScopeType,
    User,
} from '@/features/auth/types';
import { getCurrencyConfig } from '@/lib/utils/currency';
import { clearTokenRefresh, scheduleTokenRefresh } from '@/lib/tokenRefreshService';

export type {
    AuthorizationCapabilityGrant,
    AuthorizationSnapshot,
    CapabilityScopeType,
    User,
};

interface AuthState {
    user: User | null;
    accessToken: string | null;
    /** Unix timestamp (ms) when the access token expires. Null if unknown. */
    accessTokenExpiresAt: number | null;
    isLoading: boolean;
    
    /** The single server-produced source of truth for client-side access UX. */
    authorization: AuthorizationSnapshot | null;
    authorizationFetchedAt: number | null;

    /** Derived lookup structures; rebuilt after session-storage hydration. */
    _permissionSet: Set<string>;
    _capabilityGrantsByKey: Map<string, AuthorizationCapabilityGrant[]>;

    setAccessToken: (token: string, expiresInMs?: number) => void;
    login: (data: User) => void;
    logout: () => void;
    hydrate: () => void;
    setAuthorization: (snapshot: AuthorizationSnapshot) => void;

    /** Compatibility signature used by existing screens during phased migration. */
    can: (resource: string, action: string) => boolean;
    canPermission: (permission: string) => boolean;
    canAny: (permissions: string[]) => boolean;
    canAll: (permissions: string[]) => boolean;
    grantsFor: (capabilityKey: string) => AuthorizationCapabilityGrant[];
    hasCapabilityScope: (
        capabilityKey: string,
        scopeType: CapabilityScopeType,
    ) => boolean;
    scopesFor: (capabilityKey: string) => CapabilityScopeType[];
    isAuthorizationStale: (maxAgeMs: number) => boolean;

    getCurrencySymbol: () => string;
}

function buildDerivedAuthorization(snapshot: AuthorizationSnapshot | null) {
    const { permissionSet, grantsByCapability } = buildAuthorizationIndexes(snapshot);
    return {
        _permissionSet: permissionSet,
        _capabilityGrantsByKey: grantsByCapability,
    };
}

const emptyDerivedAuthorization = () => buildDerivedAuthorization(null);

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            accessTokenExpiresAt: null,
            isLoading: true,
            authorization: null,
            authorizationFetchedAt: null,
            ...emptyDerivedAuthorization(),

            getCurrencySymbol: () => {
                const countryCode = get().user?.company?.countryOfRegistration ?? '';
                return getCurrencyConfig(countryCode).symbol;
            },

            setAccessToken: (accessToken, expiresInMs) => set({
                accessToken,
                ...(expiresInMs != null
                    ? { accessTokenExpiresAt: Date.now() + expiresInMs }
                    : {}),
            }),

            setAuthorization: (authorization) => {
                set({
                    authorization,
                    authorizationFetchedAt: Date.now(),
                    ...buildDerivedAuthorization(authorization),
                });
            },

            login: (user) => {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('villeto_lastActivityTime', Date.now().toString());
                }

                const authorization = user.authorization ?? get().authorization;
                set({
                    user,
                    ...(authorization
                        ? {
                              authorization,
                              authorizationFetchedAt: Date.now(),
                              ...buildDerivedAuthorization(authorization),
                          }
                        : {}),
                });
            },

            logout: () => {
                clearTokenRefresh();

                if (typeof window !== 'undefined') {
                    try {
                        localStorage.removeItem('villeto_lastActivityTime');
                        for (let index = 0; index < localStorage.length; index += 1) {
                            const key = localStorage.key(index);
                            if (
                                key &&
                                (key.startsWith('line_item_staging:') ||
                                    key.startsWith('bill_line_item_staging:'))
                            ) {
                                localStorage.removeItem(key);
                                index -= 1;
                            }
                        }
                    } catch {
                        // Storage may be unavailable in privacy-restricted browsers.
                    }
                    sessionStorage.removeItem('auth-storage');
                }

                set({
                    user: null,
                    accessToken: null,
                    accessTokenExpiresAt: null,
                    authorization: null,
                    authorizationFetchedAt: null,
                    ...emptyDerivedAuthorization(),
                });
            },

            can: (resource, action) => get().canPermission(toPermissionName(resource, action)),

            canPermission: (permission) => hasPermission(get()._permissionSet, permission),

            canAny: (permissions) => hasAnyPermission(get()._permissionSet, permissions),

            canAll: (permissions) => hasAllPermissions(get()._permissionSet, permissions),

            grantsFor: (capabilityKey) =>
                get()._capabilityGrantsByKey.get(capabilityKey) ?? [],

            hasCapabilityScope: (capabilityKey, scopeType) =>
                get()
                    .grantsFor(capabilityKey)
                    .some((grant) => grant.scopeType === scopeType),

            scopesFor: (capabilityKey) =>
                uniqueCapabilityScopes(get().grantsFor(capabilityKey)),

            isAuthorizationStale: (maxAgeMs) => {
                const fetchedAt = get().authorizationFetchedAt;
                return fetchedAt === null || Date.now() - fetchedAt >= maxAgeMs;
            },

            hydrate: () => {
                const authorization = get().authorization;
                const expiresAt = get().accessTokenExpiresAt;
                const token = get().accessToken;

                // Reschedule the proactive refresh timer using remaining token lifetime
                if (token && expiresAt) {
                    const remainingMs = expiresAt - Date.now();
                    if (remainingMs > 0) {
                        scheduleTokenRefresh(remainingMs);
                    }
                    // If the token has already expired, the reactive interceptor
                    // in useAxios will handle the 401 on the next request.
                }

                set({
                    isLoading: false,
                    ...buildDerivedAuthorization(authorization),
                });
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                accessTokenExpiresAt: state.accessTokenExpiresAt,
                authorization: state.authorization,
                authorizationFetchedAt: state.authorizationFetchedAt,
            }),
            onRehydrateStorage: () => (state) => state?.hydrate(),
        },
    ),
);

export const useCan = (resource: string, action: string): boolean =>
    useAuthStore((state) => state.can(resource, action));

export const useCanPermission = (permission: string): boolean =>
    useAuthStore((state) => state.canPermission(permission));

export const useCapabilityScopes = (capabilityKey: string): CapabilityScopeType[] =>
    useAuthStore((state) => state.scopesFor(capabilityKey));

/** Display role only; role names must never be used for authorization. */
export const useUserRole = () => useAuthStore((state) => state.user?.companyRole || state.user?.villetoRole);
