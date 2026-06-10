"use client";

import { useAuthStore } from "@/stores/auth-stores";
import React from "react";

// ─── PermissionGuard ──────────────────────────────────────────────────────────
// Renders children only when the current user holds the given resource+action.
//
// Usage (preferred):
//   <PermissionGuard resource="vendor" action="approve">
//     <ApproveButton />
//   </PermissionGuard>
//
// Optional fallback:
//   <PermissionGuard resource="vendor" action="approve" fallback={<ReadOnlyView />}>
//     <ApproveButton />
//   </PermissionGuard>
//
// Legacy usage (deprecated but supported during migration):
//   <PermissionGuard requiredPermissions={["vendor.approve"]}>...</PermissionGuard>

interface PermissionGuardProps {
  /** resource to check, e.g. "vendor", "expense.report" */
  resource?: string;
  /** action to check, e.g. "approve", "read_company" */
  action?: string;

  /** Array of structured permissions (evaluates as OR). Use this instead of resource/action for multiple gates. */
  permissions?: { resource: string; action: string }[];

  /**
   * @deprecated Use resource + action props instead.
   * Accepts "resource.action" or "resource:action" strings.
   */
  requiredPermissions?: string[];

  /** Rendered when the user does NOT have the permission. Defaults to null (invisible). */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  resource,
  action,
  permissions,
  requiredPermissions,
  fallback = null,
  children,
}) => {
  const can = useAuthStore(state => state.can);
  const hasPermission = useAuthStore(state => state.hasPermission);

  // ── New preferred path (Multiple OR) ──
  if (permissions && permissions.length > 0) {
    const hasAny = permissions.some((p) => can(p.resource, p.action));
    return hasAny ? <>{children}</> : <>{fallback}</>;
  }

  // ── New preferred path (Single) ──
  if (resource && action) {
    return can(resource, action) ? <>{children}</> : <>{fallback}</>;
  }

  // ── Legacy path (deprecated) ──
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return <>{children}</>;
  }

  return hasPermission(requiredPermissions) ? <>{children}</> : <>{fallback}</>;
};

export default PermissionGuard;
