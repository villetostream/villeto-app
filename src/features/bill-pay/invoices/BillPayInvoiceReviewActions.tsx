"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import { getApiErrorMessage } from "@/lib/types/api-error";
import { InvoiceRejectDialog } from "./InvoiceRejectDialog";
import {
  useBillPayInvoiceReviewAction,
  type InvoiceReviewAction,
} from "./queries";

export function BillPayInvoiceReviewActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: string;
}) {
  const policies = useAuthorizationPolicies();
  const review = useBillPayInvoiceReviewAction();
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);

  const runAction = async (action: InvoiceReviewAction, reason?: string) => {
    if (review.isPending) return;
    try {
      await review.mutateAsync({ invoiceId, action, reason });
      setDecision(null);
      toast.success(
        action === "approve"
          ? "Invoice approved and posted."
          : "Invoice rejected.",
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Invoice action could not be completed."),
      );
    }
  };

  return (
    <>
      {(status === "submitted" || status === "under_review") &&
        policies.billPay.canApproveInvoice && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={review.isPending}
              onClick={() => setDecision("reject")}
            >
              Reject invoice
            </Button>
            <Button
              type="button"
              disabled={review.isPending}
              onClick={() => setDecision("approve")}
            >
              Approve invoice
            </Button>
          </>
        )}
      <ConfirmDialog
        open={decision === "approve"}
        onOpenChange={(open) => {
          if (!open && !review.isPending) setDecision(null);
        }}
        title="Approve invoice?"
        description="Approval posts the invoice to accounts payable and creates the obligation."
        confirmText="Approve invoice"
        onConfirm={() => void runAction("approve")}
      />
      {decision === "reject" && (
        <InvoiceRejectDialog
          open
          pending={review.isPending}
          onOpenChange={(open) => !open && setDecision(null)}
          onConfirm={(reason) => void runAction("reject", reason)}
        />
      )}
    </>
  );
}
