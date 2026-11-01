// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Notification from "./notification";
import { useAuthStore } from "@/stores/auth-stores";
import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), unread: vi.fn() }));
vi.mock("@/features/entity-workspace/fetch", () => ({ workspaceFetch: mocks.fetch }));
vi.mock("@/hooks/useNotificationCount", () => ({
  useNotificationCountStore: (select: (state: { setUnreadCount: typeof mocks.unread }) => unknown) =>
    select({ setUnreadCount: mocks.unread }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/lib/tokenRefreshService", () => ({
  clearTokenRefresh: vi.fn(), scheduleTokenRefresh: vi.fn(),
}));

const item = {
  notificationId: "notice-1", title: "Approval required", message: "A report is ready",
  isRead: false, createdAt: "2026-11-01T12:00:00.000Z",
};
let root: Root;
let container: HTMLDivElement;
let rows: typeof item[];
let identity = 0;
const listCalls = () => mocks.fetch.mock.calls.filter(([url]) => String(url).endsWith("/all"));
const settle = async (ms = 1) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  useAuthStore.setState({ accessToken: "test-token" });
  useEntityWorkspaceStore.getState().reset(`test-company:actor-${++identity}`);
  rows = [item];
  mocks.fetch.mockReset();
  mocks.unread.mockReset();
  mocks.fetch.mockImplementation(async (url: string, init: RequestInit) => {
    if (url.endsWith("/all")) {
      // Bound the broken implementation's request loop so the regression fails promptly.
      if (listCalls().length > 3) return new Promise(() => {});
      return new Response(JSON.stringify({ data: rows }));
    }
    if (url.endsWith("/events/notifications")) {
      return new Response(new ReadableStream<Uint8Array>({
        start(controller) {
          init.signal?.addEventListener("abort", () => controller.close(), { once: true });
        },
      }));
    }
    return new Response("{}");
  });
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
const mount = async () => {
  await act(async () => root.render(<Notification />));
  await settle();
};

describe("notification request lifecycle", () => {
  it.each(["empty", "populated"])("does not refetch a %s response during an idle minute", async (kind) => {
    if (kind === "empty") rows = [];
    await mount();
    await settle(60_000);
    expect(listCalls()).toHaveLength(1);
    expect(container.textContent).toContain(kind === "empty" ? "No notifications yet." : item.title);
  });

  it("keeps mark-all-read local after the server confirms it", async () => {
    await mount();
    const button = Array.from(container.querySelectorAll("button"))
      .find((element) => element.textContent?.includes("Mark all read"))!;
    await act(async () => button.click());
    await settle();
    expect(mocks.fetch.mock.calls.filter(([url]) => String(url).endsWith("/mark-all-read"))).toHaveLength(1);
    expect(mocks.unread).toHaveBeenLastCalledWith(0);
    expect(listCalls()).toHaveLength(1);
  });

  it("marks a single notification read without reloading the list", async () => {
    await mount();
    const title = Array.from(container.querySelectorAll("p")).find((element) => element.textContent === item.title)!;
    await act(async () => title.click());
    await settle();
    expect(mocks.fetch.mock.calls.filter(([url]) => String(url).endsWith("/mark-read/notice-1"))).toHaveLength(1);
    expect(mocks.unread).toHaveBeenLastCalledWith(0);
    expect(listCalls()).toHaveLength(1);
  });

  it("refreshes once after a failed mark-all action and preserves unread state", async () => {
    await mount();
    mocks.fetch.mockImplementationOnce(async () => new Response("Denied", { status: 403 }));
    const button = Array.from(container.querySelectorAll("button"))
      .find((element) => element.textContent?.includes("Mark all read"))!;
    await act(async () => button.click());
    await settle(60_000);
    expect(listCalls()).toHaveLength(2);
    expect(container.textContent).toContain("1 unread");
  });

  it("does not open a second notification stream from the panel", async () => {
    await mount();
    expect(mocks.fetch.mock.calls.filter(([url]) => String(url).endsWith("/events/notifications"))).toHaveLength(0);
    expect(listCalls()).toHaveLength(1);
  });

  it("refreshes once on reopening without creating a cache feedback loop", async () => {
    await mount();
    await act(async () => root.render(null));
    rows = [{ ...item, title: "Updated while closed" }];
    await mount();
    await settle(60_000);
    expect(listCalls()).toHaveLength(2);
    expect(container.textContent).toContain("Updated while closed");
  });

  it("rejects an old workspace response after the actor changes", async () => {
    let resolveOld!: (response: Response) => void;
    const normalFetch = mocks.fetch.getMockImplementation()!;
    mocks.fetch.mockReset().mockImplementation((url: string, init: RequestInit) => {
      if (url.endsWith("/all") && listCalls().length === 1)
        return new Promise<Response>((resolve) => { resolveOld = resolve; });
      return normalFetch(url, init);
    });
    await mount();
    rows = [{ ...item, title: "New workspace notice" }];
    await act(async () => useEntityWorkspaceStore.getState().reset("other-company:other-actor"));
    await settle();
    await act(async () => resolveOld(new Response(JSON.stringify({ data: [{ ...item, title: "Old private notice" }] }))));
    expect(container.textContent).toContain("New workspace notice");
    expect(container.textContent).not.toContain("Old private notice");
  });
});
