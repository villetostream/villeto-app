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

    const hasAccess = (): boolean => {
      if (!requiredPermissions || requiredPermissions.length === 0) return true;
      return requiredPermissions.some(p => can(p.resource, p.action));
    };

    useEffect(() => {
      if (!hasAccess()) {
        router.push("/dashboard");
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathName]);

    if (!hasAccess()) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
};

export default withPermissions;
