"use client";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";
import { useAuthStore } from "@/stores/auth-stores";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/dashboard/landing/StatCard";
import { RecentActivity } from "@/components/dashboard/landing/RecentActivity";
import { ExpenseChart } from "@/components/dashboard/landing/ExpenseChart";
import { PolicyAlertsTable } from "@/components/dashboard/landing/PolicyAlertTable";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import PermissionGuard from "@/components/permissions/permission-protected-components";
import { DollarSign } from "lucide-react";
import { StatusUp, WalletMoney, LampOn } from "iconsax-reactjs";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const currencySymbol = useAuthStore((state) => state.getCurrencySymbol());
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "there";

  return (
    <div style={{ maxHeight: "100%" }}>
      <PermissionGuard>
        <div className="space-y-5">
          {/* Apply Banner */}
          <Card className="bg-gradient-to-r from-primary/20 to-primary/10 border-primary/50 !p-0">
            <div className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-white shrink-0" aria-hidden="true">
                  i
                </div>
                <div>
                  <h3 className="font-semibold">Apply for Villeto</h3>
                  <p className="text-sm text-muted-foreground">
                    This is a demo environment. Apply now to unlock your
                    company&apos;s full environment.
                  </p>
                </div>
              </div>
              <Button size={"sm"} className="!h-10 w-full sm:w-auto">
                Apply Now
              </Button>
            </div>
          </Card>

          {/* Welcome Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Welcome Back, <span>{userName}!</span>
              </h2>
              <p className="text-muted-foreground text-sm font-normal">
                Here&apos;s what&apos;s happening with your expenses today.
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search by transaction etc"
                aria-label="Search transactions"
                className="pl-9 h-12"
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-1.5">
            <StatsCard
              title="Total Spend"
              value={`${currencySymbol}0.00`}
              subtitle={<span className="text-muted-foreground">This month you spent <span className="text-success">{currencySymbol}0.00</span> </span>}
              trend="up"
              icon={
                <div className="p-2 mr-3 flex items-center justify-center rounded-full text-white bg-[#38B2AC]" aria-hidden="true">
                  <DollarSign className="w-5 h-5" />
                </div>
              }
            />
            <StatsCard
              title="Overall Budget Utilization"
              value="0%"
              subtitle={
                <span className="">
                  Your budget utilization is{" "}
                  <span className="text-success">0%</span>
                </span>
              }
              trend="neutral"
              icon={
                <div className="p-2 mr-3 flex items-center justify-center rounded-full text-white bg-[#5A67D8]" aria-hidden="true">
                  <StatusUp className="w-5 h-5" />
                </div>
              }
            />
            <StatsCard
              title="Total Accounts Payable"
              value={`${currencySymbol}0.00`}
              subtitle={<>You have 0 accounts to pay</>}
              icon={
                <div className="p-2 mr-3 flex items-center justify-center rounded-full text-white bg-[#F45B69]" aria-hidden="true">
                  <WalletMoney className="w-5 h-5" />
                </div>
              }
            />
            <StatsCard
              title="Open Approvals"
              value="0"
              subtitle={
                // Previously href="" — an empty href resolves to the
                // current URL, so the link silently reloaded the
                // dashboard instead of navigating anywhere. Pointed
                // at the real procurement route, which is where
                // approvals live today.
                <Link href="/procurement" className="text-success underline">
                  Authorize Approvals
                </Link>
              }
              trend="up"
              icon={
                <div className="p-2 mr-3 flex items-center justify-center rounded-full text-white bg-[#418341]" aria-hidden="true">
                  <LampOn className="w-5 h-5" />
                </div>
              }
            />
            <StatsCard
              title="Critical Policy Alerts"
              value="0"
              subtitle={
                // Previously href="" — same no-op bug as above.
                <Link href="/policies" className="text-error underline">
                  Authorize Policy Alerts
                </Link>
              }
              trend="down"
              icon={
                <div className="p-2 mr-3 flex items-center justify-center rounded-full text-white bg-[#384A57]" aria-hidden="true">
                  <StatusUp className="w-5 h-5" />
                </div>
              }
            />
          </div>

          {/* Chart */}
          <ExpenseChart />

          {/* Table and Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            <div className="lg:col-span-3">
              <PolicyAlertsTable />
            </div>
            <div>
              <RecentActivity />
            </div>
          </div>

          {/* Owner Dashboard Section */}
          <Card className="p-6 gap-1.5">
            <h3 className="text-lg font-semibold">Owner Dashboard</h3>
            <p className="text-sm text-muted-foreground pb-4 border-b-2 border-muted">
              Special insights and controls for business owners
            </p>
            <p className="mt-4 mb-4">
              As an owner, you have access to all financial data and company
              settings.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />
                Company financial performance metrics
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />
                Departmental spending breakdowns
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />
                Executive reports and analytics
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />
                Full administrative controls
              </li>
            </ul>
          </Card>
        </div>
      </PermissionGuard>
    </div>
  );
}
