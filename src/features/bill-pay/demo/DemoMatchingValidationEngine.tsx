"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  PackageCheck,
  FileText,
  ShieldCheck,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type DemoBill } from "./demo-data";
import { formatNgn } from "./demo-utils";
import { useBillPayDemoStore } from "./useBillPayDemoStore";

interface MatchingEngineProps {
  bill: DemoBill;
}

export function DemoMatchingValidationEngine({ bill }: MatchingEngineProps) {
  const {
    simulateRemainingDelivery,
    resolveThreeWayAcceptReceived,
    applyVendorCreditNote,
    approveBill,
  } = useBillPayDemoStore();

  const [isReceivingGoods, setIsReceivingGoods] = useState(false);
  const [isApplyingCredit, setIsApplyingCredit] = useState(false);

  const isPoBacked = bill.supportType === "po_backed" || !!bill.poReference;
  const isVoucher =
    bill.supportType === "no_invoice_voucher" || bill.invoiceAttached === false;
  const isNonPo = !isPoBacked && !isVoucher;

  // Determine current match status
  const hasException = bill.matchingStatus === "EXCEPTION_HOLD";
  const isApproved = bill.approvalStatus === "APPROVED";

  // PO Line simulation values
  const firstLine = bill.poReference?.lines?.[0];
  const poQty = firstLine?.poOrderedQty ?? 10;
  const grnQty = firstLine?.grAcceptedQty ?? (hasException ? 6 : 10);
  const invoicedQty = firstLine?.invoicedQty ?? 10;
  const unitPrice =
    firstLine?.unitPrice ??
    (bill.originalAmount > 0 && invoicedQty > 0
      ? Math.round(bill.originalAmount / invoicedQty)
      : bill.originalAmount);

  const poNumber = bill.poReference?.poNumber || "PO-1794469015843-317";

  const qtyVariance = invoicedQty - grnQty;
  const unreceivedAmount = qtyVariance * unitPrice;

  // Handle live interactive simulation: Warehouse delivery
  function handleSimulateDelivery() {
    setIsReceivingGoods(true);
    setTimeout(() => {
      simulateRemainingDelivery(bill.id);
      setIsReceivingGoods(false);
      toast.success(
        `Warehouse goods receipt updated: ${qtyVariance} additional units accepted on GRN-843-317! 3-Way Match passed.`,
      );
    }, 600);
  }

  // Handle live interactive simulation: Accept 6 and adjust
  function handleAcceptReceived() {
    resolveThreeWayAcceptReceived(bill.id);
    toast.info("Invoice approved for received quantity (6 units) with variance flagged for credit.");
  }

  // Handle live interactive simulation: Vendor credit note
  function handleApplyCreditNote() {
    setIsApplyingCredit(true);
    setTimeout(() => {
      applyVendorCreditNote(
        bill.id,
        unreceivedAmount,
        `Credit note for ${qtyVariance} unreceived units on PO ${poNumber}`,
      );
      setIsApplyingCredit(false);
      toast.success(
        `Vendor Credit Note applied: ${formatNgn(unreceivedAmount)}. Invoice balance adjusted!`,
      );
    }, 600);
  }

  return (
    <div className="bg-white rounded-2xl border border-black/[0.08] shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-[#fbfcfb]">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isPoBacked
                ? "bg-[#f0faf8] text-[#087f70]"
                : isVoucher
                ? "bg-[#f5f3ff] text-[#7c3aed]"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {isPoBacked ? (
              <PackageCheck className="w-4 h-4" />
            ) : isVoucher ? (
              <ShieldCheck className="w-4 h-4" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#10231d]">
                {isPoBacked
                  ? "3-Way Matching Engine (PO ↔ GRN ↔ Invoice)"
                  : isVoucher
                  ? "Payment Voucher & Statutory Mandate Validation"
                  : "2-Way Non-PO Expense Policy Validation"}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  hasException
                    ? "bg-amber-100 text-amber-900 border border-amber-200"
                    : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                }`}
              >
                {hasException ? "Exception Hold" : "Validation Passed"}
              </span>
            </div>
            <p className="text-xs text-[#68726d] mt-0.5">
              {isPoBacked
                ? `Matched against Purchase Order ${poNumber}`
                : isVoucher
                ? `Backing Reference: ${bill.voucherReference || "Statutory Mandate"}`
                : "Direct Non-PO expense validated against department budget and approval thresholds."}
            </p>
          </div>
        </div>

        {/* Dynamic tolerance pill */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-[#68726d]">Tolerance Rule:</span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800">
            {isPoBacked ? "Price ±2% / Qty 0% strict" : "Budget & Hash Match"}
          </span>
        </div>
      </div>

      {/* Main Validation Body */}
      <div className="p-5 space-y-5">
        {/* Exception Alert Banner if 3-Way Match Failed */}
        {hasException && isPoBacked && (
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-amber-900">
                  3-Way Match Discrepancy: Goods Receipt Shortage Detected
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  The supplier invoiced for <strong>{invoicedQty} units</strong>, but warehouse inspection
                  reports on Goods Receipt Note <strong>GRN-843-317</strong> confirm only{" "}
                  <strong>{grnQty} units</strong> were delivered and accepted.{" "}
                  <strong>{qtyVariance} units ({formatNgn(unreceivedAmount)})</strong> remain unreceived.
                </p>
              </div>
            </div>

            {/* Live Interactive Actions */}
            <div className="pt-2 border-t border-amber-200/60 flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] font-semibold text-amber-900">
                Test Exception Resolution Flows:
              </span>
              <Button
                type="button"
                size="sm"
                disabled={isReceivingGoods}
                onClick={handleSimulateDelivery}
                className="rounded-lg bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-8 gap-1.5"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                {isReceivingGoods ? "Receiving Goods…" : "📦 Receive Remaining 4 Units in Warehouse"}
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isApplyingCredit}
                onClick={handleApplyCreditNote}
                className="rounded-lg border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-semibold h-8 gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                {isApplyingCredit ? "Applying…" : `Request Credit Note (${formatNgn(unreceivedAmount)})`}
              </Button>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleAcceptReceived}
                className="text-xs font-medium text-amber-800 hover:text-amber-950 h-8"
              >
                Accept Delivered 6 Units Only
              </Button>
            </div>
          </div>
        )}

        {/* Success Banner if Passed */}
        {!hasException && isPoBacked && (
          <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-xs font-semibold text-emerald-900">
                3-Way Match 100% Passed: Purchase Order, Warehouse Delivery, and Invoiced Amounts perfectly reconcile.
              </p>
            </div>
            {!isApproved && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  approveBill(bill.id, "Sodiq Atiku (Finance Specialist)");
                  toast.success("Bill approved! Now ready for payment release.");
                }}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-7 px-3"
              >
                Approve Bill
              </Button>
            )}
          </div>
        )}

        {/* Non-PO Policy Success */}
        {isNonPo && (
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-blue-900">
                  Non-PO Policy Check: Approved within Department Budget ({bill.department})
                </p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Vendor invoice hash verified unique. No duplicate submissions found in 90-day ledger.
                </p>
              </div>
            </div>
            {!isApproved && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  approveBill(bill.id, "Sodiq Atiku (Finance Specialist)");
                  toast.success("Bill approved! Now ready for payment release.");
                }}
                className="rounded-lg bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold h-7 px-3"
              >
                Approve Bill
              </Button>
            )}
          </div>
        )}

        {/* Payment Voucher Justification */}
        {isVoucher && (
          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-950 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-purple-900">
                  Statutory / Contractual Obligation Backing Verified
                </p>
                <p className="text-[11px] text-purple-700 mt-0.5">
                  Voucher type: <strong>{bill.voucherType || "Statutory Fee"}</strong> &middot; Backing Ref:{" "}
                  <strong>{bill.voucherReference || "LAWMA/REV/2026-Q4"}</strong>
                </p>
              </div>
            </div>
            {!isApproved && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  approveBill(bill.id, "Sodiq Atiku (Finance Specialist)");
                  toast.success("Payment Voucher authorized! Ready for treasury payout.");
                }}
                className="rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold h-7 px-3"
              >
                Authorize Voucher
              </Button>
            )}
          </div>
        )}

        {/* Line Items Comparison Matrix (The Core UI the user requested) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#68726d]">
              Line-Item Reconciliation Matrix
            </h4>
            <span className="text-[11px] text-[#84908a]">
              Source Currency: <strong>NGN (₦)</strong>
            </span>
          </div>

          <div className="border border-black/[0.08] rounded-xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#f9faf9] border-b border-black/[0.06] text-left text-[11px] font-bold text-[#68726d]">
                    <th className="px-3.5 py-2.5">Line Description</th>
                    <th className="px-3.5 py-2.5">PO Commitment</th>
                    <th className="px-3.5 py-2.5">Warehouse Received (GRN)</th>
                    <th className="px-3.5 py-2.5">Vendor Invoiced</th>
                    <th className="px-3.5 py-2.5">Variance</th>
                    <th className="px-3.5 py-2.5 text-right">Match Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isPoBacked ? (
                    <tr>
                      <td className="px-3.5 py-3">
                        <p className="font-semibold text-[#10231d]">
                          Dell Precision 5820 Workstations
                        </p>
                        <p className="text-[11px] text-[#68726d]">SKU: HW-DELL-5820-TOWER</p>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <p className="font-semibold text-[#10231d]">{poQty} units</p>
                        <p className="text-[11px] text-[#68726d]">@{formatNgn(unitPrice)}</p>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <p
                          className={`font-semibold ${
                            grnQty < invoicedQty ? "text-amber-700 font-bold" : "text-emerald-700"
                          }`}
                        >
                          {grnQty} units accepted
                        </p>
                        <p className="text-[11px] text-[#68726d]">Doc: GRN-843-317</p>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <p className="font-semibold text-[#10231d]">{invoicedQty} units</p>
                        <p className="text-[11px] text-[#68726d]">@{formatNgn(unitPrice)}</p>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        {qtyVariance > 0 ? (
                          <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            +{qtyVariance} unreceived ({formatNgn(unreceivedAmount)})
                          </span>
                        ) : (
                          <span className="text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            0.0% (Exact match)
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        {hasException ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> Exception Hold
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Matched OK
                          </span>
                        )}
                      </td>
                    </tr>
                  ) : isVoucher ? (
                    <tr>
                      <td className="px-3.5 py-3">
                        <p className="font-semibold text-[#10231d]">
                          {bill.voucherType === "statutory_fee"
                            ? "Lagos State Waste Management (LAWMA) Monthly Commercial Levy"
                            : "Contractual Lease Tenancy Installment"}
                        </p>
                        <p className="text-[11px] text-[#68726d]">
                          Backing: {bill.voucherReference || "Statutory Gazette #2026-LAWMA"}
                        </p>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap text-[#68726d]">N/A (Non-PO)</td>
                      <td className="px-3.5 py-3 whitespace-nowrap text-[#68726d]">
                        Statutory Mandate
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <p className="font-semibold text-[#10231d]">
                          {formatNgn(bill.originalAmount)}
                        </p>
                        <p className="text-[11px] text-[#68726d]">Single Voucher</p>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className="text-purple-800 font-semibold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                          Authorized Levy
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-100 px-2.5 py-1 rounded-full">
                          <ShieldCheck className="w-3 h-3" /> Validated
                        </span>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td className="px-3.5 py-3">
                        <p className="font-semibold text-[#10231d]">{bill.category}</p>
                        <p className="text-[11px] text-[#68726d]">GL: {bill.glAccount}</p>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap text-[#68726d]">
                        Direct Non-PO Expense
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap text-[#68726d]">
                        Services Rendered
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <p className="font-semibold text-[#10231d]">
                          {formatNgn(bill.originalAmount)}
                        </p>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className="text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Within Budget
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Validated
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Matrix Summary Footer */}
            <div className="px-4 py-3 bg-[#fbfcfb] border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 text-[#68726d]">
                <span>
                  Invoice Total:{" "}
                  <strong className="text-[#10231d]">{formatNgn(bill.originalAmount)}</strong>
                </span>
                {bill.creditApplied > 0 && (
                  <span className="text-emerald-700 font-semibold">
                    Credit Notes: -{formatNgn(bill.creditApplied)}
                  </span>
                )}
                <span>
                  Net Payable:{" "}
                  <strong className="text-[#10231d]">{formatNgn(bill.outstandingAmount)}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#68726d]">
                  {hasException ? (
                    <span className="text-amber-800 font-semibold">
                      Action Required: Resolve warehouse receipt or request credit note
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> All accounting controls satisfied
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
