import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { buildAuthorizationPolicies } from "@/features/auth/policies";
import { applyWorkspaceReadOnlyPolicies } from "@/features/entity-workspace/read-only-policies";
import { workspaceRoute } from "@/features/entity-workspace/transport";
import {
  resolveVendorLifecycleStatus,
  normalizeVendorSite,
  normalizeConnectedLegalEntities,
  isLegalEntitySelectionRequiredError,
} from "./vendor-network";

describe("vendor V2 lifecycle, sites, master directory & workspace boundaries", () => {
  it("prefers canonical lifecycleStatus and falls back safely for legacy payloads", () => {
    expect(
      resolveVendorLifecycleStatus({
        lifecycleStatus: "pending_vendor_action",
        status: "active",
      }),
    ).toBe("pending_vendor_action");

    expect(
      resolveVendorLifecycleStatus({
        lifecycleStatus: "pending_company_approval",
      }),
    ).toBe("pending_company_approval");

    expect(
      resolveVendorLifecycleStatus({
        onboardingStatus: "submitted",
        approvalStatus: "pending",
      }),
    ).toBe("pending_company_approval");

    expect(
      resolveVendorLifecycleStatus({
        status: "Active",
        approvalStatus: "approved",
      }),
    ).toBe("active");

    expect(
      resolveVendorLifecycleStatus({
        approvalStatus: "approved",
        deactivatedAt: "2026-10-01T00:00:00Z",
      }),
    ).toBe("inactive");
  });

  it("normalizes both address and addressLine1 on V2 vendor sites", () => {
    const fromAddress = normalizeVendorSite({
      vendorSiteId: "site-1",
      vendorId: "vendor-1",
      code: "LAGOS-HQ",
      name: "Lagos Head Office",
      address: "10 Marina Road",
      city: "Lagos",
      stateOrProvince: "Lagos",
      countryCode: "NG",
      isPrimary: true,
      isAttachedToEntity: true,
      legalEntityCount: 2,
      legalEntities: [
        { legalEntityId: "le-1", legalName: "Entity A" },
        { legalEntityId: "le-2", legalName: "Entity B" },
      ],
    });

    expect(fromAddress.addressLine1).toBe("10 Marina Road");
    expect(fromAddress.isPrimary).toBe(true);
    expect(fromAddress.isAssignedToLegalEntity).toBe(true);
    expect(fromAddress.legalEntityCount).toBe(2);
    expect(fromAddress.legalEntities).toHaveLength(2);

    const fromAddressLine1 = normalizeVendorSite({
      siteId: "site-2",
      code: "ABUJA-WH",
      name: "Abuja Warehouse",
      addressLine1: "25 Central Avenue",
      status: "inactive",
      isAssignedToLegalEntity: false,
    });

    expect(fromAddressLine1.vendorSiteId).toBe("site-2");
    expect(fromAddressLine1.addressLine1).toBe("25 Central Avenue");
    expect(fromAddressLine1.status).toBe("inactive");
    expect(fromAddressLine1.isAssignedToLegalEntity).toBe(false);
  });

  it("extracts connected legal entities from V2 master detail or legacy relationships", () => {
    const v2 = normalizeConnectedLegalEntities({
      legalEntityCount: 2,
      legalEntities: [
        { legalEntityId: "le-a", legalName: "Entity A" },
        { legalEntityId: "le-b", legalName: "Entity B" },
      ],
    });
    expect(v2.legalEntityCount).toBe(2);
    expect(v2.legalEntities.map((e) => e.legalEntityId)).toEqual([
      "le-a",
      "le-b",
    ]);

    const legacy = normalizeConnectedLegalEntities({
      entityRelationships: [
        { legalEntity: { legalEntityId: "le-x", legalName: "Entity X" } },
      ],
    });
    expect(legacy.legalEntityCount).toBe(1);
    expect(legacy.legalEntities[0].legalName).toBe("Entity X");
  });

  it("detects LEGAL_ENTITY_SELECTION_REQUIRED error payloads", () => {
    const axiosErr = new AxiosError(
      "Bad Request",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: {
          code: "LEGAL_ENTITY_SELECTION_REQUIRED",
          message: "Select a legal entity before sending invitation",
        },
      },
    );
    expect(isLegalEntitySelectionRequiredError(axiosErr)).toBe(true);
    expect(isLegalEntitySelectionRequiredError(new Error("Other"))).toBe(false);
  });

  it("exposes vendor.master_list.manage in policies and preserves it in All mode", () => {
    const policies = buildAuthorizationPolicies({
      schemaVersion: 1,
      revision: "master-list-test",
      capabilityGrants: [],
      permissions: ["vendor.directory.read", "vendor.master_list.manage"],
    });
    expect(policies.vendors.canManageMasterList).toBe(true);
    expect(
      applyWorkspaceReadOnlyPolicies(policies, true).vendors
        .canManageMasterList,
    ).toBe(true);
  });

  it("keeps master directory & entity-invitation endpoints outside global workspace mutation blocking while scoping My Vendors", () => {
    expect(workspaceRoute("/vendor-network/vendors")).toBe(true);
    expect(workspaceRoute("/vendor-network/vendors/v-1")).toBe(true);
    expect(workspaceRoute("/vendor-network/administration/vendors")).toBe(false);
    expect(workspaceRoute("/vendor-network/administration/vendors/v-1")).toBe(
      false,
    );
    expect(
      workspaceRoute("/vendor-network/v2/entity-invitations", "POST"),
    ).toBe(false);
  });
});
