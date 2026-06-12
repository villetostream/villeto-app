import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { Role } from '@/actions/role/get-all-roles';
import { Department } from '@/actions/departments/get-all-departments';
import { getCurrencyConfig } from "@/lib/utils/currency";

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
        [key: string]: any;
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

    /**
     * @deprecated Use can(resource, action) instead.
     * Kept temporarily to avoid breaking un-migrated call sites.
     * Internally delegates to can() where possible.
     */
    hasPermission: (permission: string | string[]) => boolean;
    setUserPermissions: (permissions: any[]) => void;

    // ─ Utilities ─
    getCurrencySymbol: () => string;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isLoading: true,
            companyPermissions: [],
            accessToken: null,

            getCurrencySymbol: () => {
                const countryCode = get().user?.company?.countryOfRegistration ?? "";
                return getCurrencyConfig(countryCode).symbol;
            },

            setAccessToken: (data: string) => {
                set({ accessToken: data });
            },

            setCompanyPermissions: (permissions: CompanyPermission[]) => {
                set({ companyPermissions: Array.isArray(permissions) ? permissions : [] });
            },

            /** @deprecated — delegates to setCompanyPermissions for backward compat */
            setUserPermissions: (permissions: any[]) => {
                // During migration some call-sites pass villetoRole.permissions (old shape).
                // We accept them here but the can() helper will only operate on companyPermissions.
                set({ companyPermissions: Array.isArray(permissions) ? permissions : [] });
            },

            login: (data: User) => {
                set({ user: data });
            },

            logout: () => {
                set({ user: null, companyPermissions: [], accessToken: null });
                Cookies.remove('auth-storage');
            },

            /**
             * ─── PRIMARY GATE ──────────────────────────────────────────────
             * Checks whether the current user holds the given resource+action
             * pair in their companyRole.permissions list.
             *
             * This is PURELY data-driven — no role names, no bypass logic.
             * If a permission is not in the list, the answer is false.
             */
            can: (resource: string, action: string): boolean => {
                const { companyPermissions } = get();
                if (!companyPermissions || companyPermissions.length === 0) return false;
                return companyPermissions.some(
                    p => p.resource === resource && (p.action === action || p.action === "manage")
                );
            },

            /**
             * @deprecated
             * Legacy helper kept so un-migrated components don't break.
             * Maps old "action:resource" strings (e.g. "read:roles") to can()
             * where the format matches; otherwise falls back to name inclusion check
             * against companyPermissions.
             */
            hasPermission: (permission: string | string[]): boolean => {
                const { can, companyPermissions } = get();
                const perms = Array.isArray(permission) ? permission : [permission];
                return perms.every(perm => {
                    if (!perm || perm.trim() === "") return true;

                    // Try to parse legacy "action:resource" format (e.g., "create:roles")
                    if (perm.includes(":")) {
                        const [legacyAction, legacyResource] = perm.split(":");
                        // Strip trailing 's' if plural (e.g. 'roles' -> 'role', 'users' -> 'user')
                        const singularResource = legacyResource.endsWith('s') ? legacyResource.slice(0, -1) : legacyResource;
                        
                        return can(singularResource, legacyAction);
                    }
                    // Try "resource.action" format
                    if (perm.includes(".")) {
                        const lastDot = perm.lastIndexOf(".");
                        const resource = perm.substring(0, lastDot);
                        let action = perm.substring(lastDot + 1);

                        // Often "resource.action" means action="approve_company" or something. 
                        // The 'can' method covers it, and handles "manage" implicitly now.
                        return can(resource, action);
                    }
                    // Fallback: check name includes (least reliable but functional)
                    return companyPermissions.some(p => p.name.includes(perm));
                });
            },

            hydrate: () => {
                set({ isLoading: false });
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => sessionStorage),
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
