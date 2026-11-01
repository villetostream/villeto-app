import { describe, expect, it } from "vitest";
import {
  requiresPurchasingHold,
  shouldRefreshAfterEndConflict,
  type EndingRelationship,
  type EndingSiteAssignment,
} from "./end-site-assignment";

const now = Date.parse("2026-11-01T12:00:00Z");
const assignment: EndingSiteAssignment = {
  vendorEntitySiteAssignmentId: "ending",
  purpose: "purchasing",
  status: "active",
  effectiveFrom: "2026-01-01T00:00:00Z",
  effectiveTo: null,
  site: { status: "active", name: "Lagos" },
};
const relationship: EndingRelationship = {
  purchasingEnabled: true,
  status: "approved",
  legalEntity: { displayName: "Acme", legalName: "Acme Ltd" },
  siteAssignments: [assignment],
};

describe("ending purchasing assignments", () => {
  it("requires a hold for the last purchasing site even when other purposes remain", () => {
    const invoicing = {
      ...assignment,
      vendorEntitySiteAssignmentId: "invoice",
      purpose: "invoicing" as const,
    };
    expect(
      requiresPurchasingHold(
        { ...relationship, siteAssignments: [assignment, invoicing] },
        assignment,
        now,
      ),
    ).toBe(true);
  });

  it("keeps the ordinary action when another effective purchasing site remains", () => {
    const replacement = {
      ...assignment,
      vendorEntitySiteAssignmentId: "replacement",
    };
    expect(
      requiresPurchasingHold(
        { ...relationship, siteAssignments: [assignment, replacement] },
        assignment,
        now,
      ),
    ).toBe(false);
  });

  it.each([
    { status: "inactive" as const },
    { site: { name: "Closed site", status: "inactive" as const } },
    { site: null },
    { effectiveFrom: "2026-11-02T00:00:00Z" },
    { effectiveTo: "2026-11-01T12:00:00Z" },
  ])("does not count an unavailable replacement: %j", (changes) => {
    const replacement = {
      ...assignment,
      vendorEntitySiteAssignmentId: "replacement",
      ...changes,
    };
    expect(
      requiresPurchasingHold(
        { ...relationship, siteAssignments: [assignment, replacement] },
        assignment,
        now,
      ),
    ).toBe(true);
  });

  it("does not request a hold if purchasing is already disabled", () => {
    expect(
      requiresPurchasingHold(
        { ...relationship, purchasingEnabled: false },
        assignment,
        now,
      ),
    ).toBe(false);
  });

  it.each(["invoicing", "remit_to"] as const)(
    "does not offer the purchasing action for %s",
    (purpose) => {
      expect(
        requiresPurchasingHold(relationship, { ...assignment, purpose }, now),
      ).toBe(false);
    },
  );

  it("does not request a hold for an assignment already ended", () => {
    expect(
      requiresPurchasingHold(
        relationship,
        { ...assignment, status: "inactive" },
        now,
      ),
    ).toBe(false);
  });
});

describe("refreshing stale end confirmations", () => {
  it.each([
    "VENDOR_ENTITY_RELATIONSHIP_VERSION_CONFLICT",
    "VENDOR_SITE_ASSIGNMENT_CHANGED",
    "VENDOR_SITE_ASSIGNMENT_REQUIRED",
  ])("handles flat and HTTP-filter envelopes for %s", (code) => {
    expect(shouldRefreshAfterEndConflict({ code }, "purchasing")).toBe(true);
    expect(
      shouldRefreshAfterEndConflict({ data: { code } }, "purchasing"),
    ).toBe(true);
  });
  it("preserves other errors and non-purchasing purpose guards", () => {
    expect(
      shouldRefreshAfterEndConflict(
        { code: "VENDOR_SITE_ASSIGNMENT_REQUIRED" },
        "invoicing",
      ),
    ).toBe(false);
    expect(shouldRefreshAfterEndConflict({ data: null }, "purchasing")).toBe(
      false,
    );
    expect(shouldRefreshAfterEndConflict(undefined, "purchasing")).toBe(false);
  });
});
