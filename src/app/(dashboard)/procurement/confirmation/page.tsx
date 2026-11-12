"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowUp, CheckCircle2, ChevronsUpDown,
  Clock3, PackageCheck, Search, Truck, RefreshCw, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { Pagination } from "@/components/ui/custom-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProcurementMetric } from "@/components/procurement/ProcurementWorkspace";
import {
  useConfirmationOrders,
  type PurchaseOrderRecord,
} from "@/queries/procurement/purchase-orders";
import {
  getEffectiveAwaitingReceiptQty,
  needsReceiptConfirmation,
  needsCompanyExceptionDecision,
} from "@/lib/types/purchase-request-helpers";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import { STALE_TIMES, POLL_INTERVALS } from "@/lib/constants/stale-times";

const labels: Record<string, string> = {
  ready_for_delivery: "Awaiting delivery",
  not_delivered: "Not delivered",
  partially_delivered: "Partially delivered",
  partially_delivered_with_exceptions: "Partially delivered (Exceptions)",
  partial_delivery_with_exceptions: "Partially delivered (Exceptions)",
  delivered: "Fully delivered",
  fully_delivered: "Fully delivered",
  delivered_with_exceptions: "Delivered (Exceptions)",
  full_delivery_with_exceptions: "Delivered (Exceptions)",
};

const DELIVERY_OUTCOME_OPTIONS = [
  { value: "all", label: "All delivery outcomes" },
  { value: "not_delivered", label: "Not delivered" },
  { value: "partially_delivered", label: "Partially delivered" },
  { value: "partial_delivery_with_exceptions", label: "Partial w/ exceptions" },
  { value: "fully_delivered", label: "Fully delivered" },
  { value: "full_delivery_with_exceptions", label: "Full delivery w/ exceptions" },
] as const;

const RESOLUTION_STATUS_OPTIONS = [
  { value: "all", label: "All exception statuses" },
  { value: "awaiting_vendor_response", label: "Awaiting vendor response" },
  { value: "under_company_review", label: "Under company review" },
  { value: "backordered", label: "Backordered" },
  { value: "forfeited", label: "Forfeited" },
  { value: "resolved_after_dispute", label: "Resolved after dispute" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "disputed", label: "Disputed" },
  { value: "corrective_action_pending", label: "Corrective action pending" },
  { value: "resolved", label: "Resolved" },
  { value: "not_required", label: "No exceptions" },
] as const;

const money = (value: number, code: string) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: code }).format(value);

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "—";
  try {
    let d: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, day] = dateStr.split("-").map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(d);
  } catch {
    return "—";
  }
};

const formatTime = (dateStr?: string | null) => {
  if (!dateStr || !dateStr.includes("T")) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", { timeStyle: "short" }).format(d);
  } catch {
    return "";
  }
};

const getShipmentOrDeliveryDate = (item: PurchaseOrderRecord) =>
  item.shipmentDate || item.digitalDeliveryDate || null;

type SortKey = "poNumber" | "vendor" | "amount" | "shipmentDate" | "confirmationDate" | "status";
type SortDir = "asc" | "desc";

// Tab definitions map to API status values (delivery stage of the PO)
//  - ready_for_delivery:  issued, nothing received yet
//  - partially_delivered: some quantity received, more still expected
//  - delivered:           all ordered quantity received
//  - exceptions:          partially_delivered_with_exceptions or delivered_with_exceptions
const TABS = [
  { key: "all",                  label: "All" },
  { key: "ready_for_delivery",   label: "Awaiting delivery" },
  { key: "partially_delivered",  label: "Partially delivered" },
  { key: "delivered",            label: "Fully delivered" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function ActionBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="ml-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#d33d44] text-white text-[10px] font-bold"
      style={{ paddingTop: "1px" }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ColHeader({
  label,
  sortKey,
  current,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  current: { key: SortKey; dir: SortDir } | null;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = current?.key === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider select-none transition-colors ${
        active ? "text-[#0b100e]" : "text-[#89918d] hover:text-[#34413b]"
      } ${className}`}
    >
      {label}
      {active
        ? current!.dir === "asc"
          ? <ArrowUp className="w-3 h-3 text-[#087f70] shrink-0" />
          : <ArrowDown className="w-3 h-3 text-[#087f70] shrink-0" />
        : <ChevronsUpDown className="w-3 h-3 opacity-35 shrink-0" />
      }
    </button>
  );
}

function statusWeight(status?: string | null) {
  const w: Record<string, number> = {
    ready_for_delivery: 1,
    not_delivered: 1,
    partially_delivered: 2,
    partially_delivered_with_exceptions: 2,
    partial_delivery_with_exceptions: 2,
    delivered: 3,
    fully_delivered: 3,
    delivered_with_exceptions: 3,
    full_delivery_with_exceptions: 3,
  };
  return w[status ?? ""] ?? 0;
}

function matchesTabStatus(itemStatus?: string | null, tab?: TabKey) {
  if (!tab || tab === "all") return true;
  if (tab === "partially_delivered") {
    return (
      itemStatus === "partially_delivered" ||
      itemStatus === "partially_delivered_with_exceptions"
    );
  }
  if (tab === "delivered") {
    return (
      itemStatus === "delivered" ||
      itemStatus === "delivered_with_exceptions"
    );
  }
  return itemStatus === tab;
}

function ConfirmationPage() {
  const policies = useAuthorizationPolicies();

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [deliveryOutcomeFilter, setDeliveryOutcomeFilter] = useState<string>("all");
  const [resolutionStatusFilter, setResolutionStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortState, setSortState] = useState<{ key: SortKey; dir: SortDir } | null>({
    key: "shipmentDate",
    dir: "desc",
  });

  // Debounce search input
  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout((handleSearchChange as any)._t);
    (handleSearchChange as any)._t = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 350);
  };

  // Main data query — uses the active tab, deliveryOutcome, and resolutionStatus filters
  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useConfirmationOrders(
    {
      status: activeTab === "all" ? undefined : activeTab,
      deliveryOutcome: deliveryOutcomeFilter === "all" ? undefined : deliveryOutcomeFilter,
      resolutionStatus: resolutionStatusFilter === "all" ? undefined : resolutionStatusFilter,
      search: debouncedSearch || undefined,
      page,
      limit: perPage,
    },
    { refetchInterval: POLL_INTERVALS.ACTIVE_LIST, staleTime: STALE_TIMES.LIVE },
  );

  // Separate "all" query (no status filter) solely for badge counts on metric cards + tab pills
  // Same query key as the sidebar badge query, so React Query dedupes it.
  const { data: allData, isLoading: isAllLoading } = useConfirmationOrders(
    { limit: 100 },
    { refetchInterval: POLL_INTERVALS.BADGE, staleTime: STALE_TIMES.LIVE },
  );

  const orders = useMemo(() => data?.data ?? [], [data?.data]);
  const allOrders = useMemo(() => allData?.data ?? [], [allData?.data]);

  // Counts derived from the full dataset (not the filtered view)
  const activeCount    = allOrders.filter((i) => matchesTabStatus(i.status, "ready_for_delivery")).length;
  const partialCount   = allOrders.filter((i) => matchesTabStatus(i.status, "partially_delivered")).length;
  const deliveredCount = allOrders.filter((i) => matchesTabStatus(i.status, "delivered")).length;
  const inTransit      = activeCount + partialCount;

  // Red-badge counts: POs with dispatched goods awaiting receipt confirmation OR a vendor dispute awaiting company decision
  const needsConfirmation = (tab?: TabKey) =>
    allOrders.filter(
      (i) =>
        (needsReceiptConfirmation(i) || needsCompanyExceptionDecision(i)) &&
        matchesTabStatus(i.status, tab),
    ).length;

  const unconfirmedAll       = needsConfirmation("all");
  const unconfirmedActive    = needsConfirmation("ready_for_delivery");
  const unconfirmedPartial   = needsConfirmation("partially_delivered");
  const unconfirmedDelivered = needsConfirmation("delivered");

  // Client-side sort only (filtering is server-side)
  const sorted = useMemo(() => {
    if (!sortState) return orders;
    return [...orders].sort((a: PurchaseOrderRecord, b: PurchaseOrderRecord) => {
      let valA: any, valB: any;
      if (sortState.key === "poNumber") {
        valA = a.poNumber ?? "";
        valB = b.poNumber ?? "";
      } else if (sortState.key === "vendor") {
        valA = a.vendor?.displayName ?? a.vendor?.legalName ?? "";
        valB = b.vendor?.displayName ?? b.vendor?.legalName ?? "";
      } else if (sortState.key === "amount") {
        valA = Number(a.totalAmount ?? 0);
        valB = Number(b.totalAmount ?? 0);
      } else if (sortState.key === "shipmentDate") {
        const dateA = getShipmentOrDeliveryDate(a);
        const dateB = getShipmentOrDeliveryDate(b);
        valA = dateA ? new Date(dateA).getTime() : 0;
        valB = dateB ? new Date(dateB).getTime() : 0;
        if (!valA && !valB) return 0;
        if (!valA) return 1;
        if (!valB) return -1;
      } else if (sortState.key === "confirmationDate") {
        valA = a.confirmationDate ? new Date(a.confirmationDate).getTime() : 0;
        valB = b.confirmationDate ? new Date(b.confirmationDate).getTime() : 0;
        if (!valA && !valB) return 0;
        if (!valA) return 1;
        if (!valB) return -1;
      } else if (sortState.key === "status") {
        valA = statusWeight(a.status);
        valB = statusWeight(b.status);
      }
      if (valA < valB) return sortState.dir === "asc" ? -1 : 1;
      if (valA > valB) return sortState.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [orders, sortState]);

  const meta = data?.meta;
  const totalCount = meta?.totalCount ?? sorted.length;
  const totalPages = meta?.totalPages ?? Math.max(1, Math.ceil(totalCount / perPage));
  const paginated = useMemo(() => {
    return meta ? sorted : sorted.slice((page - 1) * perPage, page * perPage);
  }, [sorted, meta, page, perPage]);

  const handleSort = (key: SortKey) => {
    setSortState((prev) => {
      if (prev?.key === key) return prev.dir === "asc" ? { key, dir: "desc" } : null;
      return { key, dir: "asc" };
    });
  };

  return (
    <div className="space-y-4 pb-6 flex-1 flex flex-col min-h-0 overflow-hidden h-full">
      <div className="grid gap-3 sm:grid-cols-3 shrink-0">
        <ProcurementMetric
          label="Open deliveries"
          value={inTransit}
          detail="Awaiting or partially delivered"
          icon={<Truck className="size-4" />}
          tone="blue"
          isLoading={isAllLoading}
        />
        <ProcurementMetric
          label="To confirm"
          value={unconfirmedAll}
          detail="Dispatched goods awaiting your receipt"
          icon={<PackageCheck className="size-4" />}
          tone="amber"
          isLoading={isAllLoading}
        />
        <ProcurementMetric
          label="Fully delivered"
          value={deliveredCount}
          detail="Orders ready for final review"
          icon={<CheckCircle2 className="size-4" />}
          isLoading={isAllLoading}
        />
      </div>

      <section className="overflow-hidden rounded-[15px] border border-black/[0.07] bg-white shadow-[0_12px_35px_-30px_rgba(14,28,23,0.7)] flex-1 flex flex-col min-h-0">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-black/[0.06] p-4 lg:flex-row lg:items-center lg:justify-between shrink-0">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-[9px] bg-[#f3f6f5] p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                className={`h-8 whitespace-nowrap rounded-[7px] px-4 text-[11px] font-semibold transition flex items-center ${
                  activeTab === tab.key ? "bg-white text-[#111815] shadow-sm" : "text-[#75807b] hover:text-[#111815]"
                }`}
              >
                {tab.label}
                {tab.key === "all"                 && <ActionBadge count={unconfirmedAll} />}
                {tab.key === "ready_for_delivery"  && <ActionBadge count={unconfirmedActive} />}
                {tab.key === "partially_delivered" && <ActionBadge count={unconfirmedPartial} />}
                {tab.key === "delivered"            && <ActionBadge count={unconfirmedDelivered} />}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Select value={deliveryOutcomeFilter} onValueChange={(v) => { setDeliveryOutcomeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px] h-9 rounded-[9px] bg-white border-black/[0.08] text-[11px] font-medium text-[#111815] hover:bg-[#f9faf9] focus:border-[#0ea894] focus:ring-0 transition-colors">
                <SelectValue placeholder="All delivery outcomes" />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_OUTCOME_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-[12px]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={resolutionStatusFilter} onValueChange={(v) => { setResolutionStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[190px] h-9 rounded-[9px] bg-white border-black/[0.08] text-[11px] font-medium text-[#111815] hover:bg-[#f9faf9] focus:border-[#0ea894] focus:ring-0 transition-colors">
                <SelectValue placeholder="All exception statuses" />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-[12px]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#89918d]" />
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search PO or vendor"
                className="h-9 w-full rounded-[9px] border border-black/[0.08] bg-white pl-9 pr-3 text-[11px] outline-none focus:border-[#0ea894]"
              />
            </div>
            <button
              onClick={() => {
                refetch();
                toast.success("Receiving queue refreshed");
              }}
              disabled={isLoading || isFetching}
              title="Refresh receiving queue"
              className="flex items-center gap-1.5 h-9 px-3 rounded-[9px] border border-black/[0.08] bg-white hover:bg-[#f9faf9] text-[11px] font-semibold text-[#111815] transition shrink-0 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 text-[#087f70] ${isLoading || isFetching ? "animate-spin" : ""}`} />
              <span>{isLoading || isFetching ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 flex flex-col modal-scrollbar">
          {/* Sticky column header */}
          <div className="hidden lg:grid lg:grid-cols-[2fr_1.1fr_1.3fr_1.3fr_140px] gap-3 px-5 py-3 border-b border-black/[0.055] bg-[#f9faf9] sticky top-0 z-10 shrink-0">
            <ColHeader label="Purchase Order" sortKey="poNumber" current={sortState} onSort={handleSort} />
            <ColHeader label="Total Amount"   sortKey="amount"   current={sortState} onSort={handleSort} />
            <ColHeader label="Fulfillment Date" sortKey="shipmentDate" current={sortState} onSort={handleSort} />
            <ColHeader label="Confirmation Date" sortKey="confirmationDate" current={sortState} onSort={handleSort} />
            <ColHeader label="Status" sortKey="status" current={sortState} onSort={handleSort} className="justify-end" />
          </div>

          {isLoading ? (
            <div className="divide-y divide-black/[0.055]">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={`skeleton-${idx}`}
                  className="grid gap-3 px-5 py-3.5 lg:grid-cols-[2fr_1.1fr_1.3fr_1.3fr_140px] lg:items-center"
                >
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-40 animate-pulse rounded-[4px] bg-[#f0f2f1]" />
                    <div className="h-2.5 w-52 animate-pulse rounded-[4px] bg-[#f0f2f1]" />
                  </div>
                  <div className="hidden lg:block">
                    <div className="h-3.5 w-24 animate-pulse rounded-[4px] bg-[#f0f2f1]" />
                  </div>
                  <div className="hidden lg:block">
                    <div className="h-3.5 w-24 animate-pulse rounded-[4px] bg-[#f0f2f1]" />
                  </div>
                  <div className="hidden lg:block">
                    <div className="h-3.5 w-24 animate-pulse rounded-[4px] bg-[#f0f2f1]" />
                  </div>
                  <div className="hidden lg:flex lg:justify-end">
                    <div className="h-5 w-24 animate-pulse rounded-full bg-[#f0f2f1]" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
              <p className="text-[12px] text-[#b93643]">Unable to load receiving activity.</p>
              <button onClick={() => refetch()} className="mt-3 text-[11px] font-semibold text-[#087f70]">Try again</button>
            </div>
          ) : sorted.length ? (
            <div className="divide-y divide-black/[0.055]">
              {paginated.map((item) => {
                const id = item.purchaseOrderId || item.id || "";
                const isStillPartial =
                  item.status === "partially_delivered" ||
                  item.status === "partially_delivered_with_exceptions" ||
                  (item.closeBlockers || []).includes("delivery_incomplete");
                const deliveryOutcomeKey = isStillPartial
                  ? (item.status || "partially_delivered")
                  : item.deliveryOutcome && item.deliveryOutcome !== "not_delivered"
                    ? item.deliveryOutcome
                    : item.status || "ready_for_delivery";
                const hasOpenExceptions =
                  (item.openExceptionCount ?? 0) > 0 ||
                  (item.deliveryOutcome || "").includes("with_exceptions") && (item.openExceptionCount ?? 0) > 0;
                const displayForfeited =
                  isStillPartial && (item.quantityOutstanding ?? 0) === 0
                    ? 0
                    : (item.quantityForfeited ?? 0);
                const displayOutstanding =
                  isStillPartial && (item.quantityOutstanding ?? 0) === 0 && (item.quantityForfeited ?? 0) > 0
                    ? (item.quantityForfeited ?? 0)
                    : (item.quantityOutstanding ?? 0);

                return (
                  <Link
                    key={id}
                    href={`/procurement/confirmation/${id}`}
                    className="group grid gap-3 px-5 py-3.5 transition hover:bg-[#f8fbfa] lg:grid-cols-[2fr_1.1fr_1.3fr_1.3fr_140px] lg:items-center"
                  >
                    <div>
                      <p className="text-[12px] font-semibold text-[#17211d]">{item.poNumber || "Purchase order"}</p>
                      <p className="mt-0.5 text-[10px] text-[#89918d]">
                        {item.vendor?.displayName || item.vendor?.legalName || "Vendor pending"}
                        {item.quantityOrdered != null && (
                          <>
                            {" · "}
                            {item.quantityAccepted ?? item.quantityReceived ?? 0}/{item.quantityOrdered} accepted
                            {displayForfeited > 0 && ` · ${displayForfeited} forfeited`}
                            {displayOutstanding > 0 && ` · ${displayOutstanding} outstanding`}
                          </>
                        )}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {needsReceiptConfirmation(item) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#fdecee] px-2 py-0.5 text-[10px] font-semibold text-[#d33d44]">
                            {getEffectiveAwaitingReceiptQty(item)} unit{getEffectiveAwaitingReceiptQty(item) === 1 ? "" : "s"} to confirm
                          </span>
                        )}
                        {item.companyActionRequired && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#fdecee] px-2 py-0.5 text-[10px] font-semibold text-[#d33d44]">
                            <AlertTriangle className="size-3" /> Dispute decision required
                          </span>
                        )}
                        {!item.companyActionRequired && item.vendorResponseRequired && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            Awaiting vendor response
                          </span>
                        )}
                        {(item.openExceptionCount ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50/80 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            {item.openExceptionCount} open exception{item.openExceptionCount === 1 ? "" : "s"}
                          </span>
                        )}
                        {item.fulfillmentState === "backordered" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                            <Clock3 className="size-3" /> Backordered by vendor
                          </span>
                        )}
                      </div>
                      {(() => {
                        const effectiveDate = getShipmentOrDeliveryDate(item);
                        if (!effectiveDate && !item.confirmationDate) return null;
                        const datePrefix = item.shipmentDate ? "Shipped" : "Delivered";
                        return (
                          <p className="mt-1 text-[10px] text-[#89918d] lg:hidden">
                            {effectiveDate && <>{datePrefix}: {formatDate(effectiveDate)}</>}
                            {effectiveDate && item.confirmationDate && <> · </>}
                            {item.confirmationDate && <>Confirmed: {formatDate(item.confirmationDate)}</>}
                          </p>
                        );
                      })()}
                    </div>
                    <div className="hidden lg:flex lg:flex-col lg:justify-center">
                      <p className="text-[11px] font-medium text-[#34413b]">
                        {item.totalAmount ? money(Number(item.totalAmount), item.currency || "NGN") : "—"}
                      </p>
                      {item.invoiceableSubtotal != null && Number(item.invoiceableSubtotal) > 0 && (
                        <p className="mt-0.5 text-[10px] text-[#087f70]">
                          Confirmed value: {money(Number(item.invoiceableSubtotal), item.currency || "NGN")}
                        </p>
                      )}
                    </div>
                    <div className="hidden lg:flex lg:flex-col lg:justify-center">
                      {(() => {
                        const effectiveDate = getShipmentOrDeliveryDate(item);
                        const time = formatTime(effectiveDate);
                        return (
                          <>
                            <p className="text-[11px] font-medium text-[#34413b]">
                              {formatDate(effectiveDate)}
                            </p>
                            {effectiveDate && time && (
                              <p className="mt-0.5 text-[10px] text-[#89918d]">
                                {time}
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <div className="hidden lg:flex lg:flex-col lg:justify-center">
                      <p className="text-[11px] font-medium text-[#34413b]">
                        {formatDate(item.confirmationDate)}
                      </p>
                      {item.confirmationDate && (
                        <p className="mt-0.5 text-[10px] text-[#89918d]">
                          {formatTime(item.confirmationDate)}
                        </p>
                      )}
                    </div>
                    <div className="hidden lg:flex lg:items-center lg:justify-end">
                      {deliveryOutcomeKey === "ready_for_delivery" || deliveryOutcomeKey === "not_delivered" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#f0faf8] text-[#087f70] whitespace-nowrap">
                          Awaiting delivery
                        </span>
                      ) : hasOpenExceptions ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                          {labels[deliveryOutcomeKey] || "With exceptions"}
                        </span>
                      ) : deliveryOutcomeKey === "partially_delivered" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 whitespace-nowrap">
                          Partially delivered
                        </span>
                      ) : (
                        <StatusBadge status={item.status} label={labels[deliveryOutcomeKey] || labels[item.status ?? ""] || item.status} />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center py-16 text-center flex-1 justify-center">
              <span className="flex size-11 items-center justify-center rounded-xl bg-[#edf4ff] text-[#3b67b0]">
                <Clock3 className="size-5" />
              </span>
              <p className="mt-3 text-[13px] font-semibold">
                {activeTab === "all" ? "No receiving activity" : `No ${labels[activeTab] ?? activeTab} orders`}
              </p>
              <p className="mt-1 text-[11px] text-[#89918d]">
                {activeTab === "all"
                  ? "Issued purchase orders will appear here as suppliers prepare delivery."
                  : "Try switching to a different tab or clearing the search."}
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0">
          <Pagination
            total={totalCount}
            page={meta?.currentPage ?? page}
            perPage={meta?.limit ?? perPage}
            onPage={setPage}
            onPerPage={setPerPage}
            totalPages={totalPages}
          />
        </div>
      </section>
    </div>
  );
}

export default withPermissions(ConfirmationPage, [
  { resource: "procurement.purchase_order", action: "read_own" },
  { resource: "procurement.purchase_order", action: "read_department" },
  { resource: "procurement.purchase_order", action: "read_company" },
]);
