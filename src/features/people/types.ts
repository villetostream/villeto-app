/**
 * People domain types — users, departments, roles.
 *
 * Previously scattered across:
 *   - src/queries/departments/get-all-departments.ts  (Department, AppUser)
 *   - src/queries/role/get-all-roles.ts  (Role, CapabilityGroup, etc.)
 *   - src/queries/users/get-all-users.ts  (Meta — now in shared/types/api.ts)
 */

import type { Permission } from '@/features/auth/types';

// ─── Department ───────────────────────────────────────────────────────────────

export interface Department {
    departmentId: string;
    departmentName: string;
    description?: string | null;
    code?: string | null;
    isActive?: boolean | null;
    company?: string | null;
    head?: AppUser;
    manager?: AppUser;
    members?: AppUser[];
    createdAt?: string | null;
    updatedAt?: string | null;
    deletedAt?: string | null;
}

// ─── User (application-level, from list endpoints) ───────────────────────────

export interface AppUser {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    password?: string | null;
    loginCount?: number | null;
    isActive?: boolean | null;
    status?: string | null;
    phone?: string | null;
    ownershipPercentage?: number | null;
    company?: string | null;
    companyId?: string | null;
    department?: string | null;
    departmentId?: string | null;
    villetoRole?: Role;
    role?: Role;
    position?: string | null;
    cardIssued?: boolean;
    jobTitle?: string;
    manager?: AppUser | null;
}

// ─── Role & Capabilities ──────────────────────────────────────────────────────

export interface CapabilityGroupPermission {
    permissionId: string;
    name: string;
    description: string;
    resource: string;
    action: string;
}

export interface CapabilityGroup {
    capabilityGroupId: string;
    key: string;
    name: string;
    description: string;
    module: string;
    sortOrder: number;
    isActive: boolean;
    permissions: CapabilityGroupPermission[];
}

export interface CapabilitiesByModule {
    [module: string]: {
        capabilityGroups: CapabilityGroup[];
    };
}

export interface Role {
    roleId: string;
    name: string;
    description?: string;
    isActive: boolean;
    permissions: Permission[];
    createdAt: Date;
    updatedAt: Date;
    totalAssignedUsers?: number;
    createdBy?: AppUser;
    templateKey?: string | null;
    source?: string;
    isDefault?: boolean;
    capabilityGroupKeys?: string[];
    capabilitiesByModule?: CapabilitiesByModule;
}
