// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore, type User } from "./auth-stores";
vi.mock("@/lib/tokenRefreshService", () => ({
  clearTokenRefresh: vi.fn(), scheduleTokenRefresh: vi.fn(),
}));
const user = {
  userId: "actor", firstName: "Test", lastName: "User", companyId: "company",
  authorization: { schemaVersion: 1, revision: "before", permissions: ["user.manage"], capabilityGrants: [] },
} as User;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
  localStorage.clear();
  sessionStorage.clear();
  useAuthStore.getState().logout();
});
afterEach(() => vi.useRealTimers());
describe("login and background profile updates", () => {
  it("records explicit login activity", () => {
    useAuthStore.getState().login(user);
    expect(localStorage.getItem("villeto_lastActivityTime")).toBe(String(Date.now()));
    expect(useAuthStore.getState().canPermission("user.manage")).toBe(true);
  });
  it("refreshes the profile and revoked permissions without extending activity", () => {
    useAuthStore.getState().login(user);
    const activity = localStorage.getItem("villeto_lastActivityTime");
    vi.advanceTimersByTime(120_000);
    useAuthStore.getState().setProfile({
      ...user, firstName: "Updated",
      authorization: { schemaVersion: 1, revision: "revoked", permissions: [], capabilityGrants: [] },
    });
    expect(useAuthStore.getState().user?.firstName).toBe("Updated");
    expect(useAuthStore.getState().canPermission("user.manage")).toBe(false);
    expect(useAuthStore.getState().authorizationFetchedAt).toBe(Date.now());
    expect(localStorage.getItem("villeto_lastActivityTime")).toBe(activity);
  });
  it("does not manufacture activity while restoring a missing profile", () => {
    useAuthStore.getState().setProfile(user);
    expect(localStorage.getItem("villeto_lastActivityTime")).toBeNull();
    expect(useAuthStore.getState().user?.userId).toBe(user.userId);
  });
});
