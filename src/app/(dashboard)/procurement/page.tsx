"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, CircleCheck, FileText, PackageCheck, Plus, ShoppingCart, Truck, Users } from "lucide-react";
import { ProcurementMetric, ProcurementSection, ProcurementWorkspaceHeader } from "@/components/procurement/ProcurementWorkspace";
import { useAuthStore } from "@/stores/auth-stores";
import { useGetPurchaseRequests } from "@/queries/procurement/purchase-requests";
import { usePurchaseOrders } from "@/queries/procurement/purchase-orders";
import withPermissions from "@/components/permissions/permission-protected-routes";

const money = (value: number, code = "USD") => new Intl.NumberFormat(undefined, { style: "currency", currency: code, maximumFractionDigits: 0 }).format(value);

function ProcurementOverviewPage() {
  const can = useAuthStore((state) => state.can);
  const prScope = can("procurement.purchase_request", "read_company") ? "company" : can("procurement.purchase_request", "read_department") ? "team" : "own";
  const poScope = can("procurement.purchase_order", "read_company") ? "company" : can("procurement.purchase_order", "read_department") ? "team" : "own";
  const { data: prResponse, isLoading: loadingPr } = useGetPurchaseRequests({ scope: prScope, page: 1, limit: 100 });
  const { data: poResponse, isLoading: loadingPo } = usePurchaseOrders(1, 100, undefined, undefined, undefined, poScope);
  const requests = prResponse?.data || [];
  const orders = poResponse?.data || [];
  const currency = requests[0]?.currency || orders[0]?.currency || "USD";
  const approvals = requests.filter((item) => item.currentUserActionRequired || item.status === "submitted");
  const conversion = requests.filter((item) => item.status === "approved");
  const receiving = orders.filter((item) => ["issued", "acknowledged", "ready_for_delivery", "partially_delivered"].includes(item.status || ""));
  const openOrders = orders.filter((item) => !["closed", "cancelled"].includes(item.status || ""));
  const totalCommitment = openOrders.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);

  return (
    <div className="space-y-5 pb-8">
      <ProcurementWorkspaceHeader title="Control spend before it happens." description="Move every request from business need to approved order and confirmed delivery—with ownership, entity, and currency controls visible at every step." action={{ label: "Create request", href: "/procurement/purchase-request/new" }} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProcurementMetric label="Requests awaiting action" value={approvals.length} detail="Submitted into approval" icon={<CalendarClock className="size-4" />} tone="amber" />
        <ProcurementMetric label="Ready for conversion" value={conversion.length} detail="Approved requests without a PO" icon={<CircleCheck className="size-4" />} />
        <ProcurementMetric label="Open commitments" value={money(totalCommitment, currency)} detail={`${openOrders.length} active purchase orders`} icon={<ShoppingCart className="size-4" />} tone="blue" />
        <ProcurementMetric label="In receiving" value={receiving.length} detail="Awaiting complete delivery" icon={<Truck className="size-4" />} tone="rose" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <ProcurementSection title="Procure-to-pay flow" description="One connected operational path from request to invoice">
          <div className="grid gap-px bg-black/[0.06] md:grid-cols-4">
            <FlowStep index="01" icon={<FileText />} title="Request" detail={`${requests.length} requests`} href="/procurement/purchase-request" />
            <FlowStep index="02" icon={<CircleCheck />} title="Approve" detail={`${approvals.length} need action`} href="/procurement/purchase-request?innerTab=approve" />
            <FlowStep index="03" icon={<ShoppingCart />} title="Order" detail={`${openOrders.length} open POs`} href="/procurement/purchase-order" />
            <FlowStep index="04" icon={<PackageCheck />} title="Receive" detail={`${receiving.length} in progress`} href="/procurement/confirmation" />
          </div>
        </ProcurementSection>

        <ProcurementSection title="Start something" description="Create or configure the next step">
          <div className="space-y-2 p-4">
            <ActionLink href="/procurement/purchase-request/new" icon={<Plus />} title="Create a purchase request" detail="Capture a business need and route it" />
            <ActionLink href="/procurement/purchase-order/new" icon={<ShoppingCart />} title="Create a direct PO" detail="Order without converting a request" />
            <ActionLink href="/vendors" icon={<Users />} title="Manage suppliers" detail="Review readiness and onboarding" />
          </div>
        </ProcurementSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProcurementSection title="Latest requests" action={{ label: "All requests", href: "/procurement/purchase-request" }}>
          <div className="divide-y divide-black/[0.055]">{loadingPr ? <Loading /> : requests.slice(0, 5).map((item) => <RecordRow key={item.purchaseRequestId} href={`/procurement/purchase-request/${item.purchaseRequestId}`} title={item.title} meta={`${item.requestNumber} · ${item.status.replaceAll("_", " ")}`} amount={money(Number(item.totalAmount || 0), item.currency)} />)}{!loadingPr && !requests.length && <Empty label="No purchase requests yet" />}</div>
        </ProcurementSection>
        <ProcurementSection title="Latest purchase orders" action={{ label: "All orders", href: "/procurement/purchase-order" }}>
          <div className="divide-y divide-black/[0.055]">{loadingPo ? <Loading /> : orders.slice(0, 5).map((item) => <RecordRow key={item.purchaseOrderId || item.id} href={`/procurement/purchase-order/${item.purchaseOrderId || item.id}`} title={item.poNumber || "Purchase order"} meta={`${item.vendor?.displayName || item.vendor?.legalName || "Vendor pending"} · ${(item.status || "draft").replaceAll("_", " ")}`} amount={money(Number(item.totalAmount || 0), item.currency || currency)} />)}{!loadingPo && !orders.length && <Empty label="No purchase orders yet" />}</div>
        </ProcurementSection>
      </div>
    </div>
  );
}

function FlowStep({ index, icon, title, detail, href }: { index: string; icon: React.ReactNode; title: string; detail: string; href: string }) { return <Link href={href} className="group bg-white p-5 transition hover:bg-[#f6fbf9]"><div className="flex items-center justify-between"><span className="flex size-9 items-center justify-center rounded-[10px] bg-[#e8f8f5] text-[#087f70] [&>svg]:size-4">{icon}</span><span className="text-[10px] font-semibold tracking-[0.15em] text-[#b0b6b3]">{index}</span></div><p className="mt-5 text-[14px] font-semibold text-[#111815]">{title}</p><p className="mt-1 text-[11px] text-[#89918d]">{detail}</p><span className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-[#087f70] opacity-0 transition group-hover:opacity-100">Open <ArrowRight className="size-3.5" /></span></Link>; }
function ActionLink({ href, icon, title, detail }: { href: string; icon: React.ReactNode; title: string; detail: string }) { return <Link href={href} className="flex items-center gap-3 rounded-[11px] border border-black/[0.055] p-3 transition hover:border-[#0ea894]/25 hover:bg-[#f8fbfa]"><span className="flex size-9 items-center justify-center rounded-[9px] bg-[#eff7f5] text-[#087f70] [&>svg]:size-4">{icon}</span><span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-[#17211d]">{title}</span><span className="mt-0.5 block text-[11px] text-[#89918d]">{detail}</span></span><ArrowRight className="size-3.5 text-[#a6adaa]" /></Link>; }
function RecordRow({ href, title, meta, amount }: { href: string; title: string; meta: string; amount: string }) { return <Link href={href} className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#f8fbfa]"><div className="min-w-0"><p className="truncate text-[13px] font-semibold text-[#17211d]">{title}</p><p className="mt-1 truncate text-[11px] capitalize text-[#89918d]">{meta}</p></div><div className="flex items-center gap-3"><span className="text-[13px] font-semibold text-[#17211d]">{amount}</span><ArrowRight className="size-3.5 text-[#a6adaa] transition group-hover:translate-x-0.5 group-hover:text-[#087f70]" /></div></Link>; }
function Loading() { return <div className="space-y-3 p-5">{[1, 2, 3].map((item) => <div key={item} className="h-9 animate-pulse rounded-lg bg-[#f1f4f3]" />)}</div>; }
function Empty({ label }: { label: string }) { return <div className="px-5 py-12 text-center text-[13px] text-[#89918d]">{label}</div>; }

export default withPermissions(ProcurementOverviewPage, [
  { resource: "procurement.purchase_request", action: "read_own" },
  { resource: "procurement.purchase_request", action: "read_department" },
  { resource: "procurement.purchase_request", action: "read_company" },
]);
