"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { DemoWorkspaceShell } from "@/features/bill-pay/demo/DemoWorkspaceShell";
import { DemoPaymentsAndReconciliationTab } from "@/features/bill-pay/demo/DemoPaymentsAndReconciliationTab";
import { useBillPayDemoStore } from "@/features/bill-pay/demo/useBillPayDemoStore";

function PaymentsPageContent() {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const isReconTab = urlTab === "reconciliation";

  const { payments, resetDemo } = useBillPayDemoStore();
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const selectedPayment = payments.find((p) => p.id === selectedPaymentId) || null;

  function handleLoadSampleData() {
    resetDemo();
    toast.success("Sample bills, recurring schedules, and payments loaded");
  }

  return (
    <DemoWorkspaceShell
      activePage={isReconTab ? "reconciliation" : "payments"}
      isDetailView={!!selectedPayment}
      detailTitle={selectedPayment?.paymentRef}
      onBackFromDetail={() => setSelectedPaymentId(null)}
    >
      <DemoPaymentsAndReconciliationTab
        initialTab={isReconTab ? "reconciliation" : urlTab === "journals" ? "journals" : "payments"}
        selectedPaymentId={selectedPaymentId}
        onSelectPaymentId={setSelectedPaymentId}
        onLoadSampleData={handleLoadSampleData}
      />
    </DemoWorkspaceShell>
  );
}

function BillPayDemoPaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsPageContent />
    </Suspense>
  );
}

export default withPermissions(BillPayDemoPaymentsPage, [
  { resource: "bill_pay.invoice", action: "view" },
  { resource: "bill_pay.intake", action: "view" },
]);
