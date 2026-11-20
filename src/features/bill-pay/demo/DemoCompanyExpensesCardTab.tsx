"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  Paperclip,
  Plus,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBillPayDemoStore } from "./useBillPayDemoStore";
import { type DemoCompanyExpenseCardTx } from "./demo-data";
import { formatNgn, mapDemoBadgeStatus } from "./demo-utils";

export function DemoCompanyExpensesCardTab({
  onJumpToReconciliation,
  onLoadSampleData,
  selectedExpenseId: externalSelectedExpenseId,
  onSelectExpenseId: externalOnSelectExpenseId,
}: {
  onJumpToReconciliation: () => void;
  onLoadSampleData?: () => void;
  selectedExpenseId?: string | null;
  onSelectExpenseId?: (id: string | null) => void;
}) {
  const {
    companyCardExpenses,
    simulateEmployeeCardSwipe,
    attachCardExpenseReceipt,
    approveCompanyCardExpense,
    settlePendingCardExpense,
    disputeCardExpense,
  } = useBillPayDemoStore();

  const [showSwipeModal, setShowSwipeModal] = useState(false);
  const [merchant, setMerchant] = useState("Figma");
  const [description, setDescription] = useState("Design Team Seat License");
  const [cardOwner, setCardOwner] = useState("Kemi Adeyemi (Product Designer)");
  const [amount, setAmount] = useState("80000");
  const [category, setCategory] = useState("Software & SaaS");
  const [withReceipt, setWithReceipt] = useState(false);

  // Clearing & Dispute modal states
  const [isClearing, setIsClearing] = useState(false);
  const [fxVariance, setFxVariance] = useState("0");
  const [bankFee, setBankFee] = useState("0");

  const [isDisputing, setIsDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState("Unrecognized charge / duplicate merchant billing");

  const [internalInspectTxId, setInternalInspectTxId] = useState<string | null>(null);

  const inspectTxId =
    externalSelectedExpenseId !== undefined
      ? externalSelectedExpenseId
      : internalInspectTxId;

  const setInspectTxId = useCallback((id: string | null) => {
    if (externalOnSelectExpenseId) externalOnSelectExpenseId(id);
    setInternalInspectTxId(id);
  }, [externalOnSelectExpenseId]);
  const inspectTx: DemoCompanyExpenseCardTx | null =
    companyCardExpenses.find((t) => t.id === inspectTxId) || null;

  function handleClear() {
    if (!inspectTx) return;
    const res = settlePendingCardExpense(inspectTx.id, {
      fxVariance: Number(fxVariance) || 0,
      bankFee: Number(bankFee) || 0,
    });
    if (res.ok) {
      toast.success(res.message);
      setIsClearing(false);
    } else {
      toast.error(res.message);
    }
  }

  function handleDispute() {
    if (!inspectTx) return;
    const res = disputeCardExpense(inspectTx.id, disputeReason);
    if (res.ok) {
      toast.success(res.message);
      setIsDisputing(false);
    } else {
      toast.error(res.message);
    }
  }

  useEffect(() => {
    if (inspectTxId) {
      useHeaderBackStore.getState().setBackHandler(() => {
        setInspectTxId(null);
      }, "Company Expenses");
      return () => {
        useHeaderBackStore.getState().clearBackHandler();
      };
    } else {
      useHeaderBackStore.getState().clearBackHandler();
    }
  }, [inspectTxId, setInspectTxId]);

  function handleRecordSwipe() {
    const amt = Number(amount);
    if (!merchant.trim() || Number.isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid merchant and amount.");
      return;
    }
    const msg = simulateEmployeeCardSwipe({
      merchant: merchant.trim(),
      description: description.trim(),
      cardOwner: cardOwner.trim(),
      cardLast4: "4821",
      department: "Engineering & Design",
      category,
      amount: amt,
      receiptAttached: withReceipt,
    });
    if (msg.includes("VIOLATION") || msg.includes("FLAGGED")) {
      toast.warning(msg);
    } else {
      toast.success(msg);
    }
    setShowSwipeModal(false);
  }

  if (inspectTx) {
    const stateBadge = mapDemoBadgeStatus(inspectTx.workflowState);
    const policyBadge = mapDemoBadgeStatus(inspectTx.policyEvaluation.status);

    return (
      <div className="space-y-6">
        {/* Top Navigation & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-[#10231d]">
                {inspectTx.merchant}
              </h2>
              <StatusBadge
                status={stateBadge.status}
                label={inspectTx.workflowState === "pending" ? "Pending Review" : stateBadge.label}
              />
              <StatusBadge status={policyBadge.status} label={policyBadge.label} />
              <span className="text-xs text-[#68726d]">
                · Card *{inspectTx.cardLast4}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!inspectTx.receiptAttached && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  attachCardExpenseReceipt(inspectTx.id, "receipt-uploaded.pdf");
                  toast.success("Receipt uploaded & policy rules re-checked");
                }}
                className="rounded-xl border-amber-300 text-amber-800 hover:bg-amber-50 text-xs font-semibold h-9 px-4 gap-1.5"
              >
                <Paperclip className="w-3.5 h-3.5" /> Attach Missing Receipt
              </Button>
            )}

            {inspectTx.clearingStatus === "PENDING_CLEARING" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsClearing(true)}
                className="rounded-xl border-[#087f70]/40 text-[#087f70] hover:bg-[#f0faf8] text-xs font-semibold h-9 px-4 gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5" /> Settle via Bank Feed
              </Button>
            )}

            {!inspectTx.isDisputed && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDisputing(true)}
                className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold h-9 px-4 gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Dispute Charge
              </Button>
            )}

            {inspectTx.workflowState !== "approved" && (
              <Button
                type="button"
                disabled={inspectTx.policyEvaluation.status === "violation"}
                onClick={() => {
                  approveCompanyCardExpense(inspectTx.id);
                  toast.success("Expense approved and ready for bank reconciliation");
                }}
                className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-5 gap-1.5 disabled:opacity-40"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve Expense
              </Button>
            )}
          </div>
        </div>

        {/* Dispute Alert Banner (if lodged) */}
        {inspectTx.isDisputed && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50/80 text-xs text-red-950 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-900">Chargeback Dispute Lodged with Card Issuer</p>
              <p className="mt-0.5 text-red-800">
                Reason: <strong>{inspectTx.disputeReason}</strong>. Card issuer is reviewing merchant evidence. Provisional reversal applied to GL.
              </p>
            </div>
          </div>
        )}

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Charge Amount
            </p>
            <p className="text-lg font-bold text-[#10231d] mt-1">
              {formatNgn(inspectTx.amount)}
            </p>
            <p className="text-[11px] text-[#087f70] font-medium mt-0.5 capitalize">
              {inspectTx.clearingStatus.replace(/_/g, " ").toLowerCase()}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Cardholder &amp; Department
            </p>
            <p className="text-sm font-bold text-[#10231d] mt-1 truncate">
              {inspectTx.cardOwner}
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              {inspectTx.department}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Payment Instrument
            </p>
            <p className="text-sm font-bold text-[#10231d] mt-1">
              Corporate Card *{inspectTx.cardLast4}
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              Auto-submitted on swipe
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Policy Compliance
            </p>
            <p className="text-sm font-bold text-[#10231d] mt-1 capitalize">
              {inspectTx.policyEvaluation.status}
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              {inspectTx.receiptAttached ? "Receipt attached" : "Missing required receipt"}
            </p>
          </div>
        </div>

        {/* Main Details Body */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="space-y-6">
            {/* Policy Evaluation Breakdown Card */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-sm space-y-4">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#10231d]">
                    Expense Policy Evaluation &amp; Controls
                  </h3>
                  <p className="text-xs text-[#68726d] mt-0.5">
                    {inspectTx.policyEvaluation.summary}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {inspectTx.policyEvaluation.checks.map((chk) => (
                  <div
                    key={chk.id}
                    className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                      chk.outcome === "violation"
                        ? "border-red-200 bg-red-50/70 text-red-900"
                        : chk.outcome === "warning"
                        ? "border-amber-200 bg-amber-50/70 text-amber-900"
                        : "border-emerald-200 bg-emerald-50/60 text-emerald-900"
                    }`}
                  >
                    {chk.outcome === "violation" ? (
                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    ) : chk.outcome === "warning" ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5 flex-1">
                      <p className="font-bold">{chk.ruleName}</p>
                      <p className="text-[11px] opacity-90">{chk.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction & Accounting Metadata */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#10231d] border-b border-gray-100 pb-3">
                Transaction &amp; Accounting Allocation
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-[#68726d]">Merchant</p>
                  <p className="font-bold text-[#10231d] mt-1">{inspectTx.merchant}</p>
                </div>
                <div>
                  <p className="text-[#68726d]">Transaction Purpose</p>
                  <p className="font-semibold text-[#10231d] mt-1">{inspectTx.description}</p>
                </div>
                <div>
                  <p className="text-[#68726d]">Gateway Reference</p>
                  <p className="font-mono text-[#10231d] mt-1 text-[11px]">{inspectTx.providerTxId}</p>
                </div>
                <div>
                  <p className="text-[#68726d]">Expense GL Account</p>
                  <p className="font-semibold text-[#10231d] mt-1">{inspectTx.glAccount}</p>
                </div>
                <div>
                  <p className="text-[#68726d]">Category</p>
                  <p className="font-semibold text-[#10231d] mt-1">{inspectTx.category}</p>
                </div>
                <div>
                  <p className="text-[#68726d]">Reconciliation Status</p>
                  <p className="font-semibold text-[#10231d] mt-1 capitalize">
                    {inspectTx.reconciliationStatus === "RECONCILED"
                      ? "Matched with Bank Feed"
                      : "Pending Settlement Feed"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Receipt & Logic */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#087f70]">
                Supporting Evidence
              </span>
              <h4 className="text-sm font-bold text-[#10231d]">Receipt Attachment</h4>
              {inspectTx.receiptAttached ? (
                <div className="p-3.5 rounded-xl bg-[#ecfdf5] border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-emerald-700" /> Receipt Attached
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    {inspectTx.receiptFileName || "receipt-document.pdf"} (Verified by OCR)
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#fef2f2] border border-red-200 text-xs text-red-900 space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" /> Receipt Required
                  </p>
                  <p className="text-[11px] text-red-800">
                    Corporate card purchases above ₦25,000 require an itemized receipt for policy clearance.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      attachCardExpenseReceipt(inspectTx.id, "receipt-uploaded.pdf");
                      toast.success("Receipt attached & policy re-evaluated");
                    }}
                    className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                  >
                    Upload Receipt Now
                  </Button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#087f70]">
                Enterprise Principle
              </span>
              <h4 className="text-sm font-bold text-[#10231d]">Corporate Card Logic</h4>
              <p className="text-xs text-[#68726d] leading-relaxed">
                All card transactions enter <strong>Company Expenses</strong> automatically in a <em>Pending</em> state and evaluate against your organization&apos;s expense policies.
              </p>
              <div className="p-3 rounded-xl bg-[#f0faf8] border border-[#087f70]/20 text-xs text-[#065f55]">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> No Fake Unpaid Bills
                </p>
                <p className="mt-1">
                  Card purchases do not create unpaid AP bills because the card issuer was already charged. They settle directly with bank feeds.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Simulate Bank Clearing Modal */}
        <Dialog
          open={isClearing}
          onOpenChange={(open) => !open && setIsClearing(false)}
        >
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#f0faf8] flex items-center justify-center text-[#087f70]">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-[#10231d]">
                    Bank Feed Settlement &amp; Clearing
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#68726d]">
                    Simulate cleared settlement for this corporate card transaction against your bank statement feed.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-black/[0.06] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#68726d]">Merchant:</span>
                  <span className="font-semibold text-[#10231d]">{inspectTx.merchant}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68726d]">Original Swipe Amount:</span>
                  <span className="font-bold text-[#087f70] text-sm">{formatNgn(inspectTx.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68726d]">Corporate Card:</span>
                  <span className="font-mono text-gray-800">**** **** **** {inspectTx.cardLast4}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700">FX Variance (₦)</label>
                  <input
                    type="number"
                    value={fxVariance}
                    onChange={(e) => setFxVariance(e.target.value)}
                    placeholder="0"
                    className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold"
                  />
                  <p className="text-[10px] text-[#68726d]">Difference between auth &amp; clear rate</p>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700">Bank Fee (₦)</label>
                  <input
                    type="number"
                    value={bankFee}
                    onChange={(e) => setBankFee(e.target.value)}
                    placeholder="0"
                    className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold"
                  />
                  <p className="text-[10px] text-[#68726d]">Cross-border or interchange fee</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#f0faf8] border border-[#087f70]/20 flex justify-between items-center font-bold text-xs">
                <span>Final Settlement Debit:</span>
                <span className="text-sm text-[#087f70]">
                  {formatNgn(inspectTx.amount + (Number(fxVariance) || 0) + (Number(bankFee) || 0))}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsClearing(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleClear}
                className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold"
              >
                Confirm Settlement &amp; Post GL
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dispute Transaction Modal */}
        <Dialog
          open={isDisputing}
          onOpenChange={(open) => !open && setIsDisputing(false)}
        >
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-red-800">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-[#10231d]">
                    Dispute Transaction: {inspectTx.merchant}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#68726d]">
                    Lodge a formal chargeback dispute for this {formatNgn(inspectTx.amount)} charge on card *{inspectTx.cardLast4}.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-gray-700">Dispute Reason</label>
                <input
                  type="text"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="e.g. Unauthorized fraudulent charge, duplicate billing, service not rendered"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs"
                />
              </div>

              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" /> Chargeback Protection
                </p>
                <p>
                  This charge will be immediately marked as Disputed, removed from payable liabilities, and provisional GL reversal journal will be created.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDisputing(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDispute}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Submit Chargeback Dispute
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner explaining how Company Card Transactions behave */}
      <div className="rounded-2xl border border-[#c8ece4] bg-[#f0faf8] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-[#087f70]">
            Corporate Card Transactions Live in Company Expenses
          </p>
          <p className="text-xs text-[#065f55]">
            Every company card purchase and virtual card renewal enters{" "}
            <strong>Company Expenses</strong> automatically in a <strong>Pending</strong> state
            and is checked against your organization&apos;s expense policies (such as receipt
            thresholds and spend limits) before reconciliation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onJumpToReconciliation}
            className="rounded-xl border-[#087f70]/40 text-[#087f70] bg-white hover:bg-[#f0faf8] text-xs font-semibold h-9"
          >
            View Reconciliation &rarr;
          </Button>
          <Button
            type="button"
            onClick={() => setShowSwipeModal(true)}
            className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-4 gap-1.5"
          >
            <Plus className="w-4 h-4" /> Record Card Expense
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#10231d]">
              Company Expenses &mdash; Corporate Card Activity
            </h2>
            <p className="text-xs text-[#68726d] mt-0.5">
              Click any card expense to review policy check details or attach a missing receipt.
            </p>
          </div>
          <span className="text-xs font-semibold text-[#68726d]">
            {companyCardExpenses.length} expense(s)
          </span>
        </div>

        {companyCardExpenses.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#f0faf8] mx-auto flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-[#087f70]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#10231d]">
                No corporate card expenses yet
              </p>
              <p className="text-xs text-[#68726d] mt-1 max-w-sm mx-auto">
                Record a card transaction or charge a subscription card to see how it enters Company
                Expenses automatically for policy evaluation.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button
                type="button"
                onClick={() => setShowSwipeModal(true)}
                className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-4 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Record Card Expense
              </Button>
              {onLoadSampleData && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onLoadSampleData}
                  className="rounded-xl border-gray-200 text-xs font-semibold h-9 px-4"
                >
                  Load Sample Data
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                  <th className="py-3 px-4">MERCHANT</th>
                  <th className="py-3 px-4">CARDHOLDER</th>
                  <th className="py-3 px-4">AMOUNT</th>
                  <th className="py-3 px-4">RECEIPT</th>
                  <th className="py-3 px-4">POLICY STATUS</th>
                  <th className="py-3 px-4">EXPENSE STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companyCardExpenses.map((tx) => {
                  const stateBadge = mapDemoBadgeStatus(tx.workflowState);
                  const policyBadge = mapDemoBadgeStatus(tx.policyEvaluation.status);

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setInspectTxId(tx.id)}
                      className="hover:bg-gray-50/70 cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-4">
                        <p className="text-xs font-bold text-[#10231d]">{tx.merchant}</p>
                        <p className="text-[11px] text-[#68726d]">
                          Card *{tx.cardLast4} · {tx.description}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-xs font-medium text-[#10231d] whitespace-nowrap">
                          {tx.cardOwner}
                        </p>
                        <p className="text-[11px] text-[#68726d] whitespace-nowrap">
                          {tx.department}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-xs font-bold text-[#10231d] whitespace-nowrap">
                        {formatNgn(tx.amount)}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {tx.receiptAttached ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#087f70]">
                            <FileCheck2 className="w-3.5 h-3.5" /> Attached
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600">
                            <AlertTriangle className="w-3.5 h-3.5" /> Missing
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StatusBadge status={policyBadge.status} label={policyBadge.label} />
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StatusBadge
                          status={stateBadge.status}
                          label={tx.workflowState === "pending" ? "Pending Review" : stateBadge.label}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Card Transaction Modal */}
      <Dialog open={showSwipeModal} onOpenChange={setShowSwipeModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#10231d]">
              Record Corporate Card Purchase
            </DialogTitle>
            <DialogDescription className="text-xs text-[#68726d]">
              Card purchases enter Company Expenses in Pending status and are automatically checked
              against company receipt and spending policies.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Merchant</label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Purpose / Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Amount (₦)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Receipt Attached?</label>
                <Select
                  value={withReceipt ? "yes" : "no"}
                  onValueChange={(v) => setWithReceipt(v === "yes")}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="no" className="text-xs">
                      No (Flags &gt;₦25k rule)
                    </SelectItem>
                    <SelectItem value="yes" className="text-xs">
                      Yes, uploaded
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Cardholder</label>
              <input
                type="text"
                value={cardOwner}
                onChange={(e) => setCardOwner(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSwipeModal(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRecordSwipe}
              className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold"
            >
              Submit to Company Expenses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
