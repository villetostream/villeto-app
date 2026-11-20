"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeftRight,
  BookOpenCheck,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck,
  Layers,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { DemoBankVerificationModal } from "./DemoBankVerificationModal";
import { DemoCheckBankDetailsModal } from "./DemoCheckBankDetailsModal";
import { DemoReconciliationDetailModal } from "./DemoReconciliationDetailModal";
import { DemoJournalEntryDetailModal } from "./DemoJournalEntryDetailModal";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";
import { useBillPayDemoStore } from "./useBillPayDemoStore";
import {
  type DemoBankStatementLine,
  type DemoJournalEntry,
  type DemoPayment,
  type DemoVendor,
} from "./demo-data";
import { formatNgn, mapDemoBadgeStatus } from "./demo-utils";

export function DemoPaymentsAndReconciliationTab({
  initialTab,
  onLoadSampleData,
  selectedPaymentId: externalSelectedPaymentId,
  onSelectPaymentId: externalOnSelectPaymentId,
}: {
  initialTab?: "payments" | "reconciliation" | "journals";
  onLoadSampleData?: () => void;
  selectedPaymentId?: string | null;
  onSelectPaymentId?: (id: string | null) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const effectiveTab =
    urlTab === "reconciliation"
      ? "reconciliation"
      : urlTab === "journals"
      ? "journals"
      : initialTab || "payments";

  const {
    bills,
    vendors,
    payments,
    bankLines,
    companyCardExpenses,
    journals,
    queryProviderStatus,
    retryFailedPayment,
    reconcileBankLine,
    createPaymentRun,
    releasePayment,
    recordExternalPayment,
  } = useBillPayDemoStore();

  const [subTab, setSubTab] = useState<"payments" | "reconciliation" | "journals">(
    effectiveTab,
  );

  // Payment Queue Filters
  const [paymentFilter, setPaymentFilter] = useState<
    "all" | "awaiting_release" | "confirming" | "completed" | "failed"
  >("all");

  // Batch Payment Run modal
  const [showPaymentRunModal, setShowPaymentRunModal] = useState(false);
  const [selectedBillIdsForRun, setSelectedBillIdsForRun] = useState<string[]>([]);
  const [batchFundingAccount, setBatchFundingAccount] = useState("Providus Treasury Main · *2837");
  const [batchDate, setBatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [batchName, setBatchName] = useState("Weekly Vendor Run");

  // Dual-control release modal
  const [releasingPayment, setReleasingPayment] = useState<DemoPayment | null>(null);
  const [releaserName, setReleaserName] = useState("Chioma Eze (Head of Corporate Treasury)");
  const [releaseMode, setReleaseMode] = useState<"complete" | "awaiting_webhook">("complete");

  const payableApprovedBills = bills.filter(
    (b) => b.approvalStatus === "APPROVED" && b.outstandingAmount > 0,
  );

  const selectedBatchSum = payableApprovedBills
    .filter((b) => selectedBillIdsForRun.includes(b.id))
    .reduce((sum, b) => sum + b.outstandingAmount, 0);

  const paymentFilterCounts = {
    all: payments.length,
    awaiting_release: payments.filter((p) => p.status === "AWAITING_RELEASE").length,
    confirming: payments.filter((p) => p.status === "AWAITING_CONFIRMATION").length,
    completed: payments.filter((p) => p.status === "COMPLETED").length,
    failed: payments.filter((p) => p.status === "FAILED").length,
  };

  const filteredPayments = payments.filter((p) => {
    if (paymentFilter === "awaiting_release") return p.status === "AWAITING_RELEASE";
    if (paymentFilter === "confirming") return p.status === "AWAITING_CONFIRMATION";
    if (paymentFilter === "completed") return p.status === "COMPLETED";
    if (paymentFilter === "failed") return p.status === "FAILED";
    return true;
  });

  useEffect(() => {
    if (urlTab === "reconciliation" || urlTab === "journals" || urlTab === "payments") {
      setSubTab(urlTab);
    }
  }, [urlTab]);

  const handleSubTabChange = (tab: "payments" | "reconciliation" | "journals") => {
    setSubTab(tab);
    if (tab === "reconciliation") {
      router.replace("/bill-pay/demo/payments?tab=reconciliation", { scroll: false });
    } else if (tab === "journals") {
      router.replace("/bill-pay/demo/payments?tab=journals", { scroll: false });
    } else {
      router.replace("/bill-pay/demo/payments", { scroll: false });
    }
  };
  const [internalSelectedPaymentId, setInternalSelectedPaymentId] = useState<string | null>(null);

  const selectedPaymentId =
    externalSelectedPaymentId !== undefined
      ? externalSelectedPaymentId
      : internalSelectedPaymentId;

  const setSelectedPaymentId = useCallback((id: string | null) => {
    if (externalOnSelectPaymentId) externalOnSelectPaymentId(id);
    setInternalSelectedPaymentId(id);
  }, [externalOnSelectPaymentId]);

  const [verifyingVendor, setVerifyingVendor] = useState<DemoVendor | null>(null);
  const [checkingPayment, setCheckingPayment] = useState<DemoPayment | null>(null);
  const [selectedBankLine, setSelectedBankLine] = useState<DemoBankStatementLine | null>(null);
  const [selectedJournal, setSelectedJournal] = useState<DemoJournalEntry | null>(null);

  const pendingVendors = vendors.filter((v) => v.pendingBankChange !== null);
  const unmatchedCount = bankLines.filter((b) => b.status === "UNMATCHED").length;

  const selectedPayment = payments.find((p) => p.id === selectedPaymentId) || null;
  const paymentVendor = selectedPayment
    ? vendors.find((v) => v.id === selectedPayment.vendorId)
    : null;

  useEffect(() => {
    if (selectedPaymentId) {
      useHeaderBackStore.getState().setBackHandler(() => {
        setSelectedPaymentId(null);
      }, "Payments Queue");
      return () => {
        useHeaderBackStore.getState().clearBackHandler();
      };
    } else {
      useHeaderBackStore.getState().clearBackHandler();
    }
  }, [selectedPaymentId, setSelectedPaymentId]);

  const renderSharedModals = () => (
    <>
      {/* Dual-Control Bank Verification Modal */}
      <DemoBankVerificationModal
        open={!!verifyingVendor}
        onOpenChange={(open) => !open && setVerifyingVendor(null)}
        vendorId={verifyingVendor?.id}
        vendorName={verifyingVendor?.name}
      />

      {/* NIP Banking Gateway Check Modal */}
      <DemoCheckBankDetailsModal
        open={!!checkingPayment}
        onOpenChange={(open) => !open && setCheckingPayment(null)}
        payment={checkingPayment}
      />

      {/* Bank & Card Reconciliation Inspection Modal */}
      <DemoReconciliationDetailModal
        open={!!selectedBankLine}
        onOpenChange={(open) => !open && setSelectedBankLine(null)}
        bankLine={selectedBankLine}
        matchedPayment={
          selectedBankLine?.channel === "NIP Bank Transfer"
            ? payments.find(
                (p) =>
                  p.status === "COMPLETED" &&
                  (p.providerRef === selectedBankLine.reference || p.amount === selectedBankLine.amount),
              )
            : null
        }
        matchedCardExpense={
          selectedBankLine?.channel === "Card Settlement Feed"
            ? companyCardExpenses.find(
                (e) =>
                  e.providerTxId === selectedBankLine.reference || e.amount === selectedBankLine.amount,
              )
            : null
        }
      />

      {/* General Ledger Journal Voucher Modal */}
      <DemoJournalEntryDetailModal
        open={!!selectedJournal}
        onOpenChange={(open) => !open && setSelectedJournal(null)}
        journal={selectedJournal}
      />

      {/* Dual-Control Payment Release Modal */}
      <Dialog
        open={Boolean(releasingPayment)}
        onOpenChange={(open) => !open && setReleasingPayment(null)}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#10231d] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#087f70]" />
              Dual-Control Payment Authorization
            </DialogTitle>
            <DialogDescription className="text-xs text-[#68726d]">
              Treasury segregation of duties protocol: Release payout of funds to vendor account.
            </DialogDescription>
          </DialogHeader>

          {releasingPayment && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#68726d]">Payment Ref:</span>
                  <span className="font-bold text-[#10231d]">{releasingPayment.paymentRef}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68726d]">Beneficiary:</span>
                  <span className="font-semibold text-[#10231d]">{releasingPayment.vendorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68726d]">Release Total:</span>
                  <span className="font-bold text-[#087f70] text-sm">
                    {formatNgn(releasingPayment.amount)}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Dual-Control Authorizing Reviewer
                </label>
                <Select value={releaserName} onValueChange={setReleaserName}>
                  <SelectTrigger className="h-9 rounded-xl text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Chioma Eze (Head of Corporate Treasury)" className="text-xs">
                      Chioma Eze (Head of Corporate Treasury)
                    </SelectItem>
                    <SelectItem value="Adebayo Okonjo (Chief Financial Officer)" className="text-xs">
                      Adebayo Okonjo (Chief Financial Officer)
                    </SelectItem>
                    <SelectItem value="Ibrahim Musa (Internal Controls Director)" className="text-xs">
                      Ibrahim Musa (Internal Controls Director)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Execution Mode</label>
                <Select
                  value={releaseMode}
                  onValueChange={(v) => setReleaseMode(v as typeof releaseMode)}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="complete" className="text-xs">
                      Release &amp; Settle Immediately (Instant NIP)
                    </SelectItem>
                    <SelectItem value="awaiting_webhook" className="text-xs">
                      Release &amp; Await NIBSS Gateway Webhook
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReleasingPayment(null)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!releasingPayment) return;
                const res = releasePayment(releasingPayment.id, releaserName, releaseMode);
                if (res.ok) {
                  toast.success(res.message);
                  setReleasingPayment(null);
                } else {
                  toast.error(res.message);
                }
              }}
              className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold"
            >
              Authorize &amp; Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Payment Run Modal */}
      <Dialog open={showPaymentRunModal} onOpenChange={setShowPaymentRunModal}>
        <DialogContent className="max-w-xl rounded-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between gap-4 shrink-0 bg-white">
            <div className="space-y-1">
              <DialogTitle className="text-base font-bold text-[#10231d] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#087f70]" />
                Create Batch Payment Run
              </DialogTitle>
              <DialogDescription className="text-xs text-[#68726d]">
                Bundle multiple approved vendor bills into an authorized treasury payout batch.
              </DialogDescription>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Batch Run Name</label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="e.g. Mid-Month Supplier Run"
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Funding Bank Account</label>
                <Select value={batchFundingAccount} onValueChange={setBatchFundingAccount}>
                  <SelectTrigger className="h-9 rounded-xl text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Providus Treasury Main · *2837" className="text-xs">
                      Providus Treasury Main · *2837
                    </SelectItem>
                    <SelectItem value="Zenith Operating NGN · *8821" className="text-xs">
                      Zenith Operating NGN · *8821
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#10231d]">
                  Select Approved Bills ({payableApprovedBills.length} Available)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedBillIdsForRun.length === payableApprovedBills.length) {
                      setSelectedBillIdsForRun([]);
                    } else {
                      setSelectedBillIdsForRun(payableApprovedBills.map((b) => b.id));
                    }
                  }}
                  className="text-xs font-semibold text-[#087f70] hover:underline"
                >
                  {selectedBillIdsForRun.length === payableApprovedBills.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              {payableApprovedBills.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-gray-50 border border-gray-100 text-xs text-[#68726d]">
                  No approved bills currently awaiting payment. Approve bills in Standard Bills first.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-56 overflow-y-auto">
                  {payableApprovedBills.map((bill) => {
                    const isChecked = selectedBillIdsForRun.includes(bill.id);
                    return (
                      <label
                        key={bill.id}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50 cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(ch) => {
                              if (ch) {
                                setSelectedBillIdsForRun((prev) => [...prev, bill.id]);
                              } else {
                                setSelectedBillIdsForRun((prev) =>
                                  prev.filter((id) => id !== bill.id),
                                );
                              }
                            }}
                          />
                          <div>
                            <p className="font-bold text-[#10231d]">{bill.vendorName}</p>
                            <p className="text-[11px] text-[#68726d]">
                              Invoice {bill.invoiceNumber} · Due: {bill.dueDate}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-[#087f70]">
                          {formatNgn(bill.outstandingAmount)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Total Batch Summary Card */}
            <div className="p-3.5 rounded-xl bg-[#f0faf8] border border-[#c8ece4] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#065f55]">
                {selectedBillIdsForRun.length} bill{selectedBillIdsForRun.length !== 1 ? "s" : ""} selected for batch
              </span>
              <span className="text-base font-extrabold text-[#087f70]">
                {formatNgn(selectedBatchSum)}
              </span>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPaymentRunModal(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={selectedBillIdsForRun.length === 0}
              onClick={() => {
                if (selectedBillIdsForRun.length === 0) {
                  toast.error("Please select at least one bill for this payment run.");
                  return;
                }
                const res = createPaymentRun({
                  billIds: selectedBillIdsForRun,
                  fundingAccount: batchFundingAccount,
                  scheduledDate: batchDate,
                  batchName: batchName.trim() || undefined,
                });
                if (res.ok) {
                  toast.success(res.message);
                  setShowPaymentRunModal(false);
                  setSelectedBillIdsForRun([]);
                  if (res.paymentId) {
                    setSelectedPaymentId(res.paymentId);
                  }
                } else {
                  toast.error(res.message);
                }
              }}
              className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold"
            >
              Create Payment Run ({formatNgn(selectedBatchSum)})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  if (selectedPayment) {
    const badge = mapDemoBadgeStatus(selectedPayment.status);
    return (
      <div className="space-y-6">
        {/* Top Navigation & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-[#10231d]">
                {selectedPayment.paymentRef}
              </h2>
              <StatusBadge
                status={badge.status}
                label={
                  selectedPayment.status === "AWAITING_CONFIRMATION"
                    ? "Confirming with Bank"
                    : badge.label
                }
              />
              <span className="text-xs text-[#68726d]">
                · {selectedPayment.vendorName}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedPayment.status === "AWAITING_RELEASE" && (
              <Button
                type="button"
                onClick={() => setReleasingPayment(selectedPayment)}
                className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-4 gap-1.5 shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Authorize &amp; Release Payout (Dual Control)
              </Button>
            )}

            {selectedPayment.status === "AWAITING_CONFIRMATION" && (
              <>
                <Button
                  type="button"
                  onClick={() => setCheckingPayment(selectedPayment)}
                  className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-4 gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Check Bank Status
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    queryProviderStatus(selectedPayment.id, "FAILED");
                    toast.warning(`${selectedPayment.paymentRef} marked failed — safe to retry`);
                  }}
                  className="rounded-xl border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold h-9 px-4"
                >
                  Mark Failed
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    queryProviderStatus(selectedPayment.id, "COMPLETED");
                    toast.success(`${selectedPayment.paymentRef} confirmed completed by bank`);
                  }}
                  className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-4 gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Bank Transfer
                </Button>
              </>
            )}

            {selectedPayment.status === "FAILED" && (
              <Button
                type="button"
                onClick={() => {
                  retryFailedPayment(selectedPayment.id);
                  toast.success(`${selectedPayment.paymentRef} retried and completed`);
                }}
                className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-4 gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Bank Transfer
              </Button>
            )}

            {selectedPayment.status === "COMPLETED" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ecfdf5] text-xs font-semibold text-[#047857] border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Settled with Treasury Bank
              </span>
            )}
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Disbursed Amount
            </p>
            <p className="text-lg font-bold text-[#10231d] mt-1">
              {formatNgn(selectedPayment.amount)}
            </p>
            <p className="text-[11px] text-[#087f70] font-medium mt-0.5">
              NGN Bank Transfer
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Funding Account
            </p>
            <p className="text-sm font-bold text-[#10231d] mt-1 truncate">
              {selectedPayment.fundingAccount}
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              Operating settlement account
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Payment Method
            </p>
            <p className="text-base font-bold text-[#10231d] mt-1">
              NIP Instant Transfer
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              CBN / NIBSS interbank rails
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Bank Reconciliation
            </p>
            <p className="text-base font-bold text-[#10231d] mt-1">
              {selectedPayment.reconciledBankTxId ? "Reconciled" : "Pending Statement Line"}
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              {selectedPayment.reconciledBankTxId ? "Matched with MT940 line" : "Awaiting statement match"}
            </p>
          </div>
        </div>

        {/* Main Details Body */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="space-y-6">
            {/* Beneficiary & Banking Details */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#10231d] border-b border-gray-100 pb-3">
                Beneficiary Banking &amp; Dual Control Verification
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-[#68726d]">Beneficiary Supplier</p>
                  <p className="font-bold text-[#10231d] mt-1">{selectedPayment.vendorName}</p>
                </div>
                <div>
                  <p className="text-[#68726d]">Receiving Bank</p>
                  <p className="font-semibold text-[#10231d] mt-1">
                    {paymentVendor?.verifiedBankName || "Zenith Bank PLC"}
                  </p>
                </div>
                <div>
                  <p className="text-[#68726d]">Account Number</p>
                  <p className="font-semibold font-mono text-[#10231d] mt-1">
                    {paymentVendor?.verifiedAccountNumber || "1014582901"}
                  </p>
                </div>
                <div>
                  <p className="text-[#68726d]">Execution Date</p>
                  <p className="font-semibold text-[#10231d] mt-1">{selectedPayment.scheduledDate}</p>
                </div>
                <div>
                  <p className="text-[#68726d]">Security Review</p>
                  <p className="font-semibold text-[#087f70] mt-1">
                    Verified bank details · Dual control approved
                  </p>
                </div>
                <div>
                  <p className="text-[#68726d]">Provider Reference</p>
                  <p className="font-mono text-[11px] text-[#10231d] mt-1">
                    {selectedPayment.providerRef || selectedPayment.paymentRef}
                  </p>
                </div>
              </div>
            </div>

            {/* Allocated Bills Table */}
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-[#10231d]">
                  Bills Settled by this Transfer ({selectedPayment.allocations.length})
                </h3>
                <p className="text-xs text-[#68726d]">
                  Decoupled payment allocation preserves original invoice totals while tracking paid balances.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 text-[10px] font-semibold uppercase text-gray-500">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Bill Reference</th>
                      <th className="py-3 px-4">Allocated Payment</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedPayment.allocations.map((alloc) => (
                      <tr key={alloc.billId} className="hover:bg-gray-50/70">
                        <td className="py-3.5 px-4 font-bold text-[#10231d]">
                          {alloc.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-700">
                          {alloc.billNumber}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#087f70]">
                          {formatNgn(alloc.amount)}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge
                            status={selectedPayment.status === "COMPLETED" ? "paid" : "pending"}
                            label={selectedPayment.status === "COMPLETED" ? "Settled" : "Processing"}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* General Ledger Settlement Posting */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-[#10231d] border-b border-gray-100 pb-3">
                General Ledger Impact (2-Stage Settlement)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60 text-[10px] text-gray-500 uppercase">
                      <th className="py-2.5 px-3">Account</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Debit (NGN)</th>
                      <th className="py-2.5 px-3 text-right">Credit (NGN)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold">2000 · Accounts Payable</td>
                      <td className="py-2.5 px-3 font-sans text-gray-600">
                        Reduce supplier liability for {selectedPayment.vendorName}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#10231d]">
                        {formatNgn(selectedPayment.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-400">—</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold">1010 · Operating Cash</td>
                      <td className="py-2.5 px-3 font-sans text-gray-600">
                        Disbursement from {selectedPayment.fundingAccount}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-400">—</td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#10231d]">
                        {formatNgn(selectedPayment.amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Historical Payment Attempts Audit Log */}
            {selectedPayment.attempts && selectedPayment.attempts.length > 0 && (
              <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#10231d]">
                      Payment Gateway Attempts ({selectedPayment.attempts.length})
                    </h3>
                    <p className="text-xs text-[#68726d]">
                      Immutable audit trail of gateway payloads, timestamps, and bank response codes.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60 text-[10px] font-semibold uppercase text-gray-500">
                        <th className="py-3 px-4">Attempt</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Rail / Provider</th>
                        <th className="py-3 px-4">Gateway Reference</th>
                        <th className="py-3 px-4">Response / Error</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedPayment.attempts.map((att) => {
                        const attBadge = mapDemoBadgeStatus(att.status);
                        return (
                          <tr key={att.id} className="hover:bg-gray-50/70">
                            <td className="py-3.5 px-4 font-bold text-[#10231d]">
                              #{att.attemptNumber}
                            </td>
                            <td className="py-3.5 px-4 text-[#68726d] whitespace-nowrap">
                              {att.timestamp}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[#10231d]">
                              {att.gateway}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-gray-700">
                              {att.gatewayRef || "—"}
                            </td>
                            <td className="py-3.5 px-4 text-xs">
                              <span
                                className={
                                  att.status === "FAILED"
                                    ? "text-red-700 font-medium"
                                    : "text-gray-700"
                                }
                              >
                                {att.errorMessage || att.responseMessage}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <StatusBadge status={attBadge.status} label={attBadge.label} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Timeline & Reconciliation Action */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#087f70]">
                Payment Lifecycle
              </span>
              <h4 className="text-sm font-bold text-[#10231d]">Settlement Timeline</h4>
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#10231d]">1. Treasury Payment Run</p>
                    <p className="text-[11px] text-[#68726d] mt-0.5">
                      Batch payout initiated from approved bills.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#10231d]">2. Dual Control Authorization</p>
                    <p className="text-[11px] text-[#68726d] mt-0.5">
                      Verified beneficiary account against bank registry.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <CreditCard className="w-4 h-4 text-[#087f70] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#10231d]">3. NIP Bank Transmission</p>
                    <p className="text-[11px] text-[#68726d] mt-0.5">
                      Dispatched to banking network with provider ref.
                    </p>
                  </div>
                </div>

                <div
                  className={`flex items-start gap-3 p-3 rounded-xl border ${
                    selectedPayment.status === "COMPLETED"
                      ? "bg-emerald-50/70 border-emerald-200"
                      : selectedPayment.status === "FAILED"
                      ? "bg-red-50/70 border-red-200"
                      : "bg-amber-50/70 border-amber-200"
                  }`}
                >
                  {selectedPayment.status === "COMPLETED" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : selectedPayment.status === "FAILED" ? (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-spin" />
                  )}
                  <div>
                    <p className="font-bold text-[#10231d]">
                      4. {selectedPayment.status === "COMPLETED" ? "Settled & Confirmed" : selectedPayment.status === "FAILED" ? "Transfer Declined" : "Awaiting Bank Webhook"}
                    </p>
                    <p className="text-[11px] text-[#68726d] mt-0.5">
                      {selectedPayment.status === "COMPLETED"
                        ? "Bank confirmed funds arrived at beneficiary account."
                        : selectedPayment.status === "FAILED"
                        ? selectedPayment.failureReason || "Bank rejected transfer"
                        : "Temporary state preventing double-spending."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#087f70]">
                Reconciliation
              </span>
              <h4 className="text-sm font-bold text-[#10231d]">Bank Statement Matching</h4>
              <p className="text-xs text-[#68726d]">
                Match this payment against incoming statement lines from your bank feed.
              </p>
              <Button
                type="button"
                onClick={() => {
                  setSelectedPaymentId(null);
                  setSubTab("reconciliation");
                }}
                className="w-full rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9"
              >
                Open Bank Reconciliation &rarr;
              </Button>
            </div>
          </div>
        </div>

        {renderSharedModals()}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-navigation Pill Switcher */}
      <div className="inline-flex p-1 bg-[#f3f4f6] rounded-xl border border-black/[0.04]">
        <button
          type="button"
          onClick={() => setSubTab("payments")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            subTab === "payments"
              ? "bg-white text-[#10231d] shadow-sm"
              : "text-gray-500 hover:text-[#10231d]"
          }`}
        >
          Payments Queue ({payments.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab("reconciliation")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            subTab === "reconciliation"
              ? "bg-white text-[#10231d] shadow-sm"
              : "text-gray-500 hover:text-[#10231d]"
          }`}
        >
          Bank &amp; Card Reconciliation
          {unmatchedCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              {unmatchedCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSubTab("journals")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            subTab === "journals"
              ? "bg-white text-[#10231d] shadow-sm"
              : "text-gray-500 hover:text-[#10231d]"
          }`}
        >
          Accounting Entries ({journals.length})
        </button>
      </div>

      {/* ── SUB-TAB 1: Payments Queue & Dual Control ── */}
      {subTab === "payments" && (
        <div className="space-y-4">
          {pendingVendors.length > 0 && payments.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h2 className="text-sm font-bold text-[#10231d]">
                  Security Review: Vendor Bank Detail Changes
                </h2>
              </div>
              {pendingVendors.map((v) => (
                <div
                  key={v.id}
                  className="p-4 rounded-xl bg-[#fff9e6] border border-amber-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-amber-950">
                      {v.name} — Payouts paused until second reviewer approves bank change
                    </p>
                    <p className="text-amber-900">
                      Current Verified: <strong>{v.verifiedBankName}</strong> (
                      {v.verifiedAccountNumber}) &rarr; Requested:{" "}
                      <strong>{v.pendingBankChange?.newBankName}</strong> (
                      {v.pendingBankChange?.newAccountNumber})
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setVerifyingVendor(v)}
                    className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold shrink-0 h-9 gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" /> Verify &amp; Approve Bank Account
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#10231d]">Bill Payments Queue</h2>
                <p className="text-xs text-[#68726d] mt-0.5">
                  Decoupled payment release, multi-bill batch payouts, dual-control authorization, and banking confirmation checks.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setSelectedBillIdsForRun(payableApprovedBills.map((b) => b.id));
                    setShowPaymentRunModal(true);
                  }}
                  className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-8.5 px-3.5 gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> + Create Payment Run ({payableApprovedBills.length})
                </Button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#f3f4f6] p-1 rounded-xl max-w-full overflow-x-auto shrink-0">
              {[
                { key: "all", label: "All Payments", count: paymentFilterCounts.all },
                {
                  key: "awaiting_release",
                  label: "Awaiting Release",
                  count: paymentFilterCounts.awaiting_release,
                },
                {
                  key: "confirming",
                  label: "Confirming with Bank",
                  count: paymentFilterCounts.confirming,
                },
                {
                  key: "completed",
                  label: "Completed",
                  count: paymentFilterCounts.completed,
                },
                { key: "failed", label: "Failed", count: paymentFilterCounts.failed },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPaymentFilter(tab.key as typeof paymentFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    paymentFilter === tab.key
                      ? "bg-white text-[#10231d] font-semibold shadow-sm"
                      : "text-gray-500 hover:text-gray-900 font-medium"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      paymentFilter === tab.key
                        ? "bg-[#f0faf8] text-[#087f70] font-bold"
                        : "bg-gray-200/70 text-gray-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {filteredPayments.length === 0 ? (
              <div className="py-14 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#f0faf8] mx-auto flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-[#087f70]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#10231d]">No payments match filter</p>
                  <p className="text-xs text-[#68726d] mt-1 max-w-sm mx-auto">
                    Approve a bill in Standard Bills and click Pay to initiate transfers and track
                    confirmations here.
                  </p>
                </div>
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
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                      <th className="py-3 px-4">PAYMENT REF</th>
                      <th className="py-3 px-4">VENDOR</th>
                      <th className="py-3 px-4">BILL PAID</th>
                      <th className="py-3 px-4">AMOUNT</th>
                      <th className="py-3 px-4">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPayments.map((pay) => {
                      const badge = mapDemoBadgeStatus(pay.status);
                      return (
                        <tr
                          key={pay.id}
                          onClick={() => setSelectedPaymentId(pay.id)}
                          className="hover:bg-gray-50/70 cursor-pointer transition-colors"
                        >
                          <td className="py-4 px-4 whitespace-nowrap">
                            <p className="text-xs font-bold text-[#10231d]">{pay.paymentRef}</p>
                            <p className="text-[11px] text-[#68726d]">{pay.scheduledDate}</p>
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-xs font-semibold text-[#10231d]">
                              {pay.vendorName}
                            </p>
                            <p className="text-[11px] text-[#68726d]">{pay.fundingAccount}</p>
                          </td>
                          <td className="py-4 px-4 text-xs text-gray-700">
                            {pay.allocations.map((a) => (
                              <div key={a.billId}>{a.invoiceNumber}</div>
                            ))}
                          </td>
                          <td className="py-4 px-4 text-xs font-bold text-[#10231d] whitespace-nowrap">
                            {formatNgn(pay.amount)}
                          </td>
                          <td className="py-4 px-4">
                            <StatusBadge
                              status={badge.status}
                              label={
                                pay.status === "AWAITING_CONFIRMATION"
                                  ? "Confirming with Bank"
                                  : badge.label
                              }
                            />
                            {pay.failureReason && (
                              <p className="text-[11px] text-red-600 mt-1 max-w-[200px]">
                                {pay.failureReason}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUB-TAB 2: Bank & Card Statement Reconciliation ── */}
      {subTab === "reconciliation" && (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#10231d] flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-[#087f70]" />
                Bank &amp; Corporate Card Reconciliation
              </h2>
              <p className="text-xs text-[#68726d] mt-0.5">
                Match actual bank statement lines and card settlement feeds to your completed Bill
                Payments and approved Company Card Expenses.
              </p>
            </div>
          </div>

          {bankLines.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <p className="text-sm font-semibold text-[#10231d]">
                No bank or card settlement statements yet
              </p>
              <p className="text-xs text-[#68726d] max-w-sm mx-auto">
                Complete a bill payment or record a card purchase to generate statement lines for
                reconciliation.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bankLines.map((line) => {
                const matchingPayment =
                  line.channel === "NIP Bank Transfer"
                    ? payments.find(
                        (p) =>
                          p.status === "COMPLETED" &&
                          !p.reconciledBankTxId &&
                          (p.providerRef === line.reference || p.amount === line.amount),
                      )
                    : undefined;

                const matchingCardExp =
                  line.channel === "Card Settlement Feed"
                    ? companyCardExpenses.find(
                        (e) =>
                          e.reconciliationStatus === "PENDING" &&
                          (e.providerTxId === line.reference || e.amount === line.amount),
                      )
                    : undefined;

                const badge = mapDemoBadgeStatus(
                  line.status === "MATCHED" ? "RECONCILED" : "PENDING",
                );

                return (
                  <div
                    key={line.id}
                    onClick={() => setSelectedBankLine(line)}
                    className="p-4 rounded-xl border border-black/[0.08] hover:border-[#087f70]/40 hover:bg-[#fbfcfb] transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-bold uppercase">
                          {line.channel}
                        </span>
                        <span className="text-xs font-bold text-[#10231d]">
                          {line.description}
                        </span>
                        <StatusBadge status={badge.status} label={badge.label} />
                      </div>
                      <p className="text-[11px] text-[#68726d]">
                        {line.date} · Ref: {line.reference} ·{" "}
                        <strong className="text-[#10231d]">{formatNgn(line.amount)}</strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {line.status === "MATCHED" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#087f70] bg-[#f0faf8] border border-[#c8ece4] px-3 py-1.5 rounded-xl">
                          <CheckCircle2 className="w-4 h-4" /> Reconciled
                        </span>
                      ) : matchingPayment ? (
                        <Button
                          type="button"
                          onClick={() => {
                            reconcileBankLine(line.id, "ap_payment", matchingPayment.id);
                            toast.success(`Matched to ${matchingPayment.paymentRef}`);
                          }}
                          className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-4"
                        >
                          Match to {matchingPayment.paymentRef} ({formatNgn(matchingPayment.amount)})
                        </Button>
                      ) : matchingCardExp ? (
                        <Button
                          type="button"
                          onClick={() => {
                            reconcileBankLine(line.id, "card_expense", matchingCardExp.id);
                            toast.success(`Matched to Card Expense (${matchingCardExp.merchant})`);
                          }}
                          className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-4"
                        >
                          Match to Card Expense: {matchingCardExp.merchant} (
                          {formatNgn(matchingCardExp.amount)})
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" /> Approve or settle matching
                          record first
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SUB-TAB 3: General Ledger Journal Entries ── */}
      {subTab === "journals" && (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="w-5 h-5 text-[#087f70]" />
            <div>
              <h2 className="text-sm font-bold text-[#10231d]">General Ledger Postings</h2>
              <p className="text-xs text-[#68726d]">
                Bills record expense &amp; payable when approved, then clear payable &amp; cash
                when paid.
              </p>
            </div>
          </div>

          {journals.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#68726d]">
              No accounting entries posted yet. Approve a bill or card expense to see journal
              postings.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {journals.map((j) => (
                <div
                  key={j.id}
                  onClick={() => setSelectedJournal(j)}
                  className="p-4 rounded-xl border border-black/[0.08] bg-[#f9faf9] hover:bg-white hover:border-[#087f70]/40 transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#087f70]">
                      {j.stage} · {j.sourceRef}
                    </span>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <StatusBadge
                        status={mapDemoBadgeStatus(j.status).status}
                        label={mapDemoBadgeStatus(j.status).label}
                      />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-[#10231d]">{j.memo}</p>
                  <div className="bg-white rounded-lg border border-black/[0.06] p-2.5 space-y-1 text-[11px] font-mono">
                    {j.lines.map((l, idx) => (
                      <div key={idx} className="flex justify-between gap-2">
                        <span className="text-gray-700 truncate">{l.account}</span>
                        <span className="font-bold text-[#10231d] shrink-0">
                          {l.debit > 0
                            ? `DR ${formatNgn(l.debit)}`
                            : `CR ${formatNgn(l.credit)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {renderSharedModals()}
    </div>
  );
}
