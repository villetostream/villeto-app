"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Clock,
  Eye,
  FileText,
  MoreHorizontal,
  RefreshCcw,
  Search,
  ShieldCheck,
  Loader2,
  ShoppingCart,
  Pencil,
  Trash2,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PolicySummaryStrip, type PolicySummaryItem } from "@/components/policies/PolicyWorkspace";
import { DataTable } from "@/components/datatable";
import { useDataTable } from "@/components/datatable/useDataTable";
import { SortableColumnHeader } from "@/components/datatable/SortableColumnHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ColumnDef } from "@tanstack/react-table";
import { ProcurementPolicyDetailsModal } from "./ProcurementPolicyDetailsModal";
import { SPEND_PROGRAM_GROUPS } from "./constants";
import type { SpendProgramListItem } from "./types";
import {
  useGetSpendPrograms,
  useDeleteSpendProgramDraft,
  useApproveSpendProgram,
  useRejectSpendProgram,
  useGetSpendProgramSettings,
  useDeleteSpendProgram,
} from "@/queries/procurement/policies";
import type { ProcurementPolicyApiRecord } from "@/queries/procurement/policies";
import { useAuthStore } from "@/stores/auth-stores";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useGetEligibleRoles } from "@/queries/policies/governance";
import { useAxios } from "@/hooks/useAxios";
import { PROCUREMENT_KEYS } from "@/lib/constants/apis";
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

// ─── Helpers ────────────────────────────────────────────────────────────────

const groupLabel = (group: string) =>
  SPEND_PROGRAM_GROUPS.find((item) => item.value === group)?.shortLabel ?? group;

const formatDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-") : "—";

const capitalizeName = (n: string) => n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : "";

const createdByName = (record: SpendProgramListItem) => {
  const cb = record.createdBy;
  if (!cb) return "—";
  if (typeof cb === "string") return cb;
  if (cb.firstName || cb.lastName) return `${cb.firstName ?? ""} ${cb.lastName ?? ""}`.trim();
  return "—";
};

// Status filter tabs under the "Policies" top-level tab
const STATUS_FILTERS = [
  { value: "all",      label: "All" },
  { value: "draft",    label: "Draft" },
  { value: "pending",  label: "Pending" },
  { value: "active",   label: "Active" },
  { value: "rejected", label: "Rejected" },
] as const;
type StatusFilter = typeof STATUS_FILTERS[number]["value"];

// ─── Component ──────────────────────────────────────────────────────────────

export function ProcurementPolicySection({
  canCreate,
  onCreateClick,
  onEdit,
  onSubmitDraft,
}: {
  canCreate: boolean;
  onCreateClick: () => void;
  onEdit?: (p: SpendProgramListItem) => void;
  onSubmitDraft?: (p: SpendProgramListItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [detailPolicy, setDetailPolicy] = useState<{ id: string; isDraft?: boolean; isReviewMode?: boolean; initialData?: any } | null>(null);
  const [viewTab, setViewTab] = useState<"policies" | "archived">("policies");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const tableProps = useDataTable({
    initialPage: 1,
    initialPageSize: 10,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: false,
    manualPagination: false,
  });

  const axios = useAxios();
  const { data, isLoading, refetch, isRefetching } = useGetSpendPrograms(1, 100);
  const deleteDraftMutation = useDeleteSpendProgramDraft();
  const approveMutation = useApproveSpendProgram();
  const rejectMutation = useRejectSpendProgram();
  const deleteProgramMutation = useDeleteSpendProgram();

  const { data: spendProgramSettingsResponse } = useGetSpendProgramSettings();
  const isSpendProgramEnabled = spendProgramSettingsResponse?.data?.enabled ?? true;

  const programs = useMemo<SpendProgramListItem[]>(() => data?.data ?? [], [data?.data]);

  const approvedCount = useMemo(() => programs.filter((p) => p.status === "active").length, [programs]);
  const pendingCount  = useMemo(() => programs.filter((p) => p.status === "pending" || p.status === "pending_approval").length, [programs]);
  const draftCount    = useMemo(() => programs.filter((p) => p.status === "draft").length, [programs]);

  const summary: PolicySummaryItem[] = [
    { label: "Active",   value: approvedCount, detail: "Currently enforced",     icon: ShieldCheck, tone: "teal" },
    { label: "Pending",  value: pendingCount,  detail: "Waiting for approval",   icon: Clock,       tone: "amber" },
    { label: "Drafts",   value: draftCount,    detail: "Still being configured", icon: FileText,    tone: "slate" },
    { label: "Total",    value: programs.filter(p => !["inactive","archived"].includes(p.status)).length, detail: "Spend programs", icon: ShoppingCart, tone: "blue" },
  ];

  const ARCHIVED_STATUSES = ["inactive", "archived"];

  const filteredPrograms = useMemo(() => {
    const q = search.toLowerCase();
    return programs.filter((p) => {
      const isArchived = ARCHIVED_STATUSES.includes(p.status?.toLowerCase());
      if (viewTab === "archived") {
        if (!isArchived) return false;
      } else {
        if (isArchived) return false;
        // Status sub-filter
        if (statusFilter !== "all") {
          const statusMatch = p.status?.toLowerCase() === statusFilter.toLowerCase() ||
            (statusFilter === "pending" && p.status?.toLowerCase() === "pending_approval");
          if (!statusMatch) return false;
        }
      }
      // Group filter
      if (groupFilter !== "all") {
        const inGroup = Array.isArray(p.groups) && p.groups.some(g => g === groupFilter);
        if (!inGroup) return false;
      }
      // Search
      return !q || p.name.toLowerCase().includes(q);
    });
  }, [programs, search, viewTab, statusFilter, groupFilter]);

  useEffect(() => {
    tableProps.setTotalItems(filteredPrograms.length);
  }, [filteredPrograms.length, tableProps.setTotalItems]);

  const user = useAuthStore.getState().user;
  const { can } = useAuthStore();
  const canUpdate     = can("policy", "update");
  const canDeactivate = can("policy", "deactivate");
  const canApprove    = can("policy", "approve");

  const checkIfReviewable = useCallback((program: SpendProgramListItem) => {
    const isPending = program.status === "pending" || program.status === "pending_approval";
    if (!isPending) return false;

    const cb = program.createdBy;
    const creatorId = typeof cb === "object" && cb !== null
      ? ((cb as any).userId ?? (cb as any).id ?? "")
      : "";
    const isCreator = Boolean(user?.userId) && Boolean(creatorId) && creatorId === user?.userId;
    if (isCreator) return false;

    const currentUserRoleId = 
      user?.companyRole?.roleId || 
      (user as any)?.companyRole?.id || 
      (user as any)?.villetoRole?.roleId || 
      (user as any)?.villetoRole?.id || 
      (user as any)?.role?.roleId || 
      (user as any)?.role?.id || 
      "";
    const approvalSetting = spendProgramSettingsResponse?.data;
    
    if (approvalSetting?.allRolesCanApprove) return true;
    if (approvalSetting?.approverRoleIds?.length) return approvalSetting.approverRoleIds.includes(currentUserRoleId);
    return canApprove;
  }, [user, spendProgramSettingsResponse?.data, canApprove]);

  const handleRowClick = useCallback((row: SpendProgramListItem) => {
    setDetailPolicy({
      id: row.procurementSpendProgramId,
      isDraft: row.status === "draft",
      isReviewMode: checkIfReviewable(row),
      initialData: row,
    });
  }, [checkIfReviewable]);

  const handleOpenSpendReview = useCallback((program: SpendProgramListItem) => {
    handleRowClick(program);
  }, [handleRowClick]);

  const columns = useMemo<ColumnDef<SpendProgramListItem>[]>(
    () => [
      {
        accessorKey: "name",
        sortingFn: (rowA, rowB, columnId) => {
          const a = String(rowA.getValue(columnId) || "").toLowerCase();
          const b = String(rowB.getValue(columnId) || "").toLowerCase();
          return a.localeCompare(b);
        },
        header: ({ column }) => <SortableColumnHeader column={column} title="Policy Name" />,
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-bold text-[#0b100e]">{capitalizeName(row.original.name)}</p>
            {row.original.description && (
              <p className="text-xs text-[#68726d] truncate max-w-[200px]">{row.original.description}</p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "groups",
        header: "Stage",
        cell: ({ row }) => {
          const GROUP_SORT_ORDER = ["pr_submission", "pr_to_po", "po_submission"];
          const raw: string[] = row.original.groups ?? [];
          const grps = [...raw].sort(
            (a, b) => GROUP_SORT_ORDER.indexOf(a) - GROUP_SORT_ORDER.indexOf(b)
          );
          if (!grps.length) return <span className="text-sm text-[#68726d]">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {grps.map(g => (
                <span key={g} className="text-xs bg-[#f0fbf9] text-[#087f70] px-2 py-0.5 rounded font-medium whitespace-nowrap">
                  {groupLabel(g)}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: "categories",
        header: "Categories",
        cell: ({ row }) => {
          const cats = row.original.categories ?? [];
          if (!cats.length) return <span className="text-sm text-[#68726d]">—</span>;
          const visible = cats.slice(0, 1);
          const rest = cats.slice(1);
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              {visible.map(c => (
                <span
                  key={c.categoryId}
                  className="text-xs bg-[#f5f7f6] text-[#3a4a44] px-2.5 py-1 rounded-full font-medium border border-black/[0.05] whitespace-nowrap max-w-[140px] truncate"
                  title={c.name}
                >
                  {c.name}
                </span>
              ))}
              {rest.length > 0 && (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs bg-[#e8f5f3] text-[#087f70] px-2.5 py-1 rounded-full font-semibold border border-[#a6e6df]/40 cursor-default whitespace-nowrap">
                        +{rest.length} more
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-[#1a2e28] text-white border-0 text-[12px] max-w-[240px] px-3 py-2.5 rounded-xl shadow-xl"
                    >
                      <div className="flex flex-wrap gap-1.5">
                        {rest.map(c => (
                          <span key={c.categoryId} className="bg-white/10 px-2 py-0.5 rounded-full text-[11px] font-medium">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "versionNumber",
        header: "Version",
        cell: ({ row }) => (
          <span className="text-sm text-[#68726d]">
            {row.original.versionNumber ? `v${row.original.versionNumber}` : "v1"}
          </span>
        ),
      },
      {
        id: "createdBy",
        header: "Created By",
        cell: ({ row }) => (
          <span className="text-sm text-[#3a4a44]">{createdByName(row.original)}</span>
        ),
      },
      {
        accessorKey: "createdAt",
        sortingFn: (rowA, rowB, columnId) => {
          const a = new Date(rowA.getValue(columnId) as string).getTime();
          const b = new Date(rowB.getValue(columnId) as string).getTime();
          return a - b;
        },
        header: ({ column }) => <SortableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => (
          <span className="text-sm text-[#68726d] tabular-nums">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: () => <div className="text-right w-full">Action</div>,
        cell: ({ row }) => {
          const program = row.original;
          const isPending = program.status === "pending" || program.status === "pending_approval";
          const showReview = checkIfReviewable(program);

          return (
            <div className="flex items-center justify-end gap-2">
              {showReview ? (
                <button
                  onClick={(e) => { e.stopPropagation(); handleOpenSpendReview(program); }}
                  className="h-8 px-4 rounded-lg bg-[#087f70] text-white text-[12px] font-semibold hover:bg-[#076b5e] transition-colors whitespace-nowrap"
                >
                  Review
                </button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#f9faf9]/60 transition-colors cursor-pointer">
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[210px] bg-white rounded-[20px] border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.08)] py-1.5 overflow-hidden">
                    <DropdownMenuItem
                      onClick={() => setDetailPolicy({ id: program.procurementSpendProgramId, isDraft: program.status === "draft", initialData: program })}
                      className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-[#0b100e] hover:bg-[#f9faf9]/40 transition-colors border-b border-black/[0.06]/50 cursor-pointer"
                    >
                      <Eye className="w-[17px] h-[17px] text-[#68726d] shrink-0" strokeWidth={1.5} />
                      View Details
                    </DropdownMenuItem>
                    {canUpdate && onEdit && !isPending && program.status !== "archived" && program.status !== "inactive" && (
                      <DropdownMenuItem
                        onClick={() => onEdit(program)}
                        className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-[#0b100e] hover:bg-[#f9faf9]/40 transition-colors border-b border-black/[0.06]/50 cursor-pointer"
                      >
                        <Pencil className="w-[17px] h-[17px] text-[#68726d] shrink-0" strokeWidth={1.5} />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {canUpdate && program.status === "draft" && (
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(program.procurementSpendProgramId); }}
                        className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-[17px] h-[17px] text-red-500 shrink-0" strokeWidth={1.5} />
                        Delete Draft
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        },
      },
    ],
    [canUpdate, canDeactivate, canApprove, handleOpenSpendReview, setDetailPolicy, onEdit, deleteDraftMutation, checkIfReviewable]
  );

  return (
    <>
      <PolicySummaryStrip items={summary} isLoading={isLoading} />

      {/* Main card */}
      <div className="bg-white rounded-[15px] border border-black/[0.07] shadow-[0_12px_35px_-30px_rgba(14,28,23,0.7)] overflow-hidden flex flex-col flex-1 min-h-0 mt-5">

        {/* Header bar */}
        <div className="flex items-center justify-between px-4 md:px-5 py-4 shrink-0 flex-wrap gap-3 border-b border-black/[0.055]">
          {/* Left: top tabs + status sub-tabs */}
          <div className="flex flex-col gap-2">
            {/* Policies / Archived top tabs */}
            <div className="inline-flex w-fit max-w-full overflow-x-auto bg-[#f5f7f6] rounded-[10px] p-1 h-10">
              <button
                onClick={() => { setViewTab("policies"); setStatusFilter("all"); }}
                className={`h-full px-4 text-[13px] rounded-[6px] transition-all whitespace-nowrap ${viewTab === "policies" ? "bg-white text-[#0b100e] font-semibold shadow-sm" : "text-[#68726d] font-semibold hover:text-[#0b100e]"}`}
              >
                Policies
              </button>
              <button
                onClick={() => { setViewTab("archived"); setStatusFilter("all"); }}
                className={`h-full px-4 text-[13px] rounded-[6px] transition-all whitespace-nowrap ${viewTab === "archived" ? "bg-white text-[#0b100e] font-semibold shadow-sm" : "text-[#68726d] font-semibold hover:text-[#0b100e]"}`}
              >
                Archived
              </button>
            </div>

            {/* Status sub-filters (only under Policies tab) */}
            {viewTab === "policies" && (
              <div className="flex items-center gap-1.5">
                {STATUS_FILTERS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className={`h-7 px-3 text-[12px] rounded-full transition-all whitespace-nowrap font-semibold
                      ${statusFilter === f.value
                        ? "bg-[#087f70] text-white"
                        : "bg-[#f5f7f6] text-[#68726d] hover:bg-[#e8f5f3] hover:text-[#087f70]"
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: group filter + search + refresh */}
          <div className="flex w-full items-center gap-2 sm:w-auto self-start sm:self-center mt-2 sm:mt-0">
            {/* Group filter dropdown */}
            <div className="relative">
              <button
                onClick={() => setGroupDropdownOpen(o => !o)}
                className="h-10 px-3 rounded-[9px] border border-black/[0.07] bg-white text-[13px] text-[#3a4a44] font-medium flex items-center gap-1.5 hover:bg-[#f4f8f6] transition-colors whitespace-nowrap"
              >
                {groupFilter === "all" ? "All Groups" : groupLabel(groupFilter)}
                <ChevronDown className="w-3.5 h-3.5 text-[#68726d]" />
              </button>
              {groupDropdownOpen && (
                <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-black/[0.07] rounded-[10px] shadow-lg py-1 min-w-[170px]">
                  <button
                    onClick={() => { setGroupFilter("all"); setGroupDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-[13px] hover:bg-[#f4f8f6] ${groupFilter === "all" ? "font-semibold text-[#087f70]" : "text-[#3a4a44]"}`}
                  >
                    All Groups
                  </button>
                  {SPEND_PROGRAM_GROUPS.map(g => (
                    <button
                      key={g.value}
                      onClick={() => { setGroupFilter(g.value); setGroupDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-[13px] hover:bg-[#f4f8f6] ${groupFilter === g.value ? "font-semibold text-[#087f70]" : "text-[#3a4a44]"}`}
                    >
                      {g.shortLabel}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#68726d]" />
              <input
                placeholder="Search policies…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-[9px] border border-black/[0.07] bg-white pl-9 pr-4 text-[13px] placeholder:text-[#929c97] focus:outline-none focus:border-[#0ea894] transition-colors sm:w-[220px]"
              />
            </div>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="flex size-10 shrink-0 items-center justify-center rounded-[9px] border border-black/[0.07] bg-white text-[#68726d] hover:bg-[#f4f8f6] hover:text-[#087f70] transition-colors"
            >
              {isRefetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCcw className="w-4 h-4" />
              )}
              <span className="sr-only">Refresh procurement policies</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#68726d]" />
          </div>
        ) : programs.filter(p => !ARCHIVED_STATUSES.includes(p.status)).length === 0 && viewTab === "policies" ? (
          <div className="flex-1 flex justify-center items-center py-16 px-6 overflow-y-auto">
            <div className="flex flex-col items-center text-center max-w-sm">
              <div className="flex size-12 rounded-[14px] bg-[#e8f8f5] items-center justify-center mb-5">
                <FileText className="w-5 h-5 text-[#087f70]" strokeWidth={1.5} />
              </div>
              <h2 className="text-[15px] font-semibold text-[#0b100e] mb-2">No procurement policies yet</h2>
              <p className="text-[13px] text-[#77837e] leading-5 mb-6">
                Create your first procurement policy to define how your organisation handles purchasing requests, vendor assignments, and purchase orders.
              </p>
              {canCreate && (
                !isSpendProgramEnabled ? (
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-not-allowed">
                          <button disabled className="h-10 px-4 rounded-[9px] bg-[#087f70]/50 text-white cursor-not-allowed text-[13px] font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4" strokeWidth={2} />
                            Create First Policy
                          </button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-800 text-white border-0 text-[12px] px-3 py-1.5 rounded-md shadow-lg" sideOffset={8}>
                        Spend Programs are currently disabled in Governance.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <button onClick={onCreateClick} className="h-10 px-4 rounded-[9px] bg-[#087f70] text-white hover:bg-[#076b5e] transition-colors text-[13px] font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4" strokeWidth={2} />
                    Create First Policy
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <DataTable
              manualPagination={true}
              data={filteredPrograms}
              columns={columns}
              initialSorting={[{ id: "createdAt", desc: true }]}
              height="auto"
              emptyState={
                <div className="w-full flex justify-center flex-col items-center pb-10">
                  <EmptyState
                    icon={<Search className="w-6 h-6" />}
                    title="No policies found"
                    description="Try adjusting your search or filter."
                  />
                </div>
              }
              onRowClick={handleRowClick}
              paginationProps={tableProps.paginationProps}
            />
          </div>
        )}
      </div>

      <ProcurementPolicyDetailsModal
        policyId={detailPolicy?.id ?? null}
        isDraft={detailPolicy?.isDraft}
        isReviewMode={detailPolicy?.isReviewMode}
        initialData={detailPolicy?.initialData}
        onEdit={(p: any) => {
          if (onEdit) onEdit(p);
          setDetailPolicy(null);
        }}
        onSubmitDraft={(p: any) => {
          if (onSubmitDraft) onSubmitDraft(p);
          setDetailPolicy(null);
        }}
        onArchive={async (p: any) => {
          try {
            await deleteProgramMutation.mutateAsync(p.procurementSpendProgramId ?? p.procurementPolicyId);
            toast.success("Spend program archived successfully.");
          } catch (err) {
            toast.error("Failed to archive spend program.");
          }
          setDetailPolicy(null);
        }}
        onDeleteDraft={async (draftId) => {
          await deleteDraftMutation.mutateAsync(draftId);
          setDetailPolicy(null);
        }}
        onApprove={async (p: any) => {
          await approveMutation.mutateAsync(p.procurementSpendProgramId ?? p.procurementPolicyId);
          toast.success("Spend program approved successfully.");
          setDetailPolicy(null);
        }}
        onReject={async (p: any) => {
          await rejectMutation.mutateAsync(p.procurementSpendProgramId ?? p.procurementPolicyId);
          toast.success("Spend program rejected.");
          setDetailPolicy(null);
        }}
        onClose={() => setDetailPolicy(null)}
      />

      {/* Delete Draft Confirmation */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent className="max-w-[420px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the draft spend program. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDeleteId) return;
                try {
                  await deleteDraftMutation.mutateAsync(confirmDeleteId);
                  toast.success("Draft deleted successfully.");
                } catch {
                  toast.error("Failed to delete draft. Please try again.");
                } finally {
                  setConfirmDeleteId(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteDraftMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Deleting…</>
              ) : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
