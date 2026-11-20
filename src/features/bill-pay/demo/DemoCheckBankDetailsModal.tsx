"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Landmark,
  CheckCircle2,
  ShieldCheck,
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
import { type DemoPayment } from "./demo-data";
import { formatNgn } from "./demo-utils";
import { useBillPayDemoStore } from "./useBillPayDemoStore";

interface CheckBankDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: DemoPayment | null;
  onSettled?: () => void;
}

export function DemoCheckBankDetailsModal({
  open,
  onOpenChange,
  payment,
  onSettled,
}: CheckBankDetailsModalProps) {
  const { queryProviderStatus, vendors } = useBillPayDemoStore();
  const [isQuerying, setIsQuerying] = useState(false);

  if (!payment) return null;

  const vendor = vendors.find((v) => v.id === payment.vendorId);
  const destBank = vendor?.verifiedBankName || "Providus Bank";
  const destAccount = vendor?.verifiedAccountNumber || "5400192837";
  const billRef =
    payment.allocations[0]?.invoiceNumber ||
    payment.allocations[0]?.billNumber ||
    "BILL-2026-966";

  function handleConfirmSettlement() {
    setIsQuerying(true);
    setTimeout(() => {
      queryProviderStatus(payment!.id, "COMPLETED");
      setIsQuerying(false);
      toast.success(
        `NIBSS Instant Payment settled! Payment ${payment!.paymentRef} marked Completed and Stage 2 GL posted.`,
      );
      onOpenChange(false);
      if (onSettled) onSettled();
    }, 600);
  }

  function handleSimulateReversal() {
    setIsQuerying(true);
    setTimeout(() => {
      queryProviderStatus(payment!.id, "FAILED");
      setIsQuerying(false);
      toast.error(
        `Payment ${payment!.paymentRef} returned failure (NIP 91: Destination Bank Unavailable). Bill restored to payable queue.`,
      );
      onOpenChange(false);
      if (onSettled) onSettled();
    }, 600);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl rounded-2xl p-6">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#f0faf8] flex items-center justify-center text-[#087f70]">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[#10231d]">
                NIP Banking Gateway Status &amp; Settlement Check
              </DialogTitle>
              <DialogDescription className="text-xs text-[#68726d]">
                Real-time NIBSS / Bank API inquiry for payment {payment.paymentRef}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Status Overview Card */}
          <div className="p-4 rounded-xl bg-gray-50 border border-black/[0.06] flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-[#68726d]">Beneficiary &amp; Bill</p>
              <p className="text-sm font-bold text-[#10231d]">{payment.vendorName}</p>
              <p className="text-[11px] text-[#68726d]">Bill Ref: {billRef}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[#68726d]">Transfer Amount</p>
              <p className="text-sm font-bold text-[#087f70]">{formatNgn(payment.amount)}</p>
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-0.5 ${
                  payment.status === "COMPLETED"
                    ? "bg-emerald-100 text-emerald-900"
                    : payment.status === "FAILED"
                    ? "bg-red-100 text-red-900"
                    : "bg-amber-100 text-amber-900"
                }`}
              >
                {payment.status === "COMPLETED"
                  ? "Settled with Bank"
                  : payment.status === "FAILED"
                  ? "Transfer Failed"
                  : "Awaiting Bank Settlement"}
              </span>
            </div>
          </div>

          {/* Account Details Side-by-Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white border border-gray-200 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Source Debit Account
              </p>
              <p className="font-bold text-[#10231d]">{payment.fundingAccount}</p>
              <p className="text-[11px] text-[#68726d]">Available Balance: ₦42,500,000</p>
            </div>

            <div className="p-3 rounded-xl bg-white border border-gray-200 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Beneficiary Credit Account
              </p>
              <p className="font-bold text-[#10231d]">{destBank}</p>
              <p className="text-xs font-mono text-[#087f70] font-bold">{destAccount}</p>
              <p className="text-[11px] text-gray-500">{payment.vendorName}</p>
            </div>
          </div>

          {/* Gateway Status Verification */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> NIBSS Central Switch Response
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-200/50 px-2 py-0.5 rounded">
                Code 00: Approved
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-emerald-900 pt-1">
              <div>
                <span className="text-emerald-700/80 block">Gateway Session ID:</span>
                <span className="font-mono font-semibold">9990261119001284920</span>
              </div>
              <div>
                <span className="text-emerald-700/80 block">NIP Transfer Fee:</span>
                <span className="font-semibold">₦53.75</span>
              </div>
              <div>
                <span className="text-emerald-700/80 block">Value Date:</span>
                <span className="font-semibold">{payment.scheduledDate}</span>
              </div>
            </div>
          </div>

          {/* 2-Stage GL Accounting Explanation */}
          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/80 text-blue-950 space-y-2">
            <p className="text-xs font-bold text-blue-900">
              Enterprise 2-Stage GL Accounting Protocol
            </p>
            <div className="space-y-1 text-[11px] font-mono">
              <p className="text-blue-900">
                <strong>Stage 1 (At Release):</strong> DR 2000 Accounts Payable &bull; CR 1015 Cash in Transit ({formatNgn(payment.amount)})
              </p>
              <p className="text-blue-800">
                <strong>Stage 2 (Bank Confirmed):</strong> DR 1015 Cash in Transit &bull; CR 1010 Main Zenith Account ({formatNgn(payment.amount)})
              </p>
            </div>
            <p className="text-[10px] text-blue-700 font-sans">
              Ensures your General Ledger accounts never assume cash has left the bank until the NIBSS central switch confirms final settlement.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isQuerying}
            onClick={handleSimulateReversal}
            className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold"
          >
            Simulate Gateway Failure / Reversal
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Close
            </Button>
            {payment.status !== "COMPLETED" && (
              <Button
                type="button"
                disabled={isQuerying}
                onClick={handleConfirmSettlement}
                className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isQuerying ? "Querying Bank…" : "Confirm Settlement & Mark Paid"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
