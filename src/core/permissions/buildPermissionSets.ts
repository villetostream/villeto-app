/**
 * Pure function — no React dependency.
 * Converts a flat permissions array into O(1) lookup Sets.
 * Extracted from the auth store so it can be tested in isolation.
 */

import type { CompanyPermission } from '@/features/auth/types';

export function buildPermissionSets(permissions: CompanyPermission[]) {
    const permissionSet = new Set<string>();
    const managedResources = new Set<string>();
    for (const p of permissions) {
        if (p.action === 'manage') {
            managedResources.add(p.resource);
        } else {
            permissionSet.add(`${p.resource}.${p.action}`);
        }
    }
    return { _permissionSet: permissionSet, _managedResources: managedResources };
}
