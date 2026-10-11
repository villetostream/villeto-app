"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEntityWorkspaceStore } from "./store";

export function EntityWorkspaceSwitcher() {
  const state = useEntityWorkspaceStore();
  const client = useQueryClient();
  if (!state.snapshot?.enabled) return null;
  const entity = state.snapshot.entities.find(e => e.legalEntityId === state.selection);
  if (!state.snapshot.canSwitch) return <span className="max-w-48 truncate text-sm" title={entity?.legalName}>{entity?.legalName || "Entity assignment required"}{entity?.readOnly ? " · History" : ""}</span>;
  return <label className="flex items-center gap-2 text-sm">
    <span className="sr-only">Legal entity workspace</span>
    <select aria-label="Legal entity workspace" value={state.selection || ""} disabled={state.pendingMutations > 0} className="max-w-56 rounded-md border bg-white px-3 py-2" onChange={async event => {
      const selection = event.target.value;
      if (!selection || selection === state.selection) return;
      if (state.dirty && !window.confirm("Save your changes before switching, or discard unsaved changes and switch?")) return;
      await client.cancelQueries({ predicate: q => q.queryKey[0] === "entity-workspace" });
      client.removeQueries({ predicate: q => q.queryKey[0] === "entity-workspace" });
      useEntityWorkspaceStore.getState().select(selection);
    }}>
      <option value="" disabled>Choose a legal entity</option>
      {state.snapshot.canViewAll && <option value="all">All legal entities</option>}
      {state.snapshot.entities.map(e => <option key={e.legalEntityId} value={e.legalEntityId}>{e.code} · {e.legalName}{e.readOnly ? " · History" : ""}</option>)}
    </select>
  </label>;
}
