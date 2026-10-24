"use client";

import { create } from "zustand";
import type { QueryKey } from "@tanstack/react-query";

export interface WorkspaceEntity {
  legalEntityId: string;
  code: string;
  legalName: string;
  baseCurrency: string;
  status: "active" | "inactive";
  readinessStatus: string;
  readOnly: boolean;
}
export interface WorkspaceSnapshot {
  enabled: boolean;
  canSwitch: boolean;
  canViewAll: boolean;
  primaryAssignment: { legalEntityId: string } | null;
  defaultSelection: string | null;
  blockers: string[];
  personalExpenseEntityReady?: boolean;
  authorizationRevision?: string;
  entities: WorkspaceEntity[];
}
interface WorkspaceState {
  identity: string | null;
  snapshot: WorkspaceSnapshot | null;
  selection: string | null;
  generation: number;
  dirty: boolean;
  pendingMutations: number;
  reset: (identity: string | null) => void;
  hydrate: (snapshot: WorkspaceSnapshot) => void;
  select: (selection: string) => void;
  setDirty: (dirty: boolean) => void;
  mutationStarted: () => void;
  mutationFinished: () => void;
}

function permitted(
  snapshot: WorkspaceSnapshot,
  selection: string | null,
): boolean {
  if (!selection) return false;
  if (selection === "all") return snapshot.canViewAll;
  return (
    snapshot.entities.some((e) => e.legalEntityId === selection) &&
    (snapshot.canSwitch ||
      selection === snapshot.primaryAssignment?.legalEntityId)
  );
}
function storageKey(identity: string) {
  return `villeto:entity-workspace:${identity}`;
}
function storedSelection(identity: string | null): string | null {
  try {
    return identity && typeof window !== "undefined"
      ? window.sessionStorage.getItem(storageKey(identity))
      : null;
  } catch {
    return null;
  }
}
function persistSelection(identity: string | null, selection: string | null) {
  try {
    if (!identity || typeof window === "undefined") return;
    if (selection)
      window.sessionStorage.setItem(storageKey(identity), selection);
    else window.sessionStorage.removeItem(storageKey(identity));
  } catch {
    /* Workspace still works when browser storage is disabled. */
  }
}

/**
 * Produces a stable canonical string representing the policy-relevant fields
 * of a WorkspaceSnapshot. Only changes that affect capability decisions and
 * cache scoping should increment `generation`; volatile/transient fields
 * (e.g. personalExpenseEntityReady, array ordering) must not.
 */
function snapshotPolicyKey(snapshot: WorkspaceSnapshot | null): string {
  if (!snapshot) return "";
  // Sort entities by id so server-side ordering never causes a false change.
  const sortedEntities = [...snapshot.entities]
    .sort((a, b) => a.legalEntityId.localeCompare(b.legalEntityId))
    .map((e) => `${e.legalEntityId}:${e.status}:${e.readOnly ? "r" : "w"}`);
  return JSON.stringify({
    enabled: snapshot.enabled,
    canSwitch: snapshot.canSwitch,
    canViewAll: snapshot.canViewAll,
    primaryAssignment: snapshot.primaryAssignment?.legalEntityId ?? null,
    defaultSelection: snapshot.defaultSelection,
    authorizationRevision: snapshot.authorizationRevision ?? null,
    entities: sortedEntities,
    blockers: [...(snapshot.blockers ?? [])].sort(),
  });
}

export const useEntityWorkspaceStore = create<WorkspaceState>((set, get) => ({
  identity: null,
  snapshot: null,
  selection: null,
  generation: 0,
  dirty: false,
  pendingMutations: 0,
  reset: (identity) =>
    set((s) => ({
      identity,
      snapshot: null,
      selection: null,
      generation: s.generation + 1,
      dirty: false,
      pendingMutations: 0,
    })),
  hydrate: (snapshot) => {
    const state = get();
    const saved = state.selection || storedSelection(state.identity);
    const selection = snapshot.enabled
      ? permitted(snapshot, saved)
        ? saved
        : snapshot.defaultSelection
      : null;
    persistSelection(state.identity, selection);
    // Grants can shrink while an All selection remains valid. Every policy
    // change must invalidate requests and cached data, even without a switch.
    //
    // We compare only the fields that affect capability decisions and cache
    // correctness. Volatile/transient status fields (e.g. personalExpenseEntityReady)
    // and server-side array ordering must not spuriously bump generation and
    // trigger a mass refetch of all business-data queries.
    const policyChanged =
      snapshotPolicyKey(state.snapshot) !== snapshotPolicyKey(snapshot);
    const changed = selection !== state.selection || policyChanged;
    set({
      snapshot,
      selection,
      generation: state.generation + (changed ? 1 : 0),
      dirty: changed ? false : state.dirty,
    });
  },
  select: (selection) => {
    const state = get();
    if (!state.snapshot?.enabled || !permitted(state.snapshot, selection))
      throw new Error("This legal entity workspace is not available");
    if (state.pendingMutations > 0)
      throw new Error("Wait for the current action to finish before switching");
    persistSelection(state.identity, selection);
    set({ selection, generation: state.generation + 1, dirty: false });
  },
  setDirty: (dirty) =>
    set((s) => (s.dirty === dirty ? s : { dirty })),
  mutationStarted: () =>
    set((s) => ({ pendingMutations: s.pendingMutations + 1 })),
  mutationFinished: () =>
    set((s) => ({ pendingMutations: Math.max(0, s.pendingMutations - 1) })),
}));

export function workspaceQueryKey(key: QueryKey): QueryKey {
  if (key[0] === "entity-workspace") return key;
  const state = useEntityWorkspaceStore.getState();
  return [
    "entity-workspace",
    state.identity,
    state.snapshot?.enabled ? state.selection : "legacy",
    state.generation,
    ...key,
  ];
}

export function workspaceReadOnly(): boolean {
  const state = useEntityWorkspaceStore.getState();
  return (
    !!state.snapshot?.enabled &&
    (!state.selection ||
      state.selection === "all" ||
      !!state.snapshot.entities.find((e) => e.legalEntityId === state.selection)
        ?.readOnly)
  );
}
