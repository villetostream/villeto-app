"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "use-debounce";
import {
  Search,
  SlidersHorizontal,
  MoreHorizontal,
  Eye,
  Loader2,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Receipt2, Cards } from "iconsax-reactjs";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO } from "date-fns";
import { useTransactionLegalEntities } from "@/features/entity-workspace/hooks";
import {
  useRecurringOccurrences,
  useRecurringProfiles,
  type OccurrenceState,
  type RecurringProfile,
  type RecurringOccurrence,
} from "@/queries/bill-pay/recurring";
import { RecurringCardSubscriptionsTable } from "./RecurringCardSubscriptionsTable";

const VIEWS: Array<{ key: "schedules" | OccurrenceState; label: string }> = [
  { key: "schedules", label: "All Schedules" },
  { key: "upcoming",  label: "Upcoming" },
  { key: "due",       label: "Due" },
  { key: "overdue",   label: "Overdue" },
  { key: "matched",   label: "Matched" },
  { key: "skipped",   label: "Skipped" },
];

const CADENCES = [
  { value: "weekly",    label: "Weekly" },
  { value: "monthly",   label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly",    label: "Yearly" },
] as const;

const SCHEDULE_STATUSES = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "ended",  label: "Ended" },
] as const;

function formatCurrency(amount: string | number | null, currency: string = "NGN") {
  if (amount == null || amount === "") return "Variable";
  const numeric = typeof amount === "number" ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(numeric);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value.slice(0, 10)), "dd MMM yyyy");
  } catch {
    return value;
  }
}

function InvoiceRecurringBillsTable() {
  const router = useRouter();
  const entities = useTransactionLegalEntities("finance");
  const entityOptions = entities.data?.data || [];
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const legalEntityId = entityOptions.some((entity) => entity.legalEntityId === selectedEntityId)
    ? selectedEntityId
    : entityOptions[0]?.legalEntityId || "";

  const [view, setView] = useState<(typeof VIEWS)[number]["key"]>("schedules");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search.trim(), 300);
  const isSearchPending = search.trim() !== debouncedSearch;

  const [showFilters, setShowFilters] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState("");
  const [cadence, setCadence] = useState("");
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();

  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter panel on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fromDateString = useMemo(() => (fromDate ? format(fromDate, "yyyy-MM-dd") : undefined), [fromDate]);
  const toDateString = useMemo(() => (toDate ? format(toDate, "yyyy-MM-dd") : undefined), [toDate]);

  const schedulesQuery = useRecurringProfiles(
    {
      legalEntityId,
      status: scheduleStatus || undefined,
      cadence: cadence || undefined,
      search: debouncedSearch || undefined,
      page,
      limit: pageSize,
    },
    view === "schedules" && !isSearchPending
  );

  const occurrencesQuery = useRecurringOccurrences(
    {
      legalEntityId,
      status: view === "schedules" ? undefined : view,
      from: fromDateString,
      to: toDateString,
      page,
      limit: pageSize,
    },
    view !== "schedules"
  );

  const activeQuery = view === "schedules" ? schedulesQuery : occurrencesQuery;
  const isLoading = activeQuery.isLoading || isSearchPending || entities.isLoading;
  const isError = activeQuery.isError;
  const isFetching = activeQuery.isFetching;

  const meta = activeQuery.data?.meta;
  const totalEntries = meta?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const startEntry = totalEntries === 0 ? 0 : Math.min((page - 1) * pageSize + 1, totalEntries);
  const endEntry = Math.min(page * pageSize, totalEntries);

  const pageNumbers = useMemo(() => {
    const maxPagesToShow = 6;
    return Array.from({ length: Math.min(totalPages, maxPagesToShow) }, (_, i) => i + 1);
  }, [totalPages]);

  const hasActiveFilters = Boolean(
    scheduleStatus || cadence || fromDate || toDate || (!entities.workspaceEnabled && selectedEntityId)
  );

  function resetFilters() {
    setScheduleStatus("");
    setCadence("");
    setFromDate(undefined);
    setToDate(undefined);
    setPage(1);
  }

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-[#f3f4f6] p-1 rounded-xl max-w-full overflow-x-auto shrink-0">
          {VIEWS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setView(tab.key);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                view === tab.key
                  ? "bg-white text-gray-900 font-semibold shadow-sm"
                  : "text-gray-500 hover:text-gray-900 font-medium"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search, Filter & Actions */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          {view === "schedules" && (
            <div className="relative flex-1 lg:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendor, description…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#087f70] focus:ring-1 focus:ring-[#087f70]/20 placeholder-gray-400 bg-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Filter Popover Button */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors shrink-0 bg-white ${
                hasActiveFilters
                  ? "border-[#087f70] text-[#087f70] bg-[#f0faf8]"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#087f70]" />
              )}
            </button>

            {showFilters && (
              <div className="absolute right-0 top-full mt-2 z-30 w-72 rounded-2xl border border-black/[0.08] bg-white p-4 shadow-xl space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-900">Filter Options</span>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-[11px] font-medium text-[#087f70] hover:underline"
                    >
                      Reset all
                    </button>
                  )}
                </div>

                {view === "schedules" ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-gray-600">Frequency (Cadence)</label>
                      <Select
                        value={cadence || "all"}
                        onValueChange={(val) => {
                          setCadence(val === "all" ? "" : val);
                          setPage(1);
                        }}
                      >
                        <SelectTrigger className="w-full h-8 px-2.5 rounded-lg border-gray-200 text-xs bg-white text-gray-800">
                          <SelectValue placeholder="All frequencies" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-black/[0.08] shadow-lg">
                          <SelectItem value="all" className="text-xs">All frequencies</SelectItem>
                          {CADENCES.map((c) => (
                            <SelectItem key={c.value} value={c.value} className="text-xs">
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-gray-600">Schedule Status</label>
                      <Select
                        value={scheduleStatus || "all"}
                        onValueChange={(val) => {
                          setScheduleStatus(val === "all" ? "" : val);
                          setPage(1);
                        }}
                      >
                        <SelectTrigger className="w-full h-8 px-2.5 rounded-lg border-gray-200 text-xs bg-white text-gray-800">
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-black/[0.08] shadow-lg">
                          <SelectItem value="all" className="text-xs">All statuses</SelectItem>
                          {SCHEDULE_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value} className="text-xs">
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-gray-600">Expected Date Range</label>
                    <div className="space-y-2">
                      <DatePicker
                        date={fromDate}
                        setDate={(d) => {
                          setFromDate(d);
                          setPage(1);
                        }}
                        placeholder="From date"
                        className="h-8 text-xs rounded-lg"
                        toDate={toDate}
                      />
                      <DatePicker
                        date={toDate}
                        setDate={(d) => {
                          setToDate(d);
                          setPage(1);
                        }}
                        placeholder="To date"
                        className="h-8 text-xs rounded-lg"
                        fromDate={fromDate}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              void activeQuery.refetch();
              toast.success("Recurring bills refreshed");
            }}
            disabled={isLoading || isFetching || !legalEntityId}
            title="Refresh recurring bills"
            className="flex items-center gap-2 h-9 px-3.5 rounded-[8px] border border-black/[0.12] text-[13px] text-[#0b100e] bg-white hover:bg-[#f9faf9] transition-colors whitespace-nowrap disabled:opacity-60 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#087f70] ${isLoading || isFetching ? "animate-spin" : ""}`} />
            <span className="font-semibold text-[13px]">{isLoading || isFetching ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ── Active Filter Pills ── */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Active filters:</span>
          {cadence && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0faf8] text-[#087f70] text-xs font-medium border border-[#087f70]/20">
              Cadence: {CADENCES.find((c) => c.value === cadence)?.label || cadence}
              <button
                type="button"
                onClick={() => {
                  setCadence("");
                  setPage(1);
                }}
                className="hover:text-red-500 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {scheduleStatus && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0faf8] text-[#087f70] text-xs font-medium border border-[#087f70]/20">
              Status: {SCHEDULE_STATUSES.find((s) => s.value === scheduleStatus)?.label || scheduleStatus}
              <button
                type="button"
                onClick={() => {
                  setScheduleStatus("");
                  setPage(1);
                }}
                className="hover:text-red-500 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {fromDate && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0faf8] text-[#087f70] text-xs font-medium border border-[#087f70]/20">
              From: {format(fromDate, "dd MMM yyyy")}
              <button
                type="button"
                onClick={() => {
                  setFromDate(undefined);
                  setPage(1);
                }}
                className="hover:text-red-500 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {toDate && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f0faf8] text-[#087f70] text-xs font-medium border border-[#087f70]/20">
              To: {format(toDate, "dd MMM yyyy")}
              <button
                type="button"
                onClick={() => {
                  setToDate(undefined);
                  setPage(1);
                }}
                className="hover:text-red-500 ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-gray-500 hover:text-gray-800 underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Table Content ── */}
      <div className="overflow-x-auto -mx-5 px-5">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin text-[#087f70]" />
            Loading recurring schedules…
          </div>
        ) : entities.isError ? (
          <div className="py-14 text-center">
            <p className="text-sm text-red-500">Could not load legal entity access.</p>
            <button
              type="button"
              onClick={() => void entities.refetch()}
              className="mt-3 text-xs font-semibold text-[#087f70] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : !legalEntityId ? (
          <div className="py-14 text-center">
            <p className="text-sm font-medium text-gray-700">No eligible legal entity selected</p>
            <p className="mt-1 text-xs text-gray-400">
              Select one legal entity to view recurring bills.
            </p>
          </div>
        ) : isError ? (
          <div className="py-14 text-center">
            <p className="text-sm text-red-500">Failed to load recurring bills.</p>
            <button
              type="button"
              onClick={() => void activeQuery.refetch()}
              className="mt-3 text-xs font-semibold text-[#087f70] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (activeQuery.data?.data.length || 0) === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm font-medium text-gray-700">
              {view === "schedules" ? "No recurring schedules found" : `No ${view} occurrences found`}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {search || hasActiveFilters
                ? "Try adjusting your search or filters."
                : "Set up a recurring bill to automatically track and review expected vendor invoices."}
            </p>
            {view === "schedules" && !search && !hasActiveFilters && (
              <Button
                type="button"
                onClick={() => router.push("/bill-pay/add-recurring")}
                className="mt-4 rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Set Up Recurring Bill
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">VENDOR NAME</th>
                <th className="py-3 px-4">DESCRIPTION</th>
                <th className="py-3 px-4">AMOUNT</th>
                <th className="py-3 px-4">FREQUENCY</th>
                <th className="py-3 px-4">
                  {view === "schedules" ? "NEXT DUE" : "EXPECTED DATE"}
                </th>
                <th className="py-3 px-4">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {view === "schedules"
                ? (schedulesQuery.data?.data || []).map((row: RecurringProfile) => (
                    <tr
                      key={row.recurringBillId}
                      onClick={() => router.push(`/bill-pay/recurring/${row.recurringBillId}`)}
                      className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-4 text-xs font-normal text-gray-500 whitespace-nowrap">
                        {row.recurringBillId.slice(0, 8)}
                      </td>
                      <td className="py-4 px-4 text-xs font-bold text-gray-900 whitespace-nowrap">
                        {row.vendorName || "Vendor"}
                      </td>
                      <td className="py-4 px-4 text-xs font-normal text-gray-600 max-w-[200px] truncate">
                        {row.description}
                      </td>
                      <td className="py-4 px-4 text-xs font-bold text-gray-900 whitespace-nowrap">
                        {formatCurrency(row.expectedAmount, row.currency)}
                      </td>
                      <td className="py-4 px-4 text-xs font-medium text-gray-700 capitalize whitespace-nowrap">
                        {row.cadence}
                      </td>
                      <td className="py-4 px-4 text-xs font-normal text-gray-500 whitespace-nowrap">
                        {formatDate(row.nextExpectedDate)}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))
                : (occurrencesQuery.data?.data || []).map((row: RecurringOccurrence) => (
                    <tr
                      key={row.recurringBillOccurrenceId}
                      onClick={() => router.push(`/bill-pay/recurring/${row.recurringBillId}`)}
                      className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-4 text-xs font-normal text-gray-500 whitespace-nowrap">
                        {row.recurringBillOccurrenceId.slice(0, 8)}
                      </td>
                      <td className="py-4 px-4 text-xs font-bold text-gray-900 whitespace-nowrap">
                        {row.vendorName || "Vendor"}
                      </td>
                      <td className="py-4 px-4 text-xs font-normal text-gray-600 max-w-[200px] truncate">
                        {row.description}
                      </td>
                      <td className="py-4 px-4 text-xs font-bold text-gray-900 whitespace-nowrap">
                        {formatCurrency(row.expectedAmount, row.currency)}
                      </td>
                      <td className="py-4 px-4 text-xs font-medium text-gray-700 capitalize whitespace-nowrap">
                        {row.cadence}
                      </td>
                      <td className="py-4 px-4 text-xs font-normal text-gray-500 whitespace-nowrap">
                        {formatDate(row.expectedDate)}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination Footer ── */}
      {!isLoading && totalEntries > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 text-xs text-gray-500 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <span>
              Showing {startEntry}–{endEntry} of {totalEntries} entries
            </span>
            <div className="relative inline-flex items-center">
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 px-2.5 text-xs bg-white border-gray-200 rounded-lg text-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-black/[0.08] shadow-lg">
                  {[10, 20, 50].map((size) => (
                    <SelectItem key={size} value={String(size)} className="text-xs">
                      {size} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`min-w-8 h-8 px-2 rounded-lg text-xs font-semibold transition-colors ${
                  page === p
                    ? "bg-[#087f70] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RecurringBillsTable() {
  const [type, setType] = useState<"invoice" | "card">("invoice");

  return (
    <div className="space-y-4">
      {/* Sub-view toggle (Vendor Invoices vs Card Subscriptions) */}
      <div className="inline-flex p-1 bg-[#edeef0] rounded-xl border border-black/[0.04]">
        <button
          type="button"
          onClick={() => setType("invoice")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            type === "invoice"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Receipt2 variant={type === "invoice" ? "Bold" : "Linear"} className="w-4 h-4 text-[#087f70]" />
          Vendor Invoices
        </button>
        <button
          type="button"
          onClick={() => setType("card")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            type === "card"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <Cards variant={type === "card" ? "Bold" : "Linear"} className="w-4 h-4 text-[#087f70]" />
          Company Card Subscriptions
        </button>
      </div>

      {type === "invoice" ? <InvoiceRecurringBillsTable /> : <RecurringCardSubscriptionsTable />}
    </div>
  );
}
