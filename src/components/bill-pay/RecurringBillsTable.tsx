"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, MoreHorizontal, Eye, PauseCircle, PlayCircle, Edit3, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface RecurringBillRow {
  id: string;
  vendorName: string;
  description: string;
  amount: string;
  frequency: string;
  nextDue: string;
  status: "active" | "pending" | "action_required" | string;
}

const mockRecurringBills: RecurringBillRow[] = [
  { id: "00041", vendorName: "Acme Ltd", description: "Cloud Services", amount: "₦4,200,000.00", frequency: "Monthly", nextDue: "-", status: "pending" },
  { id: "00041", vendorName: "Delta Services", description: "Office Supplies", amount: "₦4,200,000.00", frequency: "Weekly", nextDue: "10 Sept 2025", status: "active" },
  { id: "00041", vendorName: "Nova Tech", description: "Advisory Services", amount: "₦4,200,000.00", frequency: "Monthly", nextDue: "-", status: "pending" },
  { id: "00041", vendorName: "Zenith Corp", description: "Software Subscription", amount: "₦4,200,000.00", frequency: "Weekly", nextDue: "10 Sept 2025", status: "active" },
  { id: "00041", vendorName: "Delta Services", description: "Equipment Lease", amount: "₦4,200,000.00", frequency: "Monthly", nextDue: "-", status: "action_required" },
  { id: "00041", vendorName: "Pinnacle Ltd", description: "Monthly Stationery", amount: "₦4,200,000.00", frequency: "Weekly", nextDue: "10 Sept 2025", status: "active" },
  { id: "00041", vendorName: "Delta Services", description: "Software Subscription", amount: "₦4,200,000.00", frequency: "Monthly", nextDue: "10 Sept 2025", status: "active" },
  { id: "00041", vendorName: "Atlas Partners", description: "Equipment Lease", amount: "₦4,200,000.00", frequency: "Weekly", nextDue: "10 Sept 2025", status: "active" },
];

export function RecurringBillsTable() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const displayItems = useMemo(() => {
    let list = mockRecurringBills;
    if (activeTab === "active") {
      list = list.filter((i) => i.status === "active");
    } else if (activeTab === "action_required") {
      list = list.filter((i) => i.status === "action_required");
    } else if (activeTab === "pending") {
      list = list.filter((i) => i.status === "pending");
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.vendorName.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeTab, search]);

  const totalEntries = 170;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));

  const startEntry = Math.min((currentPage - 1) * pageSize + 1, totalEntries);
  const endEntry = Math.min(currentPage * pageSize, totalEntries);

  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxPagesToShow = 8;
    for (let i = 1; i <= Math.min(totalPages, maxPagesToShow); i++) {
      pages.push(i);
    }
    return pages;
  }, [totalPages]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#ecfdf5] text-[#10b981] whitespace-nowrap">
            Active
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#fff8eb] text-[#d97706] whitespace-nowrap">
            Pending
          </span>
        );
      case "action_required":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#fff8eb] text-[#d97706] whitespace-nowrap">
            Action required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#f3f4f6] text-gray-700 capitalize whitespace-nowrap">
            {status.replace(/_/g, " ")}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Status Sub-filter Tabs */}
        <div className="flex items-center gap-1 bg-[#f3f4f6] p-1 rounded-xl max-w-full overflow-x-auto">
          {[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "action_required", label: "Action required" },
            { key: "pending", label: "Pending" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 font-medium"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right Search & Action Controls */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#0da594] placeholder-gray-400 bg-white"
            />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shrink-0 bg-white">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              <th className="py-3 px-4">ID</th>
              <th className="py-3 px-4">VENDOR NAME</th>
              <th className="py-3 px-4">DESCRIPTION</th>
              <th className="py-3 px-4">AMOUNT</th>
              <th className="py-3 px-4">FREQUENCY</th>
              <th className="py-3 px-4">NEXT DUE</th>
              <th className="py-3 px-4">STATUS</th>
              <th className="py-3 px-4 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayItems.map((item, idx) => (
              <tr
                key={`${item.id}-${idx}`}
                onClick={() => router.push(`/bill-pay/recurring/${item.id}`)}
                className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
              >
                <td className="py-4 px-4 text-xs font-normal text-gray-500 whitespace-nowrap">
                  {item.id}
                </td>
                <td className="py-4 px-4 text-xs font-bold text-gray-900 whitespace-nowrap">
                  {item.vendorName}
                </td>
                <td className="py-4 px-4 text-xs font-normal text-gray-500 whitespace-nowrap">
                  {item.description}
                </td>
                <td className="py-4 px-4 text-xs font-bold text-gray-900 whitespace-nowrap">
                  {item.amount}
                </td>
                <td className="py-4 px-4 text-xs font-normal text-gray-500 whitespace-nowrap">
                  {item.frequency}
                </td>
                <td className="py-4 px-4 text-xs font-normal text-gray-500 whitespace-nowrap">
                  {item.nextDue}
                </td>
                <td className="py-4 px-4 whitespace-nowrap">
                  {renderStatusBadge(item.status)}
                </td>
                <td className="py-4 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-xl border border-black/[0.08] shadow-lg">
                      <DropdownMenuItem
                        onClick={() => router.push(`/bill-pay/recurring/${item.id}`)}
                        className="text-xs cursor-pointer gap-2"
                      >
                        <Eye className="w-3.5 h-3.5 text-gray-500" /> View Schedule
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs cursor-pointer gap-2">
                        <Edit3 className="w-3.5 h-3.5 text-gray-500" /> Edit Schedule
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs cursor-pointer gap-2">
                        {item.status === "active" ? (
                          <>
                            <PauseCircle className="w-3.5 h-3.5 text-amber-500" /> Pause Schedule
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-3.5 h-3.5 text-emerald-500" /> Activate
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 text-xs text-gray-500 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <span>
            Showing {startEntry}-{endEntry} of {totalEntries} entries
          </span>
          <div className="relative inline-flex items-center">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1 pr-6 text-xs text-gray-700 font-medium focus:outline-none focus:border-[#0da594] cursor-pointer"
            >
              <option value={4}>4</option>
              <option value={8}>8</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-gray-400" />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          {pageNumbers.map((p) => (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                p === currentPage
                  ? "bg-[#0da594] text-white font-semibold shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
