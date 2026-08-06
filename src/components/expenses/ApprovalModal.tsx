"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle } from "lucide-react";

interface ApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (note: string) => void;
  expenseTitle: string;
  expenseAmount: string;
}

export function ApprovalModal({
  open,
  onOpenChange,
  onApprove,
  expenseTitle,
  expenseAmount,
}: ApprovalModalProps) {
  const [approvalNote, setApprovalNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    onApprove(approvalNote);
    setShowSuccessToast(true);
    setTimeout(() => {
      handleClose();
    }, 12000);
  };

  const handleClose = () => {
    setApprovalNote("");
    setShowSuccessToast(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && !showSuccessToast} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md rounded-[14px] border border-black/[0.08]">
          <>
            <DialogHeader>
              <DialogTitle className="text-[18px] font-bold text-[#0b100e]">Approve Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              {/* Expense Summary */}
              <div className="bg-[#f0faf8] rounded-[10px] p-4 border border-[#e7f6f2]">
                <p className="text-[11px] font-medium text-[#84908a] mb-0.5">Expense Title</p>
                <p className="text-[13px] font-semibold text-[#0b100e] mb-3">{expenseTitle}</p>
                <p className="text-[11px] font-medium text-[#84908a] mb-0.5">Amount to Approve</p>
                <p className="text-[22px] font-bold text-[#087f70]">{expenseAmount}</p>
              </div>

              {/* Approval Message */}
              <p className="text-[13px] text-[#68726d] leading-relaxed">
                You are about to approve this expense. Once approved, it will move to the next stage of processing or payment.
              </p>

              {/* Approval Note */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-[#0b100e]">Add Approval Note</label>
                  <span className="text-[11px] text-[#84908a]">(optional)</span>
                </div>
                <Textarea
                  placeholder="Write your approval note here...."
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  className="min-h-[100px] resize-none rounded-[8px] border-black/[0.08] text-[13px] placeholder:text-[#84908a] focus-visible:ring-[#087f70] focus-visible:border-[#087f70]"
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
                  onClick={handleApprove}
                  disabled={isLoading}
                  className="flex-1 h-10 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isLoading ? "Processing..." : "Approve"}
                </button>
              </div>
            </div>
          </>
        </DialogContent>
      </Dialog>

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-white border border-black/[0.08] rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.10)] p-5 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-[#087f70]/20 rounded-full animate-pulse"></div>
                <div className="relative flex items-center justify-center w-10 h-10 bg-[#087f70] rounded-full">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[14px] text-[#0b100e]">Expense Approved Successfully</h3>
                <p className="text-[12px] text-[#68726d] mt-1 leading-relaxed">
                  The expense has been approved and the requester has been notified.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
