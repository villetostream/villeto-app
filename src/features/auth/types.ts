/**
 * Auth domain types.
 *
 * Previously scattered across:
 *   - src/stores/auth-stores.ts  (User, CompanyPermission)
 *   - src/queries/auth/auth-permissions.ts  (Permission)
 */

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

export interface CapabilityGroup {
    capabilityGroupId: string;
    key: string;
    name: string;
    description: string;
    module: string;
    sortOrder: number;
    isActive: boolean;
    permissions: CompanyPermission[];
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface CompanyRoleSummary {
    roleId: string;
    name: string;
    description?: string | null;
    isActive: string;
    templateKey?: string | null;
    source?: string | null;
    isDefault: boolean;
    permissions: CompanyPermission[];
}

export interface User {
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    userId: string;
    employeeExternalId?: string | null;
    firstName: string;
    lastName: string;
    loginCount: number;
    lastLoginAt?: string | null;
    email: string;
    status: string;
    isActive?: boolean; // legacy
    jobTitle?: string | null;
    businessUnit?: string | null;
    location?: string | null;
    phoneNumber?: string | null;
    phone?: string | number; // legacy
    employmentType?: string | null;
    employeeStatus?: string | null;
    managementLevel?: string | null;
    effectiveDate?: string | null;
    lastImportSource?: string | null;
    percentageOfOwnership?: string | null;
    ownershipPercentage?: number; // legacy
    departmentId?: string | null;
    managerId?: string | null;
    jobGradeId?: string | null;
    managementLevelId?: string | null;
    lastImportBatchId?: string | null;
    companyId?: string; // legacy
    position: string;
    villetoRole?: Role; // legacy
    cardIssued?: boolean; // legacy
    manager?: {
        name: string | null;
        userId: string;
        employeeExternalId?: string | null;
        firstName?: string | null;
        lastName?: string | null;
    } | User | string | null; // legacy
    jobGrade?: {
        code: string | null;
        name: string | null;
        rank: number | null;
        jobGradeId: string;
    } | null; // legacy
    managementLevelRef?: {
        code: string | null;
        name: string | null;
        rank: number | null;
        managementLevelId: string;
    } | null; // legacy
    company?: {
        companyId: string;
        contactEmail: string;
        contactPhone: string;
        contactFirstName: string;
        contactLastName: string;
        companyName: string;
        countryOfRegistration: string;
        businessName: string;
        taxId?: string | null;
        registrationId?: string | null;
        websiteUrl?: string | null;
        address?: string | null;
        logoUrl?: string | null;
        accountType: string;
        productModules: string[];
        description?: string | null;
        status: string;
        [key: string]: unknown;
    };
    department?: {
        departmentId: string;
        departmentExternalId?: string | null;
        departmentName: string;
        description?: string | null;
        departmentHeadId?: string | null;
        departmentHeadName?: string | null;
        parentDepartmentId?: string | null;
        isActive: string;
        [key: string]: unknown;
    };
    /**
     * Some backend responses return the department name as a flat sibling
     * of departmentId rather than nesting it under `department`. Display
     * code should check both `department?.departmentName` and this field.
     */
    departmentName?: string | null;
    /** Company role holds the user's explicit capability permissions. */
    /** @deprecated Primary-role compatibility alias. */
    companyRole?: CompanyRoleSummary;
    /** Complete set of active company roles assigned to this user. */
    companyRoles?: CompanyRoleSummary[];
    capabilityGroups?: CapabilityGroup[];
}
