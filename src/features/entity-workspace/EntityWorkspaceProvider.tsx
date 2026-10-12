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
    const edited = (event: Event) => {
      const target = event.target as Element | null;
      const editingRoute = /\/(new|add|edit|settings)(\/|$)/.test(pathname);
      if (
        (editingRoute ||
          target?.closest("form") ||
          target?.closest('[role="dialog"]')) &&
        !target?.closest("[data-workspace-filter]")
      )
        useEntityWorkspaceStore.getState().setDirty(true);
    };
    document.addEventListener("input", edited, true);
    document.addEventListener("change", edited, true);
    return () => {
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
  if (!identity || state.identity !== identity || !state.snapshot)
    return (
      <div role="status" className="p-6">
        Loading workspace…
      </div>
    );
  return children;
}
