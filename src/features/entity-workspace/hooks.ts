"use client";

import {
  useEligibleLegalEntities,
  type LegalEntity,
  type LegalEntityReadiness,
} from "@/queries/legal-entities";
import { useEntityWorkspaceStore } from "./store";
import { useEffect } from "react";

type Action = Parameters<typeof useEligibleLegalEntities>[0];

/** Transaction screens consume the workspace; administration keeps its inventory. */
export function useTransactionLegalEntities(
  action: Action = "finance",
  options?: { enabled?: boolean },
) {
  const snapshot = useEntityWorkspaceStore((s) => s.snapshot);
  const selection = useEntityWorkspaceStore((s) => s.selection);
  const legacy = useEligibleLegalEntities(action, {
    enabled: !snapshot?.enabled && options?.enabled !== false,
  });
  const selected = snapshot?.entities.find(
    (entity) => entity.legalEntityId === selection,
  );
  const entities: LegalEntity[] = snapshot?.enabled
    ? selected
      ? [
          {
            ...selected,
            countryOfRegistration: "",
            registeredAddress: "",
            isDefault: selected.legalEntityId === snapshot.defaultSelection,
            readinessStatus: selected.readinessStatus as LegalEntityReadiness,
            readinessBlockers: [],
          },
        ]
      : selection === "all"
        ? [
            {
              legalEntityId: "all",
              code: "ALL",
              legalName: "All legal entities",
              baseCurrency: "",
              status: "inactive",
              readinessStatus: "provisional",
              readinessBlockers: [],
              countryOfRegistration: "",
              registeredAddress: "",
              isDefault: false,
            },
          ]
        : []
    : legacy.data || [];
  return {
    ...legacy,
    workspaceEnabled: !!snapshot?.enabled,
    data: { data: entities },
    isLoading: snapshot?.enabled ? false : legacy.isLoading,
  };
}

export function useWorkspaceUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    useEntityWorkspaceStore.getState().setDirty(dirty);
    return () => useEntityWorkspaceStore.getState().setDirty(false);
  }, [dirty]);
}
