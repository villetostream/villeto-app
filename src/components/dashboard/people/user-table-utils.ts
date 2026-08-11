import { AppUser } from "@/queries/departments/get-all-departments";
import { Department } from "@/queries/departments/get-all-departments";
import { Role } from "@/queries/role/get-all-roles";
import { isRecord } from "@/lib/types/api-error";

export function toStringFilterRecord(filters: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
  }
  return result;
}

export function unwrapFilterKeys(filters: Record<string, unknown>): Record<string, unknown> {
  const unwrapped: Record<string, unknown> = {};
  Object.entries(filters).forEach(([key, value]) => {
    const match = key.match(/filters\[(.*?)\]/);
    if (match) unwrapped[match[1]] = value;
    else unwrapped[key] = value;
  });
  return unwrapped;
}

export function getUserRoleId(u: AppUser): string | undefined {
  if (u.villetoRole?.roleId) return u.villetoRole.roleId;
  const roleId = (u as unknown as Record<string, unknown>).roleId;
  if (typeof roleId === "string") return roleId;
  return undefined;
}

export function getUserDepartmentId(u: AppUser): string | undefined {
  if (u.department && typeof u.department === "object") {
    const dept = u.department as any;
    if (typeof dept.departmentId === "string") return dept.departmentId;
    if (typeof dept.id === "string") return dept.id;
    if (typeof dept._id === "string") return dept._id;
  }
  if (typeof u.departmentId === "string") return u.departmentId;
  const anyUser = u as any;
  if (typeof anyUser.department === "string") return anyUser.department;
  return undefined;
}

export function getUserManagerName(u: AppUser): string {
  const manager = u.manager ?? (u as unknown as Record<string, unknown>).manager;
  if (!manager) return "";
  if (typeof manager === "string") return manager.toLowerCase();
  if (isRecord(manager)) {
    const first = typeof manager.firstName === "string" ? manager.firstName : "";
    const last = typeof manager.lastName === "string" ? manager.lastName : "";
    return `${first} ${last}`.trim().toLowerCase();
  }
  return "";
}

export function formatRoleOptionLabel(role: Role): string {
  if (!role.name) return "Unknown";
  return role.name
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function formatDepartmentOptionLabel(dept: Department): string {
  return dept.departmentName || (typeof dept.code === "string" ? dept.code : "") || "Unknown";
}

export function getDepartmentOptionValue(dept: Department): string {
  const d = dept as any;
  return d.departmentId || d.id || d._id || d.code || "Unknown";
}
