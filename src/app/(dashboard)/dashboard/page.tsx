"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Building2, CalendarClock, CheckCircle2, FileText, Plus, ShoppingCart, Truck } from "lucide-react";
import PermissionGuard from "@/components/permissions/permission-protected-components";
import { ProcurementSection } from "@/components/procurement/ProcurementWorkspace";
import { useAuthStore } from "@/stores/auth-stores";
import { useGetPurchaseRequests } from "@/queries/procurement/purchase-requests";
import { usePurchaseOrders } from "@/queries/procurement/purchase-orders";
import { useLegalEntities } from "@/queries/legal-entities";

const currency = (value: number, code = "USD") => new Intl.NumberFormat(undefined, { style: "currency", currency: code, maximumFractionDigits: 0 }).format(value);
const date = (value?: string) => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value)) : "No date";
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

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
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const updateGreeting = () => setGreeting(getGreeting());
    updateGreeting();
    const timer = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <PermissionGuard>
      <div className="space-y-5 pb-8">
        <section className="relative overflow-hidden rounded-[17px] bg-[#0b1714] px-5 py-5 text-white shadow-[0_18px_50px_-36px_rgba(4,43,36,0.85)] md:px-7 md:py-6">
          <div className="absolute -right-16 -top-24 size-60 rounded-full bg-[#19b9a1]/16 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-24 w-52 bg-gradient-to-t from-[#0ea894]/10 to-transparent" />
          <div className="relative grid gap-5 lg:grid-cols-[1.6fr_0.8fr] lg:items-center">
            <div>
              <h1 className="max-w-2xl text-[26px] font-semibold leading-[1.08] tracking-[-0.04em] md:text-[32px]">{greeting}, {userName}.<br /><span className="text-white/45">Here&apos;s what needs your attention.</span></h1>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/procurement/purchase-request/new" className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-primary px-3.5 text-[11px] font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary-hover"><Plus className="size-3.5" /> New request</Link>
                <Link href="/procurement" className="inline-flex h-9 items-center gap-2 rounded-[9px] border border-white/12 bg-white/[0.05] px-3.5 text-[11px] font-semibold text-white/80 hover:bg-white/[0.1]">Open procurement <ArrowRight className="size-3.5" /></Link>
              </div>
            </div>
            <div className="rounded-[13px] border border-white/10 bg-white/[0.055] p-3.5 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[#19b9a1]/15 text-[#71dfce]"><Building2 className="size-3.5" /></span><div className="min-w-0"><p className="text-[9px] text-white/40">Default legal entity</p><p className="mt-0.5 truncate text-[12px] font-semibold">{entity?.legalName || "Finish entity setup"}</p></div></div><span className="shrink-0 rounded-full bg-[#19b9a1]/15 px-2 py-1 text-[8px] font-semibold uppercase text-[#74e3d2]">{entity?.readinessStatus?.replaceAll("_", " ") || "Not ready"}</span></div>
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/10 pt-3"><div><p className="text-[9px] text-white/35">Base currency</p><p className="mt-0.5 text-[12px] font-semibold">{code}</p></div><div><p className="text-[9px] text-white/35">Open commitments</p><p className="mt-0.5 text-[12px] font-semibold">{currency(committed, code)}</p></div></div>
            </div>
          </div>
        </section>

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
