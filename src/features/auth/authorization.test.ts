import { describe, expect, it } from 'vitest';
import {
    buildAuthorizationIndexes,
    hasAllPermissions,
    hasAnyPermission,
    hasPermission,
    parseAuthorizationSnapshot,
    uniqueCapabilityScopes,
} from './authorization';
import type { AuthorizationSnapshot } from './types';

const snapshot: AuthorizationSnapshot = {
    schemaVersion: 1,
    revision: 'revision-1',
    permissions: ['expense.report.manage', 'expense.report.read_company'],
    capabilityGrants: [
        {
            key: 'expense_viewer',
            module: 'expense',
            scopeType: 'department',
            scopeConfig: { departmentIds: ['department-1'] },
            isImplied: false,
            sourceRoleIds: ['role-1'],
        },
        {
            key: 'expense_viewer',
            module: 'expense',
            scopeType: 'reporting_chain',
            scopeConfig: null,
            isImplied: false,
            sourceRoleIds: ['role-2'],
        },
    ],
};

describe('authorization snapshot', () => {
    it('validates the versioned server contract', () => {
        expect(parseAuthorizationSnapshot(snapshot)).toEqual(snapshot);
        expect(() =>
            parseAuthorizationSnapshot({ ...snapshot, schemaVersion: 2 }),
        ).toThrow();
    });

    it('builds exact permission and capability indexes', () => {
        const { permissionSet, grantsByCapability } =
            buildAuthorizationIndexes(snapshot);

        expect(hasPermission(permissionSet, 'expense.report.manage')).toBe(true);
        expect(hasPermission(permissionSet, 'expense.report.create')).toBe(false);
        expect(
            hasAnyPermission(permissionSet, [
                'expense.report.create',
                'expense.report.read_company',
            ]),
        ).toBe(true);
        expect(
            hasAllPermissions(permissionSet, [
                'expense.report.manage',
                'expense.report.read_company',
            ]),
        ).toBe(true);
        expect(grantsByCapability.get('expense_viewer')).toHaveLength(2);
    });

    it('does not treat manage as an implicit wildcard', () => {
        const { permissionSet } = buildAuthorizationIndexes(snapshot);

        expect(hasPermission(permissionSet, 'expense.report.manage')).toBe(true);
        expect(hasPermission(permissionSet, 'expense.report.approve')).toBe(false);
    });

    it('returns unique scopes for multi-role grants', () => {
        expect(uniqueCapabilityScopes(snapshot.capabilityGrants)).toEqual([
            'department',
            'reporting_chain',
        ]);
    });

    it('denies empty any/all requirements by default', () => {
        const { permissionSet } = buildAuthorizationIndexes(snapshot);

        expect(hasAnyPermission(permissionSet, [])).toBe(false);
        expect(hasAllPermissions(permissionSet, [])).toBe(false);
    });
});
