import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { buildPermissionSets } from '@/core/permissions/buildPermissionSets';
import { getCurrencyConfig } from '@/lib/utils/currency';
import type { User, CompanyPermission } from '@/features/auth/types';

// ─── Store Interface ──────────────────────────────────────────────────────────

interface AuthState {
    user: User | null;
    accessToken: string | null;
    isLoading: boolean;

    /** Flat list of company-level permissions for this user */
    companyPermissions: CompanyPermission[];

    /**
     * O(1) lookup structures built whenever companyPermissions changes.
     * Not persisted — rebuilt on rehydration via hydrate().
     */
    _permissionSet: Set<string>;
    _managedResources: Set<string>;

    setAccessToken: (token: string) => void;
    login: (data: User) => void;
    logout: () => void;
    hydrate: () => void;
    setCompanyPermissions: (permissions: CompanyPermission[]) => void;

    /**
     * PRIMARY permission check — the only method to call for UI gating.
     *
     * @example can('vendor', 'approve')
     */
    can: (resource: string, action: string) => boolean;

    getCurrencySymbol: () => string;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isLoading: true,
            companyPermissions: [],
            _permissionSet: new Set<string>(),
            _managedResources: new Set<string>(),
            accessToken: null,

            getCurrencySymbol: () => {
                const countryCode = get().user?.company?.countryOfRegistration ?? '';
                return getCurrencyConfig(countryCode).symbol;
            },

            setAccessToken: (token) => set({ accessToken: token }),

            setCompanyPermissions: (permissions) => {
                const list = Array.isArray(permissions) ? permissions : [];
                set({ companyPermissions: list, ...buildPermissionSets(list) });
            },

            login: (data) => set({ user: data }),

            logout: () => {
                set({
                    user: null,
                    companyPermissions: [],
                    _permissionSet: new Set(),
                    _managedResources: new Set(),
                    accessToken: null,
                });
                sessionStorage.removeItem('auth-storage');
            },

            can: (resource, action) => {
                const { _permissionSet, _managedResources, companyPermissions } = get();
                if (_permissionSet.size > 0 || _managedResources.size > 0) {
                    return _managedResources.has(resource) || _permissionSet.has(`${resource}.${action}`);
                }
                if (!companyPermissions?.length) return false;
                return companyPermissions.some(
                    (p) => p.resource === resource && (p.action === action || p.action === 'manage')
                );
            },

            hydrate: () => {
                const { companyPermissions } = get();
                set({ isLoading: false, ...buildPermissionSets(companyPermissions ?? []) });
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => sessionStorage),
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                companyPermissions: state.companyPermissions,
            }),
            onRehydrateStorage: () => (state) => {
                state?.hydrate();
            },
        }
    )
);

// ─── Selector Hooks ───────────────────────────────────────────────────────────

/** @example const canApprove = useCan('vendor', 'approve'); */
export const useCan = (resource: string, action: string): boolean =>
    useAuthStore((state) => state.can(resource, action));

/** Returns the user's display role (for labels/badges only — not for logic). */
export const useUserRole = () =>
    useAuthStore((state) => state.user?.villetoRole);
