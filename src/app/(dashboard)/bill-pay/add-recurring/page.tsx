"use client";

import { useRouter } from "next/navigation";
import { RecurringBillForm } from "@/components/bill-pay/RecurringBillForm";
import withPermissions from "@/components/permissions/permission-protected-routes";

function AddRecurringBillPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#10231d]">Set Up Recurring Bill</h1>
        <p className="mt-1 text-xs text-[#68726d]">
          Set up scheduled vendor invoices or company card subscriptions to track expected expenses and review variances.
        </p>
      </div>

      {/* Form */}
      <RecurringBillForm
        onSaved={(id) => router.push(`/bill-pay/recurring/${id}`)}
        onCardSaved={(id) => router.push(`/bill-pay/recurring-card-subscriptions/${id}`)}
        onCancel={() => router.push("/bill-pay")}
      />
    </div>
  );
}

export default withPermissions(AddRecurringBillPage, [
  { resource: "bill_pay.invoice", action: "create" },
]);
