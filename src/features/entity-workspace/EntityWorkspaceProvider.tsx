"use client";

import { useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-stores";
import { useAxios } from "@/hooks/useAxios";
import { AUTHORIZATION_INVALIDATED_EVENT } from "@/features/auth/authorization";
import { useEntityWorkspaceStore, type WorkspaceSnapshot } from "./store";

export function EntityWorkspaceProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const authorization = useAuthStore((s) => s.authorization);
  const companyId = user?.company?.companyId || user?.companyId;
  const identity = user && companyId ? `${companyId}:${user.userId}` : null;
  const axios = useAxios();
  const client = useQueryClient();
  const pathname = usePathname();
  const state = useEntityWorkspaceStore();
  const workspace = useQuery({
    queryKey: ["entity-workspace-bootstrap", identity, authorization?.revision],
    enabled: !!identity,
    staleTime: 30_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const response = await axios.get("/legal-entities/workspace", { signal });
      return (response.data?.data || response.data) as WorkspaceSnapshot;
    },
  });
  useEffect(() => {
    if (useEntityWorkspaceStore.getState().identity !== identity) {
      void client.cancelQueries({
        predicate: (q) => q.queryKey[0] === "entity-workspace",
      });
      client.removeQueries({
        predicate: (q) => q.queryKey[0] === "entity-workspace",
      });
      useEntityWorkspaceStore.getState().reset(identity);
    }
  }, [identity, client]);
  useEffect(() => {
    if (
      workspace.data &&
      identity === useEntityWorkspaceStore.getState().identity
    )
      useEntityWorkspaceStore.getState().hydrate(workspace.data);
  }, [workspace.data, identity]);
  useEffect(() => {
    const refresh = () => {
      void workspace.refetch();
    };
    window.addEventListener(AUTHORIZATION_INVALIDATED_EVENT, refresh);
    return () =>
      window.removeEventListener(AUTHORIZATION_INVALIDATED_EVENT, refresh);
  }, [workspace.refetch]);
  useEffect(() => {
    state.setDirty(false);
    let dialogObserver: MutationObserver | null = null;
    const monitorDialogClose = (dialogEl: Element) => {
      dialogObserver?.disconnect();
      const checkAndClear = () => {
        if (!dialogEl.isConnected || dialogEl.getAttribute("data-state") === "closed") {
          dialogObserver?.disconnect();
          dialogObserver = null;
          useEntityWorkspaceStore.getState().setDirty(false);
        }
      };
      dialogObserver = new MutationObserver(checkAndClear);
      dialogObserver.observe(dialogEl, { attributes: true, attributeFilter: ["data-state"] });
      dialogObserver.observe(document.body, { childList: true, subtree: true });
    };

    const edited = (event: Event) => {
      const target = event.target as Element | null;
      if (!target) return;

      // Ignore search inputs (e.g. employee search, vendor search, directory search)
      const isSearchInput =
        target instanceof HTMLInputElement &&
        (target.type === "search" ||
          target.name?.toLowerCase().includes("search") ||
          target.placeholder?.toLowerCase().includes("search") ||
          target.getAttribute("aria-label")?.toLowerCase().includes("search") ||
          target.closest('[role="search"]') !== null ||
          target.closest("[data-no-dirty]") !== null);
      if (isSearchInput) return;

      // Pages where changes persist automatically (e.g. settings) do not block entity switching
      if (pathname.startsWith("/settings")) return;

      const editingRoute = /\/(new|add|edit)(\/|$)/.test(pathname);
      const dialogEl = target?.closest('[role="dialog"]');
      if (
        (editingRoute || target?.closest("form") || dialogEl) &&
        !target?.closest("[data-workspace-filter]")
      ) {
        // Defer: this listener runs in the capture phase, before React's own
        // onChange. A synchronous store update here re-renders controlled
        // inputs with their stale value and the keystroke is lost.
        window.setTimeout(
          () => useEntityWorkspaceStore.getState().setDirty(true),
          0,
        );
        // A dialog edit is no longer unsaved once the dialog is saved/closed.
        if (!editingRoute && dialogEl)
          monitorDialogClose(dialogEl);
      }
    };
    document.addEventListener("input", edited, true);
    document.addEventListener("change", edited, true);
    return () => {
      dialogObserver?.disconnect();
      document.removeEventListener("input", edited, true);
      document.removeEventListener("change", edited, true);
    };
  }, [pathname, state.setDirty]);
  if (workspace.isError)
    return (
      <div role="alert" className="p-6">
        Unable to load your legal entity workspace.{" "}
        <button onClick={() => void workspace.refetch()} className="underline">
          Try again
        </button>
      </div>
    );
  return children;
}
