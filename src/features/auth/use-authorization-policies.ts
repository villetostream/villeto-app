"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth-stores";
import { useEntityWorkspaceStore, workspaceReadOnly } from "@/features/entity-workspace/store";
import { applyWorkspaceReadOnlyPolicies } from "@/features/entity-workspace/read-only-policies";
import { buildAuthorizationPolicies } from "./policies";

export function useAuthorizationPolicies() {
  const authorization = useAuthStore((state) => state.authorization);
  const generation = useEntityWorkspaceStore(state => state.generation);
  return useMemo(() => applyWorkspaceReadOnlyPolicies(buildAuthorizationPolicies(authorization ?? null), workspaceReadOnly()), [authorization, generation]);
}
