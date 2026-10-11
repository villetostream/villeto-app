import { beforeEach, describe, expect, it } from "vitest";
import { useEntityWorkspaceStore, workspaceQueryKey, workspaceReadOnly, type WorkspaceSnapshot } from "./store";
import { workspaceRoute, stripAllEntityFilter, responseEntity, reportReviewRoute } from "./transport";

const snapshot: WorkspaceSnapshot = { enabled: true, canSwitch: true, canViewAll: true, primaryAssignment: { legalEntityId: "A" }, defaultSelection: "A", blockers: [], entities: [
  { legalEntityId: "A", code: "A", legalName: "Entity A", baseCurrency: "USD", status: "active", readinessStatus: "procurement_ready", readOnly: false },
  { legalEntityId: "B", code: "B", legalName: "Entity B", baseCurrency: "NGN", status: "inactive", readinessStatus: "procurement_ready", readOnly: true },
] };

beforeEach(() => { useEntityWorkspaceStore.getState().reset("company:user"); useEntityWorkspaceStore.getState().hydrate(snapshot); });
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
    useEntityWorkspaceStore.getState().hydrate({ ...snapshot, entities: [snapshot.entities[0]] });
    expect(useEntityWorkspaceStore.getState().selection).toBe("A");
  });
  it("clamps ordinary users and rejects unavailable choices", () => {
    useEntityWorkspaceStore.getState().hydrate({ ...snapshot, canSwitch: false, canViewAll: false });
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
    expect(workspaceRoute("/reports")).toBe(false);
    expect(reportReviewRoute("/reports?scope=own")).toBe(false);
    expect(reportReviewRoute("/reports?scope=department")).toBe(true);
    expect(workspaceRoute("/bill-pay/intakes")).toBe(true);
  });
  it("uses All as header context while preserving ordinary search filters", () => {
    expect(stripAllEntityFilter("/bill-pay/invoices?legalEntityId=all&page=2")).toBe("/bill-pay/invoices?page=2");
    expect(responseEntity({ data: { data: { paymentRequest: { legalEntity: { legalEntityId: "A" } } } } })).toBe("A");
  });
});
