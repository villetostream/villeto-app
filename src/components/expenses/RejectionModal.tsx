"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";

const MIN_REASON_LENGTH = 10;

interface RejectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReject: (reason: string) => void;
  expenseTitle: string;
  expenseAmount: string;
}

export function RejectionModal({
  open,
  onOpenChange,
  onReject,
  expenseTitle,
  expenseAmount,
}: RejectionModalProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const trimmed = rejectionReason.trim();
  const isReasonValid = trimmed.length >= MIN_REASON_LENGTH;

  const handleReject = async () => {
    if (!isReasonValid) return;
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    onReject(trimmed);

    setShowSuccessToast(true);
    setTimeout(() => {
      handleClose();
    }, 12000);
  };

  const handleClose = () => {
    setRejectionReason("");
    setShowSuccessToast(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && !showSuccessToast} onOpenChange={handleClose}>
        {/* rounded-2xl matches the app's modal design language */}
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Reject Expense Report</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Expense Summary */}
            <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/10">
              <p className="text-xs text-muted-foreground mb-0.5">Report</p>
              <p className="text-sm font-semibold text-foreground mb-3">{expenseTitle}</p>
              <p className="text-xs text-muted-foreground mb-0.5">Total Amount</p>
              <p className="text-2xl font-bold text-destructive">{expenseAmount}</p>
            </div>

            {/* Warning notice */}
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">
                The submitter will be notified with your rejection reason. Make
                it clear and actionable so they know what to fix.
              </p>
            </div>

            {/* Rejection Reason textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Reason for Rejection
                </label>
                <span className={`text-xs ${trimmed.length < MIN_REASON_LENGTH ? "text-muted-foreground" : "text-emerald-600"}`}>
                  {trimmed.length < MIN_REASON_LENGTH
                    ? `Min. ${MIN_REASON_LENGTH} characters`
                    : `${trimmed.length} characters`}
                </span>
              </div>
              <Textarea
                placeholder="Explain why this report is being rejected — be specific so the requester knows what to correct..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[120px] resize-none rounded-xl"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1 rounded-xl"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                className="flex-1 bg-destructive hover:bg-destructive/90 rounded-xl"
                disabled={isLoading || !isReasonValid}
                title={!isReasonValid ? `Please provide at least ${MIN_REASON_LENGTH} characters` : undefined}
              >
                {isLoading ? "Rejecting..." : "Reject Report"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-5 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-destructive/20 rounded-full animate-pulse" />
                <div className="relative flex items-center justify-center w-10 h-10 bg-destructive rounded-full">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-foreground">Report Rejected</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  The report has been rejected and the submitter has been notified
                  with your reason.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
