import { z } from 'zod';
import type {
    AuthorizationCapabilityGrant,
    AuthorizationSnapshot,
    CapabilityScopeType,
} from './types';

export const AUTHORIZATION_SCHEMA_VERSION = 1 as const;
export const AUTHORIZATION_INVALIDATED_EVENT = 'villeto:authorization-invalidated';
export const AUTHORIZATION_FOCUS_MAX_AGE_MS = 5 * 60 * 1000;

const scopeTypeSchema = z.enum([
    'own',
    'reporting_chain',
    'department',
    'company',
]);

export const authorizationSnapshotSchema = z.object({
    schemaVersion: z.literal(AUTHORIZATION_SCHEMA_VERSION),
    revision: z.string().min(1),
    permissions: z.array(z.string().min(1)),
    capabilityGrants: z.array(
        z.object({
            key: z.string().min(1),
            module: z.string().min(1),
            scopeType: scopeTypeSchema,
            scopeConfig: z
                .object({
                    departmentIds: z.array(z.string()).optional(),
                    legalEntityIds: z.array(z.string()).optional(),
                })
                .nullable(),
            isImplied: z.boolean(),
            sourceRoleIds: z.array(z.string()),
        }),
    ),
});

export function parseAuthorizationSnapshot(value: unknown): AuthorizationSnapshot {
    return authorizationSnapshotSchema.parse(value);
}

export function buildAuthorizationIndexes(snapshot: AuthorizationSnapshot | null) {
    const permissionSet = new Set(snapshot?.permissions ?? []);
    const grantsByCapability = new Map<string, AuthorizationCapabilityGrant[]>();

    for (const grant of snapshot?.capabilityGrants ?? []) {
        const grants = grantsByCapability.get(grant.key) ?? [];
        grants.push(grant);
        grantsByCapability.set(grant.key, grants);
    }

    return { permissionSet, grantsByCapability };
}

export function toPermissionName(resource: string, action: string) {
    return `${resource}.${action}`;
}

export function hasPermission(permissionSet: Set<string>, permission: string) {
    return permissionSet.has(permission);
}

export function hasAnyPermission(permissionSet: Set<string>, permissions: string[]) {
    return permissions.length > 0 && permissions.some((permission) => permissionSet.has(permission));
}

export function hasAllPermissions(permissionSet: Set<string>, permissions: string[]) {
    return permissions.length > 0 && permissions.every((permission) => permissionSet.has(permission));
}

export function uniqueCapabilityScopes(
    grants: AuthorizationCapabilityGrant[],
): CapabilityScopeType[] {
    return Array.from(new Set(grants.map(({ scopeType }) => scopeType)));
}

export function invalidateAuthorization() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTHORIZATION_INVALIDATED_EVENT));
    }
}
