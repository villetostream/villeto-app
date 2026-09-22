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
    const authorizationRevision = useAuthStore(
      state => state.authorization?.revision,
    );

    const hasAccess = !requiredPermissions || requiredPermissions.length === 0
      ? true
      : requiredPermissions.some(p => can(p.resource, p.action));

    useEffect(() => {
      if (!isAuthorizationLoading && !hasAccess) {
        router.push("/dashboard");
      }
    }, [pathName, authorizationRevision, hasAccess, isAuthorizationLoading, router]);

    if (isAuthorizationLoading || !hasAccess) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
};

export default withPermissions;
