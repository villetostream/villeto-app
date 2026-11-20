"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Lock,
  Plus,
  RotateCcw,
  ShieldCheck,
  Unlock,
} from "lucide-react";
import { Cards } from "iconsax-reactjs";
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
import { useBillPayDemoStore } from "./useBillPayDemoStore";
import { type DemoSubscriptionCard } from "./demo-data";
import { formatNgn, mapDemoBadgeStatus } from "./demo-utils";

export function DemoSubscriptionsAndCardsTab({
  selectedSubId: externalSelectedSubId,
  onSelectSubId: externalOnSelectSubId,
  onJumpToExpenses,
  onLoadSampleData,
}: {
  selectedSubId?: string | null;
  onSelectSubId?: (id: string | null) => void;
  onJumpToExpenses: () => void;
  onLoadSampleData?: () => void;
}) {
  const {
    subscriptionCards,
    issueSubscriptionCard,
    toggleCardFreeze,
    simulateSubscriptionCharge,
    resolveCardDecline,
    replaceVirtualCard,
  } = useBillPayDemoStore();

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [subName, setSubName] = useState("OpenAI Enterprise Team");
  const [vendorName, setVendorName] = useState("OpenAI LLC");
  const [owner, setOwner] = useState("Tunde Baba (Engineering Lead)");
  const [expectedAmt, setExpectedAmt] = useState("150000");
  const [monthlyLimit, setMonthlyLimit] = useState("190000");

  const [internalSelectedSubId, setInternalSelectedSubId] = useState<string | null>(null);
  const selectedSubId =
    externalSelectedSubId !== undefined ? externalSelectedSubId : internalSelectedSubId;

  const setSelectedSubId = useCallback(
    (id: string | null) => {
      if (externalOnSelectSubId) externalOnSelectSubId(id);
      setInternalSelectedSubId(id);
    },
    [externalOnSelectSubId],
  );

  const [chargeTarget, setChargeTarget] = useState<DemoSubscriptionCard | null>(null);
  const [chargeAmount, setChargeAmount] = useState("250000");

  // Virtual Card Replacement Modal state
  const [isReplacingCard, setIsReplacingCard] = useState(false);
  const [replaceReason, setReplaceReason] = useState("Routine annual credential rotation & security upgrade");

  const selectedSub = subscriptionCards.find((s) => s.id === selectedSubId) || null;

  function handleReplaceCard() {
    if (!selectedSub) return;
    const res = replaceVirtualCard(selectedSub.id, replaceReason, "Amina Bello (Card Admin)");
    if (res.ok) {
      toast.success(res.message);
      setIsReplacingCard(false);
    } else {
      toast.error(res.message);
    }
  }

  useEffect(() => {
    if (selectedSubId) {
      useHeaderBackStore.getState().setBackHandler(() => {
        setSelectedSubId(null);
      }, "Card Subscriptions");
      return () => {
        useHeaderBackStore.getState().clearBackHandler();
      };
    } else {
      useHeaderBackStore.getState().clearBackHandler();
    }
  }, [selectedSubId, setSelectedSubId]);

  function runMerchantCharge(amount: number) {
    if (!chargeTarget) return;
    const res = simulateSubscriptionCharge(chargeTarget.id, amount);
    if (res.status === "declined") {
      toast.error(res.message);
    } else {
      toast.success(
        `${formatNgn(amount)} charged on *${chargeTarget.cardLast4} and added to Company Expenses`,
      );
    }
    setChargeTarget(null);
  }

  const renderChargeDialog = () => (
    <Dialog
      open={Boolean(chargeTarget)}
      onOpenChange={(open) => !open && setChargeTarget(null)}
    >
      <DialogContent className="max-w-md rounded-2xl">
        {chargeTarget && (
          <>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#10231d]">
                Record Card Charge · *{chargeTarget.cardLast4}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#68726d]">
                Expected: <strong>{formatNgn(chargeTarget.expectedAmount)}</strong> · Limit:{" "}
                <strong>{formatNgn(chargeTarget.monthlyLimit)}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => runMerchantCharge(chargeTarget.expectedAmount)}
                  className="rounded-xl text-xs h-9 border-emerald-200 bg-emerald-50/50 text-emerald-800"
                >
                  Expected ({formatNgn(chargeTarget.expectedAmount)})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => runMerchantCharge(chargeTarget.monthlyLimit + 50000)}
                  className="rounded-xl text-xs h-9 border-red-200 bg-red-50/60 text-red-800"
                >
                  Exceeds Limit ({formatNgn(chargeTarget.monthlyLimit + 50000)})
                </Button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Charge Amount (₦)
                </label>
                <input
                  type="number"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setChargeTarget(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => runMerchantCharge(Number(chargeAmount))}
                className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold"
              >
                Post Charge
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  if (selectedSub) {
    const cardBadge = mapDemoBadgeStatus(selectedSub.cardStatus);
    const subBadge = mapDemoBadgeStatus(selectedSub.subscriptionStatus);

    return (
      <div className="space-y-6">
        {/* Top Navigation & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-[#10231d]">
                {selectedSub.subscriptionName}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Subscription: {selectedSub.subscriptionStatus === "ACTIVE" ? "Active" : selectedSub.subscriptionStatus.replace(/_/g, " ")}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  selectedSub.cardStatus === "FROZEN"
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-blue-50 text-blue-800 border border-blue-200"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                Card *{selectedSub.cardLast4}: {selectedSub.cardStatus === "FROZEN" ? "Frozen" : "Active"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReplacingCard(true)}
              className="rounded-xl border-gray-200 text-xs font-semibold h-9 px-4 gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#087f70]" /> Replace Virtual Card
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                toggleCardFreeze(selectedSub.id);
                toast.info(
                  selectedSub.cardStatus === "ACTIVE"
                    ? `Card *${selectedSub.cardLast4} frozen`
                    : `Card *${selectedSub.cardLast4} unfrozen`,
                );
              }}
              className="rounded-xl border-gray-200 text-xs font-semibold h-9 px-4 gap-1.5"
            >
              {selectedSub.cardStatus === "ACTIVE" ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-600" /> Freeze Virtual Card
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-[#087f70]" /> Unfreeze Virtual Card
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setChargeTarget(selectedSub);
                setChargeAmount(String(selectedSub.expectedAmount));
              }}
              className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-4 gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" /> Record Merchant Charge
            </Button>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Monthly Spend Limit
            </p>
            <p className="text-lg font-bold text-[#087f70] mt-1">
              {formatNgn(selectedSub.monthlyLimit)}
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              Strict virtual card ceiling
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Expected Recurring Cost
            </p>
            <p className="text-lg font-bold text-[#10231d] mt-1">
              {formatNgn(selectedSub.expectedAmount)}
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              Monthly contract expectation
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Remaining Card Balance
            </p>
            <p className="text-lg font-bold text-[#10231d] mt-1">
              {formatNgn(selectedSub.remainingLimit)}
            </p>
            <p className="text-[11px] text-[#087f70] mt-0.5">
              Available before decline
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Responsible Owner
            </p>
            <p className="text-sm font-bold text-[#10231d] mt-1 truncate">
              {selectedSub.accountableOwner}
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              {selectedSub.department}
            </p>
          </div>
        </div>

        {/* Main Details Body */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="space-y-6">
            {/* Card & Subscription Terms */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#10231d] border-b border-gray-100 pb-3">
                Dedicated Virtual Card Details &amp; Spend Controls
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-[#68726d]">SaaS Merchant</p>
                  <p className="font-bold text-[#10231d] mt-1">{selectedSub.vendorName}</p>
                </div>
                <div>
                  <p className="text-[#68726d]">Masked Card Number</p>
                  <p className="font-mono font-semibold text-[#10231d] mt-1">
                    **** **** **** {selectedSub.cardLast4}
                  </p>
                </div>
                <div>
                  <p className="text-[#68726d]">Per-Transaction Limit</p>
                  <p className="font-semibold text-[#10231d] mt-1">
                    {formatNgn(selectedSub.perTransactionLimit)}
                  </p>
                </div>
                <div>
                  <p className="text-[#68726d]">Expense GL Account</p>
                  <p className="font-semibold text-[#10231d] mt-1">{selectedSub.glAccount}</p>
                </div>
                <div>
                  <p className="text-[#68726d]">Department</p>
                  <p className="font-semibold text-[#10231d] mt-1">{selectedSub.department}</p>
                </div>
                <div>
                  <p className="text-[#68726d]">Card Type</p>
                  <p className="font-semibold text-[#087f70] mt-1">
                    Single-Merchant Virtual Card
                  </p>
                </div>
              </div>
            </div>

            {/* SaaS Seat Allocation & Utilization Intelligence */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-sm space-y-4">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#10231d]">
                    SaaS Seat Allocation &amp; Spend Intelligence
                  </h3>
                  <p className="text-xs text-[#68726d] mt-0.5">
                    Live team seat count, unit license economics, and software utilization metrics.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#087f70]">
                  {selectedSub.seatsCount || 18} Allocated Seats
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Active Licenses</span>
                  <p className="text-sm font-bold text-[#10231d]">{selectedSub.seatsCount || 18} Seats</p>
                  <p className="text-[11px] text-[#087f70] font-medium">{selectedSub.utilizationPercent || 92}% Team Utilization</p>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Unit Cost per Seat</span>
                  <p className="text-sm font-bold text-[#10231d]">
                    {formatNgn(selectedSub.costPerSeat || Math.round(selectedSub.expectedAmount / (selectedSub.seatsCount || 18)))} / mo
                  </p>
                  <p className="text-[11px] text-[#68726d]">Enterprise Commercial Rate</p>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Next Scheduled Renewal</span>
                  <p className="text-sm font-bold text-[#10231d]">{selectedSub.nextRenewalDate}</p>
                  <p className="text-[11px] text-[#68726d]">Auto-Charge on *{selectedSub.cardLast4}</p>
                </div>
              </div>
            </div>

            {/* Card Replacement History (Zero-Downtime) */}
            {selectedSub.cardReplacementHistory && selectedSub.cardReplacementHistory.length > 0 && (
              <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-[#10231d] border-b border-gray-100 pb-3 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-[#087f70]" /> Card Replacement History (Zero-Downtime)
                </h4>
                <div className="divide-y divide-gray-100 text-xs">
                  {selectedSub.cardReplacementHistory.map((h, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">
                          Replaced Card *{h.oldCardLast4} &rarr; Activated *{selectedSub.cardLast4}
                        </p>
                        <p className="text-[11px] text-gray-500">Reason: {h.reason}</p>
                      </div>
                      <span className="text-[11px] text-gray-500 font-mono">{h.replacedAt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decline Alert (if triggered) */}
            {selectedSub.declineAlert && (
              <div className="p-4 rounded-2xl border border-red-200 bg-red-50/80 space-y-3">
                <div className="flex items-start gap-3 text-xs text-red-950">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Card Charge Declined by Spend Control Policy</p>
                    <p className="mt-0.5">{selectedSub.declineAlert.reason}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      resolveCardDecline(
                        selectedSub.id,
                        "increase_limit_approved",
                        selectedSub.declineAlert?.attemptedAmount,
                      );
                      toast.success("Limit increased and charge approved");
                    }}
                    className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-8"
                  >
                    Approve Limit Increase to {formatNgn(selectedSub.declineAlert.attemptedAmount)}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      resolveCardDecline(selectedSub.id, "keep_restricted");
                      toast.info("Charge kept blocked");
                    }}
                    className="rounded-xl border-red-200 text-red-800 hover:bg-red-100 text-xs font-semibold h-8"
                  >
                    Keep Card Restricted
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Corporate Card Architecture Note */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#087f70]">
                Clean Spend Management
              </span>
              <h4 className="text-sm font-bold text-[#10231d]">
                Auto-Routing to Company Expenses
              </h4>
              <p className="text-xs text-[#68726d] leading-relaxed">
                When this card is charged by {selectedSub.vendorName}, the transaction lands directly in <strong>Company Expenses</strong> as a Pending expense.
              </p>
              <div className="p-3 rounded-xl bg-[#f0faf8] border border-[#087f70]/20 text-xs text-[#065f55]">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Single-Merchant Security
                </p>
                <p className="mt-1">
                  Virtual cards locked to a single provider prevent unauthorized charges and enforce subscription renewal limits.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={onJumpToExpenses}
                className="w-full rounded-xl border-[#087f70]/40 text-[#087f70] hover:bg-[#f0faf8] text-xs font-semibold h-9"
              >
                View in Company Expenses &rarr;
              </Button>
            </div>
          </div>
        </div>

        {/* Replace Virtual Card Modal */}
        <Dialog
          open={isReplacingCard}
          onOpenChange={(open) => !open && setIsReplacingCard(false)}
        >
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#f0faf8] flex items-center justify-center text-[#087f70]">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-[#10231d]">
                    Zero-Downtime Virtual Card Replacement
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#68726d]">
                    Instantly issue a new virtual card number for {selectedSub.subscriptionName} while keeping commercial contracts, assigned owner, and GL mappings intact.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-black/[0.06] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#68726d]">Current Virtual Card:</span>
                  <span className="font-mono font-bold text-gray-800">**** **** **** {selectedSub.cardLast4}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68726d]">Subscription Vendor:</span>
                  <span className="font-semibold text-[#10231d]">{selectedSub.vendorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68726d]">Accountable Lead:</span>
                  <span className="font-semibold text-[#10231d]">{selectedSub.accountableOwner}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-gray-700">Reason for Replacement</label>
                <input
                  type="text"
                  value={replaceReason}
                  onChange={(e) => setReplaceReason(e.target.value)}
                  placeholder="e.g. Suspected compromise, annual credential rotation, provider upgrade"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Continuous Business Operation
                </p>
                <p>
                  Old card *{selectedSub.cardLast4} will be securely deprecated. Ongoing expense records, approvals, and budget tracking will transition automatically without disruption.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReplacingCard(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleReplaceCard}
                className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold"
              >
                Issue Replacement Card
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {renderChargeDialog()}
      </div>
    );
  }

  function handleIssueCard() {
    const exp = Number(expectedAmt);
    const lim = Number(monthlyLimit);
    if (!subName.trim() || !vendorName.trim() || exp <= 0 || lim < exp) {
      toast.error("Card limit must be at least equal to expected subscription cost.");
      return;
    }
    issueSubscriptionCard({
      subscriptionName: subName.trim(),
      vendorName: vendorName.trim(),
      department: "Engineering",
      glAccount: "6310 · SaaS Licenses",
      accountableOwner: owner.trim(),
      expectedAmount: exp,
      monthlyLimit: lim,
      perTransactionLimit: lim,
    });
    toast.success("Subscription virtual card issued");
    setShowIssueModal(false);
  }

  return (
    <div className="space-y-4">
      {/* Corporate Card Rule Notice */}
      <div className="rounded-2xl border border-[#c8ece4] bg-[#f0faf8] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-[#087f70]">
            Automatic Expense Tracking for Company Subscriptions
          </p>
          <p className="text-xs text-[#065f55]">
            When a SaaS provider charges a subscription card, the charge automatically appears in{" "}
            <strong>Company Expenses</strong> (Pending) for policy checks and reconciliation — it
            never creates a duplicate unpaid vendor bill.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onJumpToExpenses}
          className="rounded-xl border-[#087f70]/40 text-[#087f70] bg-white hover:bg-[#f0faf8] text-xs font-semibold shrink-0 h-9"
        >
          Open Company Expenses &rarr;
        </Button>
      </div>

      {/* Main Cards Workspace */}
      <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#10231d]">
              Company Virtual Card Subscriptions
            </h2>
            <p className="text-xs text-[#68726d] mt-0.5">
              Dedicated virtual cards isolate each software vendor and track an accountable owner
              without tying the card to a personal employee allowance.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setShowIssueModal(true)}
            className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-4 gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Virtual Card
          </Button>
        </div>

        {subscriptionCards.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#f0faf8] mx-auto flex items-center justify-center">
              <Cards variant="Bulk" className="w-6 h-6 text-[#087f70]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#10231d]">
                No subscription cards yet
              </p>
              <p className="text-xs text-[#68726d] mt-1 max-w-sm mx-auto">
                Issue a dedicated virtual card for cloud hosting or SaaS plans with spending caps
                and an accountable owner.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button
                type="button"
                onClick={() => setShowIssueModal(true)}
                className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-4 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Create Virtual Card
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
          <div className="grid grid-cols-1 gap-4">
            {subscriptionCards.map((sub) => {
              const cardBadge = mapDemoBadgeStatus(sub.cardStatus);
              const subBadge = mapDemoBadgeStatus(sub.subscriptionStatus);

              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubId(sub.id)}
                  className="rounded-2xl border border-black/[0.08] p-4 space-y-4 hover:border-[#087f70]/50 hover:bg-gray-50/70 transition-all cursor-pointer"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#10231d] text-white flex items-center justify-center shrink-0">
                        <Cards variant="Bulk" className="w-6 h-6 text-[#0ea894]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-[#10231d]">
                            {sub.subscriptionName}
                          </h3>
                          <StatusBadge
                            status={subBadge.status}
                            label={`Subscription: ${sub.subscriptionStatus === "ACTIVE" ? "Active" : sub.subscriptionStatus.replace(/_/g, " ")}`}
                          />
                          <StatusBadge
                            status={cardBadge.status}
                            label={`Card *${sub.cardLast4} · ${cardBadge.label}`}
                          />
                        </div>
                        <p className="text-xs text-[#68726d] mt-0.5">
                          {sub.vendorName} · {sub.department} · Next renewal:{" "}
                          {sub.nextRenewalDate}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Clean KPI Summary Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-gray-100 text-xs">
                    <div>
                      <p className="text-[11px] text-[#68726d]">Expected Monthly</p>
                      <p className="font-bold text-[#10231d] mt-0.5">
                        {formatNgn(sub.expectedAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#68726d]">Monthly Card Limit</p>
                      <p className="font-bold text-[#087f70] mt-0.5">
                        {formatNgn(sub.monthlyLimit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#68726d]">Latest Charge</p>
                      <p className="font-bold text-[#10231d] mt-0.5">
                        {sub.latestChargeAmount > 0 ? formatNgn(sub.latestChargeAmount) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#68726d]">Remaining Limit</p>
                      <p className="font-semibold text-gray-800 mt-0.5">
                        {formatNgn(sub.remainingLimit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#68726d]">Responsible Owner</p>
                      <p
                        className="font-semibold text-[#10231d] mt-0.5 truncate"
                        title={sub.accountableOwner}
                      >
                        {sub.accountableOwner}
                      </p>
                    </div>
                  </div>

                  {sub.declineAlert && (
                    <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 text-xs text-red-950">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">
                            Charge Declined ({formatNgn(sub.declineAlert.attemptedAmount)})
                          </p>
                          <p className="text-red-800 mt-0.5">{sub.declineAlert.reason}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            resolveCardDecline(sub.id, "keep_restricted");
                            toast.info("Card limit kept restricted");
                          }}
                          className="rounded-lg h-8 text-xs border-red-200 text-red-700 hover:bg-red-100"
                        >
                          Keep Limit Restricted
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            const newLim = sub.declineAlert
                              ? sub.declineAlert.attemptedAmount + 25000
                              : sub.monthlyLimit + 50000;
                            resolveCardDecline(sub.id, "increase_limit_approved", newLim);
                            toast.success(`Card limit increased to ${formatNgn(newLim)}`);
                          }}
                          className="rounded-lg h-8 text-xs bg-[#087f70] hover:bg-[#076a5e] text-white"
                        >
                          Approve Limit Increase
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Record Merchant Charge Modal */}
      {renderChargeDialog()}

      {/* Issue Virtual Card Modal */}
      <Dialog open={showIssueModal} onOpenChange={setShowIssueModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#10231d] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#087f70]" />
              Create Subscription Virtual Card
            </DialogTitle>
            <DialogDescription className="text-xs text-[#68726d]">
              Assign a vendor-locked virtual card with an accountable owner and monthly spend limit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Subscription Name</label>
              <input
                type="text"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Vendor / Merchant</label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Accountable Owner</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Expected Monthly (₦)</label>
                <input
                  type="number"
                  value={expectedAmt}
                  onChange={(e) => setExpectedAmt(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Monthly Card Limit (₦)</label>
                <input
                  type="number"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowIssueModal(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleIssueCard}
              className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Create Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
