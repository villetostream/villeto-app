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
import { useAuthStore } from "@/stores/auth-stores";
import { useGetPurchaseRequests } from "@/queries/procurement/purchase-requests";
import { usePurchaseOrders } from "@/queries/procurement/purchase-orders";
import { useLegalEntities } from "@/queries/legal-entities";
import { useCompanyExpenses, usePersonalExpenses } from "@/lib/react-query/expenses";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS, PROCUREMENT_KEYS } from "@/lib/constants/apis";
import { cn } from "@/lib/utils";
import { COUNTRY_CURRENCY_CONFIG } from "@/lib/utils/currency";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";

const currency = (value: number, code = "USD") => new Intl.NumberFormat("en-NG", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(value);
const date = (value?: string) => value ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value)) : "No date";
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const policies = useAuthorizationPolicies();
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
  const canViewEntities = policies.legalEntities.canView;
  const { data: entityResponse, isLoading: entityLoading } = useLegalEntities({ enabled: canViewEntities });
  const entity = (entityResponse?.data || []).find((item) => item.isDefault) || entityResponse?.data?.[0];
  
  // Fallback to company country if user lacks permission to view legal entities
  const companyCountry = user?.company?.countryOfRegistration;
  const fallbackCurrency = companyCountry ? (COUNTRY_CURRENCY_CONFIG[companyCountry]?.code || "USD") : "USD";
  const code = entity?.baseCurrency || fallbackCurrency;

  // Purchase Requests
  const prScope = policies.purchaseRequests.listScope ?? "own";
  const { data: prResponse, isLoading: prLoading } = useGetPurchaseRequests(
    { scope: prScope, page: 1, limit: 50 },
    { enabled: policies.purchaseRequests.canView },
  );
  const requests = prResponse?.data || [];
  
  // PR Action Counts
  const pendingPRApprovals = requests.filter(item => 
    item.currentUserActionRequired || 
    (item.status === "submitted" && policies.purchaseRequests.canApprove)
  );
  const prsReadyForConversion = requests.filter(item => item.status === "approved" || item.status === "partially_converted");
  const recentPRs = requests.slice(0, 5);

  // Purchase Orders
  const poScope = policies.purchaseOrders.listScope ?? "own";
  const { data: poResponse, isLoading: poLoading } = usePurchaseOrders(
    1, 50, undefined, undefined, undefined, poScope,
    { enabled: policies.purchaseOrders.canView },
  );
  const orders = poResponse?.data || [];
  const openOrders = orders.filter((item) => ["approved", "issued", "acknowledged", "ready_for_delivery", "partially_delivered"].includes(item.status || ""));
  const receivingOrders = orders.filter((item) => ["issued", "acknowledged", "ready_for_delivery", "partially_delivered"].includes(item.status || ""));

  // Expenses
  const expScope = policies.expenses.listScope;
  const companyExpenseScope = expScope === "company" || expScope === "team" ? expScope : null;
  const { data: companyExpensesData, isLoading: companyExpensesLoading } = useCompanyExpenses(
    1,
    50,
    companyExpenseScope || "company",
    undefined,
    undefined,
    companyExpenseScope !== null,
  );
  const { data: personalExpensesData, isLoading: personalExpensesLoading } = usePersonalExpenses(
    1,
    50,
    undefined,
    undefined,
    undefined,
    expScope === "own",
  );
  const expenses = companyExpenseScope
    ? companyExpensesData?.reports || []
    : personalExpensesData?.reports || [];
  const pendingExpenses = expenses.filter(e => e.status === "pending");
  const approvedExpenses = expenses.filter(e => e.status === "approved");
  const approvedExpensesSpend = approvedExpenses.reduce((sum, e) => sum + Number(e.totalAmount || 0), 0);

  // Users (Team)
  const canViewUsers = policies.people.canManageUsers;
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["dashboard_users"],
    queryFn: async () => {
      const res = await axios.get(API_KEYS.USER.USERS, { params: { status: "all" } });
      return res.data;
    },
    enabled: canViewUsers,
    staleTime: 5 * 60 * 1000,
  });
  const totalUsers = usersData?.meta?.totalCount || usersData?.data?.length || 0;

  // Vendors
  const canViewVendors = policies.vendors.canViewSensitive;
  const { data: vendorsData, isLoading: vendorsLoading } = useQuery({
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
  const spendByCurrency = [...openOrders, ...approvedExpenses].reduce((acc, item: any) => {
    const c = item.currency || code;
    acc[c] = (acc[c] || 0) + Number(item.totalAmount || 0);
    return acc;
  }, {} as Record<string, number>);

  const primarySpend = spendByCurrency[code] || 0;
  
  const otherCurrencies = Object.entries(spendByCurrency)
    .filter(([c, val]) => c !== code && val > 0)
    .map(([c, val]) => currency(val, c));
  
  const otherCurrenciesLabel = otherCurrencies.length > 0 
    ? <span className="block mt-2 text-[11px] text-[#89918d] truncate">↳ + {otherCurrencies.join(' and ')} in other entities</span> 
    : undefined;

  const totalPendingActions = pendingPRApprovals.length + prsReadyForConversion.length + pendingExpenses.length;
  
  const expLoading = companyExpenseScope ? companyExpensesLoading : personalExpensesLoading;
  const isAnyLoading = prLoading || poLoading || entityLoading || expLoading || usersLoading || vendorsLoading;

  return (
      <div className="space-y-6 pb-12 h-full">
        
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
              {policies.purchaseRequests.canCreate && (
                <Link href="/procurement/purchase-request/new" className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#087f70] px-4 text-[13px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#076b5e] shadow-sm">
                  <Plus className="size-4" /> New request
                </Link>
              )}
              {policies.expenses.canCreate && (
                <Link href="/expenses" className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-white text-[#0b100e] px-4 text-[13px] font-semibold transition hover:-translate-y-0.5 hover:bg-[#f0f4f2] shadow-sm">
                  <Receipt className="size-4" /> New expense
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* 2. KPI Metrics Row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Total Committed Spend" value={currency(primarySpend, code)} subtitle={otherCurrenciesLabel} icon={<BadgeDollarSign />} color="teal" isLoading={isAnyLoading} />
          <MetricCard title="Pending Actions" value={totalPendingActions.toString()} icon={<CalendarClock />} color="amber" isLoading={isAnyLoading} />
          {canViewVendors && <MetricCard title="Active Vendors" value={activeVendors.toString()} icon={<Store />} color="blue" isLoading={isAnyLoading} />}
          {canViewUsers && <MetricCard title="Team Members" value={totalUsers.toString()} icon={<Users />} color="purple" isLoading={isAnyLoading} />}
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
              visible={policies.expenses.canView}
              isLoading={isAnyLoading}
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
              visible={policies.purchaseRequests.canView || policies.purchaseOrders.canView}
              isLoading={isAnyLoading}
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
              isLoading={isAnyLoading}
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
              isLoading={isAnyLoading}
              stats={[
                { label: "Total Members", value: totalUsers.toString() },
                {
                  label: "Active",
                  value:
                    usersData?.data
                      ?.filter((directoryUser: { status?: string }) =>
                        directoryUser.status === "Active"
                      )
                      ?.length?.toString() || "0",
                }
              ]}
            />

            <ModuleCard 
              title="Accounting" 
              icon={<Briefcase />} 
              href="/accounting" 
              color="amber"
              visible={policies.accounting.canView}
              isLoading={isAnyLoading}
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
              visible={policies.billPay.canViewInvoices}
              isLoading={isAnyLoading}
              stats={[
                { label: "Payments", value: "0" },
                { label: "Invoices", value: "0" }
              ]}
            />

          </div>
        </section>

        {/* 4. Activity & Attention */}
        <section className={cn("grid grid-cols-1 gap-6", policies.purchaseRequests.canView && "lg:grid-cols-[1.5fr_1fr]")}>
          {/* Left: Recent PRs */}
          {policies.purchaseRequests.canView && <div className="bg-white rounded-[16px] border border-black/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
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
          </div>}

          {/* Right: Attention Queue & Quick Actions */}
          <div className="space-y-6">
            {/* Attention Queue */}
            <div className="bg-white rounded-[16px] border border-black/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="p-5 border-b border-black/[0.04]">
                <h3 className="text-[14px] font-bold text-[#0b100e]">Attention Queue</h3>
                <p className="text-[12px] text-[#68726d] mt-0.5">Items requiring your action</p>
              </div>
              <div className="p-3 space-y-2">
                {policies.purchaseRequests.canApprove && (
                  <AttentionRow 
                    icon={<ClipboardCheck />} 
                    title={`${pendingPRApprovals.length} approvals waiting`} 
                    detail="Review submitted requests" 
                    href="/procurement/purchase-request?innerTab=approve" 
                    tone="amber" 
                    isLoading={isAnyLoading}
                  />
                )}
                {policies.purchaseRequests.canConvertToPurchaseOrder && (
                  <AttentionRow 
                    icon={<ShoppingCart />} 
                    title={`${prsReadyForConversion.length} PRs ready for PO`} 
                    detail="Convert approved requests" 
                    href="/procurement/purchase-request?innerTab=convert" 
                    tone="indigo" 
                    isLoading={isAnyLoading}
                  />
                )}
                {policies.purchaseOrders.canView && (
                  <AttentionRow
                    icon={<Truck />}
                    title={`${receivingOrders.length} orders in receiving`}
                    detail="Track active deliveries"
                    href="/procurement/confirmation"
                    tone="blue"
                    isLoading={isAnyLoading}
                  />
                )}
                {policies.accounting.canView && (
                  <AttentionRow 
                    icon={<CheckCircle2 />} 
                    title={entity?.readinessStatus === "accounting_ready" ? "Accounting is ready" : "Finish accounting setup"} 
                    detail="Prepare invoice controls" 
                    href="/accounting" 
                    tone="teal" 
                    isLoading={isAnyLoading}
                  />
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-[16px] border border-black/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="p-5 border-b border-black/[0.04]">
                <h3 className="text-[14px] font-bold text-[#0b100e]">Quick Actions</h3>
              </div>
              <div className="p-4 grid grid-cols-2 gap-2">
                {policies.purchaseRequests.canCreate && <QuickLink href="/procurement/purchase-request/new" icon={<FileText />} label="New PR" />}
                {policies.purchaseOrders.canCreate && (
                  <QuickLink href="/procurement/purchase-order/new" icon={<ShoppingCart />} label="New PO" />
                )}
                {canViewVendors && (
                  <QuickLink href="/vendors" icon={<Store />} label="Vendors" />
                )}
                {policies.legalEntities.canManage && (
                  <QuickLink href="/settings/entities" icon={<CheckCircle2 />} label="Entity Setup" />
                )}
              </div>
            </div>
          </div>
        </section>

      </div>
  );
}

// --- Subcomponents ---

function MetricCard({ title, value, subtitle, icon, color, isLoading }: { title: string, value: string, subtitle?: React.ReactNode, icon: React.ReactNode, color: "teal" | "amber" | "blue" | "purple", isLoading?: boolean }) {
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
      {isLoading ? (
        <div className="h-[24px] w-16 animate-pulse rounded-[6px] bg-[#f0f2f1]" />
      ) : (
        <>
          <p className="text-[24px] font-bold leading-none tracking-tight text-[#0b100e]">{value}</p>
          {subtitle && subtitle}
        </>
      )}
    </div>
  );
}

function ModuleCard({ title, icon, href, stats, visible, comingSoon, color, isLoading }: { title: string, icon: React.ReactNode, href: string, stats: {label: string, value: string}[], visible: boolean, comingSoon?: boolean, color: string, isLoading?: boolean }) {
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
            {isLoading ? (
              <div className="h-4 w-12 animate-pulse rounded-[4px] bg-[#f0f2f1]" />
            ) : (
              <p className="text-[13px] font-bold text-[#0b100e]">{stat.value}</p>
            )}
          </div>
        ))}
      </div>
    </Link>
  );
}

function AttentionRow({ icon, title, detail, href, tone, isLoading }: { icon: React.ReactNode; title: string; detail: string; href: string; tone: "amber" | "blue" | "teal" | "indigo", isLoading?: boolean }) { 
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
        {isLoading ? (
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="h-3 w-32 animate-pulse rounded-[4px] bg-[#f0f2f1]" />
            <div className="h-[10px] w-24 animate-pulse rounded-[4px] bg-[#f0f2f1]" />
          </div>
        ) : (
          <>
            <span className="block text-[12px] font-bold text-[#0b100e] group-hover:text-[#087f70] transition-colors">{title}</span>
            <span className="mt-0.5 block text-[11px] text-[#68726d]">{detail}</span>
          </>
        )}
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
