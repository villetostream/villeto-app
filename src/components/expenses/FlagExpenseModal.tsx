"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Flag } from "lucide-react";

interface FlagExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFlag: (reason: string) => void;
  expenseTitle: string;
  expenseAmount: string;
}

export function FlagExpenseModal({
  open,
  onOpenChange,
  onFlag,
  expenseTitle,
  expenseAmount,
}: FlagExpenseModalProps) {
  const [flagReason, setFlagReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleFlag = async () => {
    if (!flagReason.trim()) {
      alert("Please provide a reason for flagging");
      return;
    }
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    onFlag(flagReason);
    setShowSuccessToast(true);
    setTimeout(() => {
      handleClose();
    }, 4000);
  };

  const handleClose = () => {
    setFlagReason("");
    setShowSuccessToast(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && !showSuccessToast} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md rounded-[14px] border border-black/[0.08]">
          <>
            <DialogHeader>
              <DialogTitle className="text-[18px] font-bold text-[#0b100e]">Flag Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              {/* Expense Summary */}
              <div className="bg-[#fff9e6] rounded-[10px] p-4 border border-[#ffe099]">
                <p className="text-[11px] font-medium text-[#84908a] mb-0.5">Expense Title</p>
                <p className="text-[13px] font-semibold text-[#0b100e] mb-3">{expenseTitle}</p>
                <p className="text-[11px] font-medium text-[#84908a] mb-0.5">Amount</p>
                <p className="text-[22px] font-bold text-[#b27b00]">{expenseAmount}</p>
              </div>

              {/* Flag Message */}
              <div className="flex items-start gap-2.5">
                <Flag className="w-4 h-4 text-[#b27b00] mt-0.5 shrink-0" />
                <p className="text-[13px] text-[#68726d]">
                  You are flagging this expense for further attention. Please provide a clear reason.
                </p>
              </div>

              {/* Flag Reason */}
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#0b100e]">Reason for Flagging</label>
                <Textarea
                  placeholder="Explain why this expense is being flagged..."
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  className="min-h-[100px] resize-none rounded-[8px] border-black/[0.08] text-[13px] placeholder:text-[#84908a] focus-visible:ring-[#b27b00] focus-visible:border-[#b27b00]"
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
                  onClick={handleFlag}
                  disabled={isLoading}
                  className="flex-1 h-10 rounded-[8px] bg-[#b27b00] text-white font-semibold text-[13px] hover:bg-[#966800] transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isLoading ? "Processing..." : "Flag Issue"}
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
                <div className="absolute inset-0 bg-[#b27b00]/20 rounded-full animate-pulse"></div>
                <div className="relative flex items-center justify-center w-10 h-10 bg-[#b27b00] rounded-full">
                  <Flag className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[14px] text-[#0b100e]">Expense Flagged</h3>
                <p className="text-[12px] text-[#68726d] mt-1">
                  The expense has been flagged for further review.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
