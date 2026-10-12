"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEntityWorkspaceStore } from "./store";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function EntityWorkspaceSwitcher() {
  const state = useEntityWorkspaceStore();
  const client = useQueryClient();
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);
  const switchTo = async (selection: string) => {
    if (useEntityWorkspaceStore.getState().pendingMutations > 0) return;
    await client.cancelQueries({
      predicate: (q) => q.queryKey[0] === "entity-workspace",
    });
    client.removeQueries({
      predicate: (q) => q.queryKey[0] === "entity-workspace",
    });
    useEntityWorkspaceStore.getState().select(selection);
    setPendingSelection(null);
  };
  if (!state.snapshot?.enabled) return null;
  const entity = state.snapshot.entities.find(
    (e) => e.legalEntityId === state.selection,
  );
  if (!state.snapshot.canSwitch)
    return (
      <span className="max-w-48 truncate text-sm" title={entity?.legalName}>
        {entity?.legalName || "Entity assignment required"}
        {entity?.readOnly ? " · History" : ""}
      </span>
    );
  return (
    <>
      <label data-workspace-filter className="flex items-center gap-2 text-sm">
        <span className="sr-only">Legal entity workspace</span>
        <select
          aria-label="Legal entity workspace"
          value={state.selection || ""}
          disabled={state.pendingMutations > 0}
          className="max-w-56 rounded-md border bg-white px-3 py-2"
          onChange={async (event) => {
            const selection = event.target.value;
            if (!selection || selection === state.selection) return;
            if (state.dirty) {
              setPendingSelection(selection);
              return;
            }
            await switchTo(selection);
          }}
        >
          <option value="" disabled>
            Choose a legal entity
          </option>
          {state.snapshot.canViewAll && (
            <option value="all">All legal entities</option>
          )}
          {state.snapshot.entities.map((e) => (
            <option key={e.legalEntityId} value={e.legalEntityId}>
              {e.code} · {e.legalName}
              {e.readOnly ? " · History" : ""}
            </option>
          ))}
        </select>
      </label>
      <AlertDialog
        open={!!pendingSelection}
        onOpenChange={(open) => {
          if (!open) setPendingSelection(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch legal entity?</AlertDialogTitle>
            <AlertDialogDescription>
              Save your changes before switching, or discard unsaved changes.
              Saved drafts stay with their original legal entity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              disabled={state.pendingMutations > 0}
              onClick={() => {
                if (pendingSelection) void switchTo(pendingSelection);
              }}
            >
              Discard and switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
