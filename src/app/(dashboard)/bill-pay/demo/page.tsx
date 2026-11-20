"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Receipt2, ClipboardText, Cards, TickCircle } from "iconsax-reactjs";
import { StatsCard } from "@/components/dashboard/landing/StatCard";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { useBillPayDemoStore } from "@/features/bill-pay/demo/useBillPayDemoStore";
import { DemoWorkspaceShell } from "@/features/bill-pay/demo/DemoWorkspaceShell";
import { DemoStandardBillsTab } from "@/features/bill-pay/demo/DemoStandardBillsTab";
import { DemoRecurringBillsTab } from "@/features/bill-pay/demo/DemoRecurringBillsTab";
import { DemoSubscriptionsAndCardsTab } from "@/features/bill-pay/demo/DemoSubscriptionsAndCardsTab";
import { formatNgn } from "@/features/bill-pay/demo/demo-utils";

function BillPayDemoBillsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab: "standard" | "recurring" =
    searchParams.get("tab") === "recurring" ? "recurring" : "standard";
  const [recurringSubTab, setRecurringSubTab] = useState<"vendor" | "card">("vendor");

  // Selection states for full-page detail view
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedCardSubId, setSelectedCardSubId] = useState<string | null>(null);

  function setActiveTab(tab: "standard" | "recurring") {
    setSelectedBillId(null);
    setSelectedScheduleId(null);
    setSelectedCardSubId(null);
    router.replace(`/bill-pay/demo?tab=${tab}`, { scroll: false });
  }

  const { bills, schedules, subscriptionCards, companyCardExpenses, resetDemo } =
    useBillPayDemoStore();

  const totalBillsSum = bills.reduce((sum, b) => sum + b.originalAmount, 0);
  const awaitingApprovalCount = bills.filter(
    (b) => b.approvalStatus === "PENDING_APPROVAL",
  ).length;
  const readyForPaymentBills = bills.filter(
    (b) => b.approvalStatus === "APPROVED" && b.outstandingAmount > 0,
  );
  const completedCount = bills.filter((b) => b.paymentStatus === "PAID").length;

  function handleLoadSampleData() {
    resetDemo();
    toast.success("Sample bills, recurring schedules, and cards loaded");
  }

  const selectedBill = bills.find((b) => b.id === selectedBillId) || null;
  const selectedSchedule =
    schedules.find((s) => s.id === selectedScheduleId) || null;
  const selectedCardSub =
    subscriptionCards.find((s) => s.id === selectedCardSubId) || null;

  const isDetailActive =
    (activeTab === "standard" && !!selectedBill) ||
    (activeTab === "recurring" && (!!selectedSchedule || !!selectedCardSub));

  const detailTitle =
    activeTab === "standard"
      ? selectedBill?.invoiceNumber
      : selectedSchedule
      ? selectedSchedule.name
      : selectedCardSub?.subscriptionName;

  return (
    <DemoWorkspaceShell
      activePage={activeTab === "standard" ? "bills" : "recurring"}
      isDetailView={isDetailActive}
      detailTitle={detailTitle}
      onBackFromDetail={() => {
        setSelectedBillId(null);
        setSelectedScheduleId(null);
        setSelectedCardSubId(null);
      }}
      onSelectBillTab={(tab) => setActiveTab(tab)}
    >
      {/* If in Full-Page Detail View (Like Purchase Order), render Detail Page ONLY without KPI cards or tab lists */}
      {isDetailActive ? (
        activeTab === "standard" && selectedBill ? (
          <DemoStandardBillsTab
            selectedBillId={selectedBillId}
            onSelectBillId={setSelectedBillId}
            onLoadSampleData={handleLoadSampleData}
          />
        ) : selectedSchedule ? (
          <DemoRecurringBillsTab
            selectedScheduleId={selectedScheduleId}
            onSelectScheduleId={setSelectedScheduleId}
            onLoadSampleData={handleLoadSampleData}
          />
        ) : selectedCardSub ? (
          <DemoSubscriptionsAndCardsTab
            selectedSubId={selectedCardSubId}
            onSelectSubId={setSelectedCardSubId}
            onJumpToExpenses={() => router.push("/bill-pay/demo/company-expenses")}
            onLoadSampleData={handleLoadSampleData}
          />
        ) : null
      ) : (
        /* List View: Top 4 KPI Summary Cards + Sub-tabs + Table */
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatsCard
              title="Total Bills"
              value={bills.length > 0 ? formatNgn(totalBillsSum) : "₦0.00"}
              subtitle={
                <span className="text-[11px] text-[#68726d]">
                  {bills.length} {bills.length === 1 ? "bill" : "bills"} recorded
                </span>
              }
              trend="none"
              icon={<Receipt2 variant="Bulk" className="w-5 h-5 text-[#0ea894]" />}
              accentColor="#0ea894"
            />
            <StatsCard
              title="Awaiting Approval"
              value={awaitingApprovalCount}
              subtitle={
                <span className="text-[11px] text-[#68726d]">
                  Bills pending review or PO check
                </span>
              }
              trend="none"
              icon={<ClipboardText variant="Bulk" className="w-5 h-5 text-amber-500" />}
              accentColor="#f59e0b"
            />
            <StatsCard
              title="Ready for Payment"
              value={readyForPaymentBills.length}
              subtitle={
                <span className="text-[11px] text-[#68726d]">
                  {readyForPaymentBills.length > 0
                    ? `${formatNgn(
                        readyForPaymentBills.reduce((s, b) => s + b.outstandingAmount, 0),
                      )} due`
                    : "Approved & ready to pay"}
                </span>
              }
              trend="none"
              icon={<Cards variant="Bulk" className="w-5 h-5 text-[#7c3aed]" />}
              accentColor="#7c3aed"
            />
            <StatsCard
              title="Completed Bills"
              value={completedCount}
              subtitle={
                <span className="text-[11px] text-[#68726d]">
                  {companyCardExpenses.length} card expense(s) tracked
                </span>
              }
              trend="none"
              icon={<TickCircle variant="Bulk" className="w-5 h-5 text-emerald-500" />}
              accentColor="#10b981"
            />
          </div>

          {/* Sub-Tabs Switcher */}
          <div className="space-y-4">
            <div className="inline-flex p-1 bg-[#edeef0] rounded-xl border border-black/[0.04]">
              <button
                type="button"
                onClick={() => setActiveTab("standard")}
                className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "standard"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Standard Bills ({bills.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("recurring")}
                className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "recurring"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Recurring Bills ({schedules.length + subscriptionCards.length})
              </button>
            </div>

            {activeTab === "standard" ? (
              <DemoStandardBillsTab
                selectedBillId={null}
                onSelectBillId={setSelectedBillId}
                onLoadSampleData={handleLoadSampleData}
              />
            ) : (
              <div className="space-y-4">
                <div className="inline-flex p-1 bg-[#f3f4f6] rounded-xl border border-black/[0.04]">
                  <button
                    type="button"
                    onClick={() => setRecurringSubTab("vendor")}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      recurringSubTab === "vendor"
                        ? "bg-white text-[#10231d] shadow-sm"
                        : "text-gray-500 hover:text-[#10231d]"
                    }`}
                  >
                    Vendor Invoices ({schedules.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecurringSubTab("card")}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      recurringSubTab === "card"
                        ? "bg-white text-[#10231d] shadow-sm"
                        : "text-gray-500 hover:text-[#10231d]"
                    }`}
                  >
                    Company Card Subscriptions ({subscriptionCards.length})
                  </button>
                </div>

                {recurringSubTab === "vendor" ? (
                  <DemoRecurringBillsTab
                    selectedScheduleId={null}
                    onSelectScheduleId={setSelectedScheduleId}
                    onLoadSampleData={handleLoadSampleData}
                  />
                ) : (
                  <DemoSubscriptionsAndCardsTab
                    selectedSubId={null}
                    onSelectSubId={setSelectedCardSubId}
                    onJumpToExpenses={() => router.push("/bill-pay/demo/company-expenses")}
                    onLoadSampleData={handleLoadSampleData}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </DemoWorkspaceShell>
  );
}

function BillPayPreviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#68726d]">Loading Bill Pay…</div>}>
      <BillPayDemoBillsContent />
    </Suspense>
  );
}

export default withPermissions(BillPayPreviewPage, [
  { resource: "bill_pay.invoice", action: "view" },
  { resource: "bill_pay.intake", action: "view" },
]);
