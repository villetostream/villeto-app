"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBillPayDemoStore } from "./useBillPayDemoStore";

interface VerifyBankModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId?: string;
  vendorName?: string;
  onApproved?: () => void;
}

export function DemoBankVerificationModal({
  open,
  onOpenChange,
  vendorId = "vnd_dell",
  vendorName = "Dell Supplies Nigeria",
  onApproved,
}: VerifyBankModalProps) {
  const { approveVendorBankChange } = useBillPayDemoStore();

  const [callbackConfirmed, setCallbackConfirmed] = useState(true);
  const [docVerified, setDocVerified] = useState(true);
  const [secondApprover, setSecondApprover] = useState("cfo_adebayo");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleConfirmApproval() {
    setIsSubmitting(true);
    setTimeout(() => {
      approveVendorBankChange(vendorId);
      setIsSubmitting(false);
      toast.success(
        `Dual-Control Verified: ${vendorName}'s bank account updated to Providus Bank. Payouts unpaused!`,
      );
      onOpenChange(false);
      if (onApproved) onApproved();
    }, 600);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl rounded-2xl p-6">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[#10231d]">
                Verify &amp; Approve Vendor Bank Change
              </DialogTitle>
              <DialogDescription className="text-xs text-[#68726d]">
                Dual-control security protocol to prevent unauthorized account diversion (BEC fraud).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Vendor Banner */}
          <div className="p-3 rounded-xl bg-gray-50 border border-black/[0.06] flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#68726d]">Vendor Entity</p>
              <p className="font-bold text-[#10231d] text-sm">{vendorName}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
              Payouts Currently Paused
            </span>
          </div>

          {/* Account Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Old Account */}
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Current Verified Account
              </p>
              <div className="space-y-0.5">
                <p className="font-bold text-gray-700">Access Bank PLC</p>
                <p className="text-xs text-gray-600 font-mono">0094827165</p>
                <p className="text-[11px] text-gray-500">Dell Supplies Nig Ltd</p>
              </div>
              <span className="inline-block text-[10px] font-semibold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                To Be Deprecated
              </span>
            </div>

            {/* New Requested Account */}
            <div className="p-3 rounded-xl bg-[#f0faf8] border border-[#087f70]/30 space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#087f70]">
                Requested New Account
              </p>
              <div className="space-y-0.5">
                <p className="font-bold text-[#10231d]">Providus Bank</p>
                <p className="text-xs text-[#087f70] font-mono font-bold">5400192837</p>
                <p className="text-[11px] text-[#10231d] font-medium">Dell Supplies Nigeria Ltd</p>
              </div>
              <span className="inline-block text-[10px] font-semibold text-[#087f70] bg-white border border-[#c8ece4] px-2 py-0.5 rounded">
                Pending 2nd Sign-Off
              </span>
            </div>
          </div>

          {/* Real-time Central Bank NUBAN check */}
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-950">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-xs text-emerald-900">
                  CBN / NIBSS NUBAN Automated Inquiry: 100% Match
                </p>
                <p className="text-[11px] text-emerald-800">
                  Account Name returned: <strong>DELL SUPPLIES NIGERIA LTD</strong> (RC: 1049281)
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded">
              Verified
            </span>
          </div>

          {/* Verification Protocol Checklist */}
          <div className="space-y-2.5 border-t border-gray-100 pt-3">
            <p className="text-xs font-bold text-[#10231d]">Mandatory Dual-Control Checklist</p>
            <div className="space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <Checkbox
                  checked={callbackConfirmed}
                  onCheckedChange={(checked) => setCallbackConfirmed(Boolean(checked))}
                  className="mt-0.5 h-4.5 w-4.5 rounded-md border-gray-300 data-[state=checked]:!bg-[#087f70] data-[state=checked]:!border-[#087f70] data-[state=checked]:!text-white shadow-none transition-colors"
                />
                <span className="text-xs text-[#68726d]">
                  <strong className="text-[#10231d]">Independent Callback:</strong> Spoke with Vendor CFO (Mr. Babatunde) at verified company headquarters line to confirm bank switch.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <Checkbox
                  checked={docVerified}
                  onCheckedChange={(checked) => setDocVerified(Boolean(checked))}
                  className="mt-0.5 h-4.5 w-4.5 rounded-md border-gray-300 data-[state=checked]:!bg-[#087f70] data-[state=checked]:!border-[#087f70] data-[state=checked]:!text-white shadow-none transition-colors"
                />
                <span className="text-xs text-[#68726d]">
                  <strong className="text-[#10231d]">Document Verification:</strong> Attached stamped bank reference letter dated Nov 2026 matches account name and number.
                </span>
              </label>
            </div>
          </div>

          {/* Dual Sign-off Approver Select */}
          <div className="space-y-1.5 border-t border-gray-100 pt-3">
            <label className="text-xs font-semibold text-[#10231d]">
              Dual-Control 2nd Reviewer Sign-off:
            </label>
            <Select value={secondApprover} onValueChange={setSecondApprover}>
              <SelectTrigger className="h-9 w-full rounded-xl border-gray-200 text-xs bg-white text-[#10231d]">
                <SelectValue placeholder="Select 2nd reviewer" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="cfo_adebayo" className="text-xs">
                  Adebayo Okonjo (Chief Financial Officer)
                </SelectItem>
                <SelectItem value="treasury_lead" className="text-xs">
                  Chioma Eze (Head of Corporate Treasury)
                </SelectItem>
                <SelectItem value="internal_audit" className="text-xs">
                  Ibrahim Musa (Internal Audit &amp; Controls)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-[#68726d]">
              1st Reviewer: <strong>Sodiq Atiku (Owner)</strong> &bull; Requires 2nd executive signature before payouts unlock.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!callbackConfirmed || !docVerified || isSubmitting}
            onClick={handleConfirmApproval}
            className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold"
          >
            {isSubmitting ? "Approving…" : "Approve Bank Change & Unfreeze Payouts"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
