// @vitest-environment jsdom
import React, { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatWidget } from "./ChatWidget";
import { useAuthStore } from "@/stores/auth-stores";
import { useChatStore } from "@/stores/useChatStore";
import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";
const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/hooks/useAxios", () => ({ useAxios: () => mocks }));
vi.mock("@/lib/tokenRefreshService", () => ({
  clearTokenRefresh: vi.fn(), scheduleTokenRefresh: vi.fn(),
}));
vi.mock("./ChatConversationPanel", () => ({ ChatConversationPanel: () => null }));
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  motion: { div: ({ children }: { children: ReactNode }) => <div>{children}</div> },
}));
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
const settle = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); }); };
const authorize = (permissions: string[]) => useAuthStore.getState().setAuthorization({
  schemaVersion: 1, revision: permissions.join(","), permissions, capabilityGrants: [],
});
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  useEntityWorkspaceStore.getState().reset("company:actor");
  authorize(["user.manage", "vendor.read_company"]);
  useChatStore.setState({ isOpen: false, activeTab: "team", teamMembers: [], vendors: [], conversations: [] });
  mocks.get.mockReset().mockImplementation(async (url: string) => ({
    data: {
      data: url.includes("users")
        ? [{ userId: "person", firstName: "Team", lastName: "Person" }]
        : [{ vendorId: "supplier", legalName: "Example Supplier" }],
      meta: { totalPages: 1, totalCount: 1 },
    },
  }));
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  focusManager.setFocused(undefined);
  container.remove();
  vi.unstubAllGlobals();
});
const mount = async () => {
  await act(async () => root.render(<QueryClientProvider client={client}><ChatWidget /></QueryClientProvider>));
  await settle();
};
describe("chat directory request eligibility", () => {
  it("makes no directory requests while closed, including invalidation and refocus", async () => {
    await mount();
    await act(async () => {
      await client.invalidateQueries({ refetchType: "all" });
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await settle();
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it("loads only the visible permitted directory without requiring sensitive access and reuses it on reopening", async () => {
    await mount();
    await act(async () => useChatStore.getState().openChat());
    await settle();
    expect(mocks.get).toHaveBeenCalledTimes(1);
    expect(String(mocks.get.mock.calls[0][0])).toContain("users");
    expect(container.textContent).toContain("Team Person");

    await act(async () => useChatStore.getState().setActiveTab("vendors"));
    await settle();
    expect(mocks.get).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("Example Supplier");

    await act(async () => useChatStore.getState().closeChat());
    await act(async () => useChatStore.getState().openChat());
    await settle();
    expect(mocks.get).toHaveBeenCalledTimes(2);
  });
  it.each([
    { permissions: [] },
    { permissions: ["vendor.directory.read"] },
    { permissions: ["vendor.sensitive.read"] },
  ])("does not call protected directories with incomplete permissions: $permissions", async ({ permissions }) => {
    authorize(permissions);
    useChatStore.setState({ isOpen: true });
    await mount();
    await act(async () => useChatStore.getState().setActiveTab("vendors"));
    await settle();
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it("hides cached contact rows when access is revoked", async () => {
    useChatStore.setState({ isOpen: true, activeTab: "vendors" });
    await mount();
    expect(container.textContent).toContain("Example Supplier");
    await act(async () => authorize([]));
    await settle();
    expect(container.textContent).not.toContain("Example Supplier");
    expect(useChatStore.getState().vendors).toEqual([]);
    expect(mocks.get).toHaveBeenCalledTimes(1);
  });
});
