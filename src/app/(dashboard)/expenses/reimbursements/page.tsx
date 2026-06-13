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
import { Search, Filter, MoreHorizontal } from "lucide-react";
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
            value={pendingCount}
            icon={
              <Image src="/images/receipt-pending.png" alt="pending" width={24} height={24} className="w-6 h-6 object-contain" />
            }
          />
          <StatsCard
            title="Approved Reports"
            value={approvedCount}
            icon={
              <Image src="/images/svgs/submitted.svg" alt="approved" width={24} height={24} className="w-6 h-6 object-contain" />
            }
          />
          <StatsCard
            title="Rejected Reports"
            value={rejectedCount}
            icon={
              <Image src="/images/svgs/draft.svg" alt="rejected" width={24} height={24} className="w-6 h-6 object-contain" />
            }
          />
          <StatsCard
            title="Total Payout"
            value={`$${totalPayout.toLocaleString()}`}
            icon={
              <Image src="/images/svgs/money.svg" alt="payout" width={24} height={24} className="w-6 h-6 object-contain" />
            }
          />
        </div>

        {/* Tabs + search + filter */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Tab pills */}
            <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === t.key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search + filter */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by transaction etc"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 w-60 text-sm"
                />
              </div>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Filter className="w-4 h-4" />
                Filter
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-background border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" className="rounded border-border" />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wide">
                    Requested By
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wide">
                    Department
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wide">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wide">
                    Amount
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wide">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase text-xs tracking-wide">
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
                        className="border-b border-border last:border-0 hover:bg-muted/10 cursor-pointer transition-colors"
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
                            className="rounded border-border"
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
                              <AvatarFallback className="text-xs bg-muted">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">
                              {r.employee}
                            </span>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.department?.departmentName ?? "—"}
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.category}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 font-medium text-foreground">
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
                        <td className="px-4 py-3 text-muted-foreground">
                          {r.date}
                        </td>

                        {/* Action */}
                        <td
                          className="px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
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