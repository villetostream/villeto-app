import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { workspaceFetch } from "./fetch";
import { useEntityWorkspaceStore, type WorkspaceSnapshot } from "./store";

const snapshot: WorkspaceSnapshot = {
  enabled: true,
  canSwitch: true,
  canViewAll: true,
  defaultSelection: "A",
  primaryAssignment: { legalEntityId: "A" },
  blockers: [],
  entities: ["A", "B"].map((id) => ({
    legalEntityId: id,
    code: id,
    legalName: id,
    baseCurrency: "USD",
    status: "active",
    readinessStatus: "payment_workflow_ready",
    readOnly: false,
  })),
};
beforeEach(() => {
  useEntityWorkspaceStore.getState().reset("company:user");
  useEntityWorkspaceStore.getState().hydrate(snapshot);
});
afterEach(() => vi.unstubAllGlobals());

describe("workspace fetch transport", () => {
  it("cancels old reads and discards late responses after switching", async () => {
    let resolve!: (response: Response) => void;
    let signal!: AbortSignal;
    vi.stubGlobal(
      "fetch",
      vi.fn((_input, init) => {
        signal = init.signal;
        return new Promise<Response>((complete) => {
          resolve = complete;
        });
      }),
    );
    const result = workspaceFetch("/bill-pay/invoices");
    useEntityWorkspaceStore.getState().select("B");
    expect(signal.aborted).toBe(true);
    resolve(new Response("{}"));
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
  });
  it("cancels All streams when an entity grant is revoked", async () => {
    useEntityWorkspaceStore.getState().select("all");
    const fetchMock = vi.fn().mockResolvedValue(new Response("data: fixture"));
    vi.stubGlobal("fetch", fetchMock);
    await workspaceFetch("/events/notifications", {
      headers: { Accept: "text/event-stream" },
    });
    const signal = fetchMock.mock.calls[0][1].signal;
    useEntityWorkspaceStore
      .getState()
      .hydrate({ ...snapshot, entities: [snapshot.entities[0]] });
    expect(signal.aborted).toBe(true);
  });
  it("preserves Request headers and enforces its mutation method in All mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await workspaceFetch(
      new Request("http://localhost/bill-pay/intakes", {
        method: "POST",
        headers: { Authorization: "Bearer fixture" },
        body: "{}",
      }),
    );
    expect(fetchMock.mock.calls[0][1].headers.get("Authorization")).toBe(
      "Bearer fixture",
    );
    expect(
      fetchMock.mock.calls[0][1].headers.get("X-Villeto-Legal-Entity"),
    ).toBe("A");
    expect(useEntityWorkspaceStore.getState().pendingMutations).toBe(0);
    useEntityWorkspaceStore.getState().select("all");
    await expect(
      workspaceFetch(
        new Request("http://localhost/bill-pay/intakes", {
          method: "POST",
          body: "{}",
        }),
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("keeps personal expense details available without a primary assignment", async () => {
    useEntityWorkspaceStore
      .getState()
      .hydrate({
        ...snapshot,
        canSwitch: false,
        canViewAll: false,
        primaryAssignment: null,
        defaultSelection: null,
        entities: [],
      });
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await workspaceFetch("/reports/owned-report");
    expect(
      fetchMock.mock.calls[0][1].headers.has("X-Villeto-Legal-Entity"),
    ).toBe(false);
    await expect(workspaceFetch("/bill-pay/invoices")).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
