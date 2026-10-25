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
  result.expenses = {
    ...result.expenses,
    canApprove: false,
    canReject: false,
    canManageCompany: false,
  };
  return result;
}
