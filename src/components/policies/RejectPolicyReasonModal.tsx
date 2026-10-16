"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { XCircle, Loader2 } from "lucide-react";

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
      <DialogContent className="sm:max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-black/[0.08]">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#fdf2f2] border border-[#fbd5d5] flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 text-[#d33d44]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-[#0b100e]">{title}</DialogTitle>
              {entityName && (
                <p className="text-xs text-[#68726d] font-medium mt-0.5 line-clamp-1">{entityName}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        <p className="text-xs text-[#68726d] leading-relaxed -mt-1">
          {description}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#0b100e]">
                Rejection Reason <span className="text-[#d33d44]">*</span>
              </label>
              <span className="text-[11px] text-[#84908a]">
                {reason.trim().length} chars
              </span>
            </div>
            <Textarea
              rows={4}
              placeholder="e.g. Spend limit exceeds department budget allocation; please adjust the monthly limit..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              className="resize-none rounded-xl border-black/[0.12] text-xs leading-relaxed focus-visible:ring-[#d33d44] focus-visible:border-[#d33d44] placeholder:text-[#84908a]"
              autoFocus
            />
            <div className="flex justify-between items-center text-[11px] pt-0.5">
              <span className={isTooShort ? "text-[#d33d44] font-medium" : "text-[#84908a]"}>
                {isTooShort
                  ? `Minimum ${MIN_LENGTH} characters required (${MIN_LENGTH - reason.trim().length} more needed)`
                  : `Minimum ${MIN_LENGTH} characters required`}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="h-10 px-5 rounded-[9px] border-black/[0.12] text-xs font-semibold text-[#68726d] hover:bg-[#f9faf9]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isLoading}
              className="h-10 px-6 rounded-[9px] bg-[#d33d44] hover:bg-[#be3239] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
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
