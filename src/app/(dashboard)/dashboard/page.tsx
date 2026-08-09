"use client";

import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Building2, CalendarClock, CheckCircle2, FileText, Plus, ShoppingCart, Sparkles, Truck } from "lucide-react";
import PermissionGuard from "@/components/permissions/permission-protected-components";
import { ProcurementMetric, ProcurementSection } from "@/components/procurement/ProcurementWorkspace";
import { useAuthStore } from "@/stores/auth-stores";
import { useGetPurchaseRequests } from "@/queries/procurement/purchase-requests";
import { usePurchaseOrders } from "@/queries/procurement/purchase-orders";
import { useLegalEntities } from "@/queries/legal-entities";

const currency = (value: number, code = "USD") => new Intl.NumberFormat(undefined, { style: "currency", currency: code, maximumFractionDigits: 0 }).format(value);
const date = (value?: string) => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value)) : "No date";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const can = useAuthStore((state) => state.can);
  const canReadCompanyPr = can("procurement.purchase_request", "read_company");
  const canReadTeamPr = can("procurement.purchase_request", "read_department");
  const prScope = canReadCompanyPr ? "company" : canReadTeamPr ? "team" : "own";
  const { data: prResponse, isLoading: prLoading } = useGetPurchaseRequests({ scope: prScope, page: 1, limit: 100 });
  const canReadCompanyPo = can("procurement.purchase_order", "read_company");
  const canReadTeamPo = can("procurement.purchase_order", "read_department");
  const poScope = canReadCompanyPo ? "company" : canReadTeamPo ? "team" : "own";
  const { data: poResponse, isLoading: poLoading } = usePurchaseOrders(1, 100, undefined, undefined, undefined, poScope);
  const { data: entityResponse } = useLegalEntities({ enabled: can("legal_entity", "view") });

  const requests = prResponse?.data || [];
  const orders = poResponse?.data || [];
  const entity = (entityResponse?.data || []).find((item) => item.isDefault) || entityResponse?.data?.[0];
  const code = entity?.baseCurrency || requests[0]?.currency || "USD";
  const pendingApprovals = requests.filter((item) => item.currentUserActionRequired || item.status === "submitted");
  const openOrders = orders.filter((item) => !["closed", "cancelled"].includes(item.status || ""));
  const receiving = orders.filter((item) => ["issued", "acknowledged", "ready_for_delivery", "partially_delivered"].includes(item.status || ""));
  const committed = openOrders.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
  const recent = requests.slice(0, 5);
  const userName = user?.firstName || "there";

  return (
    <PermissionGuard>
      <div className="space-y-5 pb-8">
        <section className="relative overflow-hidden rounded-[20px] bg-[#0b1714] px-6 py-7 text-white shadow-[0_20px_60px_-34px_rgba(4,43,36,0.9)] md:px-8 md:py-8">
          <div className="absolute -right-20 -top-32 size-80 rounded-full bg-[#19b9a1]/20 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-32 w-64 bg-gradient-to-t from-[#0ea894]/10 to-transparent" />
          <div className="relative grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-semibold text-[#87e9da]"><Sparkles className="size-3" /> FINANCE COMMAND CENTER</span>
              <h1 className="mt-5 max-w-2xl text-[30px] font-semibold leading-[1.08] tracking-[-0.04em] md:text-[38px]">Good to see you, {userName}.<br /><span className="text-white/45">Here&apos;s what needs your attention.</span></h1>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Link href="/procurement/purchase-request/new" className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#19b9a1] px-4 text-[12px] font-semibold transition hover:-translate-y-0.5 hover:bg-[#21c7ae]"><Plus className="size-4" /> New request</Link>
                <Link href="/procurement" className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.05] px-4 text-[12px] font-semibold text-white/80 hover:bg-white/[0.1]">Open procurement <ArrowRight className="size-4" /></Link>
              </div>
            </div>
            <div className="rounded-[15px] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-[10px] bg-[#19b9a1]/15 text-[#71dfce]"><Building2 className="size-4" /></span><div><p className="text-[10px] text-white/40">Default legal entity</p><p className="mt-0.5 text-[13px] font-semibold">{entity?.legalName || "Finish entity setup"}</p></div></div><span className="rounded-full bg-[#19b9a1]/15 px-2.5 py-1 text-[9px] font-semibold uppercase text-[#74e3d2]">{entity?.readinessStatus?.replaceAll("_", " ") || "Not ready"}</span></div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4"><div><p className="text-[10px] text-white/35">Base currency</p><p className="mt-1 text-[13px] font-semibold">{code}</p></div><div><p className="text-[10px] text-white/35">Open commitments</p><p className="mt-1 text-[13px] font-semibold">{currency(committed, code)}</p></div></div>
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ProcurementMetric label="Awaiting action" value={pendingApprovals.length} detail="Requests in an approval queue" icon={<CalendarClock className="size-4" />} tone="amber" />
          <ProcurementMetric label="Open purchase orders" value={openOrders.length} detail={`${currency(committed, code)} committed`} icon={<ShoppingCart className="size-4" />} />
          <ProcurementMetric label="Receiving" value={receiving.length} detail="Orders awaiting complete delivery" icon={<Truck className="size-4" />} tone="blue" />
          <ProcurementMetric label="Active entities" value={(entityResponse?.data || []).filter((item) => item.status === "active").length} detail={entity?.readinessStatus?.replaceAll("_", " ") || "Configuration required"} icon={<Building2 className="size-4" />} tone="teal" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
          <ProcurementSection title="Recent purchase requests" description="The latest demand entering your procurement workflow" action={{ label: "View all", href: "/procurement/purchase-request" }}>
            <div className="divide-y divide-black/[0.055]">
              {prLoading ? <LoadingRows /> : recent.length ? recent.map((item) => (
                <Link key={item.purchaseRequestId} href={`/procurement/purchase-request/${item.purchaseRequestId}`} className="group grid gap-3 px-5 py-4 transition hover:bg-[#f8fbfa] sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-[13px] font-semibold text-[#111815]">{item.title}</p><span className="rounded-full bg-[#f0f4f2] px-2 py-0.5 text-[9px] font-semibold uppercase text-[#68726d]">{item.status.replaceAll("_", " ")}</span></div><p className="mt-1 text-[10px] text-[#8a938f]">{item.requestNumber} · Needed {date(item.neededByDate)}</p></div>
                  <p className="text-[12px] font-semibold text-[#17211d]">{currency(Number(item.totalAmount || 0), item.currency)}</p><ArrowRight className="hidden size-4 text-[#a3aaa6] transition group-hover:translate-x-0.5 group-hover:text-[#087f70] sm:block" />
                </Link>
              )) : <EmptyPanel icon={<FileText />} title="No purchase requests yet" detail="Create the first request to start the procurement workflow." />}
            </div>
          </ProcurementSection>

          <div className="space-y-4">
            <ProcurementSection title="Attention queue" description="Items that may block purchasing">
              <div className="space-y-2 p-4">
                <AttentionRow icon={<CalendarClock />} title={`${pendingApprovals.length} approvals waiting`} detail="Review submitted requests" href="/procurement/purchase-request?innerTab=approve" tone="amber" />
                <AttentionRow icon={<Truck />} title={`${receiving.length} orders in receiving`} detail="Track partial and full deliveries" href="/procurement/confirmation" tone="blue" />
                <AttentionRow icon={<BadgeDollarSign />} title={entity?.readinessStatus === "accounting_ready" ? "Accounting is ready" : "Finish accounting setup"} detail="Prepare invoice posting controls" href="/accounting" tone="teal" />
              </div>
            </ProcurementSection>
            <ProcurementSection title="Quick actions"><div className="grid grid-cols-2 gap-2 p-4"><QuickLink href="/procurement/purchase-request/new" icon={<FileText />} label="New request" /><QuickLink href="/procurement/purchase-order/new" icon={<ShoppingCart />} label="New PO" /><QuickLink href="/vendors" icon={<Building2 />} label="Vendors" /><QuickLink href="/settings/entities" icon={<CheckCircle2 />} label="Entity setup" /></div></ProcurementSection>
          </div>
        </div>
        {(poLoading || prLoading) && <span className="sr-only">Loading dashboard</span>}
      </div>
    </PermissionGuard>
  );
}

function LoadingRows() { return <div className="space-y-3 p-5">{[1, 2, 3].map((item) => <div key={item} className="h-10 animate-pulse rounded-lg bg-[#f1f4f3]" />)}</div>; }
function EmptyPanel({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) { return <div className="flex flex-col items-center px-5 py-12 text-center"><span className="flex size-11 items-center justify-center rounded-xl bg-[#edf8f5] text-[#087f70] [&>svg]:size-5">{icon}</span><p className="mt-3 text-[13px] font-semibold">{title}</p><p className="mt-1 text-[11px] text-[#84908a]">{detail}</p></div>; }
function AttentionRow({ icon, title, detail, href, tone }: { icon: React.ReactNode; title: string; detail: string; href: string; tone: "amber" | "blue" | "teal" }) { const color = tone === "amber" ? "bg-[#fff6df] text-[#a46709]" : tone === "blue" ? "bg-[#edf4ff] text-[#3b67b0]" : "bg-[#e8f8f5] text-[#087f70]"; return <Link href={href} className="flex items-center gap-3 rounded-[11px] border border-black/[0.055] p-3 transition hover:border-[#0ea894]/25 hover:bg-[#fafcfb]"><span className={`flex size-8 shrink-0 items-center justify-center rounded-[9px] ${color} [&>svg]:size-4`}>{icon}</span><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-[#17211d]">{title}</span><span className="mt-0.5 block text-[10px] text-[#89918d]">{detail}</span></span><ArrowRight className="size-3.5 text-[#a6adaa]" /></Link>; }
function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) { return <Link href={href} className="flex flex-col gap-3 rounded-[11px] border border-black/[0.06] bg-[#fafcfb] p-3 text-[11px] font-semibold text-[#25302b] transition hover:-translate-y-0.5 hover:border-[#0ea894]/25 hover:bg-[#f3faf8]"><span className="text-[#087f70] [&>svg]:size-4">{icon}</span>{label}</Link>; }
