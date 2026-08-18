"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BillPayTabs } from "@/components/bill-pay/BillPayTabs";
import { Receipt2, ClipboardText, Cards, TickCircle } from "iconsax-reactjs";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import { ConfigureEmailModal } from "@/components/bill-pay/ConfigureEmailModal";
import { StatsCard } from "@/components/dashboard/landing/StatCard";
import withPermissions from "@/components/permissions/permission-protected-routes";

function BillPayPage() {
  const router = useRouter();
  const setAction = useHeaderActionStore((state) => state.setAction);
  const [showConfigureEmail, setShowConfigureEmail] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("billPayActiveTab") || "recurring";
    }
    return "recurring";
  });

  useEffect(() => {
    sessionStorage.setItem("billPayActiveTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    setAction({
      label: "New Bill",
      items: [
        {
          label: "Add a Bill",
          description: "Upload or enter a bill",
          onClick: () => router.push("/bill-pay/add"),
        },
        {
          label: "Set Up Recurring Bill",
          description: "Automate regular bills",
          onClick: () => router.push("/bill-pay/add-recurring"),
        },
      ],
      ...(activeTab === "other" && {
        secondaryAction: {
          label: "Configure Email",
          onClick: () => setShowConfigureEmail(true),
        },
      }),
    });
  }, [router, setAction, activeTab]);

  return (
    <div className="flex flex-col h-full pb-2">
      <div className="space-y-6 flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 shrink-0">
          <StatsCard
            title="Total Bills This Month"
            value="₦12,850,000"
            subtitle={<span className="text-[11px] text-emerald-500 font-medium">+2.5% from last period</span>}
            icon={<Receipt2 variant="Bulk" className="w-5 h-5 text-emerald-500" />}
            accentColor="#10b981"
          />
          <StatsCard
            title="Pending Approvals"
            value="7"
            subtitle={<span className="text-[11px] text-[#68726d]">Review pending bills</span>}
            icon={<ClipboardText variant="Bulk" className="w-5 h-5 text-amber-500" />}
            accentColor="#f59e0b"
          />
          <StatsCard
            title="Ready for Payment"
            value="4"
            subtitle={<span className="text-[11px] text-[#68726d]">Release payments</span>}
            icon={<Cards variant="Bulk" className="w-5 h-5 text-blue-500" />}
            accentColor="#3b82f6"
          />
          <StatsCard
            title="Completed This Month"
            value="23"
            subtitle={<span className="text-[11px] text-[#68726d]">View completed transactions</span>}
            icon={<TickCircle variant="Bulk" className="w-5 h-5 text-emerald-500" />}
            accentColor="#10b981"
          />
        </div>

        {/* Tabs Section */}
        <BillPayTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <ConfigureEmailModal open={showConfigureEmail} onOpenChange={setShowConfigureEmail} />
      </div>
    </div>
  );
}

export default withPermissions(BillPayPage, [
  { resource: "bill_pay.invoice", action: "view" },
  { resource: "bill_pay.intake", action: "view" },
]);
