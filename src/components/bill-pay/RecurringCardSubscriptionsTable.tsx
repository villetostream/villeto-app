"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "use-debounce";
import {
  Search,
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
import { Cards } from "iconsax-reactjs";
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
import { useTransactionLegalEntities } from "@/features/entity-workspace/hooks";
import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";
import {
  useRecurringCardSubscriptions,
  type RecurringCardSubscription,
} from "@/queries/bill-pay/recurring-card";
import { resolveRecurringEntityId } from "./recurring-entity";

const STATUS_OPTIONS = [
  { value: "",       label: "All states" },
  { value: "draft",  label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "ended",  label: "Ended" },
] as const;

function formatCurrency(amount: string | number | null, currency: string = "NGN") {
  if (amount == null || amount === "") return "Variable";
  const numeric = typeof amount === "number" ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(numeric);
}

export function RecurringCardSubscriptionsTable() {
  const router = useRouter();
  const entities = useTransactionLegalEntities("finance");
  const options = entities.data?.data?.filter((entity) => entity.legalEntityId !== "all") || [];
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const workspaceSelection = useEntityWorkspaceStore((state) => state.selection);
  const primaryAssignmentId = useEntityWorkspaceStore(
    (state) => state.snapshot?.primaryAssignment?.legalEntityId || null
  );
  const legalEntityId = resolveRecurringEntityId(options, {
    workspaceEnabled: entities.workspaceEnabled,
    workspaceSelection,
    primaryAssignmentId,
    legacyChoiceId: selectedEntityId,
  });

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search.trim(), 300);
  const isSearchPending = search.trim() !== debouncedSearch;

  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const subscriptionsQuery = useRecurringCardSubscriptions(
    {
      legalEntityId,
      search: debouncedSearch || undefined,
      status: status || undefined,
      page,
      limit: pageSize,
    },
    Boolean(legalEntityId && !isSearchPending)
  );

  const isLoading = subscriptionsQuery.isLoading || isSearchPending || entities.isLoading;
  const isError = subscriptionsQuery.isError;
  const isFetching = subscriptionsQuery.isFetching;

  const meta = subscriptionsQuery.data?.meta;
  const subscriptions = subscriptionsQuery.data?.data || [];
  const totalEntries = meta?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const startEntry = totalEntries === 0 ? 0 : Math.min((page - 1) * pageSize + 1, totalEntries);
  const endEntry = Math.min(page * pageSize, totalEntries);

  const pageNumbers = useMemo(() => {
    const maxPagesToShow = 6;
    return Array.from({ length: Math.min(totalPages, maxPagesToShow) }, (_, i) => i + 1);
  }, [totalPages]);

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[#10231d]">Company Card Subscriptions</h3>
          <p className="mt-0.5 text-xs text-[#68726d]">
            Merchants charge the company card directly. Subscriptions are monitored for cycle and amount variance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search merchant, plan…"
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

          {/* Status select (Custom Dropdown) */}
          <Select
            value={status || "all"}
            onValueChange={(val) => {
              setStatus(val === "all" ? "" : val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 px-3 rounded-xl border-gray-200 text-xs bg-white text-gray-700 w-32">
              <SelectValue placeholder="All states" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-black/[0.08] shadow-lg">
              <SelectItem value="all" className="text-xs">All states</SelectItem>
              <SelectItem value="draft" className="text-xs">Draft</SelectItem>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="paused" className="text-xs">Paused</SelectItem>
              <SelectItem value="ended" className="text-xs">Ended</SelectItem>
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={() => {
              void subscriptionsQuery.refetch();
              toast.success("Card subscriptions refreshed");
            }}
            disabled={isLoading || isFetching || !legalEntityId}
            title="Refresh card subscriptions"
            className="flex items-center gap-2 h-9 px-3.5 rounded-[8px] border border-black/[0.12] text-[13px] text-[#0b100e] bg-white hover:bg-[#f9faf9] transition-colors whitespace-nowrap disabled:opacity-60 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#087f70] ${isLoading || isFetching ? "animate-spin" : ""}`} />
            <span className="font-semibold text-[13px]">{isLoading || isFetching ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto -mx-5 px-5">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin text-[#087f70]" />
            Loading card subscriptions…
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
            <p className="text-sm font-medium text-gray-700">No finance-eligible legal entity selected</p>
            <p className="mt-1 text-xs text-gray-400">
              Select one eligible legal entity to view company card subscriptions.
            </p>
          </div>
        ) : isError ? (
          <div className="py-14 text-center">
            <p className="text-sm text-red-500">Failed to load card subscriptions.</p>
            <button
              type="button"
              onClick={() => void subscriptionsQuery.refetch()}
              className="mt-3 text-xs font-semibold text-[#087f70] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-12 h-12 rounded-full bg-[#f0faf8] mx-auto flex items-center justify-center mb-3">
              <Cards variant="Bulk" className="w-6 h-6 text-[#087f70]" />
            </div>
            <p className="text-sm font-medium text-gray-700">No card subscriptions found</p>
            <p className="mt-1 text-xs text-gray-400 max-w-sm mx-auto">
              {search || status
                ? "Try adjusting your search or filters."
                : "Set up a company card subscription to monitor recurring charges from SaaS and software vendors."}
            </p>
            {!search && !status && (
              <Button
                type="button"
                onClick={() => router.push("/bill-pay/add-recurring")}
                className="mt-4 rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Set Up Card Subscription
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                <th className="py-3 px-4">MERCHANT</th>
                <th className="py-3 px-4">PLAN / SUBSCRIPTION</th>
                <th className="py-3 px-4">EXPECTED AMOUNT</th>
                <th className="py-3 px-4">CADENCE</th>
                <th className="py-3 px-4">FIRST CHARGE DATE</th>
                <th className="py-3 px-4">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subscriptions.map((row: RecurringCardSubscription) => (
                <tr
                  key={row.recurringCardSubscriptionId}
                  onClick={() =>
                    router.push(
                      `/bill-pay/recurring-card-subscriptions/${row.recurringCardSubscriptionId}`
                    )
                  }
                  className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
                >
                  <td className="py-4 px-4 text-xs font-bold text-gray-900 whitespace-nowrap">
                    {row.merchantName}
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
                    {row.firstExpectedChargeDate}
                  </td>
                  <td className="py-4 px-4 whitespace-nowrap">
                    <StatusBadge
                      status={row.status}
                      label={row.status === "draft" ? "Draft · Monitoring Pending" : undefined}
                    />
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
