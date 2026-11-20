"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  Pause,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  SkipForward,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
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
import { type DemoRecurringSchedule, type DemoRecurringOccurrence } from "./demo-data";
import { formatNgn, mapDemoBadgeStatus } from "./demo-utils";

export function DemoRecurringBillsTab({
  onLoadSampleData,
  selectedScheduleId: externalSelectedScheduleId,
  onSelectScheduleId: externalOnSelectScheduleId,
}: {
  onLoadSampleData?: () => void;
  selectedScheduleId?: string | null;
  onSelectScheduleId?: (id: string | null) => void;
}) {
  const {
    schedules,
    occurrences,
    vendors,
    createRecurringSchedule,
    toggleScheduleStatus,
    generateAndSimulateCycle,
    skipOccurrence,
    updateRecurringScheduleSeries,
  } = useBillPayDemoStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("Cloud Backup Service");
  const [vendorId, setVendorId] = useState(vendors[1]?.id || "vnd_mainone");
  const [frequency, setFrequency] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [amountType, setAmountType] = useState<"fixed" | "variable">("variable");
  const [expectedAmount, setExpectedAmount] = useState("150000");
  const [invoiceRequired, setInvoiceRequired] = useState(true);
  const [approvalMode, setApprovalMode] = useState<
    "each_occurrence" | "auto_within_tolerance"
  >("auto_within_tolerance");

  const [internalSelectedScheduleId, setInternalSelectedScheduleId] = useState<string | null>(null);

  const selectedScheduleId =
    externalSelectedScheduleId !== undefined
      ? externalSelectedScheduleId
      : internalSelectedScheduleId;

  const setSelectedScheduleId = useCallback((id: string | null) => {
    if (externalOnSelectScheduleId) externalOnSelectScheduleId(id);
    setInternalSelectedScheduleId(id);
  }, [externalOnSelectScheduleId]);
  const [cycleTarget, setCycleTarget] = useState<DemoRecurringSchedule | null>(null);
  const [cycleAmount, setCycleAmount] = useState("180000");

  // Skip Occurrence modal state
  const [skippingOccurrence, setSkippingOccurrence] = useState<DemoRecurringOccurrence | null>(null);
  const [skipReason, setSkipReason] = useState("Vendor agreed to waive fee for this period");

  // Edit Schedule Terms (Series vs This Occurrence) modal state
  const [isEditingTerms, setIsEditingTerms] = useState(false);
  const [editScope, setEditScope] = useState<"series" | "this_occurrence">("series");
  const [editExpectedAmount, setEditExpectedAmount] = useState("");
  const [editTolerance, setEditTolerance] = useState("5");

  function handleConfirmSkip() {
    if (!skippingOccurrence) return;
    const res = skipOccurrence(skippingOccurrence.id, skipReason, "Sodiq Atiku (Owner)");
    if (res.ok) {
      toast.success(res.message);
      setSkippingOccurrence(null);
    } else {
      toast.error(res.message);
    }
  }

  function handleSaveTerms() {
    if (!selectedSchedule) return;
    const numAmt = Number(editExpectedAmount);
    if (Number.isNaN(numAmt) || numAmt <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    const numTol = Number(editTolerance) || 5;
    const upcomingOcc = scheduleOccurrences.find(
      (o) => o.status === "UPCOMING" || o.status === "VARIANCE_HOLD",
    );
    const res = updateRecurringScheduleSeries(
      selectedSchedule.id,
      { expectedAmount: numAmt, tolerancePercent: numTol },
      editScope,
      upcomingOcc?.id,
    );
    if (res.ok) {
      toast.success(res.message);
      setIsEditingTerms(false);
    } else {
      toast.error(res.message);
    }
  }

  function handleCreate() {
    const amt = Number(expectedAmount);
    if (!name.trim() || Number.isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid schedule name and expected amount.");
      return;
    }
    createRecurringSchedule({
      name: name.trim(),
      vendorId,
      department: "Engineering",
      category: "Utilities & Telecom",
      glAccount: "6210 · Bandwidth & Telecom",
      frequency,
      amountType,
      expectedAmount: amt,
      invoiceRequired,
      approvalMode,
      tolerancePercent: 5,
    });
    toast.success("Recurring bill schedule created");
    setShowCreateModal(false);
  }

  function handleGenerateBill(customAmount?: number, scheduleId?: string) {
    const targetId = scheduleId || cycleTarget?.id || selectedSchedule?.id;
    if (!targetId) return;
    const msg = generateAndSimulateCycle(targetId, customAmount);
    if (msg.includes("HOLD") || msg.includes("Finance Review") || msg.includes("renewed_approval")) {
      toast.warning(msg);
    } else {
      toast.success(msg);
    }
    setCycleTarget(null);
  }

  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId) || null;
  const scheduleVendor = selectedSchedule
    ? vendors.find((v) => v.id === selectedSchedule.vendorId)
    : null;
  const scheduleOccurrences = selectedSchedule
    ? occurrences.filter((o) => o.scheduleId === selectedSchedule.id)
    : [];

  useEffect(() => {
    if (selectedScheduleId) {
      useHeaderBackStore.getState().setBackHandler(() => {
        setSelectedScheduleId(null);
      }, "Recurring Schedules");
      return () => {
        useHeaderBackStore.getState().clearBackHandler();
      };
    } else {
      useHeaderBackStore.getState().clearBackHandler();
    }
  }, [selectedScheduleId, setSelectedScheduleId]);

  if (selectedSchedule) {
    const badge = mapDemoBadgeStatus(selectedSchedule.status);
    return (
      <div className="space-y-6">
        {/* Top Navigation & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-[#10231d]">
                {selectedSchedule.name}
              </h2>
              <StatusBadge status={badge.status} label={badge.label} />
              <span className="text-xs text-[#68726d]">
                · {selectedSchedule.vendorName}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditExpectedAmount(String(selectedSchedule.expectedAmount));
                setEditTolerance(String(selectedSchedule.tolerancePercent));
                setIsEditingTerms(true);
              }}
              className="rounded-xl border-gray-200 text-xs font-semibold h-9 px-4 gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#087f70]" /> Edit Terms (Series / Cycle)
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => toggleScheduleStatus(selectedSchedule.id)}
              className="rounded-xl border-gray-200 text-xs font-semibold h-9 px-4 gap-1.5"
            >
              {selectedSchedule.status === "ACTIVE" ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause Schedule
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Resume Schedule
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setCycleTarget(selectedSchedule);
                setCycleAmount(String(selectedSchedule.expectedAmount));
              }}
              className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-4 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Generate Next Bill
            </Button>
          </div>
        </div>

        {/* Contract Expiration & Auto-Renewal Policy Alert */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-950">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Contract Term:</strong> Active through{" "}
              {selectedSchedule.contractEndDate || "May 31, 2027"} &bull;{" "}
              {selectedSchedule.autoRenew ?? true ? "Auto-Renews Annually" : "Fixed Term (No Auto-Renew)"}{" "}
              &bull; Notice Period: {selectedSchedule.cancellationNoticeDays || 30} days advance cancellation required.
            </span>
          </div>
          <span className="font-semibold text-[10px] text-emerald-900 bg-emerald-200/60 px-2 py-0.5 rounded">
            Commercial Commitment Active
          </span>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Expected Amount
            </p>
            <p className="text-lg font-bold text-[#10231d] mt-1">
              {formatNgn(selectedSchedule.expectedAmount)}
            </p>
            <p className="text-[11px] text-[#087f70] font-medium mt-0.5 capitalize">
              {selectedSchedule.amountType} Amount
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Billing Frequency
            </p>
            <p className="text-lg font-bold text-[#10231d] mt-1 capitalize">
              {selectedSchedule.frequency}
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              Day {selectedSchedule.billingDay} · Next: {selectedSchedule.nextOccurrenceDate}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Approval Mode
            </p>
            <p className="text-base font-bold text-[#10231d] mt-1">
              {selectedSchedule.approvalMode === "auto_within_tolerance"
                ? `Auto-Approve (±${selectedSchedule.tolerancePercent}%)`
                : "Manual Approval Each Cycle"}
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              Variance threshold policy
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-black/[0.06] shadow-sm">
            <p className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">
              Invoice Rule
            </p>
            <p className="text-base font-bold text-[#10231d] mt-1">
              {selectedSchedule.invoiceRequired
                ? "Supplier PDF Required"
                : "Contract Auto-Bill"}
            </p>
            <p className="text-[11px] text-[#68726d] mt-0.5">
              {selectedSchedule.invoiceRequired
                ? "Matched via Email/Portal"
                : "No invoice required to pay"}
            </p>
          </div>
        </div>

        {/* Main Details Body */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="space-y-6">
            {/* Commercial Terms & Allocation */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#10231d] border-b border-gray-100 pb-3">
                Schedule Rules &amp; Accounting Allocation
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-[#68726d]">Supplier</p>
                  <p className="font-bold text-[#10231d] mt-1">{selectedSchedule.vendorName}</p>
                </div>
                <div>
                  <p className="text-[#68726d]">Department</p>
                  <p className="font-semibold text-[#10231d] mt-1">{selectedSchedule.department}</p>
                </div>
                <div>
                  <p className="text-[#68726d]">Expense Category</p>
                  <p className="font-semibold text-[#10231d] mt-1">{selectedSchedule.category}</p>
                </div>
                <div>
                  <p className="text-[#68726d]">Expense GL Account</p>
                  <p className="font-semibold text-[#10231d] mt-1">{selectedSchedule.glAccount}</p>
                </div>
                <div>
                  <p className="text-[#68726d]">Verified Settlement Bank</p>
                  <p className="font-semibold text-[#10231d] mt-1">
                    {scheduleVendor?.verifiedBankName || "Zenith Bank PLC"} (
                    {scheduleVendor?.verifiedAccountNumber || "1014582901"})
                  </p>
                </div>
                <div>
                  <p className="text-[#68726d]">Tolerance Rule</p>
                  <p className="font-semibold text-[#10231d] mt-1">
                    ±{selectedSchedule.tolerancePercent}% variance threshold
                  </p>
                </div>
              </div>
            </div>

            {/* Generated Billing Cycles for this schedule */}
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#10231d]">
                    Billing History for this Schedule ({scheduleOccurrences.length})
                  </h3>
                  <p className="text-xs text-[#68726d]">
                    Each period creates an independent payable bill without overwriting schedule terms.
                  </p>
                </div>
              </div>

              {scheduleOccurrences.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#68726d]">
                  No cycles generated yet for this schedule. Click <strong>Generate Next Bill</strong> to simulate a cycle.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60 text-[10px] font-semibold uppercase text-gray-500">
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4">Expected</th>
                        <th className="py-3 px-4">Actual Billed</th>
                        <th className="py-3 px-4">Variance</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {scheduleOccurrences.map((occ) => {
                        const occBadge = mapDemoBadgeStatus(occ.status);
                        const vp = occ.variancePercent ?? 0;
                        const varPositive = vp > 0;
                        return (
                          <tr key={occ.id} className="hover:bg-gray-50/70">
                            <td className="py-3 px-4 font-semibold text-[#10231d]">
                              {occ.periodLabel}
                              <span className="block text-[11px] font-normal text-[#68726d]">
                                Due {occ.expectedDate}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-700">
                              {formatNgn(occ.expectedAmount)}
                            </td>
                            <td className="py-3 px-4 font-bold text-[#10231d]">
                              {formatNgn(occ.actualAmount)}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  Math.abs(vp) > 15
                                    ? "bg-red-50 text-red-700"
                                    : Math.abs(vp) > 5
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                {varPositive ? `+${vp}%` : `${vp}%`}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge status={occBadge.status} label={occBadge.label} />
                            </td>
                            <td className="py-3 px-4 text-right">
                              {occ.status === "SKIPPED" ? (
                                <span className="text-[11px] text-gray-500 italic">
                                  Skipped: {occ.skippedReason || "Fee waived"}
                                </span>
                              ) : occ.status === "UPCOMING" || occ.status === "VARIANCE_HOLD" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSkippingOccurrence(occ)}
                                  className="rounded-lg text-[11px] h-7 px-2.5 border-gray-200 text-gray-700 hover:text-amber-800 hover:border-amber-300 gap-1 inline-flex"
                                >
                                  <SkipForward className="w-3 h-3 text-amber-600" />
                                  <span>Skip Cycle</span>
                                </Button>
                              ) : (
                                <span className="text-[11px] text-gray-400">—</span>
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

            {/* Upcoming 90-Day Cash Flow Projection */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-sm space-y-4">
              <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#10231d]">
                    Upcoming 90-Day Cash Flow Projection
                  </h3>
                  <p className="text-xs text-[#68726d] mt-0.5">
                    Anticipated treasury cash outlays for this recurring obligation across future quarters.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#087f70]">
                  3-Month Outlay: {formatNgn(selectedSchedule.expectedAmount * 3)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Month 1 (Next Cycle)</span>
                  <p className="text-sm font-bold text-[#10231d]">{formatNgn(selectedSchedule.expectedAmount)}</p>
                  <p className="text-[11px] text-[#68726d]">Expected: {selectedSchedule.nextOccurrenceDate}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Month 2</span>
                  <p className="text-sm font-bold text-[#10231d]">{formatNgn(selectedSchedule.expectedAmount)}</p>
                  <p className="text-[11px] text-[#68726d]">Projected Recurring Cycle</p>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Month 3</span>
                  <p className="text-sm font-bold text-[#10231d]">{formatNgn(selectedSchedule.expectedAmount)}</p>
                  <p className="text-[11px] text-[#68726d]">Projected Recurring Cycle</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Policies & Test Trigger */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#087f70]">
                Enterprise Policy
              </span>
              <h4 className="text-sm font-bold text-[#10231d]">
                How Recurring Vendor Obligations Work
              </h4>
              <p className="text-xs text-[#68726d] leading-relaxed">
                Rather than treating recurring commitments as static bills, the platform tracks this schedule as an active commitment template.
              </p>
              <div className="p-3 rounded-xl bg-[#f0faf8] border border-[#087f70]/20 text-xs text-[#065f55] space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Variance Tolerance
                </p>
                <p>
                  Any cycle billed within ±{selectedSchedule.tolerancePercent}% auto-approves. A variance above 15% places the bill on <strong>Variance Hold</strong> for approval.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-[#10231d]">Test Cycle Simulation</h4>
              <p className="text-xs text-[#68726d]">
                Generate an immediate payable bill for this schedule to test variance handling.
              </p>
              <div className="space-y-2 pt-1">
                <Button
                  type="button"
                  onClick={() => handleGenerateBill(selectedSchedule.expectedAmount, selectedSchedule.id)}
                  className="w-full rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9"
                >
                  Generate at Normal ({formatNgn(selectedSchedule.expectedAmount)})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleGenerateBill(Math.round(selectedSchedule.expectedAmount * 1.72), selectedSchedule.id)}
                  className="w-full rounded-xl border-amber-300 text-amber-800 hover:bg-amber-50 text-xs font-semibold h-9"
                >
                  Test Price Spike (+72% Hold)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleGenerateBill(Math.round(selectedSchedule.expectedAmount * 0.75), selectedSchedule.id)}
                  className="w-full rounded-xl border-blue-200 text-blue-800 hover:bg-blue-50 text-xs font-semibold h-9"
                >
                  Test Price Drop (-25% Variance)
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Skip Occurrence Modal */}
        <Dialog
          open={Boolean(skippingOccurrence)}
          onOpenChange={(open) => !open && setSkippingOccurrence(null)}
        >
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                  <SkipForward className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-[#10231d]">
                    Skip Recurring Cycle: {skippingOccurrence?.periodLabel}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#68726d]">
                    Temporarily skip this occurrence without cancelling or modifying future contract terms.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 border border-black/[0.06] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#68726d]">Schedule:</span>
                  <span className="font-semibold text-[#10231d]">{selectedSchedule.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68726d]">Expected Outlay:</span>
                  <span className="font-bold text-[#087f70]">{formatNgn(skippingOccurrence?.expectedAmount || 0)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-gray-700">Reason for Skipping Occurrence</label>
                <input
                  type="text"
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  placeholder="e.g. Supplier waived fee, contract pause, settled offline"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSkippingOccurrence(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSkip}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
              >
                Confirm Skip Cycle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Terms Modal (Series vs This Occurrence) */}
        <Dialog
          open={isEditingTerms}
          onOpenChange={(open) => !open && setIsEditingTerms(false)}
        >
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#f0faf8] flex items-center justify-center text-[#087f70]">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-[#10231d]">
                    Edit Terms: {selectedSchedule.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#68726d]">
                    Choose whether modifications apply to the entire series or just the upcoming billing cycle.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-gray-700">Scope of Change</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditScope("series")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      editScope === "series"
                        ? "border-[#087f70] bg-[#f0faf8] font-bold text-[#087f70]"
                        : "border-gray-200 text-gray-700"
                    }`}
                  >
                    <p className="font-bold text-xs">Entire Series</p>
                    <p className="text-[10px] text-gray-500 font-normal mt-0.5">Applies to all future cycles</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditScope("this_occurrence")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      editScope === "this_occurrence"
                        ? "border-[#087f70] bg-[#f0faf8] font-bold text-[#087f70]"
                        : "border-gray-200 text-gray-700"
                    }`}
                  >
                    <p className="font-bold text-xs">This Cycle Only</p>
                    <p className="text-[10px] text-gray-500 font-normal mt-0.5">One-time override</p>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-gray-700">Expected Billed Amount (₦)</label>
                <input
                  type="number"
                  value={editExpectedAmount}
                  onChange={(e) => setEditExpectedAmount(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold"
                />
              </div>

              {editScope === "series" && (
                <div className="space-y-1.5">
                  <label className="font-semibold text-gray-700">Variance Tolerance (± %)</label>
                  <input
                    type="number"
                    value={editTolerance}
                    onChange={(e) => setEditTolerance(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold"
                  />
                  <p className="text-[10px] text-[#68726d]">
                    Deviations beyond ±{editTolerance}% will trigger a Variance Hold.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditingTerms(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveTerms}
                className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold"
              >
                Save Schedule Terms
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generate Cycle Modal if opened */}
        <Dialog
          open={Boolean(cycleTarget)}
          onOpenChange={(open) => !open && setCycleTarget(null)}
        >
          <DialogContent className="max-w-md rounded-2xl">
            {cycleTarget && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-[#10231d]">
                    Generate Cycle: {cycleTarget.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#68726d]">
                    Expected amount: {formatNgn(cycleTarget.expectedAmount)}. Enter actual billed
                    amount.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Actual Amount (NGN)</label>
                    <input
                      type="number"
                      value={cycleAmount}
                      onChange={(e) => setCycleAmount(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCycleTarget(null)}
                    className="rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleGenerateBill(Number(cycleAmount))}
                    className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold"
                  >
                    Create Bill
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Schedules Card */}
      <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#10231d]">Recurring Bill Schedules</h2>
            <p className="text-xs text-[#68726d] mt-0.5">
              Track repeating supplier bills like office rent or internet. Each billing period
              generates its own bill and flags unusual price increases automatically.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-4 gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" /> New Recurring Bill
          </Button>
        </div>

        {schedules.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#f0faf8] mx-auto flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-[#087f70]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#10231d]">No recurring bills yet</p>
              <p className="text-xs text-[#68726d] mt-1 max-w-sm mx-auto">
                Set up a recurring vendor bill to anticipate monthly rent, utilities, or internet
                invoices and catch unexpected price increases.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-9 px-4 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Set Up Recurring Bill
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
                  <th className="py-3 px-4">SCHEDULE</th>
                  <th className="py-3 px-4">VENDOR</th>
                  <th className="py-3 px-4">EXPECTED</th>
                  <th className="py-3 px-4">INVOICE RULE</th>
                  <th className="py-3 px-4">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {schedules.map((sch) => {
                  const badge = mapDemoBadgeStatus(sch.status);
                  return (
                    <tr
                      key={sch.id}
                      onClick={() => setSelectedScheduleId(sch.id)}
                      className="hover:bg-gray-50/70 cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-4">
                        <p className="text-xs font-bold text-[#10231d]">{sch.name}</p>
                        <p className="text-[11px] text-[#68726d] capitalize">
                          {sch.frequency} · Next: {sch.nextOccurrenceDate}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-xs font-semibold text-[#10231d]">{sch.vendorName}</p>
                        <p className="text-[11px] text-[#68726d]">{sch.department}</p>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="text-xs font-bold text-[#10231d]">
                          {formatNgn(sch.expectedAmount)}
                        </p>
                        <p className="text-[11px] text-[#68726d] capitalize">{sch.amountType}</p>
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-700 whitespace-nowrap">
                        {sch.invoiceRequired ? "Vendor sends invoice" : "Auto-bill on contract"}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StatusBadge status={badge.status} label={badge.label} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generated Billing History Card */}
      {occurrences.length > 0 && (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#10231d]">Billing Cycle History</h3>
            <p className="text-xs text-[#68726d] mt-0.5">
              Each cycle tracks expected vs. actual invoice amounts separately without changing the
              master schedule.
            </p>
          </div>

          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                  <th className="py-3 px-4">PERIOD</th>
                  <th className="py-3 px-4">SCHEDULE</th>
                  <th className="py-3 px-4">EXPECTED</th>
                  <th className="py-3 px-4">ACTUAL BILLED</th>
                  <th className="py-3 px-4">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {occurrences.map((occ) => {
                  const sch = schedules.find((s) => s.id === occ.scheduleId);
                  const badge = mapDemoBadgeStatus(occ.status);
                  return (
                    <tr key={occ.id} className="hover:bg-gray-50/70">
                      <td className="py-3.5 px-4 text-xs font-semibold text-[#10231d]">
                        {occ.periodLabel}
                        <span className="block text-[11px] font-normal text-[#68726d]">
                          Due {occ.expectedDate}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-800">{sch?.name || "—"}</td>
                      <td className="py-3.5 px-4 text-xs font-medium text-gray-700">
                        {formatNgn(occ.expectedAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-[#10231d]">
                        {occ.actualAmount != null
                          ? formatNgn(occ.actualAmount)
                          : "Awaiting invoice"}
                        {occ.variancePercent != null && occ.variancePercent !== 0 && (
                          <span
                            className={`ml-1.5 text-[11px] font-bold ${
                              Math.abs(occ.variancePercent) > 15
                                ? "text-red-600"
                                : "text-amber-700"
                            }`}
                          >
                            ({occ.variancePercent > 0 ? "+" : ""}
                            {occ.variancePercent}%)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={badge.status} label={badge.label} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generate Next Bill Modal */}
      <Dialog
        open={Boolean(cycleTarget)}
        onOpenChange={(open) => !open && setCycleTarget(null)}
      >
        <DialogContent className="max-w-md rounded-2xl">
          {cycleTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-[#10231d]">
                  Generate Next Bill · {cycleTarget.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#68726d]">
                  Expected amount: <strong>{formatNgn(cycleTarget.expectedAmount)}</strong>. Create
                  the next period&apos;s bill in Standard Bills.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                {cycleTarget.invoiceRequired ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleGenerateBill(cycleTarget.expectedAmount)}
                        className="rounded-xl text-xs h-9 border-emerald-200 bg-emerald-50/50 text-emerald-800"
                      >
                        Exact Amount
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          handleGenerateBill(Math.round(cycleTarget.expectedAmount * 1.12))
                        }
                        className="rounded-xl text-xs h-9 border-amber-200 bg-amber-50/60 text-amber-900"
                      >
                        +12% Higher
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          handleGenerateBill(Math.round(cycleTarget.expectedAmount * 1.72))
                        }
                        className="rounded-xl text-xs h-9 border-red-200 bg-red-50/60 text-red-800"
                      >
                        +72% Spike
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">
                        Invoice Amount for This Period (₦)
                      </label>
                      <input
                        type="number"
                        value={cycleAmount}
                        onChange={(e) => setCycleAmount(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs font-semibold"
                      />
                    </div>
                  </>
                ) : (
                  <p className="p-3 rounded-xl bg-[#f0faf8] border border-[#c8ece4] text-xs text-[#065f55]">
                    This schedule does not wait for a monthly invoice PDF. Generating this cycle
                    creates an approved bill for{" "}
                    <strong>{formatNgn(cycleTarget.expectedAmount)}</strong> ready for payment.
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCycleTarget(null)}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    handleGenerateBill(
                      cycleTarget.invoiceRequired
                        ? Number(cycleAmount)
                        : cycleTarget.expectedAmount,
                    )
                  }
                  className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold"
                >
                  Create Period Bill
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Schedule Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#10231d]">
              Set Up Recurring Bill
            </DialogTitle>
            <DialogDescription className="text-xs text-[#68726d]">
              Schedule a recurring vendor bill so Finance knows what invoices to expect each cycle.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-gray-700">Schedule Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-gray-700">Vendor</label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Frequency</label>
              <Select
                value={frequency}
                onValueChange={(v) => setFrequency(v as typeof frequency)}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                  <SelectItem value="quarterly" className="text-xs">Quarterly</SelectItem>
                  <SelectItem value="yearly" className="text-xs">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Billing Type</label>
              <Select
                value={amountType}
                onValueChange={(v) => setAmountType(v as typeof amountType)}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="variable" className="text-xs">Variable (changes monthly)</SelectItem>
                  <SelectItem value="fixed" className="text-xs">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Expected Amount (₦)</label>
              <input
                type="number"
                value={expectedAmount}
                onChange={(e) => setExpectedAmount(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Invoice Required?</label>
              <Select
                value={invoiceRequired ? "yes" : "no"}
                onValueChange={(v) => setInvoiceRequired(v === "yes")}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="yes" className="text-xs">Yes, wait for vendor invoice</SelectItem>
                  <SelectItem value="no" className="text-xs">No, generate from contract</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-gray-700">Approval Rule</label>
              <Select
                value={approvalMode}
                onValueChange={(v) => setApprovalMode(v as typeof approvalMode)}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="auto_within_tolerance" className="text-xs">
                    Auto-approve when within 5% of expected amount
                  </SelectItem>
                  <SelectItem value="each_occurrence" className="text-xs">
                    Require approval every cycle
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              className="rounded-xl bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold"
            >
              Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
