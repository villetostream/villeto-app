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
  permissions?: PermissionGate[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  resource,
  action,
  permissions,
  fallback = null,
  children,
}) => {
  const can = useAuthStore(state => state.can);

  if (permissions && permissions.length > 0) {
    const hasAny = permissions.some((p) => can(p.resource, p.action));
    return hasAny ? <>{children}</> : <>{fallback}</>;
  }

  if (resource && action) {
    return can(resource, action) ? <>{children}</> : <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGuard;
