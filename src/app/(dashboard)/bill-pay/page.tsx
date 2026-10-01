"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLegalEntities } from "@/queries/legal-entities";
import { useGetBillPayDashboardSummary } from "@/queries/bill-pay";
import { BillPayTabs } from "@/components/bill-pay/BillPayTabs";
import { Receipt2, ClipboardText, Cards, TickCircle } from "iconsax-reactjs";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import { ConfigureEmailModal } from "@/components/bill-pay/ConfigureEmailModal";
import { StatsCard } from "@/components/dashboard/landing/StatCard";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, subMonths, startOfMonth as startOfM } from "date-fns";

import { DatePicker } from "@/components/ui/date-picker";

function BillPayPage() {
  const router = useRouter();
  const setAction = useHeaderActionStore((state) => state.setAction);
  const clearAction = useHeaderActionStore((state) => state.clearAction);
  const policies = useAuthorizationPolicies();
  const [showConfigureEmail, setShowConfigureEmail] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("billPayActiveTab") || "recurring";
    }
    return "recurring";
  });
  
  const [period, setPeriod] = useState("this_month");
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  
  const periodDates = useMemo(() => {
    const now = new Date();
    if (period === "this_month") {
      return { start: format(startOfMonth(now), "yyyy-MM-dd"), end: format(endOfMonth(now), "yyyy-MM-dd") };
    }
    if (period === "last_month") {
      const lastMonth = subMonths(now, 1);
      return { start: format(startOfMonth(lastMonth), "yyyy-MM-dd"), end: format(endOfMonth(lastMonth), "yyyy-MM-dd") };
    }
    if (period === "last_3_months") {
      return { start: format(startOfMonth(subMonths(now, 2)), "yyyy-MM-dd"), end: format(endOfMonth(now), "yyyy-MM-dd") };
    }
    if (period === "custom") {
      if (customStartDate && customEndDate) {
        // Automatically swap if start is after end to prevent 400 Bad Request
        let s = customStartDate;
        let e = customEndDate;
        if (s > e) {
          s = customEndDate;
          e = customStartDate;
        }
        return { 
          start: format(s, "yyyy-MM-dd"), 
          end: format(e, "yyyy-MM-dd") 
        };
      }
      // If both aren't selected yet, return undefined to prevent 400 Bad Request from API
      return { start: undefined, end: undefined };
    }
    return { start: undefined, end: undefined };
  }, [period, customStartDate, customEndDate]);

  const { data: legalEntitiesData } = useLegalEntities();
  const legalEntityId = legalEntitiesData?.data?.[0]?.legalEntityId || "";
  
  const { data: summaryData, isLoading: isSummaryLoading } = useGetBillPayDashboardSummary(
    legalEntityId,
    periodDates.start,
    periodDates.end,
    { refetchInterval: 60_000 }
  );

  useEffect(() => {
    sessionStorage.setItem("billPayActiveTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!policies.billPay.canCreateIntake && !policies.billPay.canCreateInvoice) {
      clearAction();
      return () => clearAction();
    }
    setAction({
      label: "New Bill",
      items: [
        {
          label: "Add a Bill",
          description: "Upload or enter an invoice",
          onClick: () => router.push("/bill-pay/add"),
        },
        {
          label: "Set Up Recurring Bill",
          description: "Automate regular bills",
          onClick: () => router.push("/bill-pay/add-recurring"),
        },
      ],
      ...(activeTab === "other" && policies.billPay.canManageConfiguration && {
        secondaryAction: {
          label: "Configure Email",
          onClick: () => setShowConfigureEmail(true),
        },
      }),
    });
    return () => clearAction();
  }, [router, setAction, clearAction, activeTab, policies.billPay.canCreateIntake, policies.billPay.canCreateInvoice, policies.billPay.canManageConfiguration]);

  // Format the total bills amount
  const baseCurrency = summaryData?.legalEntity?.baseCurrency || "NGN";
  const formatter = new Intl.NumberFormat("en-NG", { style: "currency", currency: baseCurrency });
  // Helper to format metric
  const getMetricFormat = (metricObj: any) => {
    const amount = metricObj?.amount ? formatter.format(parseFloat(metricObj.amount)) : "—";
    const pctChangeRaw = parseFloat(metricObj?.amountPercentageChange || "0");
    const pctChangeText = `${Math.abs(pctChangeRaw).toFixed(1)}% vs last period`;
    const trendDir = pctChangeRaw > 0 ? "up" : pctChangeRaw < 0 ? "down" : "neutral";
    return { amount, pctChangeText, trendDir };
  };

  const totalBills = getMetricFormat(summaryData?.metrics?.totalBills);
  const pendingApprovals = getMetricFormat(summaryData?.metrics?.awaitingApproval);
  const readyForPayment = getMetricFormat(summaryData?.metrics?.readyForPayment);
  const completed = getMetricFormat(summaryData?.metrics?.completed);

  return (
    <div className="flex flex-col h-full pb-2">
      <div className="space-y-6 flex-1 flex flex-col min-h-0 overflow-hidden">
        
        {/* Dashboard Header & Period Filter */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Dashboard Summary</h2>
          <div className="flex items-center justify-end gap-2">
            {period === "custom" && (
              <div className="flex items-center gap-2">
                <DatePicker
                  date={customStartDate}
                  setDate={setCustomStartDate}
                  placeholder="Start Date"
                  className="w-[140px] h-10 border-gray-200 bg-white text-gray-600 rounded-[10px]"
                  toDate={customEndDate}
                />
                <span className="text-gray-400">-</span>
                <DatePicker
                  date={customEndDate}
                  setDate={setCustomEndDate}
                  placeholder="End Date"
                  className="w-[140px] h-10 border-gray-200 bg-white text-gray-600 rounded-[10px]"
                  fromDate={customStartDate}
                />
              </div>
            )}
            <div className="w-[160px]">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="h-10 px-4 border-gray-200 bg-white text-gray-600 font-medium rounded-[10px] w-full">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent className="rounded-[12px] border-black/[0.055] shadow-lg">
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 shrink-0">
          <StatsCard
            title="Total Bills This Period"
            value={totalBills.amount}
            subtitle={summaryData ? totalBills.pctChangeText : <span className="text-[11px] text-[#68726d]">vs last period</span>}
            trend={summaryData ? totalBills.trendDir as "up" | "down" | "neutral" : "none"}
            isLoading={isSummaryLoading}
            icon={<Receipt2 variant="Bulk" className="w-5 h-5 text-emerald-500" />}
            accentColor="#10b981"
          />
          <StatsCard
            title="Pending Approvals"
            value={pendingApprovals.amount}
            subtitle={summaryData ? pendingApprovals.pctChangeText : <span className="text-[11px] text-[#68726d]">Review pending bills</span>}
            trend={summaryData ? pendingApprovals.trendDir as "up" | "down" | "neutral" : "none"}
            isLoading={isSummaryLoading}
            icon={<ClipboardText variant="Bulk" className="w-5 h-5 text-amber-500" />}
            accentColor="#f59e0b"
          />
          <StatsCard
            title="Ready for Payment"
            value={readyForPayment.amount}
            subtitle={summaryData ? readyForPayment.pctChangeText : <span className="text-[11px] text-[#68726d]">Release payments</span>}
            trend={summaryData ? readyForPayment.trendDir as "up" | "down" | "neutral" : "none"}
            isLoading={isSummaryLoading}
            icon={<Cards variant="Bulk" className="w-5 h-5 text-blue-500" />}
            accentColor="#3b82f6"
          />
          <StatsCard
            title="Completed This Period"
            value={completed.amount}
            subtitle={summaryData ? completed.pctChangeText : <span className="text-[11px] text-[#68726d]">View completed transactions</span>}
            trend={summaryData ? completed.trendDir as "up" | "down" | "neutral" : "none"}
            isLoading={isSummaryLoading}
            icon={<TickCircle variant="Bulk" className="w-5 h-5 text-emerald-500" />}
            accentColor="#10b981"
          />
        </div>

        {/* Tabs Section */}
        <BillPayTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {policies.billPay.canManageConfiguration && <ConfigureEmailModal open={showConfigureEmail} onOpenChange={setShowConfigureEmail} />}
      </div>
    </div>
  );
}

export default withPermissions(BillPayPage, [
  { resource: "bill_pay.invoice", action: "view" },
  { resource: "bill_pay.intake", action: "view" },
]);
