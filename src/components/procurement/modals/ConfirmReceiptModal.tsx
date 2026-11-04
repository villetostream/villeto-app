import { useEffect, useRef, useState } from "react";
import { PackageCheck, Loader2, UploadCloud, FileText, X, ChevronLeft, AlertCircle, Layers, CheckCircle2 } from "lucide-react";
import { type ConfirmReceiptPayload, type ReceiptLineItem } from "@/queries/procurement/purchase-orders";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const REJECTION_CATEGORIES = [
  { value: "damaged", label: "Damaged in transit" },
  { value: "missing", label: "Missing from shipment" },
  { value: "quality_failure", label: "Defective / Quality failure" },
  { value: "wrong_item", label: "Wrong item delivered" },
  { value: "wrong_specification", label: "Wrong specification" },
  { value: "expired_item", label: "Expired item" },
  { value: "incomplete_package", label: "Incomplete package" },
  { value: "other", label: "Other (specify below)" },
] as const;

type ModalStep = "input" | "discrepancy_warning" | "rejection_reason";
type RejectionMode = "all_same" | "per_item";

interface PerItemRejection {
  category: string;
  reason: string;
}

export default function ConfirmReceiptModal({
  open,
  onClose,
  onConfirm,
  isPending,
  lineItems,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: ConfirmReceiptPayload) => void;
  isPending: boolean;
  lineItems: any[];
}) {
  const [step, setStep] = useState<ModalStep>("input");
  const [receivedAt, setReceivedAt] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState("");
  const [receiptReference, setReceiptReference] = useState("");

  // Quantities & raw input string states to avoid leading zeros like "030"
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries((lineItems || []).map((li: any) => [
      li.vendorDeliveryNoticeLineItemId,
      li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity ?? 1,
    ]))
  );
  const [inputStrings, setInputStrings] = useState<Record<string, string>>(() =>
    Object.fromEntries((lineItems || []).map((li: any) => [
      li.vendorDeliveryNoticeLineItemId,
      String(li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity ?? 1),
    ]))
  );

  // Exception fields (global / shared)
  const [rejectionMode, setRejectionMode] = useState<RejectionMode>("all_same");
  const [rejectionCategory, setRejectionCategory] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Exception fields (per line item)
  const [perItemRejections, setPerItemRejections] = useState<Record<string, PerItemRejection>>({});

  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("input");
    setReceivedAt(new Date());
    setNotes("");
    setRejectionMode("all_same");
    setRejectionCategory("");
    setRejectionReason("");
    setPerItemRejections({});
    setAttachedFile(null);

    const initialQuantities = Object.fromEntries(
      (lineItems || []).map((li: any) => [
        li.vendorDeliveryNoticeLineItemId,
        li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity ?? 1,
      ])
    );
    setQuantities(initialQuantities);
    setInputStrings(
      Object.fromEntries(
        (lineItems || []).map((li: any) => [
          li.vendorDeliveryNoticeLineItemId,
          String(li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity ?? 1),
        ])
      )
    );

    setReceiptReference(
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `RCV-${Date.now()}`
    );
  }, [open, lineItems]);

  const totalSubmitted = (lineItems || []).reduce((acc: number, li: any) => {
    return acc + Number(li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity ?? 1);
  }, 0);

  const totalAccepted = (lineItems || []).reduce((acc: number, li: any) => {
    const maxQty = Number(li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity ?? 1);
    const val = quantities[li.vendorDeliveryNoticeLineItemId];
    return acc + (val !== undefined ? val : maxQty);
  }, 0);

  const totalRejected = Math.max(0, totalSubmitted - totalAccepted);
  const hasExceptions = totalRejected > 0;
  const isFullRejection = totalSubmitted > 0 && totalAccepted === 0;

  // Track which line items have rejections
  const rejectedLineItems = (lineItems || []).filter((li: any) => {
    const maxQty = Number(li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity ?? 1);
    const val = quantities[li.vendorDeliveryNoticeLineItemId];
    const accepted = val !== undefined ? val : maxQty;
    return maxQty - accepted > 0;
  });

  // Handle number input without leading zeros ("030" bug)
  const handleQuantityChange = (id: string, rawVal: string, maxQty: number) => {
    const digitsOnly = rawVal.replace(/[^\d]/g, "");
    const cleaned = digitsOnly.replace(/^0+(?=\d)/, "");

    if (cleaned === "") {
      setInputStrings((prev) => ({ ...prev, [id]: "" }));
      setQuantities((prev) => ({ ...prev, [id]: 0 }));
      return;
    }

    const num = Math.min(maxQty, Math.max(0, parseInt(cleaned, 10) || 0));
    setInputStrings((prev) => ({ ...prev, [id]: String(num) }));
    setQuantities((prev) => ({ ...prev, [id]: num }));
  };

  const handleQuantityBlur = (id: string, maxQty: number) => {
    const currentStr = inputStrings[id];
    if (currentStr === "" || currentStr === undefined) {
      setInputStrings((prev) => ({ ...prev, [id]: "0" }));
      setQuantities((prev) => ({ ...prev, [id]: 0 }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10MB limit. Please upload a smaller file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setAttachedFile(file);
  };

  const handleProceedFromInput = () => {
    if (!receivedAt) {
      toast.error("Please select a received date.");
      return;
    }

    if (hasExceptions) {
      setStep("discrepancy_warning");
    } else {
      handleFinalSubmit();
    }
  };

  const isReasonStepValid = () => {
    if (!hasExceptions) return true;
    if (rejectionMode === "all_same" || rejectedLineItems.length === 1) {
      return !!rejectionCategory && rejectionReason.trim().length > 0;
    }
    return rejectedLineItems.every((li) => {
      const itemData = perItemRejections[li.vendorDeliveryNoticeLineItemId];
      return !!itemData?.category && itemData?.reason?.trim().length > 0;
    });
  };

  const handleFinalSubmit = () => {
    if (!receivedAt) return;

    const itemsToSubmit: ReceiptLineItem[] = (lineItems || []).map((li: any) => {
      const maxQty = Number(li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity ?? 1);
      const acceptedQty = quantities[li.vendorDeliveryNoticeLineItemId] !== undefined
        ? quantities[li.vendorDeliveryNoticeLineItemId]
        : maxQty;
      const rejectedQty = Math.max(0, maxQty - acceptedQty);

      let itemReason: string | undefined = undefined;
      if (rejectedQty > 0) {
        if (rejectionMode === "per_item" && rejectedLineItems.length > 1) {
          const custom = perItemRejections[li.vendorDeliveryNoticeLineItemId];
          const catLabel = REJECTION_CATEGORIES.find((c) => c.value === custom?.category)?.label || custom?.category;
          itemReason = `${catLabel || "Rejection"}: ${custom?.reason || ""}`.trim();
        } else {
          const categoryObj = REJECTION_CATEGORIES.find((c) => c.value === rejectionCategory);
          itemReason = `${categoryObj?.label || rejectionCategory || "Rejection"}: ${rejectionReason}`.trim();
        }
      }

      return {
        fulfillmentLineItemId: li.vendorDeliveryNoticeLineItemId,
        name: li.name,
        quantityReceived: acceptedQty,
        quantityAccepted: acceptedQty,
        quantityRejected: rejectedQty,
        rejectionReason: itemReason,
        notes: undefined,
      };
    }).filter((li: any) => isFullRejection ? true : li.quantityReceived > 0);

    let auditSummary = "";
    if (hasExceptions) {
      if (rejectionMode === "per_item" && rejectedLineItems.length > 1) {
        const itemSummaries = rejectedLineItems.map((li) => {
          const custom = perItemRejections[li.vendorDeliveryNoticeLineItemId];
          const catLabel = REJECTION_CATEGORIES.find((c) => c.value === custom?.category)?.label || custom?.category || "Rejected";
          return `${li.name}: [${catLabel}] ${custom?.reason || ""}`;
        }).join("; ");
        auditSummary = `[Multi-Item Exceptions] ${itemSummaries}`;
      } else {
        const categoryObj = REJECTION_CATEGORIES.find((c) => c.value === rejectionCategory);
        auditSummary = `[Inspection Finding: ${categoryObj?.label || rejectionCategory || "Rejected"}] ${rejectionReason.trim()}`;
      }
    }

    const combinedNotes = [auditSummary, notes.trim(), attachedFile ? `Attachment: ${attachedFile.name}` : ""]
      .filter(Boolean)
      .join(" | ");

    onConfirm({
      receiptReference,
      receivedAt: receivedAt.toISOString(),
      notes: combinedNotes || undefined,
      hasExceptions,
      rejectionCategory: rejectionCategory || undefined,
      rejectionReason: auditSummary || undefined,
      rejectedQuantity: totalRejected,
      acceptedQuantity: totalAccepted,
      attachmentName: attachedFile?.name,
      lineItems: itemsToSubmit,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden gap-0 bg-white border-0 shadow-2xl rounded-[16px]">
        {/* STEP 1: QUANTITY INPUT & LINE ITEMS */}
        {step === "input" && (
          <div className="flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-black/[0.05] shrink-0">
              <DialogHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
                <div className="w-10 h-10 rounded-full bg-[#f0faf8] flex items-center justify-center shrink-0">
                  <PackageCheck className="w-5 h-5 text-[#087f70]" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-[#0b100e]">
                    Confirm Delivery Receipt
                  </DialogTitle>
                  <DialogDescription className="text-sm text-[#68726d] mt-1">
                    Enter the quantities received for each line item. Any difference from what the vendor submitted will be flagged for review.
                  </DialogDescription>
                </div>
              </DialogHeader>

              {/* Date Received */}
              <div className="space-y-1 mt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-[#0b100e]">
                    Date Received <span className="text-[#d33d44]">*</span>
                  </Label>
                  <span className="text-[11px] text-[#89918d]">Defaults to today</span>
                </div>
                <DatePicker
                  date={receivedAt}
                  setDate={setReceivedAt}
                  disabled={isPending}
                />
                <p className="text-[11px] text-[#89918d]">
                  Change only if the shipment physically arrived at the facility on an earlier date.
                </p>
              </div>
            </div>

            {/* Scrollable Body: Line Items & Notes */}
            <div className="p-6 py-4 flex-1 overflow-y-auto min-h-0 [scrollbar-width:thin] [scrollbar-color:#d1d5db_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-black/15 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent space-y-4">
              {/* Line Items */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-[#0b100e]">Line Items</Label>
                  {hasExceptions && (
                    <span className="text-xs font-semibold text-[#e14856] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {totalRejected} {totalRejected === 1 ? "unit" : "units"} marked for rejection
                    </span>
                  )}
                </div>
                <div className="border border-black/[0.06] rounded-[12px] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#f9faf9] border-b border-black/[0.06]">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#68726d]">Item</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-[#68726d]">Submitted</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-[#68726d] w-36">Accepted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(lineItems || []).map((li: any) => {
                        const maxQty = Number(li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity ?? 1);
                        const currentVal = quantities[li.vendorDeliveryNoticeLineItemId] ?? maxQty;
                        const isShort = currentVal < maxQty;
                        const displayString = inputStrings[li.vendorDeliveryNoticeLineItemId] !== undefined
                          ? inputStrings[li.vendorDeliveryNoticeLineItemId]
                          : String(currentVal);

                        return (
                          <tr
                            key={li.vendorDeliveryNoticeLineItemId}
                            className="border-b border-black/[0.04] last:border-0 hover:bg-[#fcfcfc] transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-[#0b100e] align-middle">
                              {li.name}
                            </td>
                            <td className="px-4 py-3 text-center text-[#68726d] align-middle font-medium">
                              {maxQty}
                            </td>
                            <td className="px-4 py-2 text-center align-middle">
                              <div className="flex flex-col items-center">
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={displayString}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      li.vendorDeliveryNoticeLineItemId,
                                      e.target.value,
                                      maxQty
                                    )
                                  }
                                  onBlur={() =>
                                    handleQuantityBlur(
                                      li.vendorDeliveryNoticeLineItemId,
                                      maxQty
                                    )
                                  }
                                  disabled={isPending}
                                  className={`w-24 text-center rounded-[10px] text-sm font-semibold transition-colors ${
                                    isShort
                                      ? "border-[#e14856] text-[#e14856] bg-red-50/30 focus-visible:ring-red-200"
                                      : "border-black/[0.08]"
                                  }`}
                                />
                                {isShort && (
                                  <span className="text-[10px] text-[#e14856] font-semibold mt-1">
                                    {maxQty - currentVal} rejected
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#0b100e]">
                  Notes <span className="text-[#68726d] font-normal">(optional)</span>
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes about the delivery…"
                  rows={2}
                  disabled={isPending}
                  className="resize-none rounded-[12px] border-black/[0.06] py-2.5 text-sm"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 pt-3 border-t border-black/[0.05] flex items-center justify-end gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isPending}
                className="px-6 border-black/[0.08] hover:bg-[#f9faf9] h-11 rounded-[12px] font-medium"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProceedFromInput}
                disabled={!receivedAt || isPending || (totalSubmitted > 0 && totalAccepted < 0)}
                className={`px-6 font-semibold h-11 rounded-[12px] transition-colors ${
                  isFullRejection
                    ? "bg-[#d33d44] hover:bg-[#b83339] text-white"
                    : "bg-[#087f70] hover:bg-[#076a5e] text-white"
                }`}
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {hasExceptions
                  ? isFullRejection
                    ? "Review Rejection in Full"
                    : `Review Rejection (${totalRejected} units)`
                  : "Confirm Full Receipt"}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: DISCREPANCY WARNING (NO OUTER SCROLLBAR - ONLY LINE ITEMS SCROLL) */}
        {step === "discrepancy_warning" && (
          <div className="flex flex-col">
            {/* Top Fixed Area */}
            <div className="p-7 sm:p-8 pb-3 space-y-4 text-center">
              {/* Warning Circle Icon */}
              <div className="w-16 h-16 rounded-full bg-[#f59e0b] flex items-center justify-center mx-auto shadow-sm">
                <span className="text-3xl font-black text-white leading-none pb-0.5 select-none">!</span>
              </div>

              {/* Title & Description */}
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-bold text-[#0b100e]">
                  {isFullRejection ? "Rejecting the Entire Delivery?" : "Rejecting the Remaining Quantity?"}
                </h2>
                <p className="text-xs sm:text-sm text-[#68726d] max-w-md mx-auto leading-relaxed">
                  {isFullRejection
                    ? "You have marked 0 accepted units. The entire fulfillment will be rejected and the vendor will be notified."
                    : "You’ve entered a quantity less than the delivered amount. The remaining quantity will be rejected and the vendor will be notified."}
                </p>
              </div>

              {/* 3-Column Mint Metric Card */}
              <div className="grid grid-cols-3 bg-[#e8f7f5] rounded-[16px] py-3 px-2 border border-[#cbf0eb]">
                <div className="px-2">
                  <p className="text-xs text-[#68726d] font-medium">Delivered</p>
                  <p className="text-xl sm:text-2xl font-bold text-[#0b100e] mt-1">{totalSubmitted}</p>
                </div>
                <div className="px-2 border-x border-[#cbf0eb]">
                  <p className="text-xs text-[#68726d] font-medium">Accepted</p>
                  <p className="text-xl sm:text-2xl font-bold text-[#087f70] mt-1">{totalAccepted}</p>
                </div>
                <div className="px-2">
                  <p className="text-xs text-[#68726d] font-medium">Rejected</p>
                  <p className="text-xl sm:text-2xl font-bold text-[#e14856] mt-1">{totalRejected}</p>
                </div>
              </div>
            </div>

            {/* Middle Scrollable Area: ONLY the Line Items Breakdown Scrolls */}
            <div className="px-7 sm:px-8 py-1">
              <div className="bg-[#f9faf9] rounded-[14px] p-3 border border-black/[0.06] space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#68726d] uppercase tracking-wider px-1">
                  <span>Line Items ({lineItems.length})</span>
                  <span>Inspection Outcome</span>
                </div>
                {/* Scrollable list with slim scrollbar only when items exceed 3 */}
                <div className="space-y-1.5 max-h-[145px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#d1d5db_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-black/15 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent pr-1">
                  {(lineItems || []).map((li: any) => {
                    const maxQty = Number(li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity ?? 1);
                    const accepted = quantities[li.vendorDeliveryNoticeLineItemId] ?? maxQty;
                    const rejected = maxQty - accepted;
                    const isItemShort = rejected > 0;
                    return (
                      <div
                        key={li.vendorDeliveryNoticeLineItemId}
                        className="flex items-center justify-between text-xs py-2 px-3 rounded-[10px] bg-white border border-black/[0.04]"
                      >
                        <div className="min-w-0 pr-3">
                          <p className="font-semibold text-[#0b100e] truncate">{li.name}</p>
                          <p className="text-[11px] text-[#68726d]">
                            {accepted} of {maxQty} accepted
                          </p>
                        </div>
                        <div className="shrink-0">
                          {isItemShort ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-[#e14856] border border-red-200/50">
                              {rejected} rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#f0faf8] text-[#087f70] border border-[#087f70]/20">
                              <CheckCircle2 className="w-3 h-3 text-[#087f70]" /> Full receipt
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions: Fixed Bottom */}
            <div className="p-7 sm:p-8 pt-4 flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("input")}
                disabled={isPending}
                className="flex-1 h-11 sm:h-12 rounded-[14px] border-black/15 font-semibold text-[#0b100e] hover:bg-black/[0.03] text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setStep("rejection_reason")}
                disabled={isPending}
                className="flex-1 h-11 sm:h-12 rounded-[14px] bg-[#00b29a] hover:bg-[#009b86] text-white font-semibold text-sm shadow-sm"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: REASON FOR REJECTION (FIXED HEADER + SCROLLABLE ITEMS BODY) */}
        {step === "rejection_reason" && (
          <div className="flex flex-col max-h-[85vh]">
            {/* FIXED HEADER: Title, Subtitle, and Multi-item Mode Switcher Banner */}
            <div className="p-6 sm:p-7 pb-4 border-b border-black/[0.06] space-y-3 bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-[#0b100e]">Reason for Rejection</h2>
                <p className="text-xs sm:text-sm text-[#68726d] mt-1 leading-relaxed">
                  Please provide a reason for rejecting the delivery. This will be shared with the vendor to acknowledge or dispute the rejection.
                </p>
              </div>

              {/* Multi-Item Header Banner with Toggle (Fixed in the header) */}
              {rejectedLineItems.length > 1 && (
                <div className="bg-[#f0faf8] rounded-[12px] p-2.5 sm:p-3 border border-[#087f70]/20 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#0b100e] flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#087f70]" />
                    {rejectedLineItems.length} items have rejected quantities
                  </span>
                  <div className="flex items-center bg-white rounded-lg p-0.5 border border-black/[0.08] text-xs">
                    <button
                      type="button"
                      onClick={() => setRejectionMode("all_same")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        rejectionMode === "all_same"
                          ? "bg-[#087f70] text-white shadow-xs"
                          : "text-[#68726d] hover:text-[#0b100e]"
                      }`}
                    >
                      Same reason for all
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectionMode("per_item")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        rejectionMode === "per_item"
                          ? "bg-[#087f70] text-white shadow-xs"
                          : "text-[#68726d] hover:text-[#0b100e]"
                      }`}
                    >
                      Specific per item
                    </button>
                  </div>
                </div>
              )}

              {/* Single Item Header Badge (Fixed in the header) */}
              {rejectedLineItems.length === 1 && (
                <div className="px-3.5 py-2 bg-[#f0faf8] rounded-[10px] border border-[#087f70]/20 text-xs text-[#087f70] flex items-center justify-between">
                  <span>
                    Rejection applies to: <strong className="text-[#0b100e]">{rejectedLineItems[0].name}</strong>
                  </span>
                  <span className="font-bold text-[#e14856]">{totalRejected} units rejected</span>
                </div>
              )}
            </div>

            {/* SCROLLABLE BODY: Only the line item inputs & attachment box scroll */}
            <div className="p-6 sm:p-7 py-4 flex-1 overflow-y-auto min-h-0 [scrollbar-width:thin] [scrollbar-color:#d1d5db_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-black/15 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent space-y-4">
              {/* FORM: ALL SAME REASON (DEFAULT / SINGLE ITEM) */}
              {(rejectionMode === "all_same" || rejectedLineItems.length <= 1) && (
                <div className="space-y-4">
                  {/* Structured Category Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-[#0b100e]">
                      Rejection Category <span className="text-[#d33d44]">*</span>
                    </Label>
                    <Select
                      value={rejectionCategory}
                      onValueChange={setRejectionCategory}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-full h-11 rounded-[12px] border-black/[0.12] bg-white text-sm font-medium">
                        <SelectValue placeholder="Select a reason category…" />
                      </SelectTrigger>
                      <SelectContent className="rounded-[12px] shadow-lg">
                        {REJECTION_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value} className="text-sm py-2">
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Enter Rejection Reason Textarea */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold text-[#0b100e]">
                      Enter Rejection Reason <span className="text-[#68726d] font-normal">(Required)</span>
                    </Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Write note here......."
                      rows={3}
                      disabled={isPending}
                      className="resize-none rounded-[14px] border-black/[0.12] py-2.5 px-3.5 text-sm placeholder:text-[#89918d] focus-visible:ring-[#00b29a]/30 focus-visible:border-[#00b29a]"
                    />
                  </div>
                </div>
              )}

              {/* FORM: PER-ITEM REJECTION REASONS */}
              {rejectionMode === "per_item" && rejectedLineItems.length > 1 && (
                <div className="space-y-3.5">
                  {rejectedLineItems.map((li: any) => {
                    const maxQty = Number(li.quantityAwaitingReceipt ?? li.quantityReady ?? li.quantity ?? 1);
                    const accepted = quantities[li.vendorDeliveryNoticeLineItemId] ?? maxQty;
                    const itemRejected = maxQty - accepted;
                    const currentItemData = perItemRejections[li.vendorDeliveryNoticeLineItemId] || {
                      category: "",
                      reason: "",
                    };

                    return (
                      <div
                        key={li.vendorDeliveryNoticeLineItemId}
                        className="p-3.5 rounded-[12px] border border-black/[0.08] bg-[#fcfcfc] space-y-2.5"
                      >
                        <div className="flex items-center justify-between pb-1 border-b border-black/[0.05]">
                          <span className="font-semibold text-xs text-[#0b100e]">{li.name}</span>
                          <span className="text-[11px] font-bold text-[#e14856] bg-red-50 px-2 py-0.5 rounded-full border border-red-200/50">
                            {itemRejected} rejected
                          </span>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-[#0b100e]">
                            Category for {li.name} <span className="text-[#d33d44]">*</span>
                          </Label>
                          <Select
                            value={currentItemData.category}
                            onValueChange={(val) =>
                              setPerItemRejections((prev) => ({
                                ...prev,
                                [li.vendorDeliveryNoticeLineItemId]: {
                                  ...prev[li.vendorDeliveryNoticeLineItemId],
                                  category: val,
                                  reason: prev[li.vendorDeliveryNoticeLineItemId]?.reason || "",
                                },
                              }))
                            }
                            disabled={isPending}
                          >
                            <SelectTrigger className="w-full h-9 rounded-[8px] border-black/[0.12] bg-white text-xs font-medium">
                              <SelectValue placeholder="Select reason category…" />
                            </SelectTrigger>
                            <SelectContent className="rounded-[10px] shadow-lg">
                              {REJECTION_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value} className="text-xs py-1.5">
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-[#0b100e]">
                            Rejection Reason for {li.name} <span className="text-[#d33d44]">*</span>
                          </Label>
                          <Textarea
                            value={currentItemData.reason}
                            onChange={(e) =>
                              setPerItemRejections((prev) => ({
                                ...prev,
                                [li.vendorDeliveryNoticeLineItemId]: {
                                  category: prev[li.vendorDeliveryNoticeLineItemId]?.category || "",
                                  reason: e.target.value,
                                },
                              }))
                            }
                            placeholder={`Specify why ${li.name} was rejected…`}
                            rows={2}
                            disabled={isPending}
                            className="resize-none rounded-[8px] border-black/[0.12] py-1.5 px-2.5 text-xs"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Attachment Section */}
              <div className="space-y-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isPending}
                />

                <div className="border border-dashed border-[#00b29a] rounded-[14px] p-3.5 flex items-center justify-between bg-[#f0faf8]/30">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-white border border-[#00b29a]/30 flex items-center justify-center shrink-0 shadow-xs">
                      <UploadCloud className="w-4 h-4 text-[#00b29a]" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#0b100e]">Add attachment</p>
                      <p className="text-[11px] text-[#68726d]">PDF, JPG or PNG (max. 10MB)</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPending}
                    className="h-8 px-3.5 rounded-[8px] border-[#00b29a] text-[#00b29a] hover:bg-[#00b29a]/10 font-semibold text-xs transition-colors"
                  >
                    upload
                  </Button>
                </div>

                {attachedFile && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-[8px] bg-[#f9faf9] border border-black/[0.06] text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-[#00b29a] shrink-0" />
                      <span className="font-medium text-[#0b100e] truncate">{attachedFile.name}</span>
                      <span className="text-[#89918d] shrink-0">
                        ({(attachedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-[#68726d] hover:text-[#e14856] ml-2 p-1 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* FIXED FOOTER */}
            <div className="p-6 sm:p-7 pt-3 pb-5 border-t border-black/[0.06] flex items-center justify-between gap-3 bg-white shrink-0">
              <Button
                variant="outline"
                type="button"
                onClick={() => setStep("discrepancy_warning")}
                disabled={isPending}
                className="h-11 px-4 rounded-[12px] border-black/15 font-semibold text-sm hover:bg-black/[0.03]"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>

              <Button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isPending || !isReasonStepValid()}
                className={`h-11 px-6 rounded-[12px] font-semibold text-sm transition-colors shadow-sm ${
                  !isReasonStepValid()
                    ? "bg-[#cfd4d1] text-white cursor-not-allowed"
                    : isFullRejection
                    ? "bg-[#d33d44] hover:bg-[#b83339] text-white"
                    : "bg-[#087f70] hover:bg-[#076a5e] text-white"
                }`}
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isFullRejection ? "Reject Delivery" : "Submit Partial Acceptance"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
