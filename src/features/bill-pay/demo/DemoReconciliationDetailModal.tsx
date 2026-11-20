"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowLeftRight,
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
import { type DemoBankStatementLine, type DemoPayment, type DemoCompanyExpenseCardTx } from "./demo-data";
import { formatNgn } from "./demo-utils";
import { useBillPayDemoStore } from "./useBillPayDemoStore";

interface ReconciliationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankLine: DemoBankStatementLine | null;
  matchedPayment?: DemoPayment | null;
  matchedCardExpense?: DemoCompanyExpenseCardTx | null;
}

export function DemoReconciliationDetailModal({
  open,
  onOpenChange,
  bankLine,
  matchedPayment,
  matchedCardExpense,
}: ReconciliationModalProps) {
  const { reconcileBankLine } = useBillPayDemoStore();
  const [simulateMismatch, setSimulateMismatch] = useState(false);

  if (!bankLine) return null;

  const isReconciled = bankLine.status === "MATCHED" && !simulateMismatch;
  const targetLabel = matchedPayment
    ? `Bill Payment: ${matchedPayment.paymentRef}`
    : matchedCardExpense
    ? `Card Swipe: ${matchedCardExpense.merchant} (*${matchedCardExpense.cardLast4})`
    : "Unmatched Ledger Obligation";

  const targetAmount = matchedPayment
    ? matchedPayment.amount
    : matchedCardExpense
    ? matchedCardExpense.amount
    : 0;

  const amountDiff = Math.abs(bankLine.amount - targetAmount);
  const isExactAmount = amountDiff === 0 && !simulateMismatch;

  function handleReconcile() {
    if (matchedPayment) {
      reconcileBankLine(bankLine!.id, "ap_payment", matchedPayment.id);
      toast.success(`Statement line reconciled with ${matchedPayment.paymentRef}. Stage 2 GL Journal posted!`);
    } else if (matchedCardExpense) {
      reconcileBankLine(bankLine!.id, "card_expense", matchedCardExpense.id);
      toast.success(`Statement line reconciled with card expense ${matchedCardExpense.merchant}.`);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl rounded-2xl p-6">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#f0faf8] flex items-center justify-center text-[#087f70]">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[#10231d]">
                Bank Statement &amp; Ledger Reconciliation Match
              </DialogTitle>
              <DialogDescription className="text-xs text-[#68726d]">
                Algorithmic verification connecting bank feeds with internal disbursements.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Match Verdict Ribbon */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              simulateMismatch
                ? "bg-red-50 border-red-200 text-red-950"
                : isReconciled
                ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                : "bg-blue-50 border-blue-200 text-blue-950"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {simulateMismatch ? (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <div>
                <p className="font-bold text-xs">
                  {simulateMismatch
                    ? "Reconciliation Discrepancy: Amount Mismatch Detected"
                    : isReconciled
                    ? "Automated Match Confirmed: Reconciled & Cleared"
                    : "High-Confidence Proposed Match (Ready to Confirm)"}
                </p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {simulateMismatch
                    ? "Bank debit differs from internal voucher by ₦15,000. Under review."
                    : "Zenith Corporate API statement ref matches payment voucher hash 100%."}
                </p>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                simulateMismatch
                  ? "bg-red-100 text-red-900 border border-red-200"
                  : isReconciled
                  ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                  : "bg-blue-100 text-blue-900 border border-blue-200"
              }`}
            >
              {simulateMismatch ? "Match Failed" : isReconciled ? "Reconciled" : "99% Match"}
            </span>
          </div>

          {/* Two-Column Side-by-Side Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Left: Bank Statement Feed */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                1. Bank Statement Feed
              </span>
              <div className="space-y-1">
                <p className="font-bold text-[#10231d] text-xs">{bankLine.description}</p>
                <p className="text-[11px] text-[#68726d]">Channel: {bankLine.channel}</p>
                <p className="text-[11px] text-[#68726d]">Date: {bankLine.date}</p>
                <p className="text-sm font-bold text-[#10231d] font-mono mt-1">
                  {formatNgn(bankLine.amount)}
                </p>
              </div>
            </div>

            {/* Right: Internal Ledger Obligation */}
            <div className="p-3.5 rounded-xl bg-[#fbfcfb] border border-[#087f70]/30 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#087f70]">
                2. Internal AP / Expense Record
              </span>
              <div className="space-y-1">
                <p className="font-bold text-[#10231d] text-xs">{targetLabel}</p>
                <p className="text-[11px] text-[#68726d]">
                  Reference: {bankLine.reference}
                </p>
                <p className="text-[11px] text-[#68726d]">Ledger Account: 2000 AP / 2010 Card</p>
                <p className="text-sm font-bold text-[#087f70] font-mono mt-1">
                  {formatNgn(simulateMismatch ? targetAmount + 15000 : targetAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* 4-Point Match Algorithm Engine Details */}
          <div className="space-y-2 border-t border-gray-100 pt-3">
            <h4 className="text-xs font-bold text-[#10231d]">
              Algorithmic Matching Criteria &amp; Rules
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg border border-black/[0.05] bg-white flex items-center justify-between">
                <div>
                  <span className="text-gray-500 block">Exact Currency Amount</span>
                  <span className="font-semibold text-[#10231d]">
                    {isExactAmount ? "±₦0.00 exact match" : "₦15,000 Discrepancy"}
                  </span>
                </div>
                {isExactAmount ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
              </div>

              <div className="p-2.5 rounded-lg border border-black/[0.05] bg-white flex items-center justify-between">
                <div>
                  <span className="text-gray-500 block">Value Date Tolerance</span>
                  <span className="font-semibold text-[#10231d]">Within 24h settlement window</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="p-2.5 rounded-lg border border-black/[0.05] bg-white flex items-center justify-between">
                <div>
                  <span className="text-gray-500 block">Beneficiary Entity Fuzzy Match</span>
                  <span className="font-semibold text-[#10231d]">97% Levenshtein Confidence</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="p-2.5 rounded-lg border border-black/[0.05] bg-white flex items-center justify-between">
                <div>
                  <span className="text-gray-500 block">NIP Session / Gateway Hash</span>
                  <span className="font-semibold text-[#10231d]">Verified via Bank API</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* 2-Stage GL Impact Note */}
          <div className="p-3 rounded-xl bg-gray-50 border border-black/[0.06] space-y-1">
            <p className="font-bold text-[#10231d] text-xs">Stage 2 General Ledger Journal Impact:</p>
            <p className="text-[11px] font-mono text-[#68726d]">
              DR 1015 Cash in Transit &bull; CR 1010 Main Zenith Account ({formatNgn(bankLine.amount)})
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSimulateMismatch((p) => !p)}
            className="text-xs rounded-xl border-amber-300 text-amber-900 hover:bg-amber-50"
          >
            {simulateMismatch ? "Reset to Passed Match" : "Simulate Mismatch Exception"}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl"
            >
              Close
            </Button>
            {!isReconciled && !simulateMismatch && (
              <Button
                type="button"
                size="sm"
                onClick={handleReconcile}
                className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Reconciliation
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
