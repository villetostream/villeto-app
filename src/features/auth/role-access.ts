import type { CompanyPermission, User } from "./types";

type RoleWithPermissions = {
  roleId?: string;
  permissions?: CompanyPermission[];
};

type RolePayload = Partial<User> & {
  role?: RoleWithPermissions;
  companyRole?: RoleWithPermissions;
  companyRoles?: RoleWithPermissions[];
};

export function getCompanyRoles(payload?: RolePayload | null): RoleWithPermissions[] {
  if (!payload) return [];
  if (Array.isArray(payload.companyRoles) && payload.companyRoles.length > 0) {
    return payload.companyRoles;
  }
  const fallback = payload.companyRole ?? payload.role;
  return fallback ? [fallback] : [];
}

export function getEffectiveCompanyPermissions(payload?: RolePayload | null): CompanyPermission[] {
  const permissions = getCompanyRoles(payload).flatMap((role) => role.permissions ?? []);
  return [
    ...new Map(
      permissions.map((permission) => [
        permission.permissionId || permission.name || `${permission.resource}.${permission.action}`,
        permission,
      ]),
    ).values(),
  ];
}
