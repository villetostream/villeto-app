"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Gavel,
  Loader2,
  Scale,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  usePOReceiptDetail,
  useFulfillmentExceptionDetail,
  useSubmitReceiptFinalDecision,
  useUploadReceiptExceptionEvidence,
  type DeliveryReceiptRecord,
  type FinalDecisionChoice,
  type ReceiptEvidenceItem,
} from "@/queries/procurement/purchase-orders";

const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024; // 5 MB

const formatExceptionReason = (raw?: string | null) => {
  if (!raw) return "";
  return raw.replace(/^Other\s*\(specify below\)\s*:\s*/i, "").trim();
};

const pluralize = (count: number | string, singular: string, plural?: string) => {
  const n = Number(count) || 0;
  return `${n} ${n === 1 ? singular : (plural || `${singular}s`)}`;
};

interface LineAllocationState {
  quantityAccepted: number;
  quantityRejected: number;
  quantityMissing: number;
  recommendedDisposition?: "backorder" | "forfeit" | "";
  reason: string;
}

export default function CompanyFinalDecisionModal({
  open,
  onClose,
  purchaseOrderId,
  receipt,
}: {
  open: boolean;
  onClose: () => void;
  purchaseOrderId: string;
  receipt: DeliveryReceiptRecord | any;
}) {
  const deliveryReceiptId = receipt?.deliveryReceiptId || receipt?.id || "";

  const { data: receiptDetail } = usePOReceiptDetail(
    open ? purchaseOrderId : undefined,
    open ? deliveryReceiptId : undefined,
  );
  const { data: exceptionDetail } = useFulfillmentExceptionDetail(
    open ? deliveryReceiptId : undefined,
  );

  const effectiveReceipt: DeliveryReceiptRecord =
    exceptionDetail || receiptDetail || receipt || {};

  const finalDecisionMut = useSubmitReceiptFinalDecision(purchaseOrderId);
  const uploadEvidenceMut = useUploadReceiptExceptionEvidence(purchaseOrderId);

  const [decision, setDecision] = useState<FinalDecisionChoice>("uphold_buyer_finding");
  const [reason, setReason] = useState("");
  const [allocations, setAllocations] = useState<Record<string, LineAllocationState>>({});
  const [extraEvidence, setExtraEvidence] = useState<
    Array<ReceiptEvidenceItem & { localName: string; localSize: number }>
  >([]);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; label: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const receiptLines = effectiveReceipt?.lineItems || [];

  const resolveLineReceiptId = (li: any): string => {
    if (!li) return "";
    const direct =
      li.deliveryReceiptLineItemId ||
      li.receiptLineItemId ||
      li.id ||
      li.deliveryReceiptLineId;
    if (direct) return String(direct);

    // Fallback: match in exceptionDetail or receiptDetail
    const fallbackList = [
      ...(exceptionDetail?.lineItems || []),
      ...(receiptDetail?.lineItems || []),
    ] as any[];

    const match = fallbackList.find(
      (dl) =>
        (li.purchaseOrderLineItemId && dl.purchaseOrderLineItemId === li.purchaseOrderLineItemId) ||
        (li.fulfillmentLineItemId && dl.fulfillmentLineItemId === li.fulfillmentLineItemId) ||
        (li.name && dl.name === li.name)
    );

    return String(
      match?.deliveryReceiptLineItemId ||
      match?.receiptLineItemId ||
      match?.id ||
      ""
    );
  };

  const getLineAlloc = (li: any): LineAllocationState => {
    const resolvedId = resolveLineReceiptId(li);
    const keys = [
      resolvedId,
      li?.deliveryReceiptLineItemId,
      li?.receiptLineItemId,
      li?.id,
      li?.purchaseOrderLineItemId,
      li?.fulfillmentLineItemId,
      li?.name,
    ].filter(Boolean) as string[];

    for (const k of keys) {
      if (allocations[k]) return allocations[k];
    }

    const qtyRejected = Number(li?.quantityRejected ?? 0);
    const qtyMissing = Number(li?.quantityMissing ?? 0);
    const hasShortfall = qtyRejected > 0 || qtyMissing > 0;

    return {
      quantityAccepted: Number(li?.quantityAccepted ?? 0),
      quantityRejected: qtyRejected,
      quantityMissing: qtyMissing,
      recommendedDisposition: hasShortfall
        ? ((li?.recommendedDisposition as any) || "backorder")
        : "",
      reason: "",
    };
  };

  // Helper to get total declared units for a receipt line item
  const getLineDeclaredTotal = (li: any) => {
    const sum =
      Number(li.quantityAccepted ?? 0) +
      Number(li.quantityRejected ?? 0) +
      Number(li.quantityMissing ?? 0);
    if (sum > 0) return sum;
    return Number(li.quantityReceived ?? li.quantityOrdered ?? 0);
  };

  // A line is already settled only if a final decision was already recorded on the receipt,
  // or if resolution is fully resolved, or if it had no rejected/missing units.
  const isLineAlreadySettled = (li: any): boolean => {
    if (effectiveReceipt?.finalDecision) return true;
    const res = li?.resolutionStatus;
    if (
      res === "resolved" ||
      res === "resolved_after_dispute" ||
      res === "not_required"
    ) {
      return true;
    }
    if (
      Number(li?.quantityRejected ?? 0) === 0 &&
      Number(li?.quantityMissing ?? 0) === 0
    ) {
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!open) return;
    setDecision("uphold_buyer_finding");
    setReason("");
    setExtraEvidence([]);

    const initial: Record<string, LineAllocationState> = {};
    for (const li of receiptLines) {
      const resolvedId = resolveLineReceiptId(li);
      const anyLi = li as any;
      const keys = [
        resolvedId,
        anyLi.deliveryReceiptLineItemId,
        anyLi.receiptLineItemId,
        anyLi.id,
        anyLi.purchaseOrderLineItemId,
        anyLi.fulfillmentLineItemId,
      ].filter(Boolean);

      const qtyAccepted = Number(li.quantityAccepted ?? 0);
      const qtyRejected = Number(li.quantityRejected ?? 0);
      const qtyMissing = Number(li.quantityMissing ?? 0);
      const hasShortfall = qtyRejected > 0 || qtyMissing > 0;

      const state: LineAllocationState = {
        quantityAccepted: qtyAccepted,
        quantityRejected: qtyRejected,
        quantityMissing: qtyMissing,
        recommendedDisposition: hasShortfall
          ? (anyLi.recommendedDisposition || "backorder")
          : "",
        reason: "",
      };

      for (const k of keys) {
        initial[k] = state;
      }
    }
    setAllocations(initial);
  }, [open, deliveryReceiptId, exceptionDetail, receiptDetail]);

  const handleDecisionSwitch = (nextDecision: FinalDecisionChoice) => {
    setDecision(nextDecision);
    const updated: Record<string, LineAllocationState> = {};

    for (const li of receiptLines) {
      const resolvedId = resolveLineReceiptId(li);
      const anyLi = li as any;
      const keys = [
        resolvedId,
        anyLi.deliveryReceiptLineItemId,
        anyLi.receiptLineItemId,
        anyLi.id,
        anyLi.purchaseOrderLineItemId,
        anyLi.fulfillmentLineItemId,
      ].filter(Boolean);

      const totalDeclared = getLineDeclaredTotal(li);
      const origAccepted = Number(li.quantityAccepted ?? 0);
      const origRejected = Number(li.quantityRejected ?? 0);
      const origMissing = Number(li.quantityMissing ?? 0);
      const currentAlloc = getLineAlloc(li);
      const currentReason = currentAlloc.reason;

      let state: LineAllocationState;
      if (nextDecision === "uphold_buyer_finding" || isLineAlreadySettled(li)) {
        const hasShortfall = origRejected > 0 || origMissing > 0;
        state = {
          quantityAccepted: origAccepted,
          quantityRejected: origRejected,
          quantityMissing: origMissing,
          recommendedDisposition: hasShortfall
            ? (currentAlloc.recommendedDisposition || anyLi.recommendedDisposition || "backorder")
            : "",
          reason: currentReason || "",
        };
      } else if (nextDecision === "accept_vendor_dispute") {
        const disputeEvent = [...(effectiveReceipt?.decisionHistory || receipt?.decisionHistory || [])]
          .reverse()
          .find((h: any) => h.event === "vendor_disputed");
        const proposedItem = disputeEvent?.proposedLineItems?.find((p: any) => {
          const pId = String(p.deliveryReceiptLineItemId || p.lineItemId || p.id || "");
          const lId = String(resolveLineReceiptId(li) || anyLi.deliveryReceiptLineItemId || "");
          const poId = String(anyLi.purchaseOrderLineItemId || "");
          return (pId && (pId === lId || pId === poId)) || (p.name && p.name === anyLi.name);
        });

        if (proposedItem) {
          const propAccepted = Number(proposedItem.quantityAccepted ?? origAccepted);
          const propRejected = Number(proposedItem.quantityRejected ?? origRejected);
          const propMissing = Number(proposedItem.quantityMissing ?? origMissing);
          const hasShortfall = propRejected > 0 || propMissing > 0;
          state = {
            quantityAccepted: propAccepted,
            quantityRejected: propRejected,
            quantityMissing: propMissing,
            recommendedDisposition: hasShortfall
              ? (currentAlloc.recommendedDisposition || anyLi.recommendedDisposition || "backorder")
              : "",
            reason: currentReason || "",
          };
        } else {
          const lineAllocs =
            anyLi.dispositionAllocations && anyLi.dispositionAllocations.length > 0
              ? anyLi.dispositionAllocations
              : effectiveReceipt?.dispositionAllocations &&
                effectiveReceipt.dispositionAllocations.length > 0
              ? effectiveReceipt.dispositionAllocations
              : [];

          const backorderQty = lineAllocs
            .filter((a: any) => a.disposition === "backorder" || a.disposition === "backordered")
            .reduce((s: number, a: any) => s + Number(a.quantity || 0), 0);
          const forfeitQty = lineAllocs
            .filter((a: any) => a.disposition === "forfeit" || a.disposition === "forfeited")
            .reduce((s: number, a: any) => s + Number(a.quantity || 0), 0);
          const disputeQty = lineAllocs
            .filter((a: any) => a.disposition === "dispute" || a.disposition === "disputed")
            .reduce((s: number, a: any) => s + Number(a.quantity || 0), 0);

          const origShortfall = origRejected + origMissing;
          const lineDisp = anyLi.vendorDisposition || effectiveReceipt?.vendorDisposition;
          const lineRes = anyLi.resolutionStatus || effectiveReceipt?.resolutionStatus;

          let disputedShortfall = 0;
          if (lineAllocs.length > 0) {
            const acknowledgedShortfall = backorderQty + forfeitQty;
            disputedShortfall =
              disputeQty > 0
                ? disputeQty
                : Math.max(0, origShortfall - acknowledgedShortfall);
          } else if (
            lineDisp === "backorder" ||
            lineDisp === "forfeit" ||
            lineRes === "backordered" ||
            lineRes === "forfeited" ||
            lineRes === "acknowledged"
          ) {
            disputedShortfall = 0;
          } else {
            disputedShortfall = origShortfall;
          }

          const nextAccepted = Math.min(totalDeclared, origAccepted + disputedShortfall);
          const rejectedReduction = Math.min(origRejected, disputedShortfall);
          const missingReduction = Math.min(
            origMissing,
            Math.max(0, disputedShortfall - rejectedReduction),
          );
          const nextRejected = Math.max(0, origRejected - rejectedReduction);
          const nextMissing = Math.max(0, origMissing - missingReduction);
          const hasRemainingShortfall = nextRejected > 0 || nextMissing > 0;

          let nextRecommendedDisp: "backorder" | "forfeit" | "" = "";
          if (hasRemainingShortfall) {
            if (forfeitQty > backorderQty || lineDisp === "forfeit" || lineRes === "forfeited") {
              nextRecommendedDisp = "forfeit";
            } else {
              nextRecommendedDisp = "backorder";
            }
          }

          state = {
            quantityAccepted: nextAccepted,
            quantityRejected: nextRejected,
            quantityMissing: nextMissing,
            recommendedDisposition: nextRecommendedDisp,
            reason: currentReason || "",
          };
        }
      } else {
        state = currentAlloc;
      }

      for (const k of keys) {
        updated[k] = state;
      }
    }
    setAllocations(updated);
  };

  const updateLineField = (
    li: any,
    field: "quantityAccepted" | "quantityRejected" | "quantityMissing",
    rawVal: string,
    totalDeclared: number,
  ) => {
    const cleaned = rawVal.replace(/[^\d]/g, "");
    const num = Math.min(totalDeclared, Math.max(0, parseInt(cleaned, 10) || 0));

    const current = getLineAlloc(li);
    const next: LineAllocationState = { ...current, [field]: num };

    // Auto-balance when editing so total matches declared quantity
    if (field === "quantityAccepted") {
      const remainder = Math.max(0, totalDeclared - num);
      const keepMissing = Math.min(remainder, current.quantityMissing);
      next.quantityMissing = keepMissing;
      next.quantityRejected = Math.max(0, remainder - keepMissing);
    } else if (field === "quantityRejected") {
      const remainder = Math.max(0, totalDeclared - next.quantityAccepted - num);
      next.quantityMissing = remainder;
    } else if (field === "quantityMissing") {
      const remainder = Math.max(0, totalDeclared - next.quantityAccepted - num);
      next.quantityRejected = remainder;
    }

    const hasShortfall = next.quantityRejected > 0 || next.quantityMissing > 0;
    if (!hasShortfall) {
      next.recommendedDisposition = "";
    } else if (!next.recommendedDisposition) {
      next.recommendedDisposition = "backorder";
    }

    const resolvedId = resolveLineReceiptId(li);
    const anyLi = li as any;
    const keys = [
      resolvedId,
      anyLi.deliveryReceiptLineItemId,
      anyLi.receiptLineItemId,
      anyLi.id,
      anyLi.purchaseOrderLineItemId,
      anyLi.fulfillmentLineItemId,
    ].filter(Boolean);

    setAllocations((prev) => {
      const copy = { ...prev };
      for (const k of keys) {
        copy[k] = next;
      }
      return copy;
    });
  };

  const updateLineDisposition = (
    li: any,
    recommendedDisposition: "backorder" | "forfeit" | "",
  ) => {
    const current = getLineAlloc(li);
    const next: LineAllocationState = { ...current, recommendedDisposition };

    const resolvedId = resolveLineReceiptId(li);
    const anyLi = li as any;
    const keys = [
      resolvedId,
      anyLi.deliveryReceiptLineItemId,
      anyLi.receiptLineItemId,
      anyLi.id,
      anyLi.purchaseOrderLineItemId,
      anyLi.fulfillmentLineItemId,
    ].filter(Boolean);

    setAllocations((prev) => {
      const copy = { ...prev };
      for (const k of keys) {
        copy[k] = next;
      }
      return copy;
    });
  };

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !deliveryReceiptId) return;

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
      toast.error("Only JPEG, PNG, or WebP images are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_EVIDENCE_BYTES) {
      toast.error("Evidence image must be 5 MB or smaller.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      const uploaded = await uploadEvidenceMut.mutateAsync({
        deliveryReceiptId,
        file,
      });
      setExtraEvidence((prev) => [
        ...prev,
        {
          url: uploaded.url,
          publicId: uploaded.publicId,
          mimeType: uploaded.mimeType || file.type,
          localName: file.name,
          localSize: file.size,
        },
      ]);
      toast.success("Additional inspection evidence uploaded");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to upload evidence image.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isAllocationValid = receiptLines.every((li: any) => {
    const alloc = getLineAlloc(li);
    const totalDeclared = getLineDeclaredTotal(li);
    return (
      alloc.quantityAccepted + alloc.quantityRejected + alloc.quantityMissing ===
      totalDeclared
    );
  });

  const canSubmit =
    reason.trim().length > 0 &&
    isAllocationValid &&
    !finalDecisionMut.isPending &&
    !uploadEvidenceMut.isPending;

  const handleSubmit = async () => {
    if (!canSubmit || !deliveryReceiptId) return;

    try {
      const lineItemsPayload = receiptLines
        .map((li: any) => {
          const lineId = resolveLineReceiptId(li);
          const alloc = getLineAlloc(li);
          const qtyAccepted = Number(alloc.quantityAccepted ?? 0);
          const qtyRejected = Number(alloc.quantityRejected ?? 0);
          const qtyMissing = Number(alloc.quantityMissing ?? 0);
          const hasShortfall = qtyRejected > 0 || qtyMissing > 0;

          return {
            deliveryReceiptLineItemId: lineId,
            quantityAccepted: qtyAccepted,
            quantityRejected: qtyRejected,
            quantityMissing: qtyMissing,
            ...(hasShortfall && alloc.recommendedDisposition
              ? { recommendedDisposition: alloc.recommendedDisposition }
              : {}),
            ...(alloc.reason?.trim() ? { reason: alloc.reason.trim() } : {}),
          };
        })
        .filter((item) => Boolean(item.deliveryReceiptLineItemId));

      await finalDecisionMut.mutateAsync({
        deliveryReceiptId,
        payload: {
          decision,
          reason: reason.trim(),
          ...(extraEvidence.length > 0
            ? {
                evidence: extraEvidence.map((ev) => ({
                  url: ev.url,
                  publicId: ev.publicId,
                  mimeType: ev.mimeType,
                })),
              }
            : {}),
          lineItems: lineItemsPayload,
        },
      });

      toast.success("Final decision recorded. Exception dispute is now resolved.");
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Unable to submit final decision."
      );
    }
  };

  const companyEvidence = effectiveReceipt?.evidence || [];
  const vendorEvidence = effectiveReceipt?.vendorEvidence || [];
  const allVendorAllocations = receiptLines.flatMap(
    (l: any) => l.dispositionAllocations || [],
  );
  const allocationSummaryText =
    allVendorAllocations.length > 0
      ? allVendorAllocations
          .map(
            (a: any) =>
              `${pluralize(a.quantity, "unit")} ${a.disposition}${a.reason ? ` ("${a.reason}")` : ""}`,
          )
          .join(" · ")
      : "";

  const disputeHistoryEvent = [...(effectiveReceipt?.decisionHistory || receipt?.decisionHistory || [])]
    .reverse()
    .find((h: any) => h.event === "vendor_disputed");

  const isLineDisputed = (li: any): boolean => {
    const lineId = resolveLineReceiptId(li) || li.deliveryReceiptLineItemId;
    const matchingInReceipt = (receipt?.lineItems || []).find((rli: any) =>
      (rli.deliveryReceiptLineItemId && rli.deliveryReceiptLineItemId === li.deliveryReceiptLineItemId) ||
      (rli.purchaseOrderLineItemId && rli.purchaseOrderLineItemId === li.purchaseOrderLineItemId) ||
      (rli.name && rli.name === li.name)
    );

    const isProposed = disputeHistoryEvent?.proposedLineItems?.some(
      (p: any) =>
        (lineId && p.deliveryReceiptLineItemId === lineId) ||
        (li.purchaseOrderLineItemId && p.purchaseOrderLineItemId === li.purchaseOrderLineItemId) ||
        (p.name && p.name === li.name)
    );

    const hasVendorAllocations =
      (li.dispositionAllocations && li.dispositionAllocations.length > 0) ||
      (matchingInReceipt?.dispositionAllocations && matchingInReceipt.dispositionAllocations.length > 0);

    const lineDisp = li.vendorDisposition || matchingInReceipt?.vendorDisposition;
    const lineRes = li.resolutionStatus || matchingInReceipt?.resolutionStatus;

    if (hasVendorAllocations && lineDisp !== "dispute" && lineRes !== "under_company_review" && lineRes !== "disputed") {
      return false;
    }

    return Boolean(
      isProposed ||
      lineDisp === "dispute" ||
      lineRes === "disputed" ||
      lineRes === "under_company_review"
    );
  };

  const disputedLines = receiptLines.filter(isLineDisputed);
  const settledLines = receiptLines.filter((li: any) => !isLineDisputed(li));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 bg-white border-0 shadow-2xl rounded-[16px]">
        <div className="flex flex-col max-h-[88vh]">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-black/[0.06] shrink-0">
            <DialogHeader className="flex flex-row items-start gap-3.5 space-y-0 text-left">
              <div className="w-9 h-9 rounded-[10px] bg-[#f5f7f6] border border-black/[0.06] flex items-center justify-center shrink-0">
                <Gavel className="w-4 h-4 text-[#111815]" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#0b100e]">
                  Final Company Decision on Disputed Receipt
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-[#68726d] mt-1">
                  Receipt{" "}
                  <span className="font-semibold text-[#0b100e]">
                    {effectiveReceipt?.receiptNumber ||
                      effectiveReceipt?.receiptReference ||
                      deliveryReceiptId}
                  </span>{" "}
                  · Review the vendor&apos;s dispute and record the final binding allocation.
                </DialogDescription>
              </div>
            </DialogHeader>
          </div>

          {/* Scrollable Body */}
          <div className="p-6 py-4 flex-1 overflow-y-auto modal-scrollbar min-h-0 space-y-5">
            {/* Vendor Dispute Summary Box */}
            <div className="rounded-[12px] border border-red-200/80 bg-red-50/40 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#d33d44] flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-[#d33d44]" /> Vendor Dispute Review
                </span>
                {effectiveReceipt?.vendorRespondedAt && (
                  <span className="text-[11px] text-[#89918d]">
                    Responded {new Date(effectiveReceipt.vendorRespondedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#d33d44] font-semibold">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-[#d33d44] uppercase tracking-wider font-bold">
                    Disputed Item{disputedLines.length === 1 ? "" : "s"} ({disputedLines.length})
                  </span>
                  <span className="text-[#0b100e]">
                    {disputedLines.map((l: any) => l.name).join(", ") || "None"}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#111815] italic font-medium">
                  &quot;{effectiveReceipt?.vendorResponseReason ||
                    disputeHistoryEvent?.reason ||
                    disputedLines.find((l: any) => l.vendorResponseReason)?.vendorResponseReason ||
                    "Vendor disputed the inspection finding on this receipt."}&quot;
                </p>
              </div>

              {(vendorEvidence.length > 0 || companyEvidence.length > 0) && (
                <div className="pt-2.5 border-t border-red-200/50 space-y-2.5">
                  <div className="flex flex-wrap gap-6">
                    {vendorEvidence.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-[#89918d] mb-1.5">
                          Vendor Evidence ({vendorEvidence.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {vendorEvidence.map((ev, idx) => (
                            <button
                              key={ev.publicId || idx}
                              type="button"
                              onClick={() =>
                                setPreviewPhoto({
                                  url: ev.url,
                                  label: `Vendor Dispute Photo #${idx + 1}`,
                                })
                              }
                              className="group relative w-12 h-12 rounded-lg overflow-hidden border border-black/[0.08] bg-white hover:border-[#087f70] transition-all cursor-pointer"
                              title={`Preview Vendor Photo #${idx + 1}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={ev.url}
                                alt={`Vendor Photo #${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {companyEvidence.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-[#89918d] mb-1.5">
                          Inspection Evidence ({companyEvidence.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {companyEvidence.map((ev, idx) => (
                            <button
                              key={ev.publicId || idx}
                              type="button"
                              onClick={() =>
                                setPreviewPhoto({
                                  url: ev.url,
                                  label: `Inspection Photo #${idx + 1}`,
                                })
                              }
                              className="group relative w-12 h-12 rounded-lg overflow-hidden border border-black/[0.08] bg-white hover:border-[#087f70] transition-all cursor-pointer"
                              title={`Preview Inspection Photo #${idx + 1}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={ev.url}
                                alt={`Inspection Photo #${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {previewPhoto && (
                    <div className="rounded-lg bg-black/90 p-3 space-y-2">
                      <div className="flex items-center justify-between text-white text-xs">
                        <span className="font-semibold">{previewPhoto.label}</span>
                        <div className="flex items-center gap-2">
                          <a
                            href={previewPhoto.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[11px]"
                          >
                            Open Original <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto(null)}
                            className="p-1 rounded bg-white/15 hover:bg-white/25"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewPhoto.url}
                        alt={previewPhoto.label}
                        className="max-h-64 mx-auto object-contain rounded"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 1: Disputed Line Items Requiring Final Decision */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#d33d44]" />
                  <h3 className="text-sm font-bold text-[#0b100e]">
                    Disputed Item{disputedLines.length === 1 ? "" : "s"} Requiring Decision ({disputedLines.length})
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-[#d33d44] bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  Action Required
                </span>
              </div>

              {disputedLines.map((li: any, idx: number) => {
                const totalDeclared = getLineDeclaredTotal(li);
                const alloc = getLineAlloc(li);
                const matchingInReceipt = (receipt?.lineItems || []).find((rli: any) =>
                  (rli.deliveryReceiptLineItemId && rli.deliveryReceiptLineItemId === li.deliveryReceiptLineItemId) ||
                  (rli.purchaseOrderLineItemId && rli.purchaseOrderLineItemId === li.purchaseOrderLineItemId) ||
                  (rli.name && rli.name === li.name)
                );
                const proposedLineItem = disputeHistoryEvent?.proposedLineItems?.find((p: any) => {
                  const pId = String(p.deliveryReceiptLineItemId || p.lineItemId || p.id || "");
                  const lId = String(resolveLineReceiptId(li) || li.deliveryReceiptLineItemId || "");
                  const poId = String(li.purchaseOrderLineItemId || "");
                  return (pId && (pId === lId || pId === poId)) || (p.name && p.name === li.name);
                });
                const vendorNote =
                  li.vendorResponseReason ||
                  matchingInReceipt?.vendorResponseReason ||
                  proposedLineItem?.reason ||
                  disputeHistoryEvent?.reason ||
                  effectiveReceipt?.vendorResponseReason;

                const proposedAccepted = proposedLineItem ? Number(proposedLineItem.quantityAccepted ?? 0) : totalDeclared - 1;
                const proposedRejected = proposedLineItem ? Number(proposedLineItem.quantityRejected ?? 0) : 1;
                const proposedMissing = proposedLineItem ? Number(proposedLineItem.quantityMissing ?? 0) : 0;

                return (
                  <div
                    key={resolveLineReceiptId(li) || idx}
                    className="rounded-[14px] border-2 border-red-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4"
                  >
                    {/* Disputed Item Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] pb-3">
                      <div>
                        <h4 className="font-bold text-base text-[#0b100e] flex items-center gap-2">
                          {li.name}
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-[#d33d44] border border-red-200">
                            Vendor Disputed
                          </span>
                        </h4>
                        <p className="text-xs text-[#68726d] mt-0.5">
                          {pluralize(totalDeclared, "unit")} in this delivery receipt
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#087f70] bg-[#f0faf8] border border-[#087f70]/20 px-2.5 py-1 rounded-md">
                          Selected Result: {alloc.quantityAccepted} Accepted · {alloc.quantityRejected} Rejected
                          {alloc.quantityMissing > 0 ? ` · ${alloc.quantityMissing} Missing` : ""}
                        </span>
                      </div>
                    </div>

                    {/* Comparison Cards (5th UI Style) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Card A: Buyer Inspection */}
                      <div className="rounded-[12px] bg-[#f9faf9] border border-black/[0.08] p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#68726d] flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-[#34413b]" /> Buyer Inspection Finding
                          </span>
                        </div>
                        <p className="text-sm font-bold text-[#111815]">
                          {li.quantityAccepted ?? 0} Accepted · <span className="text-[#e14856]">{li.quantityRejected ?? 0} Rejected</span>
                          {Number(li.quantityMissing ?? 0) > 0 && ` · ${li.quantityMissing} Missing`}
                        </p>
                        {li.exceptionReason && (
                          <p className="text-xs text-[#68726d] italic">
                            &quot;{formatExceptionReason(li.exceptionReason)}&quot;
                          </p>
                        )}
                      </div>

                      {/* Card B: Vendor Dispute Position */}
                      <div className="rounded-[12px] bg-red-50/60 border border-red-200 p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#d33d44] flex items-center gap-1">
                            <Scale className="w-3.5 h-3.5 text-[#d33d44]" /> Vendor Dispute Position
                          </span>
                        </div>
                        <p className="text-sm font-bold text-[#111815]">
                          <span className="text-[#087f70]">{proposedAccepted} Accepted</span> ·{" "}
                          <span className="text-[#e14856]">{proposedRejected} Rejected</span>
                          {proposedMissing > 0 ? ` · ${proposedMissing} Missing` : ""}
                        </p>
                        <p className="text-xs text-red-950 italic font-medium">
                          &quot;{vendorNote || "The other has no issue"}&quot;
                        </p>
                      </div>
                    </div>

                    {/* Decision Choice Buttons */}
                    <div className="space-y-1.5 pt-1">
                      <Label className="text-xs font-semibold text-[#0b100e]">
                        Choose Final Decision for {li.name}:
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecisionSwitch("uphold_buyer_finding")}
                          className={`p-3 rounded-[10px] border text-left transition-all ${
                            decision === "uphold_buyer_finding"
                              ? "border-[#087f70] bg-[#f0faf8] ring-2 ring-[#087f70]/20"
                              : "border-black/[0.08] bg-white hover:bg-[#f9faf9]"
                          }`}
                        >
                          <p className="text-xs font-bold text-[#0b100e] flex items-center justify-between">
                            Uphold Buyer Finding
                            {decision === "uphold_buyer_finding" && <CheckCircle2 className="w-3.5 h-3.5 text-[#087f70]" />}
                          </p>
                          <p className="text-[11px] text-[#68726d] mt-1">
                            Keep {li.quantityAccepted ?? 0} accepted, {li.quantityRejected ?? 0} rejected
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDecisionSwitch("accept_vendor_dispute")}
                          className={`p-3 rounded-[10px] border text-left transition-all ${
                            decision === "accept_vendor_dispute"
                              ? "border-[#087f70] bg-[#f0faf8] ring-2 ring-[#087f70]/20"
                              : "border-black/[0.08] bg-white hover:bg-[#f9faf9]"
                          }`}
                        >
                          <p className="text-xs font-bold text-[#0b100e] flex items-center justify-between">
                            Accept Vendor Dispute
                            {decision === "accept_vendor_dispute" && <CheckCircle2 className="w-3.5 h-3.5 text-[#087f70]" />}
                          </p>
                          <p className="text-[11px] text-[#68726d] mt-1">
                            Accept {proposedAccepted}, reject {proposedRejected}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDecisionSwitch("revise_buyer_finding")}
                          className={`p-3 rounded-[10px] border text-left transition-all ${
                            decision === "revise_buyer_finding"
                              ? "border-[#087f70] bg-[#f0faf8] ring-2 ring-[#087f70]/20"
                              : "border-black/[0.08] bg-white hover:bg-[#f9faf9]"
                          }`}
                        >
                          <p className="text-xs font-bold text-[#0b100e] flex items-center justify-between">
                            Custom Allocation
                            {decision === "revise_buyer_finding" && <CheckCircle2 className="w-3.5 h-3.5 text-[#087f70]" />}
                          </p>
                          <p className="text-[11px] text-[#68726d] mt-1">
                            Enter custom unit quantities
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Custom Inputs if Custom Allocation chosen */}
                    {decision === "revise_buyer_finding" && (
                      <div className="pt-2 border-t border-black/[0.06] flex flex-wrap items-center gap-3 bg-[#f9faf9] p-3 rounded-[10px]">
                        <div>
                          <label className="text-[11px] font-semibold text-[#087f70] block">Final Accepted</label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={String(alloc.quantityAccepted)}
                            onChange={(e) => updateLineField(li, "quantityAccepted", e.target.value, totalDeclared)}
                            className="h-8 w-20 text-center font-bold mt-1 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-[#e14856] block">Final Rejected</label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={String(alloc.quantityRejected)}
                            onChange={(e) => updateLineField(li, "quantityRejected", e.target.value, totalDeclared)}
                            className="h-8 w-20 text-center font-bold mt-1 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-amber-700 block">Final Missing</label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={String(alloc.quantityMissing)}
                            onChange={(e) => updateLineField(li, "quantityMissing", e.target.value, totalDeclared)}
                            className="h-8 w-20 text-center font-bold mt-1 bg-white"
                          />
                        </div>
                        <div className="text-xs text-[#68726d] pl-2 self-end pb-1 font-medium">
                          Total: {alloc.quantityAccepted + alloc.quantityRejected + alloc.quantityMissing} of {totalDeclared}
                        </div>
                      </div>
                    )}

                    {/* Shortfall Resolution recommendation */}
                    {(Number(alloc.quantityRejected ?? 0) > 0 || Number(alloc.quantityMissing ?? 0) > 0) && (
                      <div className="pt-3 border-t border-black/[0.06] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#34413b]">
                            Recommend Resolution for Shortfall ({alloc.quantityRejected + alloc.quantityMissing} unit{alloc.quantityRejected + alloc.quantityMissing === 1 ? "" : "s"}):
                          </span>
                          <div className="inline-flex rounded-lg border border-black/[0.08] p-0.5 bg-[#f5f7f6]">
                            <button
                              type="button"
                              onClick={() => updateLineDisposition(li, "backorder")}
                              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                                alloc.recommendedDisposition === "backorder"
                                  ? "bg-white text-[#087f70] shadow-xs"
                                  : "text-[#68726d] hover:text-[#0b100e]"
                              }`}
                            >
                              Backorder
                            </button>
                            <button
                              type="button"
                              onClick={() => updateLineDisposition(li, "forfeit")}
                              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                                alloc.recommendedDisposition === "forfeit"
                                  ? "bg-white text-[#d33d44] shadow-xs"
                                  : "text-[#68726d] hover:text-[#0b100e]"
                              }`}
                            >
                              Forfeit
                            </button>
                          </div>
                        </div>
                        <span className="text-[11px] text-[#68726d]">
                          {alloc.recommendedDisposition === "backorder"
                            ? `Ask vendor to redeliver replacement ${pluralize(alloc.quantityRejected + alloc.quantityMissing, "unit")}`
                            : `Cancel shortfall ${pluralize(alloc.quantityRejected + alloc.quantityMissing, "unit")} from purchase order`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* SECTION 2: Already Settled Items (5th UI Style - Cards!) */}
            {settledLines.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#34413b]">
                    <CheckCircle2 className="w-4 h-4 text-[#087f70]" />
                    <span>Other Item{settledLines.length === 1 ? "" : "s"} in this Shipment ({settledLines.length})</span>
                  </div>
                  <span className="text-[11px] text-[#89918d]">Already settled · No action needed</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {settledLines.map((li: any) => {
                    const totalDeclared = getLineDeclaredTotal(li);
                    const hasAllocs = li.dispositionAllocations && li.dispositionAllocations.length > 0;
                    const matchingInReceipt = (receipt?.lineItems || []).find((rli: any) =>
                      (rli.deliveryReceiptLineItemId && rli.deliveryReceiptLineItemId === li.deliveryReceiptLineItemId) ||
                      (rli.purchaseOrderLineItemId && rli.purchaseOrderLineItemId === li.purchaseOrderLineItemId)
                    );
                    const receiptAllocs = matchingInReceipt?.dispositionAllocations || [];
                    const activeAllocs = hasAllocs ? li.dispositionAllocations : receiptAllocs;

                    return (
                      <div
                        key={resolveLineReceiptId(li) || li.name}
                        className="rounded-[12px] border border-black/[0.06] bg-[#fcfcfc] p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-semibold text-[#0b100e] truncate">{li.name}</span>
                          {activeAllocs.length > 0 ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              Resolution Agreed
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#f0faf8] text-[#087f70] border border-[#087f70]/20">
                              Fully Accepted
                            </span>
                          )}
                        </div>

                        <p className="text-[#34413b] font-medium">
                          {li.quantityAccepted ?? totalDeclared} Accepted
                          {Number(li.quantityRejected ?? 0) > 0 && ` · ${li.quantityRejected} Rejected`}
                          {Number(li.quantityMissing ?? 0) > 0 && ` · ${li.quantityMissing} Missing`}
                          <span className="text-[#89918d] font-normal"> (of {totalDeclared})</span>
                        </p>

                        {activeAllocs.length > 0 && (
                          <div className="pt-1.5 border-t border-black/[0.04] space-y-1 text-[11px] text-[#68726d]">
                            {activeAllocs.map((a: any, aIdx: number) => (
                              <div key={aIdx} className="bg-white p-1.5 rounded border border-black/[0.04]">
                                <p className="font-semibold text-[#0b100e]">
                                  <span className="capitalize">{a.disposition}</span>: {pluralize(a.quantity, "unit")}
                                  {a.expectedRedeliveryDate ? ` (exp. ${new Date(a.expectedRedeliveryDate).toLocaleDateString()})` : ""}
                                </p>
                                {a.reason && <p className="italic text-[#68726d] mt-0.5">&quot;{a.reason}&quot;</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 3: Final Decision Reason */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold text-[#0b100e]">
                Final Decision Reason <span className="text-[#d33d44]">*</span>
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Upholding original inspection finding: both keyboards were confirmed defective and non-functional."
                rows={3}
                disabled={finalDecisionMut.isPending}
                className="resize-none rounded-[12px] border-black/[0.12] text-sm"
              />
            </div>

            {/* Optional Additional Evidence Upload */}
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleUploadEvidence}
                className="hidden"
                disabled={finalDecisionMut.isPending || uploadEvidenceMut.isPending}
              />
              <div className="border border-dashed border-[#00b29a] rounded-[12px] p-3 flex items-center justify-between bg-[#f0faf8]/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[8px] bg-white border border-[#00b29a]/30 flex items-center justify-center shrink-0">
                    {uploadEvidenceMut.isPending ? (
                      <Loader2 className="w-4 h-4 text-[#00b29a] animate-spin" />
                    ) : (
                      <UploadCloud className="w-4 h-4 text-[#00b29a]" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#0b100e]">
                      Attach additional evidence (optional)
                    </p>
                    <p className="text-[11px] text-[#68726d]">
                      JPEG, PNG, or WebP (max. 5 MB)
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={finalDecisionMut.isPending || uploadEvidenceMut.isPending}
                  className="h-8 px-3 rounded-[8px] border-[#00b29a] text-[#00b29a] hover:bg-[#00b29a]/10 text-xs font-semibold"
                >
                  {uploadEvidenceMut.isPending ? "Uploading…" : "Upload"}
                </Button>
              </div>

              {extraEvidence.length > 0 && (
                <div className="space-y-1">
                  {extraEvidence.map((ev, i) => (
                    <div
                      key={ev.publicId || i}
                      className="flex items-center justify-between px-3 py-1.5 rounded-[8px] bg-[#f9faf9] border border-black/[0.06] text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-[#00b29a] shrink-0" />
                        <span className="font-medium text-[#0b100e] truncate">
                          {ev.localName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setExtraEvidence((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="text-[#68726d] hover:text-[#e14856] p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 pt-3 border-t border-black/[0.06] flex items-center justify-end gap-3 bg-white shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={finalDecisionMut.isPending}
              className="h-10 px-5 rounded-[12px] border-black/15 font-medium text-sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="h-10 px-6 rounded-[12px] bg-[#087f70] hover:bg-[#076a5e] text-white font-semibold text-sm disabled:opacity-50"
            >
              {finalDecisionMut.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {`Submit Final Decision${disputedLines.length === 1 ? ` for ${disputedLines[0].name}` : ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

