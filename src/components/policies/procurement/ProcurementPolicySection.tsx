"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Clock,
  Eye,
  FileText,
  MoreHorizontal,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatsCard } from "@/components/dashboard/landing/StatCard";
import { DataTable } from "@/components/datatable";
import { useDataTable } from "@/components/datatable/useDataTable";
import { EmptyState } from "@/components/ui/empty-state";
import { ColumnDef } from "@tanstack/react-table";
import { ProcurementPolicyDetailsModal } from "./ProcurementPolicyDetailsModal";
import { POLICY_GROUPS } from "./constants";
import { useGetProcurementPolicies } from "@/queries/procurement/policies";
import type { ProcurementPolicyApiRecord } from "@/queries/procurement/policies";

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
  const [page] = useState(1);
  const [detailPolicy, setDetailPolicy] = useState<ProcurementPolicyApiRecord | null>(null);

  const { data, isLoading, refetch, isRefetching } = useGetProcurementPolicies(page, 50);
  const policies: ProcurementPolicyApiRecord[] = data?.data ?? [];

  const tableProps = useDataTable({
    initialPage: 1,
    initialPageSize: 10,
    totalItems: data?.meta?.totalCount ?? 0,
    manualSorting: false,
    manualFiltering: false,
    manualPagination: false,
  });

  const approvedCount = useMemo(() => policies.filter((p) => ["approved", "active"].includes(p.status)).length, [policies]);
  const pendingCount  = useMemo(() => policies.filter((p) => p.status === "pending").length, [policies]);
  const draftCount    = useMemo(() => policies.filter((p) => p.status === "draft").length, [policies]);

  const lastUpdated = `Last updated: ${new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}`;

  const statCards = [
    { title: "Approved Policies", value: approvedCount, icon: ShieldCheck, bg: "#418341" },
    { title: "Pending Approval",  value: pendingCount,  icon: Clock,       bg: "#D97706" },
    { title: "Draft Policies",    value: draftCount,    icon: FileText,    bg: "#384A57" },
    { title: "Total Policies",    value: policies.length, icon: FileText,  bg: "#38B2AC" },
  ];

  const filteredPolicies = useMemo(() => {
    const q = search.toLowerCase();
    return policies.filter(
      (p) => !q || p.name.toLowerCase().includes(q)
    );
  }, [policies, search]);

  const groupLabel = (group: string) =>
    POLICY_GROUPS.find((g) => g.value === group)?.title ?? group;

  const formatDate = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

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
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1.5">
        {statCards.map((s) => (
          <StatsCard
            key={s.title}
            title={s.title}
            value={isLoading ? "—" : s.value}
            icon={
              <div
                className="p-2 mr-3 flex items-center justify-center rounded-full text-white shrink-0"
                style={{ backgroundColor: s.bg }}
              >
                <s.icon className="w-5 h-5" />
              </div>
            }
            subtitle={<span className="text-xs leading-[125%]">{lastUpdated}</span>}
          />
        ))}
      </div>

      {/* Main card */}
      <div className="bg-white rounded-[1.25rem] border border-black/[0.06] shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 md:px-6 py-4 shrink-0 flex-wrap gap-3">
          <h2 className="text-sm font-bold text-[#0b100e]">Procurement Policies</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#68726d]" />
              <input
                placeholder="Search policies…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-9 pr-4 rounded-[14px] border border-black/[0.06] bg-white text-sm placeholder:text-[#68726d] focus:outline-none focus:border-primary transition-colors w-[200px]"
              />
            </div>
            <button className="h-10 px-4 rounded-[14px] border border-black/[0.06] bg-white text-sm text-[#68726d] flex items-center gap-1.5 hover:bg-[#f9faf9]/30 transition-colors">
              <SlidersHorizontal className="w-4 h-4" /> Filter <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-10 w-10 rounded-[14px] border border-black/[0.06] bg-white flex items-center justify-center text-[#68726d] hover:bg-[#f9faf9]/30 transition-colors"
            >
              {isRefetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCcw className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="border-t border-black/[0.06] flex justify-center items-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#68726d]" />
          </div>
        ) : policies.length === 0 ? (
          <div className="border-t border-black/[0.06] flex justify-center items-center py-10 px-6">
            <div className="w-full max-w-[660px] rounded-[1.5rem] border border-dashed border-black/[0.06] bg-[#087f70]/[0.02] py-10 px-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-[24px] bg-[#087f70]/[0.06] flex items-center justify-center mb-7">
                <FileText className="w-7 h-7 text-[#68726d]" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-[#0b100e] mb-2">No Procurement Policies Yet</h2>
              <p className="text-sm text-[#68726d] max-w-xs leading-relaxed mb-9">
                Create your first procurement policy to define how your organisation handles purchasing requests, vendor assignments, and purchase orders.
              </p>
              {canCreate && (
                <button onClick={onCreateClick} className="h-12 px-7 rounded-full bg-[#087f70] text-white hover:opacity-90 transition-opacity text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" strokeWidth={2} />
                  Create First Policy
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 border-t border-black/[0.06] overflow-hidden flex flex-col">
            <DataTable
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
              paginationProps={{ ...tableProps.paginationProps, total: filteredPolicies.length }}
            />
          </div>
        )}
      </div>

      <ProcurementPolicyDetailsModal policy={detailPolicy} onClose={() => setDetailPolicy(null)} />
    </>
  );
}
