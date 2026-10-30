"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowUp, CheckCircle2, ChevronsUpDown,
  Clock3, Loader2, PackageCheck, Search, Truck, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProcurementMetric, ProcurementPageHeader, ProcurementSection } from "@/components/procurement/ProcurementWorkspace";
import {
  useConfirmationOrders,
  type PurchaseOrderRecord,
} from "@/queries/procurement/purchase-orders";
import { needsReceiptConfirmation } from "@/lib/types/purchase-request-helpers";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import { STALE_TIMES, POLL_INTERVALS } from "@/lib/constants/stale-times";

const labels: Record<string, string> = {
  ready_for_delivery: "Awaiting delivery",
  partially_delivered: "Partially delivered",
  delivered: "Fully delivered",
};

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
  const w: Record<string, number> = { ready_for_delivery: 1, partially_delivered: 2, delivered: 3 };
  return w[status ?? ""] ?? 0;
}

function ConfirmationPage() {
  const policies = useAuthorizationPolicies();

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortState, setSortState] = useState<{ key: SortKey; dir: SortDir } | null>({
    key: "shipmentDate",
    dir: "desc",
  });

  // Debounce search input
  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout((handleSearchChange as any)._t);
    (handleSearchChange as any)._t = setTimeout(() => setDebouncedSearch(value), 350);
  };

  // Main data query — uses the active tab as the status filter
  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useConfirmationOrders(
    {
      status: activeTab === "all" ? undefined : activeTab,
      search: debouncedSearch || undefined,
      limit: 100,
    },
    { refetchInterval: POLL_INTERVALS.ACTIVE_LIST, staleTime: STALE_TIMES.LIVE },
  );

  // Separate "all" query (no status filter) solely for badge counts on metric cards + tab pills
  // Same query key as the sidebar badge query, so React Query dedupes it.
  const { data: allData } = useConfirmationOrders(
    { limit: 100 },
    { refetchInterval: POLL_INTERVALS.BADGE, staleTime: STALE_TIMES.LIVE },
  );

  const orders = useMemo(() => data?.data ?? [], [data?.data]);
  const allOrders = useMemo(() => allData?.data ?? [], [allData?.data]);

  // Counts derived from the full dataset (not the filtered view)
  const activeCount    = allOrders.filter((i) => i.status === "ready_for_delivery").length;
  const partialCount   = allOrders.filter((i) => i.status === "partially_delivered").length;
  const deliveredCount = allOrders.filter((i) => i.status === "delivered").length;
  const inTransit      = activeCount + partialCount;

  // Red-badge counts: POs with dispatched goods the tenant hasn't confirmed
  // receipt of yet (quantityAwaitingReceipt > 0). Note: fulfillmentActionRequired
  // means the VENDOR still has a backorder, so it's not a tenant action.
  const needsConfirmation = (status?: string) =>
    allOrders.filter(
      (i) => needsReceiptConfirmation(i) && (status == null || i.status === status),
    ).length;

  const unconfirmedAll       = needsConfirmation();
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

  const handleSort = (key: SortKey) => {
    setSortState((prev) => {
      if (prev?.key === key) return prev.dir === "asc" ? { key, dir: "desc" } : null;
      return { key, dir: "asc" };
    });
  };

  return (
    <div className="space-y-5 pb-8 flex-1 flex flex-col min-h-0 overflow-hidden h-full">
      <ProcurementPageHeader
        title="Receiving & confirmation"
        description="Track what suppliers are preparing, what has arrived, and what still needs a tenant receipt confirmation."
      />
      <div className="grid gap-3 sm:grid-cols-3 shrink-0">
        <ProcurementMetric label="Open deliveries" value={inTransit} detail="Awaiting or partially delivered" icon={<Truck className="size-4" />} tone="blue" />
        <ProcurementMetric label="To confirm" value={unconfirmedAll} detail="Dispatched goods awaiting your receipt" icon={<PackageCheck className="size-4" />} tone="amber" />
        <ProcurementMetric label="Fully delivered" value={deliveredCount} detail="Orders ready for final review" icon={<CheckCircle2 className="size-4" />} />
      </div>

      <ProcurementSection title="Receiving queue" description="Live purchase orders with delivery activity" className="flex-1 flex flex-col min-h-0">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-black/[0.06] p-4 lg:flex-row lg:items-center lg:justify-between shrink-0">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-[9px] bg-[#f3f6f5] p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
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
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative w-full lg:w-64">
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
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-[12px] text-[#75807b]">
            <Loader2 className="size-4 animate-spin text-[#087f70]" /> Loading receiving activity
          </div>
        ) : isError ? (
          <div className="py-16 text-center">
            <p className="text-[12px] text-[#b93643]">Unable to load receiving activity.</p>
            <button onClick={() => refetch()} className="mt-3 text-[11px] font-semibold text-[#087f70]">Try again</button>
          </div>
        ) : sorted.length ? (
          <div className="overflow-y-auto flex-1 min-h-0">
            {/* Sticky column header */}
            <div className="hidden lg:grid lg:grid-cols-[2fr_1.1fr_1.3fr_1.3fr_140px] gap-3 px-5 py-3 border-b border-black/[0.055] bg-[#f9faf9] sticky top-0 z-10">
              <ColHeader label="Purchase Order" sortKey="poNumber" current={sortState} onSort={handleSort} />
              <ColHeader label="Total Amount"   sortKey="amount"   current={sortState} onSort={handleSort} />
              <ColHeader label="Fulfillment Date" sortKey="shipmentDate" current={sortState} onSort={handleSort} />
              <ColHeader label="Confirmation Date" sortKey="confirmationDate" current={sortState} onSort={handleSort} />
              <ColHeader label="Status" sortKey="status" current={sortState} onSort={handleSort} className="justify-end" />
            </div>

            {/* Data rows */}
            <div className="divide-y divide-black/[0.055]">
              {sorted.map((item) => {
                const id = item.purchaseOrderId || item.id || "";
                return (
                  <Link
                    key={id}
                    href={`/procurement/confirmation/${id}`}
                    className="group grid gap-3 px-5 py-4 transition hover:bg-[#f8fbfa] lg:grid-cols-[2fr_1.1fr_1.3fr_1.3fr_140px] lg:items-center"
                  >
                    <div>
                      <p className="text-[12px] font-semibold text-[#17211d]">{item.poNumber || "Purchase order"}</p>
                      <p className="mt-0.5 text-[10px] text-[#89918d]">
                        {item.vendor?.displayName || item.vendor?.legalName || "Vendor pending"}
                        {item.quantityOrdered != null && (
                          <> · {item.quantityReceived ?? 0}/{item.quantityOrdered} received</>
                        )}
                      </p>
                      {needsReceiptConfirmation(item) && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#fdecee] px-2 py-0.5 text-[10px] font-semibold text-[#d33d44]">
                          {item.quantityAwaitingReceipt} unit{item.quantityAwaitingReceipt === 1 ? "" : "s"} to confirm
                        </span>
                      )}
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
                    <div className="hidden lg:flex lg:items-center">
                      <p className="text-[11px] font-medium text-[#34413b]">
                        {item.totalAmount ? money(Number(item.totalAmount), item.currency || "NGN") : "—"}
                      </p>
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
                      {item.status === "ready_for_delivery" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#f0faf8] text-[#087f70]">
                          Awaiting delivery
                        </span>
                      ) : item.status === "partially_delivered" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600">
                          Partially delivered
                        </span>
                      ) : (
                        <StatusBadge status={item.status} label={labels[item.status ?? ""] || item.status} />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-16 text-center">
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
      </ProcurementSection>
    </div>
  );
}

export default withPermissions(ConfirmationPage, [
  { resource: "procurement.purchase_order", action: "read_own" },
  { resource: "procurement.purchase_order", action: "read_department" },
  { resource: "procurement.purchase_order", action: "read_company" },
]);
