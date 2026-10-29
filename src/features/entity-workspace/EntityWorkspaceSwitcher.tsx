"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEntityWorkspaceStore } from "./store";
import { type ReactElement, type ReactNode, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Building, Layer } from "iconsax-reactjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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
import { toast } from "sonner";

interface Props {
  /** Expanded-state logo (32px). */
  logo: ReactNode;
  /** Collapsed-state logo. */
  collapsedLogo: ReactNode;
  /** Organization display name (can be a skeleton while loading). */
  organizationName: ReactNode;
  organizationLabel?: string;
  collapsed?: boolean;
}

/**
 * Organization card in the sidebar header. When multi-entity is enabled,
 * the card itself becomes the legal-entity switcher.
 */
export function EntityWorkspaceSwitcher({
  logo,
  collapsedLogo,
  organizationName,
  organizationLabel = "Workspace",
  collapsed = false,
}: Props) {
  const state = useEntityWorkspaceStore();
  const client = useQueryClient();
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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

  const snapshot = state.snapshot;
  const enabled = !!snapshot?.enabled;
  const canSwitch = enabled && !!snapshot?.canSwitch;
  const busy = state.pendingMutations > 0;
  const entities = snapshot?.entities ?? [];
  const hasSwitchPermission = canSwitch && (entities.length > 1 || !!snapshot?.canViewAll);
  const primaryId = snapshot?.primaryAssignment?.legalEntityId;
  const isAll = state.selection === "all";
  const entity = entities.find((e) => e.legalEntityId === state.selection);
  const entityName = isAll
    ? "All legal entities"
    : entity?.legalName || "Choose a legal entity";
  const showSearch = entities.length > 6;

  const visibleEntities = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? entities.filter((e) =>
          [e.legalName, e.code, e.baseCurrency].some((v) => v?.toLowerCase().includes(q)),
        )
      : entities;
    // Primary first, then active, then read-only history; alphabetical within groups
    const rank = (e: (typeof entities)[number]) =>
      (e.legalEntityId === primaryId ? 0 : 10) + (e.readOnly ? 2 : 0) + (e.status === "active" ? 0 : 1);
    return [...list].sort((a, b) => rank(a) - rank(b) || a.legalName.localeCompare(b.legalName));
  }, [entities, query, primaryId]);

  const select = async (selection: string) => {
    if (!selection || selection === state.selection) return;
    if (state.pendingMutations > 0) {
      toast.info("A save operation is currently in progress. Please wait a moment before switching.");
      return;
    }
    if (state.dirty) {
      setPendingSelection(selection);
      return;
    }
    await switchTo(selection);
  };

  /* ── User without switch permission sees a plain static organization card ── */
  if (!hasSwitchPermission) {
    if (collapsed) {
      return (
        <div className="h-8 w-8 flex items-center justify-center">
          {collapsedLogo}
        </div>
      );
    }
    return (
      <div className="flex w-full items-center gap-2.5 rounded-[11px] px-3 py-2 text-left">
        <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-[8px]">
          {logo}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-white/90">
            {organizationName}
          </div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/35">
            {organizationLabel}
          </p>
        </div>
      </div>
    );
  }

  /* ── Switcher Card (trigger) for authorized users ── */
  const card = collapsed ? (
    <button
      type="button"
      aria-label={`Switch legal entity (${entityName})`}
      disabled={busy}
      className="h-8 w-8 rounded-[8px] outline-none focus-visible:ring-2 focus-visible:ring-[#5fd4c4]/60 disabled:cursor-default"
    >
      {collapsedLogo}
    </button>
  ) : (
    <button
      type="button"
      aria-label="Switch legal entity"
      disabled={busy}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-[11px] border border-white/[0.08] bg-white/[0.05] px-3 py-2.5 text-left outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-[#5fd4c4]/60 disabled:cursor-default",
        "hover:bg-white/[0.09] data-[state=open]:bg-white/[0.09]",
      )}
    >
      <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-[8px] ring-1 ring-white/10">
        {logo}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-white/90">
          {organizationName}
        </div>
        <p className="truncate text-[11.5px] text-white/60" title={entityName}>
          {entityName}
        </p>
      </div>
      <ChevronsUpDown className="h-4 w-4 shrink-0 text-white/45 transition-colors group-hover:text-white/80" />
    </button>
  );

  const withTooltip = (node: ReactElement) =>
    collapsed ? (
      <Tooltip delayDuration={120}>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side="right">
          {entityName}
        </TooltipContent>
      </Tooltip>
    ) : (
      node
    );

  return (
    <>
      <DropdownMenu onOpenChange={(open) => !open && setQuery("")}>
        {withTooltip(<DropdownMenuTrigger asChild>{card}</DropdownMenuTrigger>)}
        <DropdownMenuContent
          data-workspace-filter
          side="right"
          align="start"
          sideOffset={collapsed ? 14 : 18}
          className="w-[300px] rounded-xl p-1.5"
        >
          <DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5 text-xs font-medium text-muted-foreground">
            <span>Switch legal entity</span>
            {showSearch && <span className="tabular-nums">{entities.length}</span>}
          </DropdownMenuLabel>

          {showSearch && (
            <div className="px-1 pb-1.5">
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-2.5 focus-within:border-[#087f70]/50 focus-within:bg-background">
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  // Keep Radix typeahead from stealing keystrokes
                  onKeyDown={(e) => e.key !== "Escape" && e.key !== "ArrowDown" && e.stopPropagation()}
                  placeholder="Search by name, code or currency"
                  className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          )}

          {snapshot?.canViewAll && !query && (
            <>
              <DropdownMenuItem
                className="gap-3 rounded-lg px-2 py-2"
                onSelect={() => void select("all")}
              >
                <Layer size={18} color="currentColor" className="shrink-0 text-[#087f70]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">All legal entities</p>
                  <p className="text-xs text-muted-foreground">Read-only overview</p>
                </div>
                {isAll && <Check className="h-4 w-4 shrink-0 text-[#087f70]" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <div className="max-h-[min(360px,50vh)] overflow-y-auto [scrollbar-width:thin]">
            {visibleEntities.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No entities match “{query}”
              </p>
            )}
            {visibleEntities.map((e) => {
              const active = e.legalEntityId === state.selection;
              const meta = [
                e.code,
                e.baseCurrency,
                e.legalEntityId === primaryId ? "Your primary entity" : null,
                e.readOnly ? "History" : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <DropdownMenuItem
                  key={e.legalEntityId}
                  className={cn("gap-3 rounded-lg px-2 py-2", active && "bg-accent/60")}
                  onSelect={() => void select(e.legalEntityId)}
                >
                  <Building
                    size={18}
                    color="currentColor"
                    className={cn("shrink-0", active ? "text-[#087f70]" : "text-muted-foreground")}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{e.legalName}</p>
                    <p className="truncate text-xs text-muted-foreground">{meta}</p>
                  </div>
                  {active && <Check className="h-4 w-4 shrink-0 text-[#087f70]" />}
                </DropdownMenuItem>
              );
            })}
          </div>

          <DropdownMenuSeparator />
          <p className="px-2 py-1.5 text-xs leading-snug text-muted-foreground">
            Your selection applies across the app. All entities and inactive
            history are read-only.
          </p>
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
              disabled={busy}
              onClick={() => {
                if (pendingSelection) {
                  if (useEntityWorkspaceStore.getState().pendingMutations > 0) {
                    toast.info("A save operation is currently in progress. Please wait a moment before switching.");
                    return;
                  }
                  useEntityWorkspaceStore.getState().setDirty(false);
                  void switchTo(pendingSelection);
                }
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
