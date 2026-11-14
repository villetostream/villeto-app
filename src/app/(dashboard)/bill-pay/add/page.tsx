"use client";

import ManualBillForm from "@/features/bill-pay/intake/manual/ManualBillForm";
import withPermissions from "@/components/permissions/permission-protected-routes";

function AddBillPage() {
  return <ManualBillForm />;
}

export default withPermissions(AddBillPage, [
  { resource: "bill_pay.invoice", action: "create" },
  { resource: "bill_pay.invoice", action: "view" },
  { resource: "bill_pay.intake", action: "create" },
  { resource: "bill_pay.intake", action: "view" },
]);
