"use client";

import withPermissions from "@/components/permissions/permission-protected-routes";
import { DemoWorkspaceShell } from "@/features/bill-pay/demo/DemoWorkspaceShell";
import { DemoVendorDirectoryTab } from "@/features/bill-pay/demo/DemoVendorDirectoryTab";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";

function BillPayDemoVendorsPage() {
  const isDetailView = useHeaderBackStore((s) => Boolean(s.handler));

  return (
    <DemoWorkspaceShell activePage="vendors" isDetailView={isDetailView}>
      <DemoVendorDirectoryTab />
    </DemoWorkspaceShell>
  );
}

export default withPermissions(BillPayDemoVendorsPage, [
  { resource: "bill_pay.invoice", action: "view" },
]);
