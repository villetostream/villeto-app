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
import { sanitizeNavigationHref } from "@/lib/security/url";
import { sanitizeImageSrc } from "@/lib/security/blob-preview";
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
  const [lineDecisions, setLineDecisions] = useState<Record<string, FinalDecisionChoice>>({});
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

  const getLineDecision = (li: any): FinalDecisionChoice => {
    const resolvedId = resolveLineReceiptId(li);
    const anyLi = li as any;
    const keys = [
      resolvedId,
      anyLi?.deliveryReceiptLineItemId,
      anyLi?.receiptLineItemId,
      anyLi?.id,
      anyLi?.purchaseOrderLineItemId,
      anyLi?.fulfillmentLineItemId,
      anyLi?.name,
    ].filter(Boolean) as string[];

    for (const k of keys) {
      if (lineDecisions[k]) return lineDecisions[k];
    }
    return "uphold_buyer_finding";
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
    setLineDecisions({});
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

  const computeLineStateForDecision = (li: any, nextDecision: FinalDecisionChoice): LineAllocationState => {
    const totalDeclared = getLineDeclaredTotal(li);
    const origAccepted = Number(li.quantityAccepted ?? 0);
    const origRejected = Number(li.quantityRejected ?? 0);
    const origMissing = Number(li.quantityMissing ?? 0);
    const currentAlloc = getLineAlloc(li);
    const currentReason = currentAlloc.reason;
    const anyLi = li as any;

    if (nextDecision === "uphold_buyer_finding" || isLineAlreadySettled(li)) {
      const hasShortfall = origRejected > 0 || origMissing > 0;
      return {
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
        return {
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

        return {
          quantityAccepted: nextAccepted,
          quantityRejected: nextRejected,
          quantityMissing: nextMissing,
          recommendedDisposition: nextRecommendedDisp,
          reason: currentReason || "",
        };
      }
    } else {
      return currentAlloc;
    }
  };

  const handleLineDecisionSwitch = (li: any, nextChoice: FinalDecisionChoice) => {
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

    setLineDecisions((prev) => {
      const updated = { ...prev };
      for (const k of keys) {
        updated[k] = nextChoice;
      }
      return updated;
    });

    const newState = computeLineStateForDecision(li, nextChoice);
    setAllocations((prev) => {
      const updated = { ...prev };
      for (const k of keys) {
        updated[k] = newState;
      }
      return updated;
    });
  };

  const handleApplyAll = (nextChoice: FinalDecisionChoice) => {
    const updatedDecisions = { ...lineDecisions };
    const updatedAllocs = { ...allocations };

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

      for (const k of keys) {
        updatedDecisions[k] = nextChoice;
      }
      const st = computeLineStateForDecision(li, nextChoice);
      for (const k of keys) {
        updatedAllocs[k] = st;
      }
    }
    setLineDecisions(updatedDecisions);
    setAllocations(updatedAllocs);
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

      const disputedLineDecisions = disputedLines.map((li: any) => getLineDecision(li));
      const allUphold = disputedLineDecisions.length > 0 && disputedLineDecisions.every((d) => d === "uphold_buyer_finding");
      const allAccept = disputedLineDecisions.length > 0 && disputedLineDecisions.every((d) => d === "accept_vendor_dispute");
      const effectiveDecision: FinalDecisionChoice = allUphold
        ? "uphold_buyer_finding"
        : allAccept
        ? "accept_vendor_dispute"
        : "revise_buyer_finding";

      await finalDecisionMut.mutateAsync({
        deliveryReceiptId,
        payload: {
          decision: effectiveDecision,
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
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 bg-white border border-black/[0.08] shadow-2xl rounded-2xl">
        <div className="flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#f0faf8] border border-[#087f70]/20 flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4 text-[#087f70]" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-[#0b100e]">
                  Resolve Disputed Delivery
                </DialogTitle>
                <DialogDescription className="text-xs text-[#68726d] mt-0.5">
                  Receipt{" "}
                  <span className="font-semibold text-[#0b100e]">
                    {effectiveReceipt?.receiptNumber ||
                      effectiveReceipt?.receiptReference ||
                      deliveryReceiptId}
                  </span>
                  {" · "}Review vendor counter-proposals and record final binding determination
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="p-6 py-4 flex-1 overflow-y-auto modal-scrollbar min-h-0 space-y-4">
            {/* Context Notice */}
            <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-[#fafafa] border border-black/[0.06]">
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs">
                  <p className="font-semibold text-[#0b100e]">
                    Vendor Disputed {disputedLines.length} Item{disputedLines.length === 1 ? "" : "s"}
                  </p>
                  <p className="text-[#68726d] leading-relaxed">
                    {disputedLines.length > 1
                      ? "The vendor disputed the inspection quantities on multiple items. Review each comparison below and set your determination."
                      : effectiveReceipt?.vendorResponseReason ||
                        disputeHistoryEvent?.reason ||
                        "Review the vendor's position and set final accepted and rejected quantities."}
                  </p>
                </div>
              </div>
              {effectiveReceipt?.vendorRespondedAt && (
                <span className="text-[11px] text-[#89918d] shrink-0 font-medium">
                  Responded {new Date(effectiveReceipt.vendorRespondedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Inspection & Vendor Evidence Photos (Compact) */}
            {(vendorEvidence.length > 0 || companyEvidence.length > 0) && (
              <div className="flex flex-wrap items-center gap-4 text-xs px-1">
                {vendorEvidence.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#68726d] text-[11px] font-medium">
                      Vendor photos ({vendorEvidence.length}):
                    </span>
                    <div className="flex items-center gap-1.5">
                      {vendorEvidence.map((ev, idx) => (
                        <button
                          key={ev.publicId || idx}
                          type="button"
                          onClick={() =>
                            setPreviewPhoto({
                              url: ev.url,
                              label: `Vendor Photo #${idx + 1}`,
                            })
                          }
                          className="w-8 h-8 rounded-md border border-black/[0.1] overflow-hidden hover:border-[#087f70] transition-all cursor-pointer"
                        >
                          <img
                            src={ev.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {companyEvidence.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#68726d] text-[11px] font-medium">
                      Inspection photos ({companyEvidence.length}):
                    </span>
                    <div className="flex items-center gap-1.5">
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
                          className="w-8 h-8 rounded-md border border-black/[0.1] overflow-hidden hover:border-[#087f70] transition-all cursor-pointer"
                        >
                          <img
                            src={ev.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Photo Lightbox Preview */}
            {previewPhoto && (
              <div className="rounded-xl bg-black/90 p-3 space-y-2">
                <div className="flex items-center justify-between text-white text-xs">
                  <span className="font-semibold">{previewPhoto.label}</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={sanitizeNavigationHref(previewPhoto.url) ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[11px]"
                    >
                      Open Original <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(null)}
                      className="p-1 rounded bg-white/15 hover:bg-white/25 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <img
                  src={sanitizeImageSrc(previewPhoto.url)}
                  alt={previewPhoto.label}
                  className="max-h-60 mx-auto object-contain rounded"
                />
              </div>
            )}

            {/* SECTION 1: Disputed Line Items Requiring Final Decision */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#0b100e] uppercase tracking-wider">
                  Disputed Item{disputedLines.length === 1 ? "" : "s"} ({disputedLines.length})
                </span>
                {disputedLines.length > 1 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#89918d] text-[11px]">Apply to all:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyAll("uphold_buyer_finding")}
                      className="text-[11px] font-medium text-[#087f70] hover:underline cursor-pointer"
                    >
                      Keep Original
                    </button>
                    <span className="text-gray-300">·</span>
                    <button
                      type="button"
                      onClick={() => handleApplyAll("accept_vendor_dispute")}
                      className="text-[11px] font-medium text-[#087f70] hover:underline cursor-pointer"
                    >
                      Accept Vendor
                    </button>
                  </div>
                )}
              </div>

              {disputedLines.map((li: any, idx: number) => {
                const totalDeclared = getLineDeclaredTotal(li);
                const alloc = getLineAlloc(li);
                const lineChoice = getLineDecision(li);
                const origAccepted = Number(li.quantityAccepted ?? 0);
                const origRejected = Number(li.quantityRejected ?? 0);
                const origMissing = Number(li.quantityMissing ?? 0);
                const origExceptionReason = formatExceptionReason(li.exceptionReason);

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
                  proposedLineItem?.vendorResponseReason ||
                  proposedLineItem?.reason ||
                  (!effectiveReceipt?.vendorResponseReason?.includes(" | ")
                    ? disputeHistoryEvent?.reason || effectiveReceipt?.vendorResponseReason
                    : null);

                const proposedAccepted = proposedLineItem
                  ? Number(proposedLineItem.quantityAccepted ?? 0)
                  : totalDeclared;
                const proposedRejected = proposedLineItem
                  ? Number(proposedLineItem.quantityRejected ?? 0)
                  : 0;
                const proposedMissing = proposedLineItem
                  ? Number(proposedLineItem.quantityMissing ?? 0)
                  : 0;

                return (
                  <div
                    key={resolveLineReceiptId(li) || idx}
                    className="rounded-xl border border-black/[0.08] bg-white p-4 space-y-3 shadow-xs"
                  >
                    {/* Item Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-[#0b100e]">{li.name}</h4>
                        <span className="text-[11px] text-[#68726d]">
                          · {pluralize(totalDeclared, "unit")} in shipment
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-[#f0faf8] text-[#087f70] border border-[#087f70]/20">
                        Result: {alloc.quantityAccepted} accepted, {alloc.quantityRejected} rejected
                        {alloc.quantityMissing > 0 ? `, ${alloc.quantityMissing} missing` : ""}
                      </span>
                    </div>

                    {/* Comparison Block: Flat & Typographic */}
                    <div className="rounded-lg bg-[#fafafa] border border-black/[0.04] p-3 text-xs space-y-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span className="text-[#68726d] font-medium text-[11px] w-28 shrink-0">
                            Your inspection:
                          </span>
                          <span className="font-semibold text-[#0b100e]">
                            {origAccepted} accepted ·{" "}
                            <span className={origRejected > 0 ? "text-[#d33d44]" : ""}>
                              {origRejected} rejected
                            </span>
                            {origMissing > 0 ? ` · ${origMissing} missing` : ""}
                          </span>
                        </div>
                        {origExceptionReason && (
                          <span
                            className="text-[#68726d] italic truncate max-w-[220px] text-[11px]"
                            title={origExceptionReason}
                          >
                            &ldquo;{origExceptionReason}&rdquo;
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline justify-between gap-3 pt-1.5 border-t border-black/[0.04]">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span className="text-[#d33d44] font-medium text-[11px] w-28 shrink-0">
                            Vendor claim:
                          </span>
                          <span className="font-semibold text-[#0b100e]">
                            <span className="text-[#087f70]">{proposedAccepted} accepted</span> ·{" "}
                            <span className={proposedRejected > 0 ? "text-[#d33d44]" : "text-[#68726d]"}>
                              {proposedRejected} rejected
                            </span>
                            {proposedMissing > 0 ? ` · ${proposedMissing} missing` : ""}
                          </span>
                        </div>
                        {vendorNote && (
                          <span
                            className="text-[#68726d] italic truncate max-w-[220px] text-[11px]"
                            title={vendorNote}
                          >
                            &ldquo;{vendorNote}&rdquo;
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Segmented Control */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-medium text-[#68726d]">Determination:</span>
                      <div className="grid grid-cols-3 p-1 rounded-lg bg-[#f5f7f6] border border-black/[0.06] gap-1 text-xs">
                        <button
                          type="button"
                          onClick={() => handleLineDecisionSwitch(li, "uphold_buyer_finding")}
                          className={`py-1.5 px-2 rounded-md text-center transition-all cursor-pointer ${
                            lineChoice === "uphold_buyer_finding"
                              ? "bg-white text-[#0b100e] shadow-xs font-semibold"
                              : "text-[#68726d] hover:text-[#0b100e] font-medium"
                          }`}
                        >
                          Keep Original ({origAccepted}/{origRejected})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLineDecisionSwitch(li, "accept_vendor_dispute")}
                          className={`py-1.5 px-2 rounded-md text-center transition-all cursor-pointer ${
                            lineChoice === "accept_vendor_dispute"
                              ? "bg-white text-[#0b100e] shadow-xs font-semibold"
                              : "text-[#68726d] hover:text-[#0b100e] font-medium"
                          }`}
                        >
                          Accept Vendor ({proposedAccepted}/{proposedRejected})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLineDecisionSwitch(li, "revise_buyer_finding")}
                          className={`py-1.5 px-2 rounded-md text-center transition-all cursor-pointer ${
                            lineChoice === "revise_buyer_finding"
                              ? "bg-white text-[#0b100e] shadow-xs font-semibold"
                              : "text-[#68726d] hover:text-[#0b100e] font-medium"
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                    </div>

                    {/* Custom numeric inputs (if Custom selected) */}
                    {lineChoice === "revise_buyer_finding" && (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#f9faf9] border border-black/[0.06] text-xs">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[#087f70] font-semibold text-[11px]">Accepted:</label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={String(alloc.quantityAccepted)}
                            onChange={(e) =>
                              updateLineField(li, "quantityAccepted", e.target.value, totalDeclared)
                            }
                            className="h-7 w-16 text-center font-bold bg-white text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="text-[#d33d44] font-semibold text-[11px]">Rejected:</label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={String(alloc.quantityRejected)}
                            onChange={(e) =>
                              updateLineField(li, "quantityRejected", e.target.value, totalDeclared)
                            }
                            className="h-7 w-16 text-center font-bold bg-white text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="text-amber-700 font-semibold text-[11px]">Missing:</label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={String(alloc.quantityMissing)}
                            onChange={(e) =>
                              updateLineField(li, "quantityMissing", e.target.value, totalDeclared)
                            }
                            className="h-7 w-16 text-center font-bold bg-white text-xs"
                          />
                        </div>
                        <span className="text-[11px] text-[#89918d] ml-auto">
                          {alloc.quantityAccepted + alloc.quantityRejected + alloc.quantityMissing} of {totalDeclared}
                        </span>
                      </div>
                    )}

                    {/* Shortfall handling (if any rejected or missing) */}
                    {(Number(alloc.quantityRejected ?? 0) > 0 || Number(alloc.quantityMissing ?? 0) > 0) && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-black/[0.04]">
                        <div className="flex items-center gap-2">
                          <span className="text-[#68726d] text-[11px]">
                            Shortfall ({alloc.quantityRejected + alloc.quantityMissing}{" "}
                            {alloc.quantityRejected + alloc.quantityMissing === 1 ? "unit" : "units"}):
                          </span>
                          <div className="inline-flex rounded-md border border-black/[0.08] p-0.5 bg-[#f5f7f6]">
                            <button
                              type="button"
                              onClick={() => updateLineDisposition(li, "backorder")}
                              className={`px-2.5 py-0.5 rounded text-[11px] transition-all cursor-pointer ${
                                alloc.recommendedDisposition === "backorder"
                                  ? "bg-white text-[#087f70] shadow-xs font-semibold"
                                  : "text-[#68726d] hover:text-[#0b100e] font-medium"
                              }`}
                            >
                              Backorder
                            </button>
                            <button
                              type="button"
                              onClick={() => updateLineDisposition(li, "forfeit")}
                              className={`px-2.5 py-0.5 rounded text-[11px] transition-all cursor-pointer ${
                                alloc.recommendedDisposition === "forfeit"
                                  ? "bg-white text-[#d33d44] shadow-xs font-semibold"
                                  : "text-[#68726d] hover:text-[#0b100e] font-medium"
                              }`}
                            >
                              Forfeit
                            </button>
                          </div>
                        </div>
                        <span className="text-[11px] text-[#89918d]">
                          {alloc.recommendedDisposition === "backorder"
                            ? "Vendor to redeliver replacement"
                            : "Cancel shortfall from order"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* SECTION 2: Settled Items in Shipment */}
            {settledLines.length > 0 && (
              <div className="rounded-xl border border-black/[0.06] bg-[#fafafa] p-3 text-xs space-y-2">
                <div className="flex items-center justify-between text-[#68726d]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#087f70]" />
                    Settled Items in Shipment ({settledLines.length})
                  </span>
                  <span className="text-[11px] text-[#89918d]">Agreed · No action needed</span>
                </div>
                <div className="space-y-1 pt-1 border-t border-black/[0.04]">
                  {settledLines.map((li: any) => {
                    const totalDeclared = getLineDeclaredTotal(li);
                    const matchingInReceipt = (receipt?.lineItems || []).find((rli: any) =>
                      (rli.deliveryReceiptLineItemId && rli.deliveryReceiptLineItemId === li.deliveryReceiptLineItemId) ||
                      (rli.purchaseOrderLineItemId && rli.purchaseOrderLineItemId === li.purchaseOrderLineItemId)
                    );
                    const activeAllocs = (li.dispositionAllocations?.length ? li.dispositionAllocations : matchingInReceipt?.dispositionAllocations) || [];

                    return (
                      <div key={resolveLineReceiptId(li) || li.name} className="flex items-center justify-between text-[11px] py-0.5">
                        <span className="font-medium text-[#0b100e]">{li.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#68726d]">
                            {li.quantityAccepted ?? totalDeclared} accepted
                            {Number(li.quantityRejected ?? 0) > 0 ? `, ${li.quantityRejected} rejected` : ""}
                          </span>
                          {activeAllocs.length > 0 ? (
                            <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-medium text-[10px] border border-amber-200/50">
                              {activeAllocs[0]?.disposition}: {activeAllocs[0]?.quantity}
                              {activeAllocs[0]?.expectedRedeliveryDate ? ` (due ${new Date(activeAllocs[0].expectedRedeliveryDate).toLocaleDateString()})` : ""}
                            </span>
                          ) : (
                            <span className="text-[#087f70] bg-[#f0faf8] px-1.5 py-0.5 rounded font-medium text-[10px] border border-[#087f70]/20">
                              Fully Accepted
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 3: Final Decision Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#0b100e]">
                Final Determination Reason <span className="text-[#d33d44]">*</span>
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain the rationale for this determination (e.g. Serial numbers verified against shipping manifest)..."
                rows={2}
                disabled={finalDecisionMut.isPending}
                className="resize-none rounded-lg border-black/[0.12] text-xs focus:ring-[#087f70] focus:border-[#087f70]"
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
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-dashed border-black/[0.15] bg-[#fafafa]">
                <div className="flex items-center gap-2 text-xs">
                  <UploadCloud className="w-4 h-4 text-[#68726d]" />
                  <span className="text-[#68726d]">Attach additional inspection photo (optional)</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={finalDecisionMut.isPending || uploadEvidenceMut.isPending}
                  className="h-7 px-2.5 rounded-md text-xs font-medium border-black/[0.12] text-[#0b100e] hover:bg-black/[0.04]"
                >
                  {uploadEvidenceMut.isPending ? "Uploading…" : "Add Photo"}
                </Button>
              </div>

              {extraEvidence.length > 0 && (
                <div className="space-y-1">
                  {extraEvidence.map((ev, i) => (
                    <div
                      key={ev.publicId || i}
                      className="flex items-center justify-between px-3 py-1.5 rounded-md bg-[#f9faf9] border border-black/[0.06] text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-[#087f70] shrink-0" />
                        <span className="font-medium text-[#0b100e] truncate">
                          {ev.localName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setExtraEvidence((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="text-[#68726d] hover:text-[#d33d44] p-1 cursor-pointer"
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
          <div className="px-6 py-3 border-t border-black/[0.06] flex items-center justify-end gap-2.5 bg-white shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={finalDecisionMut.isPending}
              className="h-9 px-4 rounded-lg border-black/[0.12] font-medium text-xs text-[#0b100e] hover:bg-black/[0.03]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="h-9 px-5 rounded-lg bg-[#087f70] hover:bg-[#076a5e] text-white font-semibold text-xs disabled:opacity-40"
            >
              {finalDecisionMut.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : null}
              {disputedLines.length === 1
                ? `Submit Final Decision for ${disputedLines[0].name}`
                : "Submit Final Determination"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
