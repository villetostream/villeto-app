"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
        <DialogContent className="sm:max-w-md rounded-[14px] border border-black/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold text-[#0b100e]">Reject Expense Report</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Expense Summary */}
            <div className="bg-[#fdf2f2] rounded-[10px] p-4 border border-[#fbd5d5]">
              <p className="text-[11px] font-medium text-[#84908a] mb-0.5">Report</p>
              <p className="text-[13px] font-semibold text-[#0b100e] mb-3">{expenseTitle}</p>
              <p className="text-[11px] font-medium text-[#84908a] mb-0.5">Total Amount</p>
              <p className="text-[22px] font-bold text-[#d33d44]">{expenseAmount}</p>
            </div>

            {/* Warning notice */}
            <div className="flex items-start gap-2.5 bg-[#fff9e6] border border-[#ffe099] rounded-[8px] px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-[#b27b00] mt-0.5 shrink-0" />
              <p className="text-[12px] text-[#b27b00] leading-relaxed">
                The submitter will be notified with your rejection reason. Make it clear and actionable so they know what to fix.
              </p>
            </div>

            {/* Rejection Reason textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-semibold text-[#0b100e]">Reason for Rejection</label>
                <span className={`text-[11px] ${trimmed.length < MIN_REASON_LENGTH ? "text-[#84908a]" : "text-[#087f70]"}`}>
                  {trimmed.length < MIN_REASON_LENGTH
                    ? `Min. ${MIN_REASON_LENGTH} characters`
                    : `${trimmed.length} characters`}
                </span>
              </div>
              <Textarea
                placeholder="Explain why this report is being rejected — be specific so the requester knows what to correct..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px] resize-none rounded-[8px] border-black/[0.08] text-[13px] placeholder:text-[#84908a] focus-visible:ring-[#d33d44] focus-visible:border-[#d33d44]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 h-10 rounded-[8px] border border-black/[0.08] text-[#68726d] font-semibold text-[13px] hover:bg-[#f9faf9] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isLoading || !isReasonValid}
                title={!isReasonValid ? `Please provide at least ${MIN_REASON_LENGTH} characters` : undefined}
                className="flex-1 h-10 rounded-[8px] bg-[#d33d44] text-white font-semibold text-[13px] hover:bg-[#c33339] transition-colors disabled:opacity-50 shadow-sm"
              >
                {isLoading ? "Rejecting..." : "Reject Report"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-white border border-black/[0.08] rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.10)] p-5 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-[#d33d44]/20 rounded-full animate-pulse" />
                <div className="relative flex items-center justify-center w-10 h-10 bg-[#d33d44] rounded-full">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[14px] text-[#0b100e]">Report Rejected</h3>
                <p className="text-[12px] text-[#68726d] mt-1 leading-relaxed">
                  The report has been rejected and the submitter has been notified with your reason.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
