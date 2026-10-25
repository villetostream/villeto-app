import { describe, expect, it } from "vitest";
import { vendorManagementQuery } from "./cache";
import { workspaceRoute } from "@/features/entity-workspace/transport";
import { buildAuthorizationPolicies } from "@/features/auth/policies";
import { applyWorkspaceReadOnlyPolicies } from "@/features/entity-workspace/read-only-policies";

describe("organization vendor administration boundaries", () => {
  it("refreshes vendor selectors across this actor's entity selections only", () => {
    const key = (identity: string, entity: string, family: string) => [
      "entity-workspace",
      identity,
      entity,
      1,
      family,
    ];
    for (const entity of ["A", "B", "all"]) {
      for (const family of ["vendors", "vendor-network", "vendor-management"])
        expect(
          vendorManagementQuery(
            key("company:actor", entity, family),
            "company:actor",
          ),
        ).toBe(true);
    }
    expect(
      vendorManagementQuery(
        key("other-company:actor", "A", "vendors"),
        "company:actor",
      ),
    ).toBe(false);
    expect(
      vendorManagementQuery(
        key("company:other-actor", "A", "vendors"),
        "company:actor",
      ),
    ).toBe(false);
    expect(
      vendorManagementQuery(
        key("company:actor", "A", "invoices"),
        "company:actor",
      ),
    ).toBe(false);
  });
  it("does not send the transaction workspace header on explicit organization administration requests", () => {
    for (const url of [
      "/vendor-management",
      "/vendor-management/vendor/profile",
      "/vendor-management/vendor/sites",
      "/vendor-management/vendor/entity-relationships",
      "/vendor-management/vendor/entity-relationships/relationship/approve",
    ]) {
      expect(workspaceRoute(url, "GET")).toBe(false);
      expect(workspaceRoute(url, "POST")).toBe(false);
    }
    expect(workspaceRoute("/procurement/purchase-orders", "POST")).toBe(true);
    expect(workspaceRoute("/legal-entities/entity/eligible-vendors")).toBe(
      true,
    );
  });
  it("preserves permitted organization actions in All mode while financial mutations stay read-only", () => {
    const policies = buildAuthorizationPolicies({
      schemaVersion: 1,
      revision: "test",
      capabilityGrants: [],
      permissions: [
        "vendor.directory.read",
        "vendor.create",
        "vendor.invite",
        "vendor.entity_configuration.manage",
        "procurement.purchase_request.create",
      ],
    });
    const all = applyWorkspaceReadOnlyPolicies(policies, true);
    expect(all.vendors.canInvite).toBe(true);
    expect(all.vendors.canCreate).toBe(true);
    expect(all.vendors.canUseDirectory).toBe(true);
    expect(all.vendors.canViewSensitive).toBe(false);
    expect(all.purchaseRequests.canCreate).toBe(false);
  });
});
