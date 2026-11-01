// @vitest-environment jsdom
import React, { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardLayoutContent from "./DashboardLayoutContent";
import SilentRefreshGate from "./SilentRefreshGate";
import { useAuthStore, type User } from "@/stores/auth-stores";
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), settings: vi.fn(), logout: vi.fn(), sidebar: vi.fn(), router: {} }));
vi.mock("@/hooks/useAxios", () => ({ useAxios: () => mocks }));
vi.mock("axios", () => ({ default: mocks }));
vi.mock("@/lib/logout", () => ({ logoutAndRedirect: mocks.logout }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/lib/tokenRefreshService", () => ({
  clearTokenRefresh: vi.fn(), scheduleTokenRefresh: vi.fn(),
}));
vi.mock("@/queries/procurement/policies", () => ({ useGetSpendProgramSettings: mocks.settings }));
vi.mock("@/components/dashboard/sidebar/DashboardSidebar", () => ({
  DashboardSidebar: (props: { isProfileLoading: boolean }) => { mocks.sidebar(props); return null; },
}));
vi.mock("@/components/ui/sidebar", () => ({
  SidebarProvider: ({ children }: { children: ReactNode }) => children,
  SidebarTrigger: () => null,
}));
vi.mock("@/components/user/user-section", () => ({ UserSection: () => null }));
vi.mock("@/components/dashboard/layout/DashboardModals", () => ({ default: () => null }));
vi.mock("@/components/tour/VilletoTourGuide", () => ({ default: () => null }));
vi.mock("@/components/tour/VilletoSetupGuide", () => ({ default: () => null }));
vi.mock("@/components/chat", () => ({ ChatPortal: () => null }));
vi.mock("@/components/ui/splash-screen", () => ({ SplashScreen: () => null }));
vi.mock("@/features/entity-workspace/EntityWorkspaceProvider", () => ({
  EntityWorkspaceProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/features/entity-workspace/EntityWorkspaceContent", () => ({
  EntityWorkspaceContent: ({ children }: { children: ReactNode }) => children,
}));
const user = {
  userId: "actor", firstName: "Test", lastName: "User", companyId: "company",
  authorization: {
    schemaVersion: 1, revision: "one", permissions: ["policy.read_company", "policy.view"], capabilityGrants: [],
  },
} as User;
let root: Root;
let container: HTMLDivElement;
const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  sessionStorage.clear();
  mocks.get.mockReset().mockResolvedValue({ data: { data: user } });
  mocks.post.mockReset().mockResolvedValue({ data: { accessToken: "restored-token", accessTokenExpiresInMs: 3_600_000 } });
  mocks.settings.mockClear();
  mocks.sidebar.mockClear();
  mocks.logout.mockClear();
  useAuthStore.getState().login(user);
  useAuthStore.getState().setAccessToken("test-token", 24 * 60 * 60 * 1000);
  useAuthStore.setState({ isLoading: false });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("Phase 1 dashboard background work", () => {
  it("refreshes authorization without activity writes or layout settings requests", async () => {
    const activity = localStorage.getItem("villeto_lastActivityTime");
    vi.advanceTimersByTime(60_000);
    await act(async () => root.render(<DashboardLayoutContent><div>Dashboard content</div></DashboardLayoutContent>));
    await advance(1200);
    expect(container.textContent).toContain("Dashboard content");
    expect(mocks.sidebar).toHaveBeenLastCalledWith({ isProfileLoading: false });
    expect(mocks.get).not.toHaveBeenCalled();
    await advance(120_000);
    expect(mocks.get).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("villeto_lastActivityTime")).toBe(activity);
    expect(mocks.settings).not.toHaveBeenCalled();
  });
  it("still expires the idle session while profile refreshes succeed", async () => {
    await act(async () => root.render(<DashboardLayoutContent><div>Dashboard</div></DashboardLayoutContent>));
    await advance(1200);
    await advance(61 * 60 * 1000);
    expect(mocks.get.mock.calls.length).toBeGreaterThan(20);
    expect(mocks.logout).toHaveBeenCalled();
  });
  it("keeps a session active after real user input", async () => {
    await act(async () => root.render(<DashboardLayoutContent><div>Dashboard</div></DashboardLayoutContent>));
    await advance(1200);
    await advance(50 * 60 * 1000);
    await act(async () => window.dispatchEvent(new MouseEvent("mousedown")));
    await advance(15 * 60 * 1000);
    expect(mocks.logout).not.toHaveBeenCalled();
  });
  it("restores a missing profile silently without resetting stored activity", async () => {
    const activity = localStorage.getItem("villeto_lastActivityTime");
    useAuthStore.setState({ user: null, accessToken: null, accessTokenExpiresAt: null });
    vi.advanceTimersByTime(120_000);
    const onDone = vi.fn();
    await act(async () => root.render(<SilentRefreshGate onDone={onDone} />));
    expect(useAuthStore.getState().user?.userId).toBe(user.userId);
    expect(useAuthStore.getState().accessToken).toBe("restored-token");
    expect(localStorage.getItem("villeto_lastActivityTime")).toBe(activity);
    expect(onDone).toHaveBeenCalled();
  });
  it("still rejects a deleted account returned by the profile refresh", async () => {
    mocks.get.mockResolvedValue({ data: { data: { ...user, status: "deleted" } } });
    await act(async () => root.render(<DashboardLayoutContent><div>Dashboard</div></DashboardLayoutContent>));
    await advance(120_000);
    expect(mocks.logout).toHaveBeenCalled();
  });
});
