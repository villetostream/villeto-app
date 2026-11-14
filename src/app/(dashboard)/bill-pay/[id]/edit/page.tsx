"use client";

import { useParams } from "next/navigation";
import ManualBillForm from "@/features/bill-pay/intake/manual/ManualBillForm";
import withPermissions from "@/components/permissions/permission-protected-routes";

function EditBillPage() {
  const params = useParams();
  return <ManualBillForm invoiceId={params.id as string} />;
}

export default withPermissions(EditBillPage, [
  { resource: "bill_pay.invoice", action: "edit" },
]);
