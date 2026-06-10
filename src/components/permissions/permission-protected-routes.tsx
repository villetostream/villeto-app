"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-stores";

// ─── withPermissions HOC ──────────────────────────────────────────────────────
// Wraps a page component and redirects to /dashboard if the user lacks the
// required permission. Uses the new can(resource, action) shape.
//
// Usage:
//   export default withPermissions(MyPage, [
//     { resource: "vendor", action: "read_company" }
//   ]);
//
// Legacy usage (deprecated — string[] still supported via hasPermission shim):
//   export default withPermissions(MyPage, ["vendor.read_company"]);

interface PermissionGate {
  resource: string;
  action: string;
}

const withPermissions = (
  WrappedComponent: React.ComponentType,
  requiredPermissions: PermissionGate[] | string[]
) => {
  return function PermissionWrapper(props: any) {
    const router = useRouter();
    const pathName = usePathname();
    const can = useAuthStore(state => state.can);
    const hasPermission = useAuthStore(state => state.hasPermission);

    const hasAccess = (): boolean => {
      if (!requiredPermissions || requiredPermissions.length === 0) return true;

      // New structured shape: { resource, action }[]
      if (typeof requiredPermissions[0] === "object") {
        return (requiredPermissions as PermissionGate[]).some(
          p => can(p.resource, p.action)
        );
      }

      // Legacy string[] shape — delegate to hasPermission shim
      return hasPermission(requiredPermissions as string[]);
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
