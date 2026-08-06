"use client";
import { Search, ArrowRight, Info, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/stores/auth-stores";
import { StatsCard } from "@/components/dashboard/landing/StatCard";
import { RecentActivity } from "@/components/dashboard/landing/RecentActivity";
import { ExpenseChart } from "@/components/dashboard/landing/ExpenseChart";
import { PolicyAlertsTable } from "@/components/dashboard/landing/PolicyAlertTable";
import Link from "next/link";
import PermissionGuard from "@/components/permissions/permission-protected-components";
import { StatusUp, WalletMoney, LampOn, WalletMinus } from "iconsax-reactjs";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const currencySymbol = useAuthStore((state) => state.getCurrencySymbol());
  const userName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "there";

  return (
    <div className="space-y-6">
      <PermissionGuard>
        {/* Apply Banner */}
        <div className="flex flex-col gap-3 rounded-[12px] border border-[#c3ece7] bg-[#f0faf8] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e7f6f2]">
              <Info className="size-4 text-[#087f70]" />
            </span>
            <div>
              <h3 className="text-[13px] font-semibold text-[#0b100e]">
                Apply for Villeto
              </h3>
              <p className="mt-0.5 text-[12px] text-[#68726d]">
                This is a demo environment. Apply now to unlock your company&apos;s full environment.
              </p>
            </div>
          </div>
          <Link
            href="/onboarding"
            className="flex shrink-0 items-center gap-1.5 rounded-[8px] bg-[#0ea894] px-4 py-2 text-[12px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(14,168,148,0.8)] transition-all hover:translate-y-[-1px] hover:bg-[#0c9785]"
          >
            Apply Now <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Welcome + Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-[#0b100e]">
              Welcome back, {userName} 👋
            </h2>
            <p className="mt-0.5 text-[13px] text-[#68726d]">
              Here&apos;s what&apos;s happening with your expenses today.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#84908a]" />
            <input
              placeholder="Search transactions..."
              aria-label="Search transactions"
              className="h-10 w-full rounded-[9px] border border-black/[0.08] bg-white pl-9 pr-4 text-[13px] text-[#0b100e] shadow-[0_2px_8px_rgba(14,28,23,0.04)] outline-none placeholder:text-[#84908a] focus:border-[#0ea894] focus:ring-0 transition-colors"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatsCard
            title="Total Spend"
            value={`${currencySymbol}0.00`}
            subtitle={<>This month: <span className="font-semibold">{currencySymbol}0.00</span></>}
            trend="up"
            accentColor="#0ea894"
            icon={<WalletMinus size={16} variant="Bold" className="text-[#0ea894]" />}
          />
          <StatsCard
            title="Budget Utilization"
            value="0%"
            subtitle={<>Utilization is <span className="font-semibold">0%</span></>}
            trend="neutral"
            accentColor="#6366f1"
            icon={<StatusUp className="size-4 text-[#6366f1]" />}
          />
          <StatsCard
            title="Accounts Payable"
            value={`${currencySymbol}0.00`}
            subtitle="0 accounts pending payment"
            accentColor="#f43f5e"
            icon={<WalletMoney className="size-4 text-[#f43f5e]" />}
          />
          <StatsCard
            title="Open Approvals"
            value="0"
            subtitle={
              <Link href="/procurement" className="underline">
                Authorize Approvals
              </Link>
            }
            trend="up"
            accentColor="#22c55e"
            icon={<LampOn className="size-4 text-[#22c55e]" />}
          />
          <StatsCard
            title="Policy Alerts"
            value="0"
            subtitle={
              <Link href="/policies" className="underline">
                View Policy Alerts
              </Link>
            }
            trend="down"
            accentColor="#f59e0b"
            icon={<StatusUp className="size-4 text-[#f59e0b]" />}
          />
        </div>

        {/* Chart */}
        <ExpenseChart />

        {/* Table and Activity */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <PolicyAlertsTable />
          </div>
          <div>
            <RecentActivity />
          </div>
        </div>

        {/* Owner Dashboard Section */}
        <div className="rounded-[12px] border border-black/[0.08] bg-white shadow-[0_4px_16px_rgba(14,28,23,0.04)]">
          <div className="flex items-center gap-3 border-b border-black/[0.06] px-5 py-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e7f6f2]">
              <ShieldCheck className="size-4 text-[#087f70]" />
            </span>
            <div>
              <h3 className="text-[13px] font-semibold text-[#0b100e]">Owner Dashboard</h3>
              <p className="text-[11px] text-[#84908a]">Special insights and controls for business owners</p>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-[13px] text-[#68726d]">
              As an owner, you have access to all financial data and company settings.
            </p>
            <ul className="mt-4 space-y-2.5">
              {[
                "Company financial performance metrics",
                "Departmental spending breakdowns",
                "Executive reports and analytics",
                "Full administrative controls",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-[12px] text-[#68726d]">
                  <span className="size-1.5 shrink-0 rounded-full bg-[#0ea894]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PermissionGuard>
    </div>
  );
}
