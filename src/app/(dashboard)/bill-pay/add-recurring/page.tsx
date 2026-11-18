"use client";

import { useRouter } from "next/navigation";
import { RecurringBillForm } from "@/components/bill-pay/RecurringBillForm";
import withPermissions from "@/components/permissions/permission-protected-routes";

function AddRecurringBillPage() {
  const router = useRouter();
  return <div className="mx-auto max-w-[620px] space-y-8 pb-8">
    <RecurringBillForm onSaved={(id) => router.push(`/bill-pay/recurring/${id}`)}
      onCardSaved={(id) => router.push(`/bill-pay/recurring-card-subscriptions/${id}`)}
      onCancel={() => router.push("/bill-pay")} />
  </div>;
}

export default withPermissions(AddRecurringBillPage, [
  { resource: "bill_pay.invoice", action: "create" },
]);
