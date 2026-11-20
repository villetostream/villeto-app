"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { DemoWorkspaceShell } from "@/features/bill-pay/demo/DemoWorkspaceShell";
import { DemoCompanyExpensesCardTab } from "@/features/bill-pay/demo/DemoCompanyExpensesCardTab";
import { useBillPayDemoStore } from "@/features/bill-pay/demo/useBillPayDemoStore";

function BillPayDemoCompanyExpensesPage() {
  const router = useRouter();
  const { companyCardExpenses, resetDemo } = useBillPayDemoStore();
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);

  const selectedExpense =
    companyCardExpenses.find((e) => e.id === selectedExpenseId) || null;

  function handleLoadSampleData() {
    resetDemo();
    toast.success("Sample company card expenses loaded");
  }

  return (
    <DemoWorkspaceShell
      activePage="company_expenses"
      isDetailView={!!selectedExpense}
      detailTitle={selectedExpense ? `${selectedExpense.merchant} (${selectedExpense.cardLast4})` : undefined}
      onBackFromDetail={() => setSelectedExpenseId(null)}
    >
      <DemoCompanyExpensesCardTab
        selectedExpenseId={selectedExpenseId}
        onSelectExpenseId={setSelectedExpenseId}
        onJumpToReconciliation={() => router.push("/bill-pay/demo/payments")}
        onLoadSampleData={handleLoadSampleData}
      />
    </DemoWorkspaceShell>
  );
}

export default withPermissions(BillPayDemoCompanyExpensesPage, [
  { resource: "bill_pay.invoice", action: "view" },
  { resource: "bill_pay.intake", action: "view" },
]);
