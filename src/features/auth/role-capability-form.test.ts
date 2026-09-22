import { describe, expect, it } from "vitest";
import type { CapabilityGroup } from "@/queries/role/get-all-roles";
import {
  capabilitiesEqual,
  changeCapabilityScope,
  compactCapability,
  newlySelectedSensitiveCapabilities,
  toggleScopeResource,
} from "./role-capability-form";

const group = (key: string, riskLevel: CapabilityGroup["riskLevel"]): CapabilityGroup => ({
  capabilityGroupId: key,
  key,
  name: key,
  description: "",
  module: "procurement",
  sortOrder: 1,
  isActive: true,
  supportedScopes: ["own", "department", "company"],
  defaultScope: "own",
  riskLevel,
  isBaseCapability: false,
  scopePermissions: {},
  requiredCapabilityKeys: [],
  permissions: [],
});

describe("role capability form", () => {
  it("removes invalid department constraints after changing scope", () => {
    const result = changeCapabilityScope(
      [{ key: "requester", scopeType: "department", scopeConfig: { departmentIds: ["b", "a"] } }],
      "requester",
      "company",
    );
    expect(result).toEqual([{ key: "requester", scopeType: "company" }]);
  });

  it("omits empty scope arrays and sorts resource ids", () => {
    const capability = compactCapability({
      key: "requester",
      scopeType: "department",
      scopeConfig: { departmentIds: ["b", "a", "a"], legalEntityIds: [] },
    });
    expect(capability.scopeConfig).toEqual({ departmentIds: ["a", "b"] });
  });

  it("treats semantically identical inputs as equal", () => {
    expect(
      capabilitiesEqual(
        [{ key: "b", scopeType: "own" }, { key: "a", scopeType: "company" }],
        [{ key: "a", scopeType: "company", scopeConfig: {} }, { key: "b", scopeType: "own" }],
      ),
    ).toBe(true);
  });

  it("tracks resource constraints without sending empty arrays", () => {
    const selected = [{ key: "requester", scopeType: "own" as const }];
    const added = toggleScopeResource(selected, "requester", "legalEntityIds", "entity-1");
    const removed = toggleScopeResource(added, "requester", "legalEntityIds", "entity-1");
    expect(added[0].scopeConfig).toEqual({ legalEntityIds: ["entity-1"] });
    expect(removed).toEqual(selected);
  });

  it("only flags newly-added sensitive capabilities", () => {
    const catalog = [group("existing", "sensitive"), group("added", "sensitive"), group("safe", "standard")];
    expect(
      newlySelectedSensitiveCapabilities(
        [{ key: "existing", scopeType: "company" }],
        [
          { key: "existing", scopeType: "company" },
          { key: "added", scopeType: "company" },
          { key: "safe", scopeType: "own" },
        ],
        catalog,
      ),
    ).toEqual(["added"]);
  });
});
