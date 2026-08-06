"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Filter, MoreHorizontal, FileText, CheckCircle2, XCircle, Banknote, Clock } from "lucide-react";
import { unsortedReimbursements } from "@/lib/mock-data";
import { getStatusIcon } from "@/lib/helper";
import { PageLoader } from "@/components/PageLoader/PageLoader";
import type { PersonalExpenseStatus } from "@/components/expenses/table/personalColumns";
import { StatsCard } from "@/components/dashboard/landing/StatCard";
import { Pagination } from "@/components/ui/custom-pagination";

// ─── Types ─────────────────────────────────────────────────────────────────────

type TabStatus = "all" | "approved" | "rejected" | "pending";

// ─── Status badge helpers ───────────────────────────────────────────────────────

const getStatusVariant = (
  status: string
): "approved" | "rejected" | "pending" | "paid" => {
  switch (status) {
    case "approved":
      return "approved";
    case "paid":
      return "paid";
    case "rejected":
    case "declined":
      return "rejected";
    default:
      return "pending";
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case "paid":
      return "Paid Out";
    case "declined":
    case "rejected":
    case "declined":
      return "Rejected";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function ReimbursementsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabStatus>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Stats
  const pendingCount = unsortedReimbursements.filter(
    (r) => r.status === "pending"
  ).length;
  const approvedCount = unsortedReimbursements.filter(
    (r) => r.status === "approved"
  ).length;
  const rejectedCount = unsortedReimbursements.filter((r) =>
    ["rejected", "declined"].includes(r.status)
  ).length;
  const totalPayout = unsortedReimbursements
    .filter((r) => ["approved", "paid"].includes(r.status))
    .reduce((sum, r) => sum + r.amount, 0);

  // Filter rows
  const filtered = unsortedReimbursements.filter((r) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "rejected"
        ? ["rejected", "declined"].includes(r.status)
        : r.status === activeTab);
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.employee.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const tabs: { key: TabStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "pending", label: "Pending" },
  ];

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <PageLoader>
      <div className="p-6 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Pending Reports"
            value={pendingCount.toString()}
            accentColor="#0b100e"
            icon={<FileText className="w-4 h-4 text-[#0b100e]" />}
          />
          <StatsCard
            title="Approved Reports"
            value={approvedCount.toString()}
            accentColor="#087f70"
            icon={<CheckCircle2 className="w-4 h-4 text-[#087f70]" />}
          />
          <StatsCard
            title="Rejected Reports"
            value={rejectedCount.toString()}
            accentColor="#d33d44"
            icon={<Clock className="w-4 h-4 text-[#d33d44]" />}
          />
          <StatsCard
            title="Total Payout"
            value={`$${totalPayout.toLocaleString()}`}
            accentColor="#0ea894"
            icon={<Banknote className="w-4 h-4 text-[#0ea894]" />}
          />
        </div>

        {/* Tabs + search + filter */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Tab pills */}
            <div className="flex gap-1 bg-[#f9faf9] rounded-[8px] p-1 border border-black/[0.06]">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-1.5 rounded-[6px] text-[13px] font-semibold transition-colors ${
                    activeTab === t.key
                      ? "bg-white text-[#0b100e] shadow-sm"
                      : "text-[#68726d] hover:text-[#0b100e]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search + filter */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#84908a]" />
                <Input
                  placeholder="Search by transaction etc"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 w-60 text-[13px] rounded-[8px] border-black/[0.08]"
                />
              </div>
              <button className="h-9 px-4 flex items-center gap-1.5 rounded-[8px] border border-black/[0.08] text-[13px] font-semibold text-[#68726d] hover:bg-[#f9faf9] hover:text-[#0b100e] transition-colors">
                <Filter className="w-3.5 h-3.5" />
                Filter
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-black/[0.06] rounded-[12px] overflow-hidden">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-[#f9faf9] border-b border-black/[0.06]">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" className="rounded border-black/[0.2]" />
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#84908a] text-[11px] uppercase tracking-wide">
                    Requested By
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#84908a] text-[11px] uppercase tracking-wide">
                    Department
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#84908a] text-[11px] uppercase tracking-wide">
                    Category
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#84908a] text-[11px] uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#84908a] text-[11px] uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#84908a] text-[11px] uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#84908a] text-[11px] uppercase tracking-wide">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-16 text-muted-foreground"
                    >
                      No reimbursements found.
                    </td>
                  </tr>
                ) : (
                  paginated.map((r) => {
                    const initials = r.employee
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <tr
                        key={r.id}
                        className="border-b border-black/[0.06] last:border-0 hover:bg-[#f9faf9] cursor-pointer transition-colors"
                        onClick={() =>
                          router.push(`/expenses/reimbursements/${r.id}`)
                        }
                      >
                        <td
                          className="px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="rounded border-black/[0.2]"
                          />
                        </td>

                        {/* Requested by */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-8 h-8">
                              <AvatarImage
                                src={r.avatar}
                                alt={r.employee}
                              />
                              <AvatarFallback className="text-[11px] font-semibold bg-[#f0faf8] text-[#087f70]">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-[#0b100e] text-[13px]">
                              {r.employee}
                            </span>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-4 py-3 text-[13px] text-[#68726d]">
                          {r.department?.departmentName ?? "—"}
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3 text-[13px] text-[#68726d]">
                          {r.category}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 text-[13px] font-semibold text-[#0b100e]">
                          ${r.amount.toFixed(2)}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge
                            variant={getStatusVariant(r.status)}
                            className="gap-1"
                          >
                            {getStatusIcon(r.status as PersonalExpenseStatus)}
                            {getStatusLabel(r.status)}
                          </Badge>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 text-[13px] text-[#68726d]">
                          {r.date}
                        </td>

                        {/* Action */}
                        <td
                          className="px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="h-8 w-8 flex items-center justify-center rounded-[6px] hover:bg-[#f5f7f6] text-[#68726d] transition-colors"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/expenses/reimbursements/${r.id}`
                                  )
                                }
                              >
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <Pagination
              total={filtered.length}
              page={page}
              perPage={perPage}
              onPage={setPage}
              onPerPage={setPerPage}
            />
          </div>
        </div>
      </div>
    </PageLoader>
  );
}