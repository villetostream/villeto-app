"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import withPermissions from "@/components/permissions/permission-protected-routes";
function VendorTransactionsPage() {
  const { vendorId } = useParams() as { vendorId: string };
  return (
    <div className="space-y-4">
      <Link href={`/vendors/${vendorId}`} className="underline">
        Back to vendor
      </Link>
      <h1 className="text-xl font-semibold">Vendor activity</h1>
      <p>
        Purchase orders, invoices and payments are managed within their
        legal-entity workspaces. Select an authorized entity, then open
        Procurement or Bill Pay to review its records.
      </p>
      <Link className="inline-block rounded border px-4 py-2" href="/bill-pay">
        Open Bill Pay
      </Link>
    </div>
  );
}
export default withPermissions(VendorTransactionsPage, [
  { resource: "vendor.directory", action: "read" },
]);
