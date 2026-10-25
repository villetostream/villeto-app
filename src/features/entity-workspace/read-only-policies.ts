import type { AuthorizationPolicies } from "@/features/auth/policies";

export function applyWorkspaceReadOnlyPolicies(
  policies: AuthorizationPolicies,
  readOnly: boolean,
): AuthorizationPolicies {
  if (!readOnly) return policies;
  const result = { ...policies };
  for (const key of [
    "purchaseRequests",
    "purchaseOrders",
    "vendorInvoices",
    "billPay",
    "accounting",
    "expenses",
  ] as const) {
    const value = result[key];
    const filtered = Object.fromEntries(
      Object.entries(value).map(([name, allowed]) => [
        name,
        name.startsWith("can") && !/^can(View|Read|Download)/.test(name)
          ? false
          : allowed,
      ]),
    );
    Object.assign(result, { [key]: filtered });
  }
  result.people = {
    ...result.people,
    canManageUsers: false,
    canManageDepartments: false,
    canManageRoles: false,
  };
  result.legalEntities = {
    ...result.legalEntities,
    canManage: false,
    canManageAssignments: false,
  };
  return result;
}
