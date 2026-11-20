"use client";

import { useState } from "react";
import { toast } from "sonner";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { DemoWorkspaceShell } from "@/features/bill-pay/demo/DemoWorkspaceShell";
import { DemoIntakeAndPortalTab } from "@/features/bill-pay/demo/DemoIntakeAndPortalTab";
import { useBillPayDemoStore } from "@/features/bill-pay/demo/useBillPayDemoStore";

function BillPayDemoIntakePage() {
  const { bills, intakes, resetDemo } = useBillPayDemoStore();
  const [selectedIntakeId, setSelectedIntakeId] = useState<string | null>(null);
  const [selectedPortalBillId, setSelectedPortalBillId] = useState<string | null>(null);

  const selectedIntake = intakes.find((i) => i.id === selectedIntakeId) || null;
  const selectedPortalBill = bills.find((b) => b.id === selectedPortalBillId) || null;
  const isDetailView = Boolean(selectedIntake || selectedPortalBill);

  const detailTitle = selectedIntake
    ? `Intake ${selectedIntake.invoiceNumber}`
    : selectedPortalBill
    ? `Vendor Portal: ${selectedPortalBill.invoiceNumber}`
    : undefined;

  function handleLoadSampleData() {
    resetDemo();
    toast.success("Sample bills, intake messages, and recurring schedules loaded");
  }

  return (
    <DemoWorkspaceShell
      activePage="intake"
      isDetailView={isDetailView}
      detailTitle={detailTitle}
      onBackFromDetail={() => {
        setSelectedIntakeId(null);
        setSelectedPortalBillId(null);
      }}
    >
      <DemoIntakeAndPortalTab
        onLoadSampleData={handleLoadSampleData}
        selectedIntakeId={selectedIntakeId}
        onSelectIntakeId={setSelectedIntakeId}
        selectedPortalBillId={selectedPortalBillId}
        onSelectPortalBillId={setSelectedPortalBillId}
      />
    </DemoWorkspaceShell>
  );
}

export default withPermissions(BillPayDemoIntakePage, [
  { resource: "bill_pay.invoice", action: "view" },
  { resource: "bill_pay.intake", action: "view" },
]);
