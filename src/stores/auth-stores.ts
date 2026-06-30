import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Role } from '@/queries/role/get-all-roles';
import { Department } from '@/queries/departments/get-all-departments';
import { getCurrencyConfig } from "@/lib/utils/currency";
import { clearTokenRefresh } from "@/lib/tokenRefreshService";

// ─── Permission Types ─────────────────────────────────────────────────────────

/**
 * A single permission entry as returned by user.companyRole.permissions
 * from the login / /users/me API response.
 */
export interface CompanyPermission {
    permissionId: string;
    name: string;        // e.g. "vendor.approve"
    description?: string;
    resource: string;    // e.g. "vendor"
    action: string;      // e.g. "approve"
}

// ─── User Type ────────────────────────────────────────────────────────────────

export interface User {
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
    userId: string;
    firstName: string;
    lastName: number;
    email: string;
    loginCount: number;
    isActive: boolean;
    phone?: string | number;
    ownershipPercentage?: number;
    companyId?: string;
    status?: string;
    jobTitle?: string | null;
    managerId?: string | null;
    company?: {
        countryOfRegistration?: string;
        [key: string]: unknown;
    };
    department?: Department;
    departmentId?: string | null;
    /**
     * Some backend responses return the department name as a flat sibling
     * of departmentId rather than nesting it under `department`. Display
     * code should check both `department?.departmentName` and this field.
     * `departmentId` remains the only value sent back to the backend.
     */
    departmentName?: string | null;
    position: string;
    /** Used for display purposes only (e.g. profile page badge). Do NOT
     *  branch on villetoRole.name for any UI gating logic. */
    villetoRole?: Role;
    /** Company role holds the user's explicit capability permissions. */
    companyRole?: {
        roleId: string;
        name: string;
        description?: string;
        templateKey?: string;
        permissions: CompanyPermission[];
    };
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface AuthState {
    user: User | null;
    accessToken: string | null;
    isLoading: boolean;

    /** The flat list of company-level permissions for this user. */
    companyPermissions: CompanyPermission[];

    /**
     * O(1) lookup structures built whenever companyPermissions changes.
     * - _permissionSet: Set of "resource.action" strings for exact matches.
     * - _managedResources: Set of resource strings where action === "manage".
     * Not persisted — rebuilt on rehydration.
     */
    _permissionSet: Set<string>;
    _managedResources: Set<string>;

    // ─ Setters ─
    setAccessToken: (token: string) => void;
    login: (data: User) => void;
    logout: () => void;
    hydrate: () => void;

    /**
     * Store companyRole.permissions from the API response.
     * Called after login AND after /users/me refresh.
     */
    setCompanyPermissions: (permissions: CompanyPermission[]) => void;

    /**
     * PRIMARY permission check — the only method you should call for UI gating.
     *
     * @param resource  e.g. "vendor", "expense.report", "procurement.purchase_request"
     * @param action    e.g. "approve", "create", "read_company"
     * @returns true if the user has the given permission; false in all other cases (defensive)
     *
     * @example
     *   const { can } = useAuthStore();
     *   return can('vendor', 'approve'); // true only if user has vendor.approve
     */
    can: (resource: string, action: string) => boolean;

    // ─ Utilities ─
    getCurrencySymbol: () => string;
}

// ─── Store ────────────────────────────────────────────────────────────────────

function buildPermissionSets(permissions: CompanyPermission[]) {
    const permissionSet = new Set<string>();
    const managedResources = new Set<string>();
    for (const p of permissions) {
        if (p.action === "manage") {
            managedResources.add(p.resource);
        } else {
            permissionSet.add(`${p.resource}.${p.action}`);
        }
    }
    return { _permissionSet: permissionSet, _managedResources: managedResources };
}

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
                const countryCode = get().user?.company?.countryOfRegistration ?? "";
                return getCurrencyConfig(countryCode).symbol;
            },

            setAccessToken: (data: string) => {
                set({ accessToken: data });
            },

            setCompanyPermissions: (permissions: CompanyPermission[]) => {
                const list = Array.isArray(permissions) ? permissions : [];
                set({ companyPermissions: list, ...buildPermissionSets(list) });
            },

            login: (data: User) => {
                set({ user: data });
            },

            logout: () => {
                clearTokenRefresh(); // cancel any pending proactive refresh
                set({
                    user: null,
                    companyPermissions: [],
                    _permissionSet: new Set(),
                    _managedResources: new Set(),
                    accessToken: null,
                });
                sessionStorage.removeItem("auth-storage");
            },

            /**
             * ─── PRIMARY GATE ──────────────────────────────────────────────
             * O(1) lookup via pre-built Sets. Falls back to linear scan only
             * when Sets are empty (e.g. immediately after hydration before
             * setCompanyPermissions is called).
             */
            can: (resource: string, action: string): boolean => {
                const { _permissionSet, _managedResources, companyPermissions } = get();
                // Fast path — O(1)
                if (_permissionSet.size > 0 || _managedResources.size > 0) {
                    return _managedResources.has(resource) || _permissionSet.has(`${resource}.${action}`);
                }
                // Fallback for the brief window before Sets are built (e.g. fresh hydration)
                if (!companyPermissions || companyPermissions.length === 0) return false;
                return companyPermissions.some(
                    p => p.resource === resource && (p.action === action || p.action === "manage")
                );
            },

            hydrate: () => {
                // Rebuild Sets from persisted companyPermissions after rehydration
                const { companyPermissions } = get();
                set({ isLoading: false, ...buildPermissionSets(companyPermissions ?? []) });
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => sessionStorage),
            // Only persist serialisable fields — Sets are not JSON-serialisable
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                companyPermissions: state.companyPermissions,
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.hydrate();
                }
            },
        }
    )
);

// ─── Selector Hooks ───────────────────────────────────────────────────────────

/**
 * Primary permission hook.
 * @example const canApprove = useCan('vendor', 'approve');
 */
export const useCan = (resource: string, action: string): boolean => {
    return useAuthStore(state => state.can(resource, action));
};

/** Returns the user's display role (for labels/badges only — not for logic). */
export const useUserRole = () => {
    return useAuthStore(state => state.user?.villetoRole);
};
