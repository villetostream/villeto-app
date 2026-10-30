import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useEntityWorkspaceStore,
  workspaceQueryKey,
  workspaceReadOnly,
  type WorkspaceSnapshot,
} from "./store";
import {
  workspaceRoute,
  stripAllEntityFilter,
  responseEntity,
  reportReviewRoute,
  optionalWorkspaceDetail,
} from "./transport";

const snapshot: WorkspaceSnapshot = {
  enabled: true,
  canSwitch: true,
  canViewAll: true,
  primaryAssignment: { legalEntityId: "A" },
  defaultSelection: "A",
  blockers: [],
  entities: [
    {
      legalEntityId: "A",
      code: "A",
      legalName: "Entity A",
      baseCurrency: "USD",
      status: "active",
      readinessStatus: "procurement_ready",
      readOnly: false,
    },
    {
      legalEntityId: "B",
      code: "B",
      legalName: "Entity B",
      baseCurrency: "NGN",
      status: "inactive",
      readinessStatus: "procurement_ready",
      readOnly: true,
    },
  ],
};

beforeEach(() => {
  useEntityWorkspaceStore.getState().reset("company:user");
  useEntityWorkspaceStore.getState().hydrate(snapshot);
});
afterEach(() => vi.unstubAllGlobals());
describe("workspace state and request boundaries", () => {
  it("keys data by actor and selected entity, including All mode", () => {
    const a = workspaceQueryKey(["invoices"]);
    useEntityWorkspaceStore.getState().select("all");
    const all = workspaceQueryKey(["invoices"]);
    expect(a).not.toEqual(all);
    useEntityWorkspaceStore.getState().reset("other-company:user");
    expect(workspaceQueryKey(["invoices"])).not.toEqual(a);
  });
  it("clears revoked selections during snapshot refresh", () => {
    useEntityWorkspaceStore.getState().select("B");
    useEntityWorkspaceStore
      .getState()
      .hydrate({ ...snapshot, entities: [snapshot.entities[0]] });
    expect(useEntityWorkspaceStore.getState().selection).toBe("A");
  });
  it("invalidates All results when grants shrink without changing the selection", () => {
    useEntityWorkspaceStore.getState().select("all");
    const key = workspaceQueryKey(["invoices"]);
    const generation = useEntityWorkspaceStore.getState().generation;
    useEntityWorkspaceStore
      .getState()
      .hydrate({ ...snapshot, entities: [snapshot.entities[0]] });
    expect(useEntityWorkspaceStore.getState().selection).toBe("all");
    expect(useEntityWorkspaceStore.getState().generation).toBeGreaterThan(
      generation,
    );
    expect(workspaceQueryKey(["invoices"])).not.toEqual(key);
  });
  it("invalidates data when business authorization changes with the same entity grants", () => {
    useEntityWorkspaceStore
      .getState()
      .hydrate({ ...snapshot, authorizationRevision: "before" });
    const key = workspaceQueryKey(["invoices"]);
    useEntityWorkspaceStore
      .getState()
      .hydrate({ ...snapshot, authorizationRevision: "revoked" });
    expect(workspaceQueryKey(["invoices"])).not.toEqual(key);
    expect(useEntityWorkspaceStore.getState().selection).toBe("A");
  });
  it("stores selections in tab-local storage separately for each actor", () => {
    const newTab = () => {
      const values = new Map<string, string>();
      return {
        getItem: (key: string) => values.get(key) || null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      };
    };
    const tabOne = newTab(),
      tabTwo = newTab();
    vi.stubGlobal("window", { sessionStorage: tabOne });
    useEntityWorkspaceStore.getState().select("B");
    useEntityWorkspaceStore.getState().reset("company:other-user");
    useEntityWorkspaceStore.getState().hydrate(snapshot);
    expect(useEntityWorkspaceStore.getState().selection).toBe("A");
    useEntityWorkspaceStore.getState().reset("company:user");
    useEntityWorkspaceStore.getState().hydrate(snapshot);
    expect(useEntityWorkspaceStore.getState().selection).toBe("B");
    vi.stubGlobal("window", { sessionStorage: tabTwo });
    useEntityWorkspaceStore.getState().reset("company:user");
    useEntityWorkspaceStore.getState().hydrate(snapshot);
    expect(useEntityWorkspaceStore.getState().selection).toBe("A");
  });
  it("clamps ordinary users and rejects unavailable choices", () => {
    useEntityWorkspaceStore
      .getState()
      .hydrate({ ...snapshot, canSwitch: false, canViewAll: false });
    expect(() => useEntityWorkspaceStore.getState().select("B")).toThrow();
    expect(() => useEntityWorkspaceStore.getState().select("all")).toThrow();
  });
  it("protects pending mutations and tracks unsaved state", () => {
    const state = useEntityWorkspaceStore.getState();
    state.setDirty(true);
    state.mutationStarted();
    expect(() => state.select("B")).toThrow("Wait for");
    state.mutationFinished();
    state.select("B");
    expect(useEntityWorkspaceStore.getState().dirty).toBe(false);
    expect(workspaceReadOnly()).toBe(true);
  });
  it("keeps profile and personal expense requests outside workspace filtering", () => {
    expect(workspaceRoute("/users/me")).toBe(false);
    expect(workspaceRoute("users?invited=true")).toBe(true);
    expect(workspaceRoute("users", "POST")).toBe(false);
    expect(workspaceRoute("/users/invite", "POST")).toBe(false);
    expect(workspaceRoute("/reports")).toBe(false);
    expect(reportReviewRoute("/reports?scope=own")).toBe(false);
    expect(reportReviewRoute("/reports?scope=department")).toBe(true);
    expect(workspaceRoute("/bill-pay/intakes")).toBe(true);
  });
  it("sends selected context for reviewer details and buyer vendor-network reads", () => {
    // The server distinguishes personal expense owners from reviewers using the
    // authenticated actor. Owners retain history even with a selected header.
    expect(optionalWorkspaceDetail("/reports/report-id")).toBe(true);
    expect(optionalWorkspaceDetail("/reports/report-id", "DELETE")).toBe(false);
    expect(workspaceRoute("/reports/report-id")).toBe(false);
    expect(workspaceRoute("/vendor-network/vendors/vendor-id")).toBe(true);
    expect(
      workspaceRoute("/vendor-network/vendor/company/vendor-id/documents"),
    ).toBe(true);
    expect(workspaceRoute("/vendor-network/me/companies")).toBe(false);
    expect(workspaceRoute("/vendor-network/vendors/vendor-id/review")).toBe(
      false,
    );
  });
  it("keeps supplier and organization setup paths independent of browser selection", () => {
    expect(workspaceRoute("/vendors/me/companies")).toBe(false);
    expect(workspaceRoute("/vendors/me/switch-company", "POST")).toBe(false);
    expect(workspaceRoute("/vendors/vendor-id/sites", "POST")).toBe(false);
    expect(
      workspaceRoute("/vendors/vendor-id/entity-relationships", "POST"),
    ).toBe(true);
    expect(workspaceRoute("/vendor-network/administration/vendors")).toBe(
      false,
    );
    expect(workspaceRoute("/policy/procurement/spend-programs/settings")).toBe(
      false,
    );
    expect(workspaceRoute("/policy/procurement/spend-programs")).toBe(true);
    expect(workspaceRoute("/policy/procurement/spend-programs/prog-1")).toBe(
      true,
    );
    expect(workspaceRoute("/policy/procurement/spend-programs", "POST")).toBe(
      true,
    );
    expect(workspaceRoute("/policy/procurement", "POST")).toBe(false);
    expect(workspaceRoute("/policy/procurement/drafts/policy-id")).toBe(true);
    expect(workspaceRoute("/policy")).toBe(true);
    expect(workspaceRoute("/policy?excludeDrafts=false")).toBe(true);
    expect(workspaceRoute("/policy", "POST")).toBe(true);
    expect(workspaceRoute("/policy/pol-1")).toBe(true);
    expect(workspaceRoute("/policy/pol-1", "PATCH")).toBe(true);
    expect(workspaceRoute("/policy/pol-1", "DELETE")).toBe(true);
    expect(workspaceRoute("/policy/pol-1/approve", "PATCH")).toBe(true);
    expect(workspaceRoute("/policy/pol-1/reject", "PATCH")).toBe(true);
    expect(workspaceRoute("/policy/drafts")).toBe(true);
    expect(workspaceRoute("/policy/drafts", "POST")).toBe(true);
    expect(workspaceRoute("/policy/drafts/draft-1")).toBe(true);
    expect(workspaceRoute("/policy/approval-settings")).toBe(false);
    expect(
      workspaceRoute(
        "https://api.villeto.com/policy/procurement/spend-programs?page=1&limit=100",
      ),
    ).toBe(true);
    expect(
      workspaceRoute("https://api.villeto.com/policy?excludeDrafts=false"),
    ).toBe(true);
  });
  it("uses All as header context while preserving ordinary search filters", () => {
    expect(
      stripAllEntityFilter("/bill-pay/invoices?legalEntityId=all&page=2"),
    ).toBe("/bill-pay/invoices?page=2");
    expect(
      responseEntity({
        data: {
          data: { paymentRequest: { legalEntity: { legalEntityId: "A" } } },
        },
      }),
    ).toBe("A");
  });
});
