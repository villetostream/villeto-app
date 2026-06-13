/**
 * Auth domain types.
 *
 * Previously scattered across:
 *   - src/stores/auth-stores.ts  (User, CompanyPermission)
 *   - src/queries/auth/auth-permissions.ts  (Permission)
 */

import type { Department } from '@/features/people/types';
import type { Role } from '@/features/people/types';

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

/**
 * Full permission object returned by the /auth/permissions endpoint.
 * Distinct from CompanyPermission — this is the system-wide permission catalogue.
 */
export interface Permission {
    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;
    permissionId: string;
    name: string;
    description: string;
    resource: string;
    action: string;
    enabled?: boolean;
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
