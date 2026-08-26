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
  Archive,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PolicySummaryStrip, type PolicySummaryItem } from "@/components/policies/PolicyWorkspace";
import { DataTable } from "@/components/datatable";
import { useDataTable } from "@/components/datatable/useDataTable";
import { SortableColumnHeader } from "@/components/datatable/SortableColumnHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ColumnDef } from "@tanstack/react-table";
import { ProcurementPolicyDetailsModal } from "./ProcurementPolicyDetailsModal";
import { POLICY_GROUPS } from "./constants";
import { useGetProcurementPolicies, useDeleteProcurementPolicyDraft } from "@/queries/procurement/policies";
import type { ProcurementPolicyApiRecord } from "@/queries/procurement/policies";
import { useAuthStore } from "@/stores/auth-stores";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useApproveProcurementPolicy, useRejectProcurementPolicy } from "@/queries/procurement/approve-reject-policy";
import { useGetEligibleRoles } from "@/queries/policies/governance";

const groupLabel = (group: string) =>
  POLICY_GROUPS.find((item) => item.value === group)?.title ?? group;

/** Short "TYPE" label for the table TYPE column */
const typeShortLabel = (group: string) => {
  if (group === "pr_submission") return "PR Submission";
  if (group === "pr_to_po")      return "PR → PO";
  if (group === "po_submission")  return "Direct PO";
  return groupLabel(group);
};

const formatDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-") : "—";

const capitalizeName = (n: string) => n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : "";

export function ProcurementPolicySection({
  canCreate,
  onCreateClick,
  onEdit,
  onSubmitDraft,
}: {
  canCreate: boolean;
  onCreateClick: () => void;
  onEdit?: (p: ProcurementPolicyApiRecord) => void;
  onSubmitDraft?: (p: ProcurementPolicyApiRecord) => void;
}) {
  const [search, setSearch] = useState("");
  const [detailPolicy, setDetailPolicy] = useState<{ id: string; isDraft?: boolean, isReviewMode?: boolean } | null>(null);
  const [viewTab, setViewTab] = useState<"active" | "archived">("active");

  const tableProps = useDataTable({
    initialPage: 1,
    initialPageSize: 10,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: false,
    manualPagination: false,
  });

  const { data, isLoading, refetch, isRefetching } = useGetProcurementPolicies(1, 1000);
  const deleteDraftMutation = useDeleteProcurementPolicyDraft();
  const approveMutation = useApproveProcurementPolicy();
  const rejectMutation = useRejectProcurementPolicy();

  const { data: eligibleRolesData } = useGetEligibleRoles("procurement_policy");
  const eligibleRoles = useMemo(() => eligibleRolesData?.data || [], [eligibleRolesData?.data]);

  const policies = useMemo<ProcurementPolicyApiRecord[]>(() => data?.data ?? [], [data?.data]);

  const approvedCount = useMemo(() => policies.filter((p) => ["approved", "active"].includes(p.status)).length, [policies]);
  const pendingCount  = useMemo(() => policies.filter((p) => p.status === "pending").length, [policies]);
  const draftCount    = useMemo(() => policies.filter((p) => p.status === "draft").length, [policies]);

  const summary: PolicySummaryItem[] = [
    { label: "Active",   value: approvedCount,      detail: "Currently enforced",       icon: ShieldCheck, tone: "teal" },
    { label: "Pending",  value: pendingCount,        detail: "Waiting for approval",     icon: Clock,       tone: "amber" },
    { label: "Drafts",   value: draftCount,          detail: "Still being configured",   icon: FileText,    tone: "slate" },
    { label: "Total",    value: policies.length,     detail: "Procurement controls",     icon: ShoppingCart,tone: "blue" },
  ];

  const filteredPolicies = useMemo(() => {
    const q = search.toLowerCase();
    return policies.filter((p) => {
      const isMatch = !q || p.name.toLowerCase().includes(q);
      const isArchived = p.status?.toLowerCase() === "inactive" || p.status?.toLowerCase() === "archived";
      if (viewTab === "active") return isMatch && !isArchived;
      return isMatch && isArchived;
    });
  }, [policies, search, viewTab]);

  useEffect(() => {
    tableProps.setTotalItems(filteredPolicies.length);
  }, [filteredPolicies.length, tableProps.setTotalItems]);

  const { can, user } = useAuthStore();
  const canUpdate     = can("policy", "update");
  const canDeactivate = can("policy", "deactivate");

  const checkIfReviewable = useCallback((policy: ProcurementPolicyApiRecord) => {
    let isApprover = false;
    const currentUserRoleId = 
      user?.companyRole?.roleId || 
      (user as any)?.companyRole?.id || 
      (user as any)?.villetoRole?.roleId || 
      (user as any)?.villetoRole?.id || 
      (user as any)?.role?.roleId || 
      (user as any)?.role?.id || 
      "";

    const canApprovePolicy = useAuthStore.getState().can("policy", "approve");

    if (canApprovePolicy) {
      isApprover = true;
    } else if ((policy as any).approvalSetting?.allRolesCanApprove) {
      isApprover = eligibleRoles.some((r: any) => r.roleId === currentUserRoleId);
    } else if ((policy as any).approvalSetting?.approverRoleIds?.length) {
      isApprover = (policy as any).approvalSetting.approverRoleIds.includes(currentUserRoleId);
    } else {
      isApprover = (policy.approvers || []).some((a: any) => a.userId === user?.userId) || (user?.userId ? (policy as any).approverIds?.includes(user?.userId) : false);
    }

    const createdByObj = (policy as any).createdBy;
    const creatorId = typeof createdByObj === 'object' && createdByObj !== null
      ? (createdByObj.id || createdByObj.userId)
      : (policy as any).createdById;
      
    let isCreator = Boolean(user?.userId) && Boolean(creatorId) && creatorId === user?.userId;

    if (!isCreator && user) {
      const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
      let creatorName = "";
      if (typeof createdByObj === 'string') {
        creatorName = createdByObj.trim().toLowerCase();
      } else if (typeof createdByObj === 'object' && createdByObj !== null) {
        creatorName = `${createdByObj.firstName || ''} ${createdByObj.lastName || ''}`.trim().toLowerCase();
      } else if (typeof (policy as any).createdByName === 'string') {
        creatorName = (policy as any).createdByName.trim().toLowerCase();
      }
      if (userFullName && creatorName && userFullName === creatorName) {
        isCreator = true;
      }
    }

    if (isApprover && isCreator) {
      let hasOtherApprovers = false;
      if ((policy as any).approvalSetting?.allRolesCanApprove) {
        hasOtherApprovers = true;
      } else if ((policy as any).approvalSetting?.approverRoleIds?.length) {
        hasOtherApprovers = true;
      } else {
        const specificUserIds = new Set<string>();
        (policy.approvers || []).forEach((a: any) => {
          if (a.userId) specificUserIds.add(a.userId);
        });
        ((policy as any).approverIds || []).forEach((id: string) => specificUserIds.add(id));
        
        specificUserIds.delete(user?.userId!);
        hasOtherApprovers = specificUserIds.size > 0;
      }
      if (hasOtherApprovers) {
        isApprover = false;
      }
    }

    const isPending = policy.status?.toLowerCase() === "pending_approval" || policy.status?.toLowerCase() === "pending";
    return isPending && isApprover;
  }, [user, eligibleRoles]);

  const handleRowClick = useCallback((row: ProcurementPolicyApiRecord) => {
    if (checkIfReviewable(row)) {
      setDetailPolicy({ id: row.procurementPolicyId, isDraft: false, isReviewMode: true });
    } else {
      setDetailPolicy({ id: row.procurementPolicyId, isDraft: row.status === "draft" });
    }
  }, [checkIfReviewable, setDetailPolicy]);

  const columns = useMemo<ColumnDef<ProcurementPolicyApiRecord>[]>(
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
        accessorKey: "policyGroup",
        header: "Type",
        cell: ({ row }) => (
          <span className="text-sm text-[#0b100e]">{typeShortLabel(row.original.policyGroup)}</span>
        ),
      },
      {
        accessorKey: "scopeType",
        header: "Applied To",
        cell: ({ row }) => (
          <span className="text-sm capitalize">
            {row.original.scopeType === "company" ? "All Employees" : "Specific"}
          </span>
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
          const policy = row.original;
          const showReviewOnly = checkIfReviewable(policy);

          return (
            <div className="flex items-center justify-end gap-2">
              {showReviewOnly ? (
                <button
                  onClick={() => setDetailPolicy({ id: policy.procurementPolicyId, isDraft: false, isReviewMode: true })}
                  className="h-8 px-4 rounded-[12px] bg-[#087f70] text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
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
                      onClick={() => setDetailPolicy({ id: row.original.procurementPolicyId, isDraft: row.original.status === "draft" })}
                      className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-[#0b100e] hover:bg-[#f9faf9]/40 transition-colors border-b border-black/[0.06]/50 cursor-pointer"
                    >
                      <Eye className="w-[17px] h-[17px] text-[#68726d] shrink-0" strokeWidth={1.5} />
                      View Details
                    </DropdownMenuItem>
                    {canUpdate && onEdit && row.original.status !== "pending" && row.original.status !== "pending_approval" && (
                      <DropdownMenuItem
                        onClick={() => onEdit(row.original)}
                        className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-[#0b100e] hover:bg-[#f9faf9]/40 transition-colors border-b border-black/[0.06]/50 cursor-pointer"
                      >
                        <Pencil className="w-[17px] h-[17px] text-[#68726d] shrink-0" strokeWidth={1.5} />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {canDeactivate && row.original.status !== "draft" && row.original.status !== "pending" && row.original.status !== "pending_approval" && (
                      <DropdownMenuItem
                        onClick={() => setDetailPolicy({ id: row.original.procurementPolicyId, isDraft: false })}
                        className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-[#0b100e] hover:bg-[#f9faf9]/40 transition-colors cursor-pointer"
                      >
                        <Archive className="w-[17px] h-[17px] text-[#68726d] shrink-0" strokeWidth={1.5} />
                        Archive Policy
                      </DropdownMenuItem>
                    )}
                    {canUpdate && row.original.status === "draft" && (
                      <DropdownMenuItem
                        onClick={() => deleteDraftMutation.mutateAsync(row.original.procurementPolicyId)}
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
    [canUpdate, canDeactivate, setDetailPolicy, onEdit, deleteDraftMutation, checkIfReviewable]
  );

  return (
    <>
      <PolicySummaryStrip items={summary} isLoading={isLoading} />

      {/* Main card */}
      <div className="bg-white rounded-[15px] border border-black/[0.07] shadow-[0_12px_35px_-30px_rgba(14,28,23,0.7)] overflow-hidden flex flex-col flex-1 min-h-0 mt-5">
        <div className="flex items-center justify-between px-4 md:px-5 py-4 shrink-0 flex-wrap gap-3 border-b border-black/[0.055]">
          <div>
            <h2 className="text-sm font-semibold text-[#14231e]">Procurement policies</h2>
            <p className="mt-0.5 text-xs text-[#8b9591]">Approval, sourcing, vendor, and purchase-order controls</p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto self-start sm:self-center mt-2 sm:mt-0">
            <div className="flex max-w-full overflow-x-auto bg-[#f5f7f6] rounded-[10px] p-1 h-10">
              <button
                onClick={() => setViewTab("active")}
                className={`h-full px-4 text-[13px] rounded-[6px] transition-all whitespace-nowrap ${viewTab === "active" ? "bg-white text-[#0b100e] font-semibold shadow-sm" : "text-[#68726d] font-semibold hover:text-[#0b100e]"}`}
              >
                Current
              </button>
              <button
                onClick={() => setViewTab("archived")}
                className={`h-full px-4 text-[13px] rounded-[6px] transition-all whitespace-nowrap ${viewTab === "archived" ? "bg-white text-[#0b100e] font-semibold shadow-sm" : "text-[#68726d] font-semibold hover:text-[#0b100e]"}`}
              >
                Archived
              </button>
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
        ) : policies.length === 0 ? (
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
                <button onClick={onCreateClick} className="h-10 px-4 rounded-[9px] bg-[#087f70] text-white hover:bg-[#076b5e] transition-colors text-[13px] font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" strokeWidth={2} />
                  Create First Policy
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <DataTable
              manualPagination={true}
              data={filteredPolicies}
              columns={columns}
              initialSorting={[{ id: "createdAt", desc: true }]}
              height="auto"
              emptyState={
                <div className="w-full flex justify-center flex-col items-center pb-10">
                  <EmptyState
                    icon={<Search className="w-6 h-6" />}
                    title="No policies found"
                    description="Try adjusting your search query."
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
        onEdit={(p) => {
          if (onEdit) onEdit(p);
          setDetailPolicy(null);
        }}
        onSubmitDraft={(p) => {
          if (onSubmitDraft) onSubmitDraft(p);
          setDetailPolicy(null);
        }}
        onArchive={(p) => {
          // Archiving procurement policies to be implemented
          setDetailPolicy(null);
        }}
        onDeleteDraft={async (draftId) => {
          await deleteDraftMutation.mutateAsync(draftId);
          setDetailPolicy(null);
        }}
        onApprove={async (p) => {
          await approveMutation.mutateAsync({ id: p.procurementPolicyId });
          toast.success("Policy approved successfully");
          setDetailPolicy(null);
        }}
        onReject={async (p) => {
          await rejectMutation.mutateAsync({ id: p.procurementPolicyId });
          toast.success("Policy rejected");
          setDetailPolicy(null);
        }}
        onClose={() => setDetailPolicy(null)} 
      />
    </>
  );
}
