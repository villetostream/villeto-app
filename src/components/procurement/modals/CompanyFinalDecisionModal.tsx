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

interface LineAllocationState {
  quantityAccepted: number;
  quantityRejected: number;
  quantityMissing: number;
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

  // Helper to get total declared units for a receipt line item
  const getLineDeclaredTotal = (li: any) => {
    const sum =
      Number(li.quantityAccepted ?? 0) +
      Number(li.quantityRejected ?? 0) +
      Number(li.quantityMissing ?? 0);
    if (sum > 0) return sum;
    return Number(li.quantityReceived ?? li.quantityOrdered ?? 0);
  };

  useEffect(() => {
    if (!open) return;
    setDecision("uphold_buyer_finding");
    setReason("");
    setExtraEvidence([]);

    const initial: Record<string, LineAllocationState> = {};
    for (const li of receiptLines) {
      const lineId = li.deliveryReceiptLineItemId || li.purchaseOrderLineItemId;
      if (!lineId) continue;
      initial[lineId] = {
        quantityAccepted: Number(li.quantityAccepted ?? 0),
        quantityRejected: Number(li.quantityRejected ?? 0),
        quantityMissing: Number(li.quantityMissing ?? 0),
        reason: "",
      };
    }
    setAllocations(initial);
  }, [open, deliveryReceiptId, receiptLines.length]);

  const handleDecisionSwitch = (nextDecision: FinalDecisionChoice) => {
    setDecision(nextDecision);
    const updated: Record<string, LineAllocationState> = {};

    for (const li of receiptLines) {
      const lineId = li.deliveryReceiptLineItemId || li.purchaseOrderLineItemId;
      if (!lineId) continue;
      const totalDeclared = getLineDeclaredTotal(li);
      const origAccepted = Number(li.quantityAccepted ?? 0);
      const origRejected = Number(li.quantityRejected ?? 0);
      const origMissing = Number(li.quantityMissing ?? 0);

      if (nextDecision === "uphold_buyer_finding") {
        updated[lineId] = {
          quantityAccepted: origAccepted,
          quantityRejected: origRejected,
          quantityMissing: origMissing,
          reason: allocations[lineId]?.reason || "",
        };
      } else if (nextDecision === "accept_vendor_dispute") {
        // Default vendor-disputed lines to accepting the rejected units unless vendor specified otherwise
        updated[lineId] = {
          quantityAccepted: origAccepted + origRejected,
          quantityRejected: 0,
          quantityMissing: Math.max(0, totalDeclared - (origAccepted + origRejected)),
          reason: allocations[lineId]?.reason || "",
        };
      } else {
        updated[lineId] = allocations[lineId] || {
          quantityAccepted: origAccepted,
          quantityRejected: origRejected,
          quantityMissing: origMissing,
          reason: "",
        };
      }
    }
    setAllocations(updated);
  };

  const updateLineField = (
    lineId: string,
    field: "quantityAccepted" | "quantityRejected" | "quantityMissing",
    rawVal: string,
    totalDeclared: number,
  ) => {
    const cleaned = rawVal.replace(/[^\d]/g, "");
    const num = Math.min(totalDeclared, Math.max(0, parseInt(cleaned, 10) || 0));

    setAllocations((prev) => {
      const current = prev[lineId] || {
        quantityAccepted: 0,
        quantityRejected: 0,
        quantityMissing: 0,
        reason: "",
      };
      const next = { ...current, [field]: num };

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

      return { ...prev, [lineId]: next };
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
      toast.success("Additional buyer evidence uploaded");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to upload evidence image.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isAllocationValid = receiptLines.every((li: any) => {
    const lineId = li.deliveryReceiptLineItemId || li.purchaseOrderLineItemId;
    if (!lineId) return true;
    const alloc = allocations[lineId];
    if (!alloc) return true;
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
        .filter((li: any) => Boolean(li.deliveryReceiptLineItemId))
        .map((li: any) => {
          const lineId = li.deliveryReceiptLineItemId;
          const alloc = allocations[lineId] || {
            quantityAccepted: Number(li.quantityAccepted ?? 0),
            quantityRejected: Number(li.quantityRejected ?? 0),
            quantityMissing: Number(li.quantityMissing ?? 0),
            reason: "",
          };
          return {
            deliveryReceiptLineItemId: lineId,
            quantityAccepted: alloc.quantityAccepted,
            quantityRejected: alloc.quantityRejected,
            quantityMissing: alloc.quantityMissing,
            ...(alloc.reason?.trim() ? { reason: alloc.reason.trim() } : {}),
          };
        });

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
          ...(lineItemsPayload.length > 0 ? { lineItems: lineItemsPayload } : {}),
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

  const buyerEvidence = effectiveReceipt?.evidence || [];
  const vendorEvidence = effectiveReceipt?.vendorEvidence || [];

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
          <div className="p-6 py-4 flex-1 overflow-y-auto min-h-0 space-y-4">
            {/* Vendor Dispute Context */}
            <div className="rounded-[12px] border border-black/[0.06] bg-[#f9faf9] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#68726d] flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-[#34413b]" /> Vendor Dispute Summary
                </span>
                {effectiveReceipt?.vendorRespondedAt && (
                  <span className="text-[11px] text-[#89918d]">
                    Disputed {new Date(effectiveReceipt.vendorRespondedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#111815] font-medium">
                {effectiveReceipt?.vendorResponseReason ||
                  receiptLines.find((l: any) => l.vendorResponseReason)?.vendorResponseReason ||
                  "Vendor disputed the inspection finding on this receipt."}
              </p>

              {(vendorEvidence.length > 0 || buyerEvidence.length > 0) && (
                <div className="pt-2.5 border-t border-black/[0.05] space-y-2.5">
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
                    {buyerEvidence.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-[#89918d] mb-1.5">
                          Buyer Evidence ({buyerEvidence.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {buyerEvidence.map((ev, idx) => (
                            <button
                              key={ev.publicId || idx}
                              type="button"
                              onClick={() =>
                                setPreviewPhoto({
                                  url: ev.url,
                                  label: `Company Inspection Photo #${idx + 1}`,
                                })
                              }
                              className="group relative w-12 h-12 rounded-lg overflow-hidden border border-black/[0.08] bg-white hover:border-[#087f70] transition-all cursor-pointer"
                              title={`Preview Buyer Photo #${idx + 1}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={ev.url}
                                alt={`Buyer Photo #${idx + 1}`}
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

            {/* 3 Decision Choices */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#0b100e]">
                Select Final Decision <span className="text-[#d33d44]">*</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    key: "uphold_buyer_finding" as const,
                    title: "Uphold Buyer Finding",
                    desc: "Keep original company quantities",
                  },
                  {
                    key: "accept_vendor_dispute" as const,
                    title: "Accept Vendor Dispute",
                    desc: "Accept vendor's disputed units",
                  },
                  {
                    key: "revise_buyer_finding" as const,
                    title: "Revise Buyer Finding",
                    desc: "Enter a custom final allocation",
                  },
                ].map((opt) => {
                  const active = decision === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleDecisionSwitch(opt.key)}
                      className={`p-3 rounded-[12px] border text-left transition-all ${
                        active
                          ? "border-[#087f70] bg-[#f0faf8] ring-2 ring-[#087f70]/20"
                          : "border-black/[0.08] bg-white hover:bg-[#f9faf9]"
                      }`}
                    >
                      <p className="text-xs font-bold text-[#0b100e] flex items-center justify-between">
                        {opt.title}
                        {active && <CheckCircle2 className="w-3.5 h-3.5 text-[#087f70] shrink-0" />}
                      </p>
                      <p className="text-[11px] text-[#68726d] mt-1">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Line Item Final Allocation Table */}
            {receiptLines.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-[#0b100e]">
                    Line Item Allocation
                  </Label>
                  {!isAllocationValid && (
                    <span className="text-[11px] font-semibold text-[#d33d44] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Accepted + Rejected + Missing must equal declared quantity
                    </span>
                  )}
                </div>

                <div className="border border-black/[0.06] rounded-[12px] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#f9faf9] border-b border-black/[0.06]">
                        <th className="px-3.5 py-2.5 text-left font-semibold text-[#68726d]">
                          Item & Original Finding
                        </th>
                        <th className="px-2.5 py-2.5 text-center font-semibold text-[#087f70] w-24">
                          Final Accepted
                        </th>
                        <th className="px-2.5 py-2.5 text-center font-semibold text-[#e14856] w-24">
                          Final Rejected
                        </th>
                        <th className="px-2.5 py-2.5 text-center font-semibold text-amber-700 w-24">
                          Final Missing
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.04]">
                      {receiptLines.map((li: any, idx: number) => {
                        const lineId =
                          li.deliveryReceiptLineItemId ||
                          li.purchaseOrderLineItemId ||
                          String(idx);
                        const totalDeclared = getLineDeclaredTotal(li);
                        const alloc = allocations[lineId] || {
                          quantityAccepted: Number(li.quantityAccepted ?? 0),
                          quantityRejected: Number(li.quantityRejected ?? 0),
                          quantityMissing: Number(li.quantityMissing ?? 0),
                          reason: "",
                        };
                        const isReadOnlyLine = decision === "uphold_buyer_finding";

                        return (
                          <tr key={lineId} className="bg-white">
                            <td className="px-3.5 py-3 align-middle">
                              <p className="font-semibold text-[#0b100e]">
                                {li.name || "Line Item"}
                              </p>
                              <p className="text-[11px] text-[#68726d] mt-0.5">
                                Original: {li.quantityAccepted ?? 0} accepted ·{" "}
                                {li.quantityRejected ?? 0} rejected ·{" "}
                                {li.quantityMissing ?? 0} missing (of {totalDeclared})
                              </p>
                              {li.exceptionReason && (
                                <p className="text-[10px] text-[#89918d] italic mt-0.5">
                                  Buyer note: {formatExceptionReason(li.exceptionReason)}
                                </p>
                              )}
                              {li.vendorResponseReason && (
                                <p className="text-[10px] text-[#68726d] font-medium mt-0.5">
                                  Vendor note: {li.vendorResponseReason}
                                </p>
                              )}
                            </td>
                            <td className="px-2.5 py-2.5 text-center align-middle">
                              <Input
                                type="text"
                                inputMode="numeric"
                                disabled={isReadOnlyLine || finalDecisionMut.isPending}
                                value={String(alloc.quantityAccepted)}
                                onChange={(e) =>
                                  updateLineField(
                                    lineId,
                                    "quantityAccepted",
                                    e.target.value,
                                    totalDeclared,
                                  )
                                }
                                className="h-8 w-16 mx-auto text-center text-xs font-semibold"
                              />
                            </td>
                            <td className="px-2.5 py-2.5 text-center align-middle">
                              <Input
                                type="text"
                                inputMode="numeric"
                                disabled={isReadOnlyLine || finalDecisionMut.isPending}
                                value={String(alloc.quantityRejected)}
                                onChange={(e) =>
                                  updateLineField(
                                    lineId,
                                    "quantityRejected",
                                    e.target.value,
                                    totalDeclared,
                                  )
                                }
                                className="h-8 w-16 mx-auto text-center text-xs font-semibold"
                              />
                            </td>
                            <td className="px-2.5 py-2.5 text-center align-middle">
                              <Input
                                type="text"
                                inputMode="numeric"
                                disabled={isReadOnlyLine || finalDecisionMut.isPending}
                                value={String(alloc.quantityMissing)}
                                onChange={(e) =>
                                  updateLineField(
                                    lineId,
                                    "quantityMissing",
                                    e.target.value,
                                    totalDeclared,
                                  )
                                }
                                className="h-8 w-16 mx-auto text-center text-xs font-semibold"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Final Decision Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#0b100e]">
                Final Decision Reason <span className="text-[#d33d44]">*</span>
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Evidence confirms that seven of the ten rejected units are acceptable."
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
                      Attach additional buyer evidence (optional)
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
              className="h-10 px-6 rounded-[12px] bg-[#087f70] hover:bg-[#076a5e] text-white font-semibold text-sm"
            >
              {finalDecisionMut.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Submit Final Decision
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

