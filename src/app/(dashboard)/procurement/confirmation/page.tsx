"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Loader2, PackageCheck, Search, Truck } from "lucide-react";
import { ProcurementMetric, ProcurementSection, ProcurementWorkspaceHeader } from "@/components/procurement/ProcurementWorkspace";
import { usePurchaseOrders } from "@/queries/procurement/purchase-orders";
import { useAuthStore } from "@/stores/auth-stores";

const receivingStatuses = ["issued", "acknowledged", "ready_for_delivery", "partially_delivered", "delivered"];
const labels: Record<string, string> = { issued: "Issued", acknowledged: "Acknowledged", ready_for_delivery: "Ready for delivery", partially_delivered: "Partial delivery", delivered: "Delivered" };

export default function ConfirmationPage() {
  const can = useAuthStore((state) => state.can);
  const scope = can("procurement.purchase_order", "read_company") ? "company" : can("procurement.purchase_order", "read_department") ? "team" : "own";
  const { data, isLoading, isError, refetch } = usePurchaseOrders(1, 100, undefined, undefined, undefined, scope);
  const [active, setActive] = useState("active");
  const [search, setSearch] = useState("");
  const orders = useMemo(() => (data?.data || []).filter((item) => receivingStatuses.includes(item.status || "")), [data?.data]);
  const filtered = useMemo(() => orders.filter((item) => {
    const statusMatch = active === "all" || (active === "active" && item.status !== "delivered") || (active === "partial" && item.status === "partially_delivered") || (active === "delivered" && item.status === "delivered");
    const value = `${item.poNumber || ""} ${item.vendor?.displayName || ""} ${item.vendor?.legalName || ""}`.toLowerCase();
    return statusMatch && value.includes(search.trim().toLowerCase());
  }), [active, orders, search]);
  const partial = orders.filter((item) => item.status === "partially_delivered").length;
  const delivered = orders.filter((item) => item.status === "delivered").length;
  const inTransit = orders.length - delivered;

  return (
    <div className="space-y-5 pb-8">
      <ProcurementWorkspaceHeader title="Receiving & confirmation" description="Track what suppliers are preparing, what has arrived, and what still needs a tenant receipt confirmation." />
      <div className="grid gap-3 sm:grid-cols-3">
        <ProcurementMetric label="Active receiving" value={inTransit} detail="Issued through partial delivery" icon={<Truck className="size-4" />} tone="blue" />
        <ProcurementMetric label="Partial deliveries" value={partial} detail="Orders with quantity still open" icon={<PackageCheck className="size-4" />} tone="amber" />
        <ProcurementMetric label="Delivered" value={delivered} detail="Orders ready for final review" icon={<CheckCircle2 className="size-4" />} />
      </div>
      <ProcurementSection title="Receiving queue" description="Live purchase orders with delivery activity">
        <div className="flex flex-col gap-3 border-b border-black/[0.06] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-[9px] bg-[#f3f6f5] p-1">{[{ key: "active", label: "Active" }, { key: "partial", label: "Partial" }, { key: "delivered", label: "Delivered" }, { key: "all", label: "All" }].map((tab) => <button key={tab.key} onClick={() => setActive(tab.key)} className={`h-8 whitespace-nowrap rounded-[7px] px-4 text-[11px] font-semibold transition ${active === tab.key ? "bg-white text-[#111815] shadow-sm" : "text-[#75807b] hover:text-[#111815]"}`}>{tab.label}</button>)}</div>
          <div className="relative w-full lg:w-64"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#89918d]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search PO or vendor" className="h-9 w-full rounded-[9px] border border-black/[0.08] bg-white pl-9 pr-3 text-[11px] outline-none focus:border-[#0ea894]" /></div>
        </div>
        {isLoading ? <div className="flex items-center justify-center gap-2 py-20 text-[12px] text-[#75807b]"><Loader2 className="size-4 animate-spin text-[#087f70]" /> Loading receiving activity</div> : isError ? <div className="py-16 text-center"><p className="text-[12px] text-[#b93643]">Unable to load receiving activity.</p><button onClick={() => refetch()} className="mt-3 text-[11px] font-semibold text-[#087f70]">Try again</button></div> : filtered.length ? <div className="divide-y divide-black/[0.055]">{filtered.map((item) => {
          const id = item.purchaseOrderId || item.id || "";
          return <Link key={id} href={`/procurement/purchase-order/${id}`} className="group grid gap-3 px-5 py-4 transition hover:bg-[#f8fbfa] sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center"><div><p className="text-[12px] font-semibold text-[#17211d]">{item.poNumber || "Purchase order"}</p><p className="mt-1 text-[10px] text-[#89918d]">{item.vendor?.displayName || item.vendor?.legalName || "Vendor pending"}</p></div><div><p className="text-[10px] text-[#89918d]">Expected delivery</p><p className="mt-1 text-[11px] font-medium text-[#34413b]">{item.deliveryDate ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(item.deliveryDate)) : "Not specified"}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-[9px] font-semibold ${item.status === "partially_delivered" ? "bg-[#fff6df] text-[#a46709]" : item.status === "delivered" ? "bg-[#e8f8f5] text-[#087f70]" : "bg-[#edf4ff] text-[#3b67b0]"}`}>{labels[item.status || ""] || item.status}</span><ArrowRight className="hidden size-4 text-[#a6adaa] transition group-hover:translate-x-0.5 group-hover:text-[#087f70] sm:block" /></Link>;
        })}</div> : <div className="flex flex-col items-center py-16 text-center"><span className="flex size-11 items-center justify-center rounded-xl bg-[#edf4ff] text-[#3b67b0]"><Clock3 className="size-5" /></span><p className="mt-3 text-[13px] font-semibold">No receiving activity</p><p className="mt-1 text-[11px] text-[#89918d]">Issued purchase orders will appear here as suppliers prepare delivery.</p></div>}
      </ProcurementSection>
    </div>
  );
}
