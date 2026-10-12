import { describe, expect, it } from "vitest";
import { buildAuthorizationPolicies } from "@/features/auth/policies";
import { applyWorkspaceReadOnlyPolicies } from "./read-only-policies";

describe("read-only workspace action controls", () => {
  it("preserves read and personal expense capabilities while disabling financial mutations", () => {
    const authorization = {
      schemaVersion: 1,
      revision: "fixture",
      capabilityGrants: [
        {
          key: "purchase_request_viewer",
          module: "procurement",
          scopeType: "company",
          scopeConfig: null,
          isImplied: false,
          sourceRoleIds: ["role"],
        },
      ],
      permissions: [
        "procurement.purchase_request.read_company",
        "procurement.purchase_request.create",
        "bill_pay.invoice.view",
        "bill_pay.invoice.create",
        "expense.report.create",
        "expense.report.approve_department",
      ],
    } as const;
    const policies = buildAuthorizationPolicies(authorization as never);
    const readOnly = applyWorkspaceReadOnlyPolicies(policies, true);
    expect(readOnly.purchaseRequests.canView).toBe(true);
    expect(readOnly.purchaseRequests.canCreate).toBe(false);
    expect(readOnly.billPay.canViewInvoices).toBe(true);
    expect(readOnly.billPay.canCreateInvoice).toBe(false);
    expect(readOnly.expenses.canCreate).toBe(true);
    expect(readOnly.expenses.canApprove).toBe(false);
    expect(policies.purchaseRequests.canCreate).toBe(true);
  });
});
