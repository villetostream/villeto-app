import { describe, expect, it } from "vitest";
import type { AuthorizationSnapshot } from "./types";
import { buildAuthorizationPolicies, strongestScope, toApiListScope } from "./policies";

function snapshot(
  permissions: string[],
  capabilityGrants: AuthorizationSnapshot["capabilityGrants"] = [],
): AuthorizationSnapshot {
  return { schemaVersion: 1, revision: "test", permissions, capabilityGrants };
}

describe("authorization policies", () => {
  it("uses capability grants, not role names, to resolve list scope", () => {
    const policies = buildAuthorizationPolicies(snapshot(
      ["procurement.purchase_request.read_department"],
      [{
        key: "purchase_request_viewer",
        module: "procurement",
        scopeType: "reporting_chain",
        scopeConfig: null,
        isImplied: false,
        sourceRoleIds: ["role-1"],
      }],
    ));
    expect(policies.purchaseRequests.listScope).toBe("team");
  });

  it("selects the strongest scope across multiple roles", () => {
    expect(strongestScope([
      { key: "expense_viewer", module: "expense", scopeType: "own", scopeConfig: null, isImplied: false, sourceRoleIds: [] },
      { key: "expense_viewer", module: "expense", scopeType: "company", scopeConfig: null, isImplied: false, sourceRoleIds: [] },
    ])).toBe("company");
    expect(toApiListScope("reporting_chain")).toBe("team");
  });

  it("does not accept obsolete generic approval permissions", () => {
    const legacy = buildAuthorizationPolicies(snapshot(["procurement.purchase_request.approve"]));
    const current = buildAuthorizationPolicies(snapshot(["procurement.purchase_request.approve_department"]));
    expect(legacy.purchaseRequests.canApprove).toBe(false);
    expect(current.purchaseRequests.canApprove).toBe(true);
  });

  it("separates safe vendor directory access from sensitive vendor access", () => {
    const policies = buildAuthorizationPolicies(snapshot(["vendor.directory.read"]));
    expect(policies.vendors.canUseDirectory).toBe(true);
    expect(policies.vendors.canViewSensitive).toBe(false);
  });

  it("uses the seeded people-directory permissions", () => {
    const policies = buildAuthorizationPolicies(snapshot([
      "user.directory.read",
      "department.read_company",
    ]));
    expect(policies.people.canViewUsers).toBe(true);
    expect(policies.people.canViewDepartments).toBe(true);
    expect(policies.people.canViewRoles).toBe(false);
  });

  it("keeps payment viewing separate from payment execution", () => {
    const policies = buildAuthorizationPolicies(snapshot([
      "bill_pay.payment_request.view",
      "bill_pay.payment.view",
    ]));
    expect(policies.billPay.canViewPayments).toBe(true);
    expect(policies.billPay.canInitiatePayment).toBe(false);
    expect(policies.billPay.canViewSensitivePayment).toBe(false);
  });

  it("centralizes legal-entity and vendor-invoice decisions", () => {
    const policies = buildAuthorizationPolicies(snapshot([
      "legal_entity.manage",
      "procurement.vendor_invoice.read_company",
      "procurement.vendor_invoice.review",
    ]));
    expect(policies.legalEntities.canView).toBe(true);
    expect(policies.legalEntities.canManage).toBe(true);
    expect(policies.vendorInvoices.canView).toBe(true);
    expect(policies.vendorInvoices.canReview).toBe(true);
    expect(policies.vendorInvoices.canApprove).toBe(false);
  });

  it("separates viewing employee entity assignments from changing them", () => {
    const viewer = buildAuthorizationPolicies(snapshot([
      "legal_entity.assignment.view",
    ]));
    const manager = buildAuthorizationPolicies(snapshot([
      "legal_entity.assignment.manage",
    ]));

    expect(viewer.legalEntities.canViewAssignments).toBe(true);
    expect(viewer.legalEntities.canManageAssignments).toBe(false);
    expect(manager.legalEntities.canViewAssignments).toBe(true);
    expect(manager.legalEntities.canManageAssignments).toBe(true);
  });
});
