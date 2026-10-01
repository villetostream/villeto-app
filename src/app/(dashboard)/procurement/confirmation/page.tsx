"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowUp, CheckCircle2, ChevronsUpDown,
  Clock3, Loader2, PackageCheck, Search, Truck,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProcurementMetric, ProcurementPageHeader, ProcurementSection } from "@/components/procurement/ProcurementWorkspace";
import { usePurchaseOrders, type PurchaseOrderRecord } from "@/queries/procurement/purchase-orders";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";

const receivingStatuses = ["ready_for_delivery", "partially_delivered", "delivered"];
const labels: Record<string, string> = {
  ready_for_delivery: "Ready for delivery",
  partially_delivered: "Partial delivery",
  delivered: "Delivered",
};

const money = (value: number, code: string) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: code }).format(value);

type SortKey = "poNumber" | "vendor" | "amount" | "delivery" | "status";
type SortDir = "asc" | "desc";

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
  const scope = policies.purchaseOrders.listScope ?? "own";
  const { data, isLoading, isError, refetch } = usePurchaseOrders(
    1, 100, undefined, undefined, undefined, scope, { refetchInterval: 60_000 }
  );

  const [active, setActive] = useState("all");
  const [search, setSearch] = useState("");
  const [sortState, setSortState] = useState<{ key: SortKey; dir: SortDir } | null>({
    key: "delivery",
    dir: "asc",
  });

  const orders = useMemo(
    () => (data?.data || []).filter((item) => receivingStatuses.includes(item.status ?? "")),
    [data?.data]
  );

  const filtered = useMemo(() => {
    const base = orders.filter((item) => {
      const statusMatch =
        active === "all" ||
        (active === "active" && item.status !== "delivered") ||
        (active === "partial" && item.status === "partially_delivered") ||
        (active === "delivered" && item.status === "delivered");
      const value = `${item.poNumber ?? ""} ${item.vendor?.displayName ?? ""} ${item.vendor?.legalName ?? ""}`.toLowerCase();
      return statusMatch && value.includes(search.trim().toLowerCase());
    });

    if (!sortState) return base;

    return [...base].sort((a: PurchaseOrderRecord, b: PurchaseOrderRecord) => {
      let valA: any, valB: any;
      if (sortState.key === "poNumber") { valA = a.poNumber ?? ""; valB = b.poNumber ?? ""; }
      else if (sortState.key === "vendor") { valA = a.vendor?.displayName ?? a.vendor?.legalName ?? ""; valB = b.vendor?.displayName ?? b.vendor?.legalName ?? ""; }
      else if (sortState.key === "amount") { valA = Number(a.totalAmount ?? 0); valB = Number(b.totalAmount ?? 0); }
      else if (sortState.key === "delivery") { valA = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 0; valB = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 0; }
      else if (sortState.key === "status") { valA = statusWeight(a.status); valB = statusWeight(b.status); }
      if (valA < valB) return sortState.dir === "asc" ? -1 : 1;
      if (valA > valB) return sortState.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [active, orders, search, sortState]);

  const partial = orders.filter((i) => i.status === "partially_delivered").length;
  const delivered = orders.filter((i) => i.status === "delivered").length;
  const inTransit = orders.length - delivered;

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
        <ProcurementMetric label="Active receiving" value={inTransit} detail="Issued through partial delivery" icon={<Truck className="size-4" />} tone="blue" />
        <ProcurementMetric label="Partial deliveries" value={partial} detail="Orders with quantity still open" icon={<PackageCheck className="size-4" />} tone="amber" />
        <ProcurementMetric label="Delivered" value={delivered} detail="Orders ready for final review" icon={<CheckCircle2 className="size-4" />} />
      </div>

      <ProcurementSection title="Receiving queue" description="Live purchase orders with delivery activity" className="flex-1 flex flex-col min-h-0">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-black/[0.06] p-4 lg:flex-row lg:items-center lg:justify-between shrink-0">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-[9px] bg-[#f3f6f5] p-1">
            {[
              { key: "all", label: "All" },
              { key: "active", label: "Active" },
              { key: "partial", label: "Partial" },
              { key: "delivered", label: "Delivered" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className={`h-8 whitespace-nowrap rounded-[7px] px-4 text-[11px] font-semibold transition flex items-center ${
                  active === tab.key ? "bg-white text-[#111815] shadow-sm" : "text-[#75807b] hover:text-[#111815]"
                }`}
              >
                {tab.label}
                {tab.key === "active" && <ActionBadge count={inTransit} />}
                {tab.key === "partial" && <ActionBadge count={partial} />}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-64">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#89918d]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search PO or vendor"
              className="h-9 w-full rounded-[9px] border border-black/[0.08] bg-white pl-9 pr-3 text-[11px] outline-none focus:border-[#0ea894]"
            />
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
        ) : filtered.length ? (
          /*
           * KEY FIX: header is sticky INSIDE the same scroll container as the rows.
           * This means the scrollbar offset is shared — no misalignment.
           */
          <div className="overflow-y-auto flex-1 min-h-0">
            {/* Sticky column header */}
            <div className="hidden lg:grid lg:grid-cols-[2.5fr_1.5fr_1.5fr_140px] gap-3 px-5 py-3 border-b border-black/[0.055] bg-[#f9faf9] sticky top-0 z-10">
              <ColHeader label="Purchase Order" sortKey="poNumber" current={sortState} onSort={handleSort} />
              <ColHeader label="Total Amount" sortKey="amount" current={sortState} onSort={handleSort} />
              <ColHeader label="Expected Delivery" sortKey="delivery" current={sortState} onSort={handleSort} />
              <ColHeader label="Status" sortKey="status" current={sortState} onSort={handleSort} className="justify-end" />
            </div>

            {/* Data rows */}
            <div className="divide-y divide-black/[0.055]">
              {filtered.map((item) => {
                const id = item.purchaseOrderId || item.id || "";
                return (
                  <Link
                    key={id}
                    href={`/procurement/confirmation/${id}`}
                    className="group grid gap-3 px-5 py-4 transition hover:bg-[#f8fbfa] lg:grid-cols-[2.5fr_1.5fr_1.5fr_140px] lg:items-center"
                  >
                    <div>
                      <p className="text-[12px] font-semibold text-[#17211d]">{item.poNumber || "Purchase order"}</p>
                      <p className="mt-0.5 text-[10px] text-[#89918d]">
                        {item.vendor?.displayName || item.vendor?.legalName || "Vendor pending"}
                      </p>
                    </div>
                    <div className="hidden lg:flex lg:items-center">
                      <p className="text-[11px] font-medium text-[#34413b]">
                        {item.totalAmount ? money(Number(item.totalAmount), item.currency || "NGN") : "—"}
                      </p>
                    </div>
                    <div className="hidden lg:flex lg:items-center">
                      <p className="text-[11px] font-medium text-[#34413b]">
                        {item.deliveryDate
                          ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(item.deliveryDate))
                          : "Not specified"}
                      </p>
                    </div>
                    <div className="hidden lg:flex lg:items-center lg:justify-end">
                      {item.fulfillmentState === "fully_ready" || item.status === "ready_for_delivery" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#f0faf8] text-[#087f70]">
                          Ready
                        </span>
                      ) : item.fulfillmentState === "partial" || item.status === "partially_delivered" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600">
                          Partial
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
            <p className="mt-3 text-[13px] font-semibold">No receiving activity</p>
            <p className="mt-1 text-[11px] text-[#89918d]">Issued purchase orders will appear here as suppliers prepare delivery.</p>
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

