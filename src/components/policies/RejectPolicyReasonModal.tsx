"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface RejectPolicyReasonModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
  title?: string;
  description?: string;
  entityName?: string;
}

export function RejectPolicyReasonModal({
  open,
  onClose,
  onConfirm,
  isLoading = false,
  title = "Reject Policy",
  description = "Please provide a reason for rejecting this policy. This will be visible to the creator and authorized reviewers.",
  entityName,
}: RejectPolicyReasonModalProps) {
  const [reason, setReason] = useState("");
  const MIN_LENGTH = 10;

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const isValid = reason.trim().length >= MIN_LENGTH;
  const isTooShort = reason.trim().length > 0 && reason.trim().length < MIN_LENGTH;

  const handleClose = () => {
    if (isLoading) return;
    setReason("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;
    onConfirm(reason.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[460px] rounded-3xl bg-white p-6 shadow-2xl border border-black/[0.08]">
        <DialogHeader className="space-y-1 pb-1">
          <DialogTitle className="text-[17px] font-bold text-[#0b100e] tracking-tight">
            {title}
          </DialogTitle>
          {entityName && (
            <p className="text-xs font-medium text-[#84908a] line-clamp-1">{entityName}</p>
          )}
        </DialogHeader>

        <p className="text-xs text-[#68726d] leading-relaxed -mt-1">
          {description}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#0b100e]">
                Rejection Reason <span className="text-[#d33d44]">*</span>
              </label>
              <span className="text-[11px] text-[#84908a]">
                {reason.trim().length} chars
              </span>
            </div>
            <textarea
              rows={4}
              placeholder="e.g. Spend limit exceeds department budget allocation; please adjust the monthly limit..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              className="w-full resize-none rounded-2xl border border-black/[0.1] bg-[#fafbfa] p-3.5 text-xs leading-relaxed text-[#0b100e] placeholder:text-[#84908a] outline-none transition-all focus:border-[#087f70] focus:bg-white focus:ring-2 focus:ring-[#087f70]/10 disabled:opacity-50"
            />
            <div className="flex justify-between items-center text-[11px] pt-0.5">
              <span className={isTooShort ? "text-[#c07a10] font-medium" : "text-[#84908a]"}>
                {isTooShort
                  ? `Minimum ${MIN_LENGTH} characters required (${MIN_LENGTH - reason.trim().length} more needed)`
                  : `Minimum ${MIN_LENGTH} characters required`}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-black/[0.06]">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="h-10 px-5 rounded-full border-black/[0.12] text-xs font-semibold text-[#68726d] hover:bg-[#f9faf9] transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isLoading}
              className="h-10 px-6 rounded-full bg-[#d33d44] hover:bg-[#be3239] text-white text-xs font-semibold shadow-sm transition-all disabled:bg-black/[0.07] disabled:text-black/35 disabled:shadow-none disabled:border-transparent disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Confirm Rejection"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
