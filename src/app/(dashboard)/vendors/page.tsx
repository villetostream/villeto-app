"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  BadgeCheck,
  Clock,
  XCircle,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { AddVendorDialog } from "@/components/vendors/AddVendorDialog";
import {
  useMyVendorsList,
  resolveVendorLifecycleStatus,
  type VendorLifecycleStatus,
} from "@/queries/vendors/vendor-network";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import { useDateFilterStore } from "@/stores/useDateFilterStore";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { asRecord, getString, pickString } from "@/lib/types/api-error";

type MyVendorTab = "all" | "verified" | "invited" | "under_review" | "rejected";

interface MyVendorItem {
  id: string;
  name: string;
  regNo: string;
  email: string;
  invitedOn: string;
  invitedAtMs: number;
  lifecycleStatus: VendorLifecycleStatus;
  lastUpdated: string;
}

const LIFECYCLE_BADGE_MAP: Record<
  VendorLifecycleStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "bg-[#e7f6f2] text-[#087f70]",
  },
  pending_company_approval: {
    label: "Under Review",
    className: "bg-[#fff9e6] text-[#b27b00]",
  },
  pending_vendor_action: {
    label: "Pending Vendor",
    className: "bg-[#fff9e6] text-[#b27b00]",
  },
  invited: {
    label: "Invited",
    className: "bg-[#f5f7f6] text-[#68726d]",
  },
  rejected: {
    label: "Rejected",
    className: "bg-[#fdf2f2] text-[#d33d44]",
  },
  suspended: {
    label: "Suspended",
    className: "bg-[#fdf2f2] text-[#d33d44]",
  },
  inactive: {
    label: "Inactive",
    className: "bg-[#f5f7f6] text-[#68726d]",
  },
};

function formatShortDate(rawValue: unknown): string {
  const str = getString(rawValue);
  if (!str) return "—";
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return "—";
  return format(parsed, "dd-MM-yyyy");
}

function buildVisiblePages(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  ) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

function MyVendorsPage() {
  const router = useRouter();
  const policies = useAuthorizationPolicies();
  const { setAction, clearAction } = useHeaderActionStore();
  const { fromDate, toDate } = useDateFilterStore();

  const canInviteVendor =
    policies.vendors.canInvite || policies.vendors.canCreate;

  const [activeTab, setActiveTab] = useState<MyVendorTab>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [pageSize, setPageSize] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!canInviteVendor) {
      clearAction();
      return;
    }
    setAction({
      label: "Add Vendor",
      onClick: () => setShowAddModal(true),
      secondaryAction: {
        label: "Bulk invite",
        iconName: "upload",
        onClick: () => router.push("/vendors/bulk-invite-page"),
      },
    });
    return () => clearAction();
  }, [canInviteVendor, setAction, clearAction, router]);

  const perPageNum = parseInt(pageSize, 10) || 10;

  // The API only accepts page/limit on this endpoint (view, lifecycleStatus,
  // dates are rejected with HTTP 400), so fetch one wide page and filter,
  // search and paginate locally.
  const vendorsApi = useMyVendorsList({ page: 1, limit: 100 });

  const mappedVendors: MyVendorItem[] = useMemo(() => {
    const list = vendorsApi.data?.data?.data || [];
    return list.map((raw, idx) => {
      const v = asRecord(raw);
      const id = getString(v.vendorId) || getString(v.id) || `v-${idx}`;
      const name =
        pickString(v, "legalName", "displayName", "name") || "Unnamed Vendor";
      const email = getString(v.email) || "—";
      const regNo =
        getString(v.registrationNumber) ||
        getString(v.cacNumber) ||
        getString(v.tin) ||
        "—";

      return {
        id,
        name,
        regNo,
        email,
        invitedOn: formatShortDate(v.invitedAt ?? v.createdAt),
        invitedAtMs: new Date(
          getString(v.invitedAt) || getString(v.createdAt),
        ).getTime(),
        lifecycleStatus: resolveVendorLifecycleStatus(v),
        lastUpdated: formatShortDate(v.updatedAt ?? v.invitedAt),
      };
    });
  }, [vendorsApi.data]);

  const filteredVendors = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    const fromMs = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
    const toMs = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null;
    return mappedVendors.filter((v) => {
      if (statusFilter !== "all" && v.lifecycleStatus !== statusFilter) {
        return false;
      }
      if (activeTab === "verified" && v.lifecycleStatus !== "active")
        return false;
      if (
        activeTab === "invited" &&
        v.lifecycleStatus !== "invited" &&
        v.lifecycleStatus !== "pending_vendor_action"
      )
        return false;
      if (
        activeTab === "under_review" &&
        v.lifecycleStatus !== "pending_company_approval"
      )
        return false;
      if (
        activeTab === "rejected" &&
        v.lifecycleStatus !== "rejected" &&
        v.lifecycleStatus !== "suspended" &&
        v.lifecycleStatus !== "inactive"
      )
        return false;
      if (query) {
        const haystack = `${v.name} ${v.email} ${v.regNo}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (!Number.isNaN(v.invitedAtMs)) {
        if (fromMs !== null && v.invitedAtMs < fromMs) return false;
        if (toMs !== null && v.invitedAtMs > toMs) return false;
      }
      return true;
    });
  }, [mappedVendors, activeTab, statusFilter, debouncedSearch, fromDate, toDate]);

  const summary = vendorsApi.data?.data?.summary;
  const totalEntries = filteredVendors.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / perPageNum));
  const safePage = Math.min(currentPage, totalPages);
  const pagedVendors = filteredVendors.slice(
    (safePage - 1) * perPageNum,
    safePage * perPageNum,
  );

  const computedCounts = useMemo(() => {
    if (summary) {
      return {
        total: summary.total,
        verified: summary.approved,
        pending: summary.pending,
        rejected: summary.rejected,
      };
    }
    return {
      total: vendorsApi.data?.data?.meta?.totalCount ?? mappedVendors.length,
      verified: mappedVendors.filter((v) => v.lifecycleStatus === "active").length,
      pending: mappedVendors.filter(
        (v) => v.lifecycleStatus === "pending_company_approval",
      ).length,
      rejected: mappedVendors.filter((v) => v.lifecycleStatus === "rejected")
        .length,
    };
  }, [summary, mappedVendors, vendorsApi.data]);

  const statCards = [
    {
      title: "Total Vendors",
      value: computedCounts.total.toString(),
      accent: "#087f70",
      icon: Users,
      subtitle: "All vendors added",
    },
    {
      title: "Verified Vendors",
      value: computedCounts.verified.toString(),
      accent: "#9333ea",
      icon: BadgeCheck,
      subtitle: "Vendors fully approved",
    },
    {
      title: "Verification Pending",
      value: computedCounts.pending.toString(),
      accent: "#d97706",
      icon: Clock,
      subtitle: "Vendors who submitted onboarding",
    },
    {
      title: "Rejected Vendors",
      value: computedCounts.rejected.toString(),
      accent: "#ef4444",
      icon: XCircle,
      subtitle: "Total number of vendors rejected",
    },
  ];

  const startEntry =
    totalEntries === 0 ? 0 : Math.min((safePage - 1) * perPageNum + 1, totalEntries);
  const endEntry = Math.min(safePage * perPageNum, totalEntries);
  const visiblePages = buildVisiblePages(safePage, totalPages);

  return (
    <div className="space-y-6 flex-1 flex flex-col min-h-0 overflow-hidden h-full">
      {/* Add Vendor Dialog */}
      <AddVendorDialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => void vendorsApi.refetch()}
      />

      {/* 4 Stat Cards in a row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {statCards.map((s) => (
          <div
            key={s.title}
            className="flex flex-col justify-between rounded-[14px] border border-black/[0.06] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[13px] font-medium text-[#68726d]">{s.title}</p>
                {vendorsApi.isLoading ? (
                  <Skeleton className="h-7 w-14 mt-2 rounded-[6px]" />
                ) : (
                  <p className="text-[26px] font-bold text-[#0b100e] mt-2 leading-none">
                    {s.value}
                  </p>
                )}
              </div>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${s.accent}15` }}
              >
                <s.icon className="w-5 h-5" style={{ color: s.accent }} />
              </div>
            </div>
            <p className="text-[12px] text-[#84908a] mt-4">{s.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Main Table Card */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-[16px] border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Table Filter Tabs & Search Bar */}
        <div className="p-4 sm:p-5 border-b border-black/[0.06] flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
          {/* Tabs Pill Group */}
          <div className="inline-flex p-1 rounded-[10px] bg-[#f5f7f6] overflow-x-auto max-w-full">
            {(
              [
                { id: "all", label: "All Vendors" },
                { id: "verified", label: "Verified" },
                { id: "invited", label: "Invited" },
                { id: "under_review", label: "Under Review" },
                { id: "rejected", label: "Rejected" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-4 py-1.5 rounded-[8px] text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-white text-[#0b100e] shadow-xs font-semibold"
                    : "text-[#68726d] hover:text-[#0b100e]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right Controls: Search & Custom Filter */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#84908a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full h-9 pl-9 pr-3 rounded-[8px] border border-black/[0.08] bg-white text-[13px] placeholder:text-[#84908a] focus:outline-none focus:border-[#087f70] transition-colors"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-9 px-3 rounded-[8px] border border-black/[0.08] bg-white text-[13px] text-[#0b100e] hover:bg-[#f9faf9] transition-colors flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#68726d]" />
                  <span>Filter</span>
                  <ChevronDown className="w-3 h-3 text-[#84908a]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-1">
                {(
                  [
                    { value: "all", label: "All Statuses" },
                    { value: "active", label: "Active" },
                    { value: "pending_company_approval", label: "Under Review" },
                    { value: "pending_vendor_action", label: "Pending Vendor" },
                    { value: "invited", label: "Invited" },
                    { value: "rejected", label: "Rejected" },
                    { value: "suspended", label: "Suspended" },
                  ] as const
                ).map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => {
                      setStatusFilter(opt.value);
                      setCurrentPage(1);
                    }}
                    className={`text-[12px] cursor-pointer ${
                      statusFilter === opt.value
                        ? "font-semibold text-[#087f70]"
                        : ""
                    }`}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          {vendorsApi.isError ? (
            <div
              role="alert"
              className="flex flex-col items-center justify-center py-20 px-6 text-center"
            >
              <p className="text-[14px] font-semibold text-[#0b100e]">
                Could not load your legal entity&apos;s vendor list.
              </p>
              <button
                type="button"
                onClick={() => void vendorsApi.refetch()}
                className="mt-3 h-9 px-4 rounded-[8px] border border-black/[0.12] text-[13px] font-semibold text-[#087f70] hover:bg-[#f0faf8] cursor-pointer"
              >
                Try again
              </button>
            </div>
          ) : vendorsApi.isLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4, 5].map((row) => (
                <Skeleton key={row} className="h-12 w-full rounded-[8px]" />
              ))}
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#f5f7f6] flex items-center justify-center mb-4">
                <Building2 className="w-7 h-7 text-[#84908a]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#0b100e]">
                {debouncedSearch || activeTab !== "all" || statusFilter !== "all"
                  ? "No vendors match this filter"
                  : "No vendors onboarded yet"}
              </h3>
              <p className="text-[13px] text-[#68726d] mt-1 max-w-xs">
                {debouncedSearch || activeTab !== "all" || statusFilter !== "all"
                  ? "Try switching tabs or clearing your search criteria."
                  : "Use the Add Vendor button above to invite or connect a supplier."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/[0.06] text-[11px] font-bold text-[#84908a] uppercase tracking-wider">
                  <th className="py-3.5 px-5">VENDOR NAME</th>
                  <th className="py-3.5 px-5">REG NO.</th>
                  <th className="py-3.5 px-5">EMAIL</th>
                  <th className="py-3.5 px-5">INVITED ON</th>
                  <th className="py-3.5 px-5">STATUS</th>
                  <th className="py-3.5 px-5">LAST UPDATED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {pagedVendors.map((vendor) => {
                  const badge =
                    LIFECYCLE_BADGE_MAP[vendor.lifecycleStatus] ||
                    LIFECYCLE_BADGE_MAP.invited;
                  return (
                    <tr
                      key={vendor.id}
                      onClick={() =>
                        router.push(
                          `/vendors/${vendor.id}?from=my-vendors&relationship=connected`,
                        )
                      }
                      className="hover:bg-[#f9faf9] transition-colors cursor-pointer text-[13px]"
                    >
                      <td className="py-3.5 px-5 font-semibold text-[#0b100e]">
                        {vendor.name}
                      </td>
                      <td className="py-3.5 px-5 font-normal text-[#68726d]">
                        {vendor.regNo}
                      </td>
                      <td className="py-3.5 px-5 font-normal text-[#68726d]">
                        {vendor.email}
                      </td>
                      <td className="py-3.5 px-5 font-normal text-[#68726d]">
                        {vendor.invitedOn}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-normal text-[#68726d]">
                        {vendor.lastUpdated}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Custom Pagination Footer */}
        <div className="p-4 sm:p-5 border-t border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 text-[13px] text-[#68726d]">
          <div className="flex items-center gap-2">
            <span>
              Showing {startEntry}-{endEntry} of {totalEntries} entries
            </span>
            <div className="w-18">
              <Select
                value={pageSize}
                onValueChange={(val) => {
                  setPageSize(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 rounded-[8px] border-black/[0.1] text-[12px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[4.5rem]">
                  <SelectItem value="10" className="text-[12px]">
                    10
                  </SelectItem>
                  <SelectItem value="20" className="text-[12px]">
                    20
                  </SelectItem>
                  <SelectItem value="50" className="text-[12px]">
                    50
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
              className="px-2.5 h-8 rounded-[6px] text-[12px] text-[#68726d] hover:bg-[#f5f7f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer font-medium"
            >
              Previous
            </button>

            {visiblePages.map((p, idx) =>
              p === "..." ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-8 h-8 inline-flex items-center justify-center text-[12px] text-[#84908a]"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`w-8 h-8 rounded-[6px] text-[12px] font-semibold transition-colors cursor-pointer ${
                    safePage === p
                      ? "bg-[#00a389] text-white"
                      : "text-[#68726d] hover:bg-[#f5f7f6]"
                  }`}
                >
                  {p}
                </button>
              ),
            )}

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
              className="px-2.5 h-8 rounded-[6px] text-[12px] text-[#68726d] hover:bg-[#f5f7f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withPermissions(MyVendorsPage, [
  { resource: "vendor.directory", action: "read" },
  { resource: "vendor", action: "read_company" },
]);
