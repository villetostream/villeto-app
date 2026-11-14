"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

export function InvoiceRejectDialog({
  open,
  pending,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => !pending && onOpenChange(value)}
    >
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Reject invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            Give a reason so the submitter knows what to correct.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label
          htmlFor="invoice-rejection-reason"
          className="text-sm font-medium"
        >
          Reason for rejection <span aria-hidden="true">*</span>
        </label>
        <Textarea
          id="invoice-rejection-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="Explain what needs to be corrected"
          aria-required="true"
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending || !reason.trim()}
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={(event) => {
              event.preventDefault();
              onConfirm(reason.trim());
            }}
          >
            {pending ? "Rejecting…" : "Reject invoice"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
