"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowRight, 
  BadgeDollarSign, 
  Building2, 
  CalendarClock, 
  CheckCircle2, 
  FileText, 
  Plus, 
  ShoppingCart, 
  Truck, 
  Users,
  CreditCard,
  Briefcase,
  Store,
  ChevronRight,
  ClipboardCheck,
  Receipt
} from "lucide-react";
import PermissionGuard from "@/components/permissions/permission-protected-components";
import { useAuthStore } from "@/stores/auth-stores";
import { useGetPurchaseRequests } from "@/queries/procurement/purchase-requests";
import { usePurchaseOrders } from "@/queries/procurement/purchase-orders";
import { useLegalEntities } from "@/queries/legal-entities";
import { useCompanyExpenses } from "@/lib/react-query/expenses";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS, PROCUREMENT_KEYS } from "@/lib/constants/apis";
import { cn } from "@/lib/utils";

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
  const axios = useAxios();

  const [greeting, setGreeting] = useState("Welcome back");
  useEffect(() => {
    const updateGreeting = () => setGreeting(getGreeting());
    updateGreeting();
    const timer = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const userName = user?.firstName || "there";
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  // --- Data Fetching ---

  // Legal Entities
  const canViewEntities = can("legal_entity", "view");
  const { data: entityResponse } = useLegalEntities({ enabled: canViewEntities });
  const entity = (entityResponse?.data || []).find((item) => item.isDefault) || entityResponse?.data?.[0];
  const code = entity?.baseCurrency || "USD";

  // Purchase Requests
  const prScope = can("procurement.purchase_request", "read_company") ? "company" : can("procurement.purchase_request", "read_department") ? "team" : "own";
  const { data: prResponse, isLoading: prLoading } = useGetPurchaseRequests({ scope: prScope, page: 1, limit: 50 });
  const requests = prResponse?.data || [];
  
  // PR Action Counts
  const pendingPRApprovals = requests.filter(item => item.status === "submitted" || item.currentUserActionRequired);
  const prsReadyForConversion = requests.filter(item => item.status === "approved" || item.status === "partially_converted");
  const recentPRs = requests.slice(0, 5);

  // Purchase Orders
  const poScope = can("procurement.purchase_order", "read_company") ? "company" : can("procurement.purchase_order", "read_department") ? "team" : "own";
  const { data: poResponse, isLoading: poLoading } = usePurchaseOrders(1, 50, undefined, undefined, undefined, poScope);
  const orders = poResponse?.data || [];
  const openOrders = orders.filter((item) => !["closed", "cancelled"].includes(item.status || ""));
  const receivingOrders = orders.filter((item) => ["issued", "acknowledged", "ready_for_delivery", "partially_delivered"].includes(item.status || ""));
  const committedSpend = openOrders.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);

  // Expenses
  const expScope = can("expense.report", "read_company") ? "company" : can("expense.report", "read_department") ? "team" : null;
  const { data: expensesData } = useCompanyExpenses(1, 50, expScope || "company", undefined, undefined, !!expScope);
  const expenses = expensesData?.reports || [];
  const pendingExpenses = expenses.filter(e => e.status === "pending");
  const approvedExpensesSpend = expenses.filter(e => e.status === "approved").reduce((sum, e) => sum + Number(e.totalAmount || 0), 0);

  // Users (Team)
  const canViewUsers = can("user", "read");
  const { data: usersData } = useQuery({
    queryKey: ["dashboard_users"],
    queryFn: async () => {
      const res = await axios.get(API_KEYS.USER.USERS);
      return res.data;
    },
    enabled: canViewUsers,
    staleTime: 5 * 60 * 1000,
  });
  const totalUsers = usersData?.meta?.totalCount || usersData?.data?.length || 0;

  // Vendors
  const canViewVendors = can("vendor", "read_company");
  const { data: vendorsData } = useQuery({
    queryKey: ["dashboard_vendors", "active"],
    queryFn: async () => {
      const res = await axios.get(PROCUREMENT_KEYS.ACTIVE_VENDORS);
      return res.data;
    },
    enabled: canViewVendors,
    staleTime: 5 * 60 * 1000,
  });
  const vendorsList = Array.isArray(vendorsData?.data) ? vendorsData.data : (vendorsData?.data?.data || []);
  const activeVendors = vendorsData?.meta?.totalCount || vendorsList.length;

  // Total Metric Calculations
  const totalSpend = committedSpend + approvedExpensesSpend;
  const totalPendingActions = pendingPRApprovals.length + prsReadyForConversion.length + pendingExpenses.length;

  return (
    <PermissionGuard>
      <div className="space-y-6 pb-12 max-w-7xl mx-auto">
        
        {/* 1. Welcome Hero */}
        <section className="relative overflow-hidden rounded-[20px] bg-[#091512] px-6 py-8 text-white shadow-[0_20px_60px_-20px_rgba(4,43,36,0.5)] md:px-10 md:py-9 border border-white/[0.04]">
          <div className="absolute -right-20 -top-20 size-72 rounded-full bg-[#19b9a1]/15 blur-3xl" />
          <div className="absolute bottom-0 right-1/3 h-32 w-64 bg-gradient-to-t from-[#0ea894]/10 to-transparent blur-2xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-[12px] font-medium text-[#19b9a1] mb-2 uppercase tracking-widest">{today}</p>
              <h1 className="text-[28px] font-bold leading-[1.1] tracking-[-0.03em] md:text-[36px]">
                {greeting}, {userName}.
              </h1>
              <p className="mt-2 text-[15px] text-white/50 max-w-xl">
                Here&apos;s your workspace at a glance. Let&apos;s get things done.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link href="/procurement/purchase-request/new" className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#087f70] px-4 text-[13px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#076b5e] shadow-sm">
                <Plus className="size-4" /> New request
              </Link>
              <Link href="/expenses" className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-white text-[#0b100e] px-4 text-[13px] font-semibold transition hover:-translate-y-0.5 hover:bg-[#f0f4f2] shadow-sm">
                <Receipt className="size-4" /> New expense
              </Link>
            </div>
          </div>
        </section>

        {/* 2. KPI Metrics Row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Total Committed Spend" value={currency(totalSpend, code)} icon={<BadgeDollarSign />} color="teal" />
          <MetricCard title="Pending Actions" value={totalPendingActions.toString()} icon={<CalendarClock />} color="amber" />
          <MetricCard title="Active Vendors" value={activeVendors.toString()} icon={<Store />} color="blue" />
          <MetricCard title="Team Members" value={totalUsers.toString()} icon={<Users />} color="purple" />
        </section>

        {/* 3. Module Overview Grid */}
        <section>
          <div className="flex items-center justify-between mb-4 mt-2">
            <h2 className="text-[15px] font-bold text-[#0b100e]">Modules Overview</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <ModuleCard 
              title="Expenses" 
              icon={<Receipt />} 
              href="/expenses" 
              color="emerald"
              visible={!!expScope}
              stats={[
                { label: "Pending approval", value: pendingExpenses.length.toString() },
                { label: "Approved spend", value: currency(approvedExpensesSpend, code) }
              ]}
            />

            <ModuleCard 
              title="Procurement" 
              icon={<ShoppingCart />} 
              href="/procurement" 
              color="teal"
              visible={prScope !== "own" || poScope !== "own"} // Show if they have some visibility
              stats={[
                { label: "Open Requests", value: requests.filter(r => !["closed", "cancelled"].includes(r.status)).length.toString() },
                { label: "Orders Receiving", value: receivingOrders.length.toString() }
              ]}
            />

            <ModuleCard 
              title="Vendors" 
              icon={<Building2 />} 
              href="/vendors" 
              color="blue"
              visible={canViewVendors}
              stats={[
                { label: "Total Vendors", value: vendorsList.length.toString() },
                { label: "Verified", value: activeVendors.toString() }
              ]}
            />

            <ModuleCard 
              title="People" 
              icon={<Users />} 
              href="/people" 
              color="purple"
              visible={canViewUsers}
              stats={[
                { label: "Total Members", value: totalUsers.toString() },
                { label: "Active", value: usersData?.data?.filter((u:any) => u.status === "Active")?.length?.toString() || "0" }
              ]}
            />

            <ModuleCard 
              title="Accounting" 
              icon={<Briefcase />} 
              href="/accounting" 
              color="amber"
              visible={canViewEntities}
              stats={[
                { label: "Base Currency", value: code },
                { label: "Readiness", value: entity?.readinessStatus?.replaceAll("_", " ") || "Not setup" }
              ]}
            />

            <ModuleCard 
              title="Bill Pay" 
              icon={<CreditCard />} 
              href="/bill-pay" 
              color="indigo"
              visible={true}
              comingSoon={true}
              stats={[
                { label: "Status", value: "Coming soon" },
                { label: "Payments", value: "—" }
              ]}
            />

          </div>
        </section>

        {/* 4. Activity & Attention */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
          {/* Left: Recent PRs */}
          <div className="bg-white rounded-[16px] border border-black/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-black/[0.04] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-[14px] font-bold text-[#0b100e]">Recent Purchase Requests</h3>
                <p className="text-[12px] text-[#68726d] mt-0.5">The latest demand in your workflow</p>
              </div>
              <Link href="/procurement/purchase-request" className="text-[12px] font-semibold text-[#087f70] hover:text-[#076b5e] flex items-center gap-1">
                View all <ArrowRight className="size-3" />
              </Link>
            </div>
            
            <div className="divide-y divide-black/[0.04] flex-1">
              {prLoading ? (
                <div className="p-5 space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-12 bg-[#f4f7f5] animate-pulse rounded-lg" />)}
                </div>
              ) : recentPRs.length > 0 ? (
                recentPRs.map((item) => (
                  <Link key={item.purchaseRequestId} href={`/procurement/purchase-request/${item.purchaseRequestId}`} className="group flex items-center justify-between p-4 sm:p-5 transition-colors hover:bg-[#f9faf9]">
                    <div className="min-w-0 flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="truncate text-[13px] font-semibold text-[#0b100e] group-hover:text-[#087f70] transition-colors">{item.title}</p>
                        <span className="shrink-0 rounded-full bg-[#f0f4f2] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#68726d]">
                          {item.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#84908a]">
                        {item.requestNumber} &nbsp;&middot;&nbsp; Needed {date(item.neededByDate)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-3">
                      <p className="text-[13px] font-bold text-[#0b100e]">{currency(Number(item.totalAmount || 0), item.currency)}</p>
                      <ChevronRight className="size-4 text-[#a3aaa6] transition-transform group-hover:translate-x-0.5 group-hover:text-[#087f70]" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-10 flex flex-col items-center justify-center text-center">
                  <div className="size-12 rounded-full bg-[#f0f4f2] flex items-center justify-center text-[#84908a] mb-3">
                    <FileText className="size-5" />
                  </div>
                  <p className="text-[13px] font-semibold text-[#0b100e]">No requests yet</p>
                  <p className="text-[12px] text-[#68726d] mt-1 max-w-[200px]">Create your first purchase request to get started.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Attention Queue & Quick Actions */}
          <div className="space-y-6">
            {/* Attention Queue */}
            <div className="bg-white rounded-[16px] border border-black/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="p-5 border-b border-black/[0.04]">
                <h3 className="text-[14px] font-bold text-[#0b100e]">Attention Queue</h3>
                <p className="text-[12px] text-[#68726d] mt-0.5">Items requiring your action</p>
              </div>
              <div className="p-3 space-y-2">
                <AttentionRow 
                  icon={<ClipboardCheck />} 
                  title={`${pendingPRApprovals.length} approvals waiting`} 
                  detail="Review submitted requests" 
                  href="/procurement/purchase-request?innerTab=approve" 
                  tone="amber" 
                />
                <AttentionRow 
                  icon={<ShoppingCart />} 
                  title={`${prsReadyForConversion.length} PRs ready for PO`} 
                  detail="Convert approved requests" 
                  href="/procurement/purchase-request?innerTab=convert" 
                  tone="indigo" 
                />
                <AttentionRow 
                  icon={<Truck />} 
                  title={`${receivingOrders.length} orders in receiving`} 
                  detail="Track active deliveries" 
                  href="/procurement/confirmation" 
                  tone="blue" 
                />
                <AttentionRow 
                  icon={<CheckCircle2 />} 
                  title={entity?.readinessStatus === "accounting_ready" ? "Accounting is ready" : "Finish accounting setup"} 
                  detail="Prepare invoice controls" 
                  href="/accounting" 
                  tone="teal" 
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-[16px] border border-black/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="p-5 border-b border-black/[0.04]">
                <h3 className="text-[14px] font-bold text-[#0b100e]">Quick Actions</h3>
              </div>
              <div className="p-4 grid grid-cols-2 gap-2">
                <QuickLink href="/procurement/purchase-request/new" icon={<FileText />} label="New PR" />
                <QuickLink href="/procurement/purchase-order/new" icon={<ShoppingCart />} label="New PO" />
                <QuickLink href="/vendors" icon={<Store />} label="Vendors" />
                <QuickLink href="/settings/entities" icon={<CheckCircle2 />} label="Entity Setup" />
              </div>
            </div>
          </div>
        </section>

      </div>
    </PermissionGuard>
  );
}

// --- Subcomponents ---

function MetricCard({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: "teal" | "amber" | "blue" | "purple" }) {
  const colorStyles = {
    teal: "bg-[#e8f8f5] text-[#087f70]",
    amber: "bg-[#fff6df] text-[#a46709]",
    blue: "bg-[#edf4ff] text-[#3b67b0]",
    purple: "bg-[#f5ecfc] text-[#8a38f5]"
  };

  return (
    <div className="bg-white rounded-[14px] border border-black/[0.06] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-4">
        <p className="text-[12px] font-semibold text-[#68726d]">{title}</p>
        <div className={cn("flex size-9 items-center justify-center rounded-[10px] shrink-0 [&>svg]:size-[18px]", colorStyles[color])}>
          {icon}
        </div>
      </div>
      <p className="text-[24px] font-bold leading-none tracking-tight text-[#0b100e]">{value}</p>
    </div>
  );
}

function ModuleCard({ title, icon, href, stats, visible, comingSoon, color }: { title: string, icon: React.ReactNode, href: string, stats: {label: string, value: string}[], visible: boolean, comingSoon?: boolean, color: string }) {
  if (!visible) return null;

  const colorStyles: Record<string, string> = {
    emerald: "group-hover:bg-[#087f70] group-hover:text-white text-[#087f70] bg-[#e8f8f5]",
    teal: "group-hover:bg-[#0ea894] group-hover:text-white text-[#0ea894] bg-[#e6f7f5]",
    blue: "group-hover:bg-[#3b82f6] group-hover:text-white text-[#3b82f6] bg-[#eff6ff]",
    purple: "group-hover:bg-[#8b5cf6] group-hover:text-white text-[#8b5cf6] bg-[#f5f3ff]",
    amber: "group-hover:bg-[#f59e0b] group-hover:text-white text-[#f59e0b] bg-[#fffbeb]",
    indigo: "group-hover:bg-[#6366f1] group-hover:text-white text-[#6366f1] bg-[#eef2ff]",
  };

  return (
    <Link 
      href={comingSoon ? "#" : href} 
      className={cn(
        "group block bg-white rounded-[16px] border border-black/[0.06] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-200",
        comingSoon ? "opacity-70 cursor-not-allowed" : "hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-black/[0.1] hover:-translate-y-1"
      )}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={cn("flex size-10 items-center justify-center rounded-[10px] transition-colors [&>svg]:size-5", colorStyles[color])}>
            {icon}
          </div>
          <h3 className="text-[15px] font-bold text-[#0b100e]">{title}</h3>
        </div>
        {comingSoon && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-700">Soon</span>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-black/[0.04]">
        {stats.map((stat, i) => (
          <div key={i}>
            <p className="text-[11px] font-medium text-[#84908a] mb-1">{stat.label}</p>
            <p className="text-[13px] font-bold text-[#0b100e]">{stat.value}</p>
          </div>
        ))}
      </div>
    </Link>
  );
}

function AttentionRow({ icon, title, detail, href, tone }: { icon: React.ReactNode; title: string; detail: string; href: string; tone: "amber" | "blue" | "teal" | "indigo" }) { 
  const tones = {
    amber: "bg-[#fff6df] text-[#a46709]", 
    blue: "bg-[#edf4ff] text-[#3b67b0]", 
    teal: "bg-[#e8f8f5] text-[#087f70]",
    indigo: "bg-[#eef2ff] text-[#6366f1]"
  };
  const color = tones[tone]; 

  return (
    <Link href={href} className="group flex items-center gap-3 rounded-[12px] border border-transparent p-2.5 transition-all hover:bg-[#f9faf9] hover:border-black/[0.04]">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${color} [&>svg]:size-[18px] transition-transform group-hover:scale-105`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-bold text-[#0b100e] group-hover:text-[#087f70] transition-colors">{title}</span>
        <span className="mt-0.5 block text-[11px] text-[#68726d]">{detail}</span>
      </span>
      <ChevronRight className="size-4 text-[#a3aaa6] transition-transform group-hover:translate-x-0.5 group-hover:text-[#087f70]" />
    </Link>
  ); 
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) { 
  return (
    <Link href={href} className="flex flex-col gap-2.5 rounded-[12px] border border-black/[0.04] bg-[#f9faf9] p-3 text-[12px] font-semibold text-[#0b100e] transition-all hover:-translate-y-0.5 hover:border-[#087f70]/30 hover:bg-[#f0faf8] group">
      <span className="text-[#087f70] [&>svg]:size-[18px] transition-transform group-hover:scale-110">{icon}</span>
      {label}
    </Link>
  ); 
}
