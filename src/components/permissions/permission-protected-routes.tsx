"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-stores";

interface PermissionGate {
  resource: string;
  action: string;
}

const withPermissions = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermissions: PermissionGate[]
) => {
  return function PermissionWrapper(props: P) {
    const router = useRouter();
    const pathName = usePathname();
    const can = useAuthStore(state => state.can);
    const isAuthorizationLoading = useAuthStore(state => state.isLoading);
    const authorization = useAuthStore(state => state.authorization);
    const authorizationRevision = authorization?.revision;

    // Treat missing authorization snapshot as still-loading — never grant
    // access based on an empty permission set that could be the default
    // before the server has responded.
    const isReady = !isAuthorizationLoading && authorization !== null;

    const hasAccess = !requiredPermissions || requiredPermissions.length === 0
      ? true
      : requiredPermissions.some(p => can(p.resource, p.action));

    useEffect(() => {
      if (isReady && !hasAccess) {
        router.push("/dashboard");
      }
    }, [pathName, authorizationRevision, hasAccess, isReady, router]);

    if (!isReady || !hasAccess) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
};

export default withPermissions;
