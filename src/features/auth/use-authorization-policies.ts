"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth-stores";
import {
  useEntityWorkspaceStore,
  workspaceReadOnly,
} from "@/features/entity-workspace/store";
import { applyWorkspaceReadOnlyPolicies } from "@/features/entity-workspace/read-only-policies";
import { buildAuthorizationPolicies } from "./policies";

export function useAuthorizationPolicies() {
  const authorization = useAuthStore((state) => state.authorization);
  const generation = useEntityWorkspaceStore((state) => state.generation);
  return useMemo(() => {
    const policies = applyWorkspaceReadOnlyPolicies(
      buildAuthorizationPolicies(authorization ?? null),
      workspaceReadOnly(),
    );
    const snapshot = useEntityWorkspaceStore.getState().snapshot;
    if (
      snapshot?.enabled &&
      (snapshot.personalExpenseEntityReady === false ||
        !snapshot.primaryAssignment?.legalEntityId)
    )
      policies.expenses = {
        ...policies.expenses,
        canCreate: false,
        canSubmit: false,
      };
    return policies;
  }, [authorization, generation]);
}
