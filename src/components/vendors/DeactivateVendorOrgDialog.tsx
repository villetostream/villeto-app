"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useVendorStatusUpdate } from "@/queries/vendors/vendor-network";
import { getApiErrorMessage } from "@/lib/types/api-error";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface DeactivateVendorOrgDialogProps {
  open: boolean;
  onClose: () => void;
  vendorName: string;
  vendorId: string;
  organizationWide?: boolean;
  legalEntityId?: string | null;
  onDeactivated?: () => void;
}

export function DeactivateVendorOrgDialog({
  open,
  onClose,
  vendorName,
  vendorId,
  organizationWide = false,
  legalEntityId = null,
  onDeactivated,
}: DeactivateVendorOrgDialogProps) {
  const [reason, setReason] = useState("");
  const statusMutation = useVendorStatusUpdate(vendorId);

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const handleDeactivate = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for deactivation.");
      return;
    }

    try {
      await statusMutation.mutateAsync({
        status: "Inactive",
        reason: reason.trim(),
        legalEntityId,
        organizationWide,
      });
      toast.success(
        organizationWide
          ? `${vendorName} has been deactivated across the entire company.`
          : `${vendorName} relationship has been deactivated.`,
      );
      onDeactivated?.();
      onClose();
    } catch (err) {
      logger.error("Failed to deactivate vendor:", err);
      toast.error(
        getApiErrorMessage(err, "Failed to deactivate vendor. Please try again."),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-[480px] p-6 sm:p-7 rounded-[18px] bg-white border border-black/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-[20px] font-bold text-[#0b100e]">
            {organizationWide
              ? "Deactivate vendor organization-wide?"
              : "Deactivate vendor relationship?"}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[#68726d] leading-relaxed">
            {organizationWide ? (
              <>
                This will deactivate{" "}
                <span className="font-semibold text-[#0b100e]">{vendorName}</span>{" "}
                across your entire company, affecting all Legal Entities connected
                to this vendor.
              </>
            ) : (
              <>
                This will deactivate your relationship with{" "}
                <span className="font-semibold text-[#0b100e]">{vendorName}</span>{" "}
                for the active legal entity.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="deactivate-vendor-reason"
              className="text-[13px] font-medium text-[#0b100e] block"
            >
              Reason for Deactivation{" "}
              <span className="text-[#84908a] font-normal">(Required)</span>
            </label>
            <textarea
              id="deactivate-vendor-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Our business is done"
              className="w-full p-3.5 rounded-[8px] border border-black/[0.12] bg-white text-[13px] text-[#0b100e] placeholder:text-[#84908a] focus:outline-none focus:border-[#d33d44] transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={statusMutation.isPending}
              className="h-10 px-6 rounded-[8px] border border-black/[0.15] bg-white text-[13px] font-semibold text-[#0b100e] hover:bg-[#f5f7f6] transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={!reason.trim() || statusMutation.isPending}
              className="h-10 px-6 rounded-[8px] bg-[#d33d44] hover:bg-[#be2f36] text-white text-[13px] font-semibold transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {statusMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deactivating...
                </>
              ) : (
                "Deactivate Vendor"
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
