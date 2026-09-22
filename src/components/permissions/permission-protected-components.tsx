"use client";

import { useAuthStore } from "@/stores/auth-stores";
import React from "react";

interface PermissionGate {
  resource: string;
  action: string;
}

interface PermissionGuardProps {
  resource?: string;
  action?: string;
  anyOf?: string[];
  allOf?: string[];
  /** @deprecated Use anyOf with complete permission names. */
  permissions?: PermissionGate[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  resource,
  action,
  anyOf,
  allOf,
  permissions,
  fallback = null,
  children,
}) => {
  const can = useAuthStore((state) => state.can);
  const canAny = useAuthStore((state) => state.canAny);
  const canAll = useAuthStore((state) => state.canAll);
  useAuthStore((state) => state.authorization?.revision); // trigger re-render

  const requirements: boolean[] = [];

  if (anyOf?.length) {
    requirements.push(canAny(anyOf));
  }

  if (allOf?.length) {
    requirements.push(canAll(allOf));
  }

  if (permissions && permissions.length > 0) {
    requirements.push(permissions.some((p) => can(p.resource, p.action)));
  }

  if (resource && action) {
    requirements.push(can(resource, action));
  }

  const hasAccess = requirements.length > 0 && requirements.every(Boolean);
  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

export default PermissionGuard;
