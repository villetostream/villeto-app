"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEntityWorkspaceStore } from "./store";
import { useState } from "react";
import { Building2, ChevronDown, Layers3, LockKeyhole } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const isAll = state.selection === "all";
  const readOnly = isAll || !!entity?.readOnly;
  const label = isAll ? "All legal entities" : entity?.legalName || "Choose legal entity";
  const WorkspaceIcon = isAll ? Layers3 : Building2;
  const identity = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#e6f7f3] text-[#087f70]">
        <WorkspaceIcon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 text-left">
        {readOnly && (
          <span className="block text-[10px] font-medium leading-3 text-[#687b73]">
            Read-only workspace
          </span>
        )}
        <span className="block max-w-28 truncate text-xs font-semibold leading-5 text-[#10231d] sm:max-w-44 xl:max-w-56">
          {label}
        </span>
      </span>
      {readOnly && <LockKeyhole className="hidden size-3.5 shrink-0 text-[#687b73] sm:block" aria-hidden="true" />}
    </>
  );
  if (!state.snapshot.canSwitch)
    return (
      <div className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-black/[0.06] bg-[#f7faf8] px-2" title={label}>
        {identity}
      </div>
    );
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-workspace-filter
            aria-label={`Legal entity workspace: ${label}${readOnly ? ", read-only" : ""}`}
            disabled={state.pendingMutations > 0}
            className="group flex h-11 min-w-0 items-center gap-2 rounded-xl border border-[#087f70]/15 bg-[#f7faf8] px-2 shadow-sm transition-colors hover:border-[#087f70]/30 hover:bg-[#edf7f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087f70] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            {identity}
            <ChevronDown className="size-3.5 shrink-0 text-[#687b73] transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} data-workspace-filter className="w-80 max-w-[calc(100vw-2rem)] rounded-xl p-2 shadow-lg">
          <DropdownMenuLabel className="px-2 py-2 text-xs text-[#687b73]">Switch legal entity</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={state.selection || ""}
            onValueChange={(selection) => {
              if (!selection || selection === state.selection || state.pendingMutations > 0) return;
              if (state.dirty) {
                setPendingSelection(selection);
                return;
              }
              void switchTo(selection);
            }}
          >
            {state.snapshot.canViewAll && (
              <>
                <DropdownMenuRadioItem value="all" textValue="All legal entities" disabled={state.pendingMutations > 0} className="items-start rounded-lg py-2.5 focus:bg-[#edf7f3]">
                  <Layers3 className="mr-2 mt-0.5 size-4 shrink-0 text-[#087f70]" aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-medium">All legal entities</span>
                    <span className="block text-xs text-[#687b73]">Read-only overview</span>
                  </span>
                </DropdownMenuRadioItem>
                <DropdownMenuSeparator />
              </>
            )}
            <div className="max-h-64 overflow-y-auto">
              {state.snapshot.entities.map((option) => (
                <DropdownMenuRadioItem key={option.legalEntityId} value={option.legalEntityId} textValue={`${option.legalName} ${option.code}`} disabled={state.pendingMutations > 0} className="items-start rounded-lg py-2.5 focus:bg-[#edf7f3]">
                  <Building2 className="mr-2 mt-0.5 size-4 shrink-0 text-[#687b73]" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-medium">{option.legalName}</span>
                    <span className="block text-xs text-[#687b73]">{option.code}{option.legalEntityId === state.snapshot?.primaryAssignment?.legalEntityId ? " · Your primary entity" : ""}</span>
                  </span>
                  {option.readOnly && <span className="ml-2 shrink-0 rounded bg-[#f1f4f2] px-1.5 py-0.5 text-[10px] text-[#687b73]">History</span>}
                </DropdownMenuRadioItem>
              ))}
              {!state.snapshot.entities.length && <p className="px-2 py-3 text-xs text-[#687b73]">No legal entities available. Contact your administrator.</p>}
            </div>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <p className="px-2 py-2 text-[11px] leading-4 text-[#687b73]">Your selection applies across the app. All entities and inactive history are read-only.</p>
        </DropdownMenuContent>
      </DropdownMenu>
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
