"use client";

import { useMemo, useState, useEffect } from "react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { ColumnDef } from "@tanstack/react-table";
import { ProcurementPolicyDetailsModal } from "./ProcurementPolicyDetailsModal";
import { POLICY_GROUPS } from "./constants";
import { useGetProcurementPolicies } from "@/queries/procurement/policies";
import type { ProcurementPolicyApiRecord } from "@/queries/procurement/policies";

const groupLabel = (group: string) =>
  POLICY_GROUPS.find((item) => item.value === group)?.title ?? group;

const formatDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-success/10 text-success",
    active: "bg-success/10 text-success",
    pending: "bg-pending/10 text-pending",
    draft: "bg-draft/10 text-draft",
    inactive: "bg-[#f9faf9]/60 text-[#68726d]",
  };
  const cls = map[status?.toLowerCase()] ?? "bg-[#f9faf9]/60 text-[#68726d]";
  return (
    <span className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {status ?? "—"}
    </span>
  );
}

export function ProcurementPolicySection({
  canCreate,
  onCreateClick,
}: {
  canCreate: boolean;
  onCreateClick: () => void;
}) {
  const [search, setSearch] = useState("");
  const [detailPolicy, setDetailPolicy] = useState<ProcurementPolicyApiRecord | null>(null);

  const tableProps = useDataTable({
    initialPage: 1,
    initialPageSize: 10,
    totalItems: 0,
    manualSorting: false,
    manualFiltering: false,
    manualPagination: false,
  });

  const { data, isLoading, refetch, isRefetching } = useGetProcurementPolicies(1, 1000);
  const policies = useMemo<ProcurementPolicyApiRecord[]>(() => data?.data ?? [], [data?.data]);

  const approvedCount = useMemo(() => policies.filter((p) => ["approved", "active"].includes(p.status)).length, [policies]);
  const pendingCount  = useMemo(() => policies.filter((p) => p.status === "pending").length, [policies]);
  const draftCount    = useMemo(() => policies.filter((p) => p.status === "draft").length, [policies]);

  const summary: PolicySummaryItem[] = [
    { label: "Active", value: approvedCount, detail: "Currently enforced", icon: ShieldCheck, tone: "teal" },
    { label: "Pending", value: pendingCount, detail: "Waiting for approval", icon: Clock, tone: "amber" },
    { label: "Drafts", value: draftCount, detail: "Still being configured", icon: FileText, tone: "slate" },
    { label: "Total", value: policies.length, detail: "Procurement controls", icon: ShoppingCart, tone: "blue" },
  ];

  const filteredPolicies = useMemo(() => {
    const q = search.toLowerCase();
    return policies.filter(
      (p) => !q || p.name.toLowerCase().includes(q)
    );
  }, [policies, search]);

  useEffect(() => {
    tableProps.setTotalItems(filteredPolicies.length);
  }, [filteredPolicies.length, tableProps.setTotalItems]);

  const columns = useMemo<ColumnDef<ProcurementPolicyApiRecord>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Policy Name",
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-bold text-[#0b100e]">{row.original.name}</p>
            <p className="text-xs text-[#68726d]">Priority {row.original.priority}</p>
          </div>
        ),
      },
      {
        accessorKey: "policyGroup",
        header: "Policy Group",
        cell: ({ row }) => <span className="text-sm">{groupLabel(row.original.policyGroup)}</span>,
      },
      {
        accessorKey: "scopeType",
        header: "Scope",
        cell: ({ row }) => (
          <span className="text-sm capitalize">
            {row.original.scopeType === "company" ? "Entire Company" : "Specific"}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
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
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 flex items-center justify-center rounded-[8px] text-[#68726d] hover:text-[#0b100e] hover:bg-[#f9faf9] transition-colors cursor-pointer">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[210px] bg-white rounded-[20px] border border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.08)] py-1.5 overflow-hidden">
                <DropdownMenuItem
                  onClick={() => setDetailPolicy(row.original)}
                  className="flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-[#0b100e] hover:bg-[#f9faf9] transition-colors cursor-pointer"
                >
                  <Eye className="w-[17px] h-[17px] text-[#68726d] shrink-0" strokeWidth={1.5} />
                  View Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <>
      <PolicySummaryStrip items={summary} isLoading={isLoading} />

      {/* Main card */}
      <div className="bg-white rounded-[15px] border border-black/[0.07] shadow-[0_12px_35px_-30px_rgba(14,28,23,0.7)] overflow-hidden flex flex-col flex-1 min-h-0 mt-5">
        <div className="flex items-center justify-between px-4 md:px-5 py-4 shrink-0 flex-wrap gap-3 border-b border-black/[0.055]">
          <div><h2 className="text-[13px] font-semibold text-[#14231e]">Procurement policies</h2><p className="mt-0.5 text-[9px] text-[#8b9591]">Approval, sourcing, vendor, and purchase-order controls</p></div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#68726d]" />
              <input
                placeholder="Search policies…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-[9px] border border-black/[0.07] bg-white pl-9 pr-4 text-[10px] placeholder:text-[#929c97] focus:outline-none focus:border-[#0ea894] transition-colors sm:w-[220px]"
              />
            </div>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="flex size-9 shrink-0 items-center justify-center rounded-[9px] border border-black/[0.07] bg-white text-[#68726d] hover:bg-[#f4f8f6] hover:text-[#087f70] transition-colors"
            >
              {isRefetching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="w-3.5 h-3.5" />
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
          <div className="flex justify-center items-center py-10 px-6">
            <div className="w-full max-w-[580px] rounded-[15px] border border-dashed border-black/[0.08] bg-[#f9fbfa] py-12 px-8 flex flex-col items-center text-center">
              <div className="flex size-12 rounded-[14px] bg-[#e8f8f5] items-center justify-center mb-5">
                <FileText className="w-5 h-5 text-[#087f70]" strokeWidth={1.5} />
              </div>
              <h2 className="text-[15px] font-semibold text-[#0b100e] mb-2">No procurement policies yet</h2>
              <p className="text-[11px] text-[#77837e] max-w-sm leading-5 mb-6">
                Create your first procurement policy to define how your organisation handles purchasing requests, vendor assignments, and purchase orders.
              </p>
              {canCreate && (
                <button onClick={onCreateClick} className="h-9 px-4 rounded-[9px] bg-[#087f70] text-white hover:bg-[#076b5e] transition-colors text-[10px] font-semibold flex items-center gap-2">
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
              onRowClick={(row) => setDetailPolicy(row)}
              paginationProps={tableProps.paginationProps}
            />
          </div>
        )}
      </div>

      <ProcurementPolicyDetailsModal policy={detailPolicy} onClose={() => setDetailPolicy(null)} />
    </>
  );
}
