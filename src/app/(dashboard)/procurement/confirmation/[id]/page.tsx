"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Clock3,
  Loader2,
  Package,
  Truck,
  Monitor,
  Wrench,
  X,
  History,
  CheckCircle2,
  Gavel,
  ExternalLink,
  UploadCloud,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import withPermissions from "@/components/permissions/permission-protected-routes";
import {
  usePurchaseOrder,
  useConfirmPOReceipt,
  useConfirmPOFinalBilling,
  useUploadFulfillmentReceiptEvidence,
  useUploadReceiptExceptionEvidence,
  type DeliveryReceiptRecord,
} from "@/queries/procurement/purchase-orders";
import ConfirmReceiptModal from "@/components/procurement/modals/ConfirmReceiptModal";
import CompanyFinalDecisionModal from "@/components/procurement/modals/CompanyFinalDecisionModal";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const RESOLUTION_STATUS_LABELS: Record<string, string> = {
  not_required: "No Exceptions",
  awaiting_vendor_response: "Awaiting Vendor Response",
  acknowledged: "Vendor Acknowledged",
  disputed: "Vendor Disputed",
  corrective_action_pending: "Corrective Action Pending",
  resolved: "Resolved",
  backordered: "Backordered",
  forfeited: "Forfeited",
  under_company_review: "Under Company Review",
  resolved_after_dispute: "Resolved After Dispute",
};

const FINAL_DECISION_LABELS: Record<string, string> = {
  uphold_buyer_finding: "Upheld Buyer Finding",
  accept_vendor_dispute: "Accepted Vendor Dispute",
  revise_buyer_finding: "Revised Buyer Finding",
};

const DELIVERY_OUTCOME_LABELS: Record<string, string> = {
  not_delivered: "Awaiting Delivery",
  partially_delivered: "Partially Delivered",
  partially_delivered_with_exceptions: "Partially Delivered (With Exceptions)",
  partial_delivery_with_exceptions: "Partially Delivered (With Exceptions)",
  delivered: "Fully Delivered",
  fully_delivered: "Fully Delivered",
  delivered_with_exceptions: "Delivered (With Exceptions)",
  full_delivery_with_exceptions: "Delivered (With Exceptions)",
};

function formatCurrency(amount: number, currency: string = "USD") {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(amount);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateStr));
}

function formatExceptionReason(reason: string | null | undefined) {
  if (!reason) return "";
  return reason.replace(/^Other\s*\(specify below\)\s*:\s*/i, "").trim();
}

function WorkflowStep({ label, person, timestamp, done, pending, isLast, badge, badgeColor }: {
  label: string; person?: string; timestamp?: string; done?: boolean; pending?: boolean; isLast?: boolean; badge?: string; badgeColor?: string;
}) {
  const status = done ? "done" : pending ? "pending" : "inactive";
  return (
    <div className={`flex items-start gap-3 ${status === "inactive" ? "opacity-45" : ""}`}>
      {/* Icon + connector */}
      <div className="flex flex-col items-center shrink-0 pt-0.5">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
          status === "done"
            ? "bg-[#f0faf8]"
            : "bg-[#f5f7f6] border border-black/[0.06]"
        }`}>
          {status === "done"
            ? <svg className="w-3 h-3 text-[#087f70]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            : <div className={`w-1.5 h-1.5 rounded-full ${status === "pending" ? "bg-amber-400" : "bg-black/[0.15]"}`} />
          }
        </div>
        {!isLast && (
          <div className="w-px bg-black/[0.06] flex-1 min-h-[16px] mt-0.5" />
        )}
      </div>

      {/* Content */}
      <div className={`pb-4 min-w-0 ${isLast ? "pb-0" : ""}`}>
        <p className={`text-xs font-medium ${status === "done" ? "text-[#68726d]" : "text-[#84908a]"}`}>{label}</p>
        {person && (
          <p className={`text-sm font-semibold flex items-center gap-1.5 flex-wrap mt-0.5 ${status === "done" || status === "pending" ? "text-[#0b100e]" : "text-[#84908a]"}`}>
            {person}
            {badge && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${badgeColor}`}>
                {badge}
              </span>
            )}
          </p>
        )}
        {!person && badge && (
          <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${badgeColor}`}>
            {badge}
          </span>
        )}
        {timestamp && (
          <p className="text-xs text-[#68726d] mt-0.5">{timestamp}</p>
        )}
      </div>
    </div>
  );
}

function FulfillmentHistoryCard({
  notice,
  index,
  canReceive,
  onReceive,
  onMakeFinalDecision,
  onAppendReceiptEvidence,
  isUploadingReceiptEvidence,
  purchaseOrderLineItems,
  outstandingAfterReceiptByFulfillmentLineId,
  outstandingAfterReadyByFulfillmentLineId,
  receiptConfirmations,
}: {
  notice: any;
  index: number;
  canReceive: boolean;
  onReceive: () => void;
  onMakeFinalDecision: (receipt: DeliveryReceiptRecord) => void;
  onAppendReceiptEvidence: (deliveryReceiptId: string, file: File) => void;
  isUploadingReceiptEvidence?: boolean;
  purchaseOrderLineItems: any[];
  outstandingAfterReceiptByFulfillmentLineId: Map<string, number>;
  outstandingAfterReadyByFulfillmentLineId?: Map<string, number>;
  receiptConfirmations?: DeliveryReceiptRecord[];
}) {
  const matchingReceipt = (receiptConfirmations || []).find(
    (rc: any) =>
      (notice.vendorDeliveryNoticeId && rc.fulfillmentId === notice.vendorDeliveryNoticeId) ||
      (notice.fulfillmentReference && rc.fulfillmentReference === notice.fulfillmentReference) ||
      (notice.shipmentReference && rc.fulfillmentReference === notice.shipmentReference)
  );

  const totalReady = (notice.lineItems || []).reduce(
    (sum: number, item: any) => sum + Number(item.quantityReady || item.quantityShipped || item.quantity || 0),
    0
  );
  const totalReceived = (notice.lineItems || []).reduce(
    (sum: number, item: any) => sum + Number(item.quantityReceived || 0),
    0
  );
  const totalAwaitingReceipt = (notice.lineItems || []).reduce(
    (sum: number, item: any) => sum + Number(item.quantityAwaitingReceipt || 0),
    0
  );

  const hasConfirmedReceipt = Boolean(matchingReceipt);
  const hasExceptions =
    matchingReceipt?.confirmationOutcome === "confirmed_with_exceptions" ||
    (matchingReceipt?.resolutionStatus && matchingReceipt.resolutionStatus !== "not_required");

  const isConfirmed =
    hasConfirmedReceipt ||
    (matchingReceipt?.status === "confirmed" && totalAwaitingReceipt === 0) ||
    (totalReceived > 0 && totalAwaitingReceipt === 0) ||
    (totalReady > 0 && totalReceived >= totalReady);

  const isPartiallyConfirmed =
    !isConfirmed &&
    (totalReceived > 0 || matchingReceipt?.status === "partially_confirmed");

  const canReceiveThisFulfillment =
    canReceive &&
    !isConfirmed &&
    (notice.dispatchStatus === "dispatched" || notice.fulfillmentMethod === "digital" || notice.fulfillmentMethod === "service") &&
    (notice.lineItems || []).some((item: any) => Number(item.quantityAwaitingReceipt || 0) > 0);

  const resolutionStatus = matchingReceipt?.resolutionStatus;
  const companyActionRequired = Boolean(matchingReceipt?.companyActionRequired);
  const vendorActionRequired = Boolean(matchingReceipt?.vendorActionRequired);
  const isResolvedAfterDispute = resolutionStatus === "resolved_after_dispute";

  const hasActiveAttention =
    canReceiveThisFulfillment ||
    companyActionRequired ||
    vendorActionRequired ||
    (Boolean(hasExceptions) && !isResolvedAfterDispute && resolutionStatus !== "resolved" && resolutionStatus !== "forfeited");

  const [expanded, setExpanded] = useState(hasActiveAttention);
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    url: string;
    label: string;
    list: { url: string; label: string }[];
    index: number;
  } | null>(null);
  const evidenceInputRef = useRef<HTMLInputElement | null>(null);
  const isDigital = notice.fulfillmentMethod === "digital";
  const titlePrefix = isDigital ? "Digital Delivery" : "Shipment";

  const canAppendEvidence =
    Boolean(matchingReceipt?.deliveryReceiptId) &&
    Boolean(hasExceptions) &&
    !isResolvedAfterDispute &&
    resolutionStatus !== "resolved" &&
    resolutionStatus !== "forfeited";

  const hasAnyEvidenceBlock =
    Boolean(matchingReceipt) &&
    (canAppendEvidence ||
      (matchingReceipt?.evidence && matchingReceipt.evidence.length > 0) ||
      (matchingReceipt?.vendorEvidence && matchingReceipt.vendorEvidence.length > 0));

  const hasStatusNote =
    Boolean(matchingReceipt) &&
    (companyActionRequired || vendorActionRequired || isResolvedAfterDispute);

  return (
    <div className="bg-white rounded-[14px] border border-black/[0.06] overflow-hidden transition-colors">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-[#f9faf9] transition-colors focus:outline-none"
      >
        <div>
          <h3 className="text-sm font-semibold text-[#0b100e]">
            {titlePrefix} #{index + 1} 
          </h3>
          <p className="text-xs text-[#68726d] mt-1">
            {formatDate(notice.readyAt)} • {notice.declaration === "full" ? "Full Delivery" : "Partial Delivery"}
            {isConfirmed && matchingReceipt?.receivedAt && (
              <> • Confirmed {formatDate(matchingReceipt.receivedAt)}</>
            )}
            {matchingReceipt && (
              <>
                {" "}• Receipt {matchingReceipt.receiptNumber || matchingReceipt.receiptReference || "Confirmed"}
                {matchingReceipt.confirmedByName ? ` (${matchingReceipt.confirmedByName})` : ""}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {companyActionRequired ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#fdecee] text-[#d33d44] border border-[#d33d44]/20">
              <AlertTriangle className="w-3.5 h-3.5" /> Under Company Review
            </span>
          ) : vendorActionRequired ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Clock3 className="w-3.5 h-3.5" /> Awaiting Vendor Response
            </span>
          ) : hasExceptions && resolutionStatus ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {RESOLUTION_STATUS_LABELS[resolutionStatus] || resolutionStatus.replace(/_/g, " ")}
            </span>
          ) : isConfirmed ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#f0faf8] text-[#087f70] border border-[#087f70]/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#087f70]" /> Confirmed
            </span>
          ) : isPartiallyConfirmed ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Clock3 className="w-3.5 h-3.5" /> Partially Confirmed
            </span>
          ) : notice.dispatchStatus && notice.dispatchStatus !== "not_applicable" ? (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
              notice.dispatchStatus === "dispatched" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600"
            }`}>
              {notice.dispatchStatus === "dispatched" ? "Dispatched" : "Pending Dispatch"}
            </span>
          ) : null}

          {companyActionRequired && matchingReceipt && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMakeFinalDecision(matchingReceipt);
              }}
              className="h-8 px-3.5 rounded-lg bg-[#087f70] text-white text-xs font-semibold hover:bg-[#076a5e] transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              Resolve Dispute
            </button>
          )}

          {canReceiveThisFulfillment && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReceive();
              }}
              className="h-8 px-4 rounded-lg bg-[#087f70] text-white text-xs font-semibold hover:bg-[#076a5e] transition-colors whitespace-nowrap"
            >
              Receive {isDigital ? "Delivery" : "Shipment"}
            </button>
          )}
          {expanded ? <ChevronDown className="w-5 h-5 text-[#89918d]" /> : <ChevronRight className="w-5 h-5 text-[#89918d]" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-black/[0.06]">
          {matchingReceipt && (hasStatusNote || hasAnyEvidenceBlock) && (
            <div className="px-5 py-4 bg-[#fcfcfc] border-b border-black/[0.05] space-y-3.5">
              {companyActionRequired && !vendorActionRequired && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <p className="text-[#34413b]">
                    <span className="font-semibold text-[#0b100e]">Vendor Disputed:</span>{" "}
                    {matchingReceipt.vendorResponseReason
                      ? `"${matchingReceipt.vendorResponseReason}"`
                      : "The vendor disputed one or more exception lines. Review their response and record the final decision."}
                  </p>
                </div>
              )}

              {vendorActionRequired && !companyActionRequired && (
                <p className="text-xs text-[#68726d]">
                  <span className="font-semibold text-[#34413b]">Awaiting Vendor Response:</span>{" "}
                  The vendor must choose to backorder, forfeit, or dispute the reported exceptions.
                </p>
              )}

              {isResolvedAfterDispute && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <p className="text-[#34413b]">
                    <span className="font-semibold text-[#087f70]">
                      Dispute Resolved ({FINAL_DECISION_LABELS[matchingReceipt.finalDecision || ""] || matchingReceipt.finalDecision || "Final Decision Recorded"})
                    </span>
                    {matchingReceipt.resolutionNote ? ` — "${matchingReceipt.resolutionNote}"` : ""}
                  </p>
                  {matchingReceipt.resolvedAt && (
                    <span className="text-[11px] text-[#89918d]">
                      {matchingReceipt.resolvedByName ? `${matchingReceipt.resolvedByName} · ` : ""}
                      {formatDate(matchingReceipt.resolvedAt)}
                    </span>
                  )}
                </div>
              )}

              {hasAnyEvidenceBlock && (
                <div className="flex flex-wrap items-start gap-8">
                  {(canAppendEvidence || (matchingReceipt.evidence && matchingReceipt.evidence.length > 0)) && (
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[#89918d] mb-2">
                        Inspection Evidence ({matchingReceipt.evidence?.length || 0})
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {(matchingReceipt.evidence || []).map((ev, i, arr) => {
                          const galleryList = arr.map((item, idx) => ({
                            url: item.url,
                            label: `Company Inspection Photo #${idx + 1}`,
                          }));
                          return (
                            <button
                              key={ev.publicId || i}
                              type="button"
                              onClick={() =>
                                setLightboxPhoto({
                                  url: ev.url,
                                  label: `Company Inspection Photo #${i + 1}`,
                                  list: galleryList,
                                  index: i,
                                })
                              }
                              className="group relative w-12 h-12 rounded-lg overflow-hidden border border-black/[0.08] bg-white hover:border-[#087f70] focus:outline-none transition-all cursor-pointer"
                              title={`View Inspection Photo #${i + 1}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={ev.url}
                                alt={`Inspection Photo #${i + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </button>
                          );
                        })}
                        {canAppendEvidence && (
                          <>
                            <input
                              ref={evidenceInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file && matchingReceipt.deliveryReceiptId) {
                                  onAppendReceiptEvidence(matchingReceipt.deliveryReceiptId, file);
                                }
                                if (evidenceInputRef.current) evidenceInputRef.current.value = "";
                              }}
                            />
                            <button
                              type="button"
                              disabled={isUploadingReceiptEvidence}
                              onClick={() => evidenceInputRef.current?.click()}
                              className="w-12 h-12 rounded-lg border border-dashed border-black/[0.15] bg-white hover:border-[#087f70] hover:text-[#087f70] text-[#68726d] flex flex-col items-center justify-center gap-0.5 transition-colors disabled:opacity-50 cursor-pointer"
                              title="Add another inspection photo"
                            >
                              {isUploadingReceiptEvidence ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <UploadCloud className="w-3.5 h-3.5" />
                              )}
                              <span className="text-[9px] font-medium leading-none">
                                {isUploadingReceiptEvidence ? "..." : "+ Add"}
                              </span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {matchingReceipt.vendorEvidence && matchingReceipt.vendorEvidence.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-[#89918d] mb-2">
                        Vendor Evidence ({matchingReceipt.vendorEvidence.length})
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {matchingReceipt.vendorEvidence.map((ev, i, arr) => {
                          const galleryList = arr.map((item, idx) => ({
                            url: item.url,
                            label: `Vendor Dispute Photo #${idx + 1}`,
                          }));
                          return (
                            <button
                              key={ev.publicId || i}
                              type="button"
                              onClick={() =>
                                setLightboxPhoto({
                                  url: ev.url,
                                  label: `Vendor Dispute Photo #${i + 1}`,
                                  list: galleryList,
                                  index: i,
                                })
                              }
                              className="group relative w-12 h-12 rounded-lg overflow-hidden border border-black/[0.08] bg-white hover:border-[#087f70] focus:outline-none transition-all cursor-pointer"
                              title={`View Vendor Photo #${i + 1}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={ev.url}
                                alt={`Vendor Photo #${i + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="p-5 grid grid-cols-4 gap-4 bg-[#fcfcfc]">
            <div>
              <p className="text-[10px] font-medium text-[#89918d] uppercase tracking-wide">Method</p>
              <p className="text-sm font-medium text-[#111815] mt-1 capitalize">{notice.fulfillmentMethod?.replace(/_/g, " ") || "—"}</p>
            </div>
            {isDigital ? (
              <div className="col-span-3">
                <p className="text-[10px] font-medium text-[#89918d] uppercase tracking-wide">Digital Assets / Instructions</p>
                <p className="text-sm font-medium text-[#111815] mt-1">
                  {notice.notes || "These items are delivered electronically. Please check your email or vendor portal for access instructions."}
                </p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-[10px] font-medium text-[#89918d] uppercase tracking-wide">Carrier</p>
                  <p className="text-sm font-medium text-[#111815] mt-1">{notice.carrier || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[#89918d] uppercase tracking-wide">Tracking No.</p>
                  <p className="text-sm font-medium text-[#111815] mt-1">{notice.trackingNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[#89918d] uppercase tracking-wide">Packing Slip</p>
                  <p className="text-sm font-medium text-[#111815] mt-1">{notice.packingSlipNumber || "—"}</p>
                </div>
              </>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-black/[0.06] bg-[#f9faf9]">
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-[#68726d] whitespace-nowrap">Item</th>
                  <th className="px-5 py-2.5 text-center text-xs font-semibold text-[#68726d] whitespace-nowrap">Quantity Sent</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-[#68726d] whitespace-nowrap">Inspection & Exceptions</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-[#68726d] whitespace-nowrap">Remaining on Order</th>
                </tr>
              </thead>
              <tbody>
                {(notice.lineItems || []).map((item: any, i: number) => {
                  const poLineItem = purchaseOrderLineItems.find(
                    (lineItem: any) => lineItem.purchaseOrderLineItemId === item.purchaseOrderLineItemId,
                  );
                  const receiptLineItem = (matchingReceipt?.lineItems || []).find(
                    (rli: any) =>
                      (item.vendorDeliveryNoticeLineItemId &&
                        rli.fulfillmentLineItemId === item.vendorDeliveryNoticeLineItemId) ||
                      (item.purchaseOrderLineItemId &&
                        rli.purchaseOrderLineItemId === item.purchaseOrderLineItemId),
                  );
                  const orderedQuantity = Number(poLineItem?.quantity ?? item.quantityOrdered ?? item.quantity ?? 0);
                  const outstandingAfterReceipt = outstandingAfterReceiptByFulfillmentLineId.get(
                    item.vendorDeliveryNoticeLineItemId,
                  );
                  const remainingQty = outstandingAfterReadyByFulfillmentLineId 
                    ? (outstandingAfterReadyByFulfillmentLineId.get(item.vendorDeliveryNoticeLineItemId) ?? Math.max(0, orderedQuantity - (item.quantityReady || 0)))
                    : Math.max(0, orderedQuantity - (item.quantityReady || 0));

                  const hasFinalDecisionNumbers =
                    receiptLineItem &&
                    (receiptLineItem.finalQuantityAccepted != null ||
                      receiptLineItem.resolutionStatus === "resolved_after_dispute" ||
                      isResolvedAfterDispute);

                  const displayAccepted = hasFinalDecisionNumbers
                    ? Number(receiptLineItem.finalQuantityAccepted ?? receiptLineItem.quantityAccepted ?? 0)
                    : Number(receiptLineItem?.quantityAccepted ?? item.quantityReceived ?? 0);
                  const displayRejected = hasFinalDecisionNumbers
                    ? Number(receiptLineItem.finalQuantityRejected ?? receiptLineItem.quantityRejected ?? 0)
                    : Number(receiptLineItem?.quantityRejected ?? 0);
                  const displayMissing = hasFinalDecisionNumbers
                    ? Number(receiptLineItem.finalQuantityMissing ?? receiptLineItem.quantityMissing ?? 0)
                    : Number(receiptLineItem?.quantityMissing ?? 0);

                  // Per-line vendor disposition & resolution status (do not apply receipt-level summary back onto every line)
                  const lineVendorDisposition = receiptLineItem?.vendorDisposition;
                  const lineResolutionStatus = receiptLineItem?.resolutionStatus;
                  const lineRedeliveryDate = receiptLineItem?.expectedRedeliveryDate;

                  return (
                  <tr key={i} className="border-b border-black/[0.04] last:border-b-0">
                    <td className="px-5 py-3 font-medium text-[#111815] align-top">{item.name || "Item"}</td>
                    <td className="px-5 py-3 text-center text-[#111815] font-medium align-top">{item.quantityReady || 0}</td>
                    <td className="px-5 py-3 align-top">
                      {!receiptLineItem && (item.quantityReceived || 0) === 0 ? (
                        <span className="text-[#68726d]">—</span>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#f0faf8] text-[#087f70]">
                              {displayAccepted} accepted
                            </span>
                            {displayRejected > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-[#e14856]">
                                {displayRejected} rejected
                              </span>
                            )}
                            {displayMissing > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700">
                                {displayMissing} missing
                              </span>
                            )}
                          </div>

                          {/* Original buyer finding shown as history when final decision exists */}
                          {hasFinalDecisionNumbers && receiptLineItem && (
                            <p className="text-[11px] text-[#68726d] bg-[#f9faf9] px-2 py-1 rounded border border-black/[0.05]">
                              <span className="font-semibold text-[#34413b]">Original finding (history):</span>{" "}
                              {receiptLineItem.quantityAccepted ?? 0} accepted ·{" "}
                              {receiptLineItem.quantityRejected ?? 0} rejected ·{" "}
                              {receiptLineItem.quantityMissing ?? 0} missing
                            </p>
                          )}

                          {receiptLineItem?.exceptionReason && (
                            <p className="text-[11px] text-[#68726d]">
                              Reason: {formatExceptionReason(receiptLineItem.exceptionReason)}
                            </p>
                          )}

                          {/* Single line-level disposition / resolution badge */}
                          {(lineVendorDisposition || (lineResolutionStatus && lineResolutionStatus !== "not_required")) && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {lineResolutionStatus === "resolved_after_dispute" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#f0faf8] text-[#087f70]">
                                  Resolved After Dispute
                                </span>
                              ) : lineVendorDisposition === "backorder" || lineResolutionStatus === "backordered" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#f5f7f6] text-[#34413b] border border-black/[0.06]">
                                  <Clock3 className="w-3 h-3 text-amber-600" /> Backordered by Vendor
                                  {lineRedeliveryDate
                                    ? ` (due ${formatDate(lineRedeliveryDate).split(",")[0]})`
                                    : ""}
                                </span>
                              ) : lineVendorDisposition === "forfeit" || lineResolutionStatus === "forfeited" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#f5f7f6] text-[#68726d] border border-black/[0.06]">
                                  Forfeited by Vendor
                                </span>
                              ) : lineVendorDisposition === "dispute" || lineResolutionStatus === "disputed" ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#fdecee] text-[#d33d44]">
                                  Vendor Disputed
                                </span>
                              ) : lineResolutionStatus ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#f5f7f6] text-[#34413b]">
                                  {RESOLUTION_STATUS_LABELS[lineResolutionStatus] || lineResolutionStatus.replace(/_/g, " ")}
                                </span>
                              ) : null}
                            </div>
                          )}

                          {receiptLineItem?.vendorResponseReason && (
                            <p className="text-[11px] text-[#89918d] italic">
                              Vendor note: {receiptLineItem.vendorResponseReason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 align-top">
                      {outstandingAfterReceipt === undefined ? (
                        <span className="text-[#68726d]">—</span>
                      ) : (
                        <div className="flex flex-col gap-1.5 items-start">
                          <div>
                            <p className="font-medium text-[#111815]">{poLineItem?.quantityOutstanding ?? outstandingAfterReceipt} remaining</p>
                            <p className="text-[11px] text-[#89918d]">of {orderedQuantity} ordered</p>
                          </div>
                          {item.remainingDisposition === "cannot_fulfill" ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium whitespace-nowrap mt-0.5">
                              <AlertCircle className="w-3.5 h-3.5" /> {remainingQty} Cannot Fulfill
                            </span>
                          ) : item.remainingDisposition === "backordered" ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium whitespace-nowrap mt-0.5">
                              <Clock3 className="w-3.5 h-3.5" /> {remainingQty} Backordered (exp. {formatDate(item.expectedReadyDate).split(",")[0]})
                            </span>
                          ) : notice.declaration === "full" ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#f0faf8] text-[#087f70] text-xs font-medium whitespace-nowrap mt-0.5">
                              Fully Fulfilled
                            </span>
                          ) : null}
                          {item.dispositionReason && (
                            <p className="text-[11px] text-[#89918d] italic truncate max-w-[200px]" title={item.dispositionReason}>
                              Reason: {item.dispositionReason}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* In-Page Evidence Photo Lightbox */}
      <Dialog open={!!lightboxPhoto} onOpenChange={(o) => !o && setLightboxPhoto(null)}>
        <DialogContent
          showCloseButton={false}
          className="max-w-3xl p-0 overflow-hidden bg-[#0b100e] border border-white/10 rounded-[16px] shadow-2xl"
        >
          {lightboxPhoto && (
            <div className="flex flex-col">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 text-white">
                <DialogTitle className="text-sm font-semibold text-white">
                  {lightboxPhoto.label}
                  {lightboxPhoto.list.length > 1 && (
                    <span className="ml-2 text-xs font-normal text-white/60">
                      ({lightboxPhoto.index + 1} of {lightboxPhoto.list.length})
                    </span>
                  )}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <a
                    href={lightboxPhoto.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors"
                  >
                    Open Original <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setLightboxPhoto(null)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="relative flex items-center justify-center bg-black/90 p-4 min-h-[340px] max-h-[75vh]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lightboxPhoto.url}
                  alt={lightboxPhoto.label}
                  className="max-h-[70vh] max-w-full object-contain rounded-lg"
                />
                {lightboxPhoto.list.length > 1 && (
                  <div className="absolute inset-x-4 flex items-center justify-between pointer-events-none">
                    <button
                      type="button"
                      onClick={() => {
                        const prevIdx =
                          (lightboxPhoto.index - 1 + lightboxPhoto.list.length) %
                          lightboxPhoto.list.length;
                        const prevItem = lightboxPhoto.list[prevIdx];
                        setLightboxPhoto({
                          ...lightboxPhoto,
                          url: prevItem.url,
                          label: prevItem.label,
                          index: prevIdx,
                        });
                      }}
                      className="pointer-events-auto h-9 px-3 rounded-full bg-black/65 hover:bg-black/85 text-white text-xs font-semibold border border-white/15 transition-colors"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextIdx = (lightboxPhoto.index + 1) % lightboxPhoto.list.length;
                        const nextItem = lightboxPhoto.list[nextIdx];
                        setLightboxPhoto({
                          ...lightboxPhoto,
                          url: nextItem.url,
                          label: nextItem.label,
                          index: nextIdx,
                        });
                      }}
                      className="pointer-events-auto h-9 px-3 rounded-full bg-black/65 hover:bg-black/85 text-white text-xs font-semibold border border-white/15 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemFulfillmentDrawer({
  open,
  onClose,
  item,
  fulfillments,
}: {
  open: boolean;
  onClose: () => void;
  item: any;
  fulfillments: any[];
}) {
  if (!item) return null;

  // Filter fulfillments that include this item
  const relevantFulfillments = fulfillments
    .map((f) => {
      const lineItem = f.lineItems?.find(
        (li: any) => li.purchaseOrderLineItemId === item.purchaseOrderLineItemId
      );
      return { notice: f, lineItem };
    })
    .filter((f) => !!f.lineItem)
    // Sort chronologically by readyAt or shippedAt
    .sort((a, b) => {
      const dateA = new Date(a.notice.readyAt || a.notice.shippedAt).getTime();
      const dateB = new Date(b.notice.readyAt || b.notice.shippedAt).getTime();
      return dateA - dateB;
    });

  const qtyReady = item.quantityReady || 0;
  const isCancelled = item.remainingDisposition === "cannot_fulfill";
  const isFullyReady = qtyReady >= item.quantity;
  const remaining = item.quantity - qtyReady;

  const methodLabel: Record<string, string> = {
    carrier: "Carrier",
    vendor_truck: "Vendor Truck",
    digital: "Digital",
    service: "Service",
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-2xl p-0 overflow-hidden sm:max-h-[85vh] flex flex-col gap-0 border-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] bg-[#f9faf9]">
          <div>
            <DialogTitle className="text-lg font-bold text-[#0b100e]">{item.name}</DialogTitle>
            <p className="text-sm text-[#68726d] mt-0.5 truncate max-w-sm">
              {item.description || "No description"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/[0.04] transition-colors"
          >
            <X className="h-4 w-4 text-[#68726d]" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6 bg-white">
          {/* Summary Section */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-[14px] bg-[#fcfcfc] border border-black/[0.06]">
            <div>
              <p className="text-xs text-[#89918d] uppercase tracking-wide font-medium">Ordered</p>
              <p className="text-base font-semibold mt-0.5 text-[#0b100e]">{item.quantity}</p>
            </div>
            <div>
              <p className="text-xs text-[#89918d] uppercase tracking-wide font-medium">Fulfilled</p>
              <p className="text-base font-semibold mt-0.5 text-[#087f70]">{qtyReady}</p>
            </div>
            <div>
              <p className="text-xs text-[#89918d] uppercase tracking-wide font-medium">Remaining</p>
              <p className="text-base font-semibold mt-0.5 text-[#0b100e]">
                {isCancelled ? 0 : (remaining > 0 ? remaining : 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#89918d] uppercase tracking-wide font-medium">Status</p>
              <div className="mt-1">
                {isFullyReady ? (
                  <span className="text-xs text-[#087f70] bg-[#f0faf8] border border-[#087f70]/20 px-1.5 py-0.5 rounded-md font-medium">Fully Fulfilled</span>
                ) : isCancelled ? (
                  <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md font-medium">{remaining} Cannot Fulfill</span>
                ) : item.remainingDisposition === "backordered" ? (
                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md font-medium">
                    Backordered (exp. {formatDate(item.expectedReadyDate).split(",")[0]})
                  </span>
                ) : qtyReady > 0 ? (
                  <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md font-medium">Partially Fulfilled</span>
                ) : (
                  <span className="text-xs text-[#68726d] font-medium bg-[#f5f7f6] px-1.5 py-0.5 rounded-md border border-black/[0.06]">Pending</span>
                )}
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div>
            <h3 className="text-sm font-semibold text-[#0b100e] flex items-center gap-2 mb-4">
              <History className="h-4 w-4 text-[#89918d]" />
              Fulfillment Timeline
            </h3>

            {relevantFulfillments.length === 0 ? (
              <p className="text-sm text-[#89918d] italic">No fulfillments recorded for this item yet.</p>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.25rem] before:-translate-x-px before:h-full before:w-0.5 before:bg-black/[0.06]">
                {(() => {
                  let runningReady = 0;
                  return relevantFulfillments.map((f, idx) => {
                    const method = f.notice.fulfillmentMethod || "unknown";
                    const isPhysical = ["carrier", "vendor_truck"].includes(method);
                    let Icon = Package;
                    if (isPhysical) Icon = Truck;
                    else if (method === "digital") Icon = Monitor;
                    else if (method === "service") Icon = Wrench;

                    const li = f.lineItem!;
                    runningReady += li.quantityReady || 0;
                    const remainingAtTime = Math.max(0, item.quantity - runningReady);

                    const liConfirmed = (li.quantityReceived || 0) > 0 && (li.quantityAwaitingReceipt == null || Number(li.quantityAwaitingReceipt) === 0);
                    const liPartiallyConfirmed = !liConfirmed && Number(li.quantityReceived || 0) > 0;

                    let badgeText = f.notice.dispatchStatus === "dispatched" ? "Dispatched" : "Pending Dispatch";
                    let badgeColor = f.notice.dispatchStatus === "dispatched"
                      ? "bg-blue-50 text-blue-600 border-blue-200"
                      : "bg-gray-50 text-gray-600 border-gray-200";

                    if (liConfirmed) {
                      badgeText = "Confirmed";
                      badgeColor = "bg-[#f0faf8] text-[#087f70] border-[#087f70]/20";
                    } else if (liPartiallyConfirmed) {
                      badgeText = "Partially Confirmed";
                      badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                    }

                    return (
                      <div key={f.notice.vendorDeliveryNoticeId || idx} className="relative flex items-start gap-4 group">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-[#f9faf9] text-[#89918d] shrink-0 shadow-sm z-10">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0 p-4 rounded-[14px] border border-black/[0.06] bg-white shadow-sm space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-[#0b100e]">
                              {formatDate(f.notice.readyAt || f.notice.shippedAt)}
                            </p>
                            {(isPhysical || liConfirmed || liPartiallyConfirmed) && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${badgeColor}`}>
                                {badgeText}
                              </span>
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-medium text-[#111815]">
                              {li.quantityReady} Fulfilled
                              {li.remainingDisposition && <span className="text-[#89918d] font-normal"> · {remainingAtTime} {li.remainingDisposition === "cannot_fulfill" ? "Cannot fulfill remaining" : `Backordered remaining (exp. ${formatDate(li.expectedReadyDate || item.expectedReadyDate).split(",")[0]})`}</span>}
                            </p>
                          <p className="text-xs text-[#89918d] mt-1">
                            Via {methodLabel[method] || method}
                            {f.notice.carrier && ` (${f.notice.carrier})`}
                          </p>
                        </div>
                        
                        {(li.quantityReceived || 0) > 0 && (
                           <div className="pt-2 border-t border-black/[0.04]">
                             <p className="text-xs text-[#087f70] font-medium">{li.quantityReceived} received by buyer</p>
                           </div>
                        )}
                      </div>
                    </div>
                  );
                })})()}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


function ConfirmationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const receiptMut = useConfirmPOReceipt(id);
  const finalizeBillingMut = useConfirmPOFinalBilling(id);
  const uploadFulfillmentEvidenceMut = useUploadFulfillmentReceiptEvidence(id);
  const uploadReceiptExceptionEvidenceMut = useUploadReceiptExceptionEvidence(id);
  const [activeNotice, setActiveNotice] = useState<any>(null);
  const [activeReceiptForDecision, setActiveReceiptForDecision] = useState<DeliveryReceiptRecord | null>(null);
  const [selectedItemForDrawer, setSelectedItemForDrawer] = useState<any>(null);
  const [showFinalBillingModal, setShowFinalBillingModal] = useState(false);

  const { data, isLoading, isError } = usePurchaseOrder(id);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#087f70]" />
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="flex h-full items-center justify-center text-red-500 p-12">
        Failed to load purchase order details.
      </div>
    );
  }

  const po = data.data as any;
  const canReceive =
    po.status === "ready_for_delivery" ||
    po.status === "partially_delivered" ||
    po.status === "partially_delivered_with_exceptions" ||
    po.status === "delivered_with_exceptions";
  const rawNotices = (po.deliveryNotices && po.deliveryNotices.length > 0)
    ? po.deliveryNotices
    : (po.fulfillments || []);
  const fulfillmentHistory = [...rawNotices].sort(
    (left: any, right: any) =>
      new Date(left.readyAt || left.shippedAt).getTime() -
      new Date(right.readyAt || right.shippedAt).getTime(),
  );
  const outstandingAfterReceiptByFulfillmentLineId = new Map<string, number>();
  const outstandingAfterReadyByFulfillmentLineId = new Map<string, number>();
  const outstandingByPurchaseOrderLineId = new Map<string, number>(
    (po.lineItems || []).map((lineItem: any) => [
      lineItem.purchaseOrderLineItemId,
      Math.max(
        Number(lineItem.quantity || 0) - Number(lineItem.shortClosedQuantity || 0),
        0,
      ),
    ]),
  );
  const outstandingReadyByPurchaseOrderLineId = new Map<string, number>(
    (po.lineItems || []).map((lineItem: any) => [
      lineItem.purchaseOrderLineItemId,
      Math.max(
        Number(lineItem.quantity || 0) - Number(lineItem.shortClosedQuantity || 0),
        0,
      ),
    ]),
  );

  for (const notice of fulfillmentHistory) {
    for (const lineItem of notice.lineItems || []) {
      const purchaseOrderLineItemId = lineItem.purchaseOrderLineItemId;
      if (!purchaseOrderLineItemId) continue;

      const outstandingBeforeReceipt = outstandingByPurchaseOrderLineId.get(
        purchaseOrderLineItemId,
      );
      if (outstandingBeforeReceipt !== undefined) {
        const outstandingAfterReceipt = Math.max(
          outstandingBeforeReceipt - Number(lineItem.quantityReceived || 0),
          0,
        );
        outstandingByPurchaseOrderLineId.set(
          purchaseOrderLineItemId,
          outstandingAfterReceipt,
        );
        outstandingAfterReceiptByFulfillmentLineId.set(
          lineItem.vendorDeliveryNoticeLineItemId,
          outstandingAfterReceipt,
        );
      }

      const outstandingBeforeReady = outstandingReadyByPurchaseOrderLineId.get(
        purchaseOrderLineItemId,
      );
      if (outstandingBeforeReady !== undefined) {
        const outstandingAfterReady = Math.max(
          outstandingBeforeReady - Number(lineItem.quantityReady || 0),
          0,
        );
        outstandingReadyByPurchaseOrderLineId.set(
          purchaseOrderLineItemId,
          outstandingAfterReady,
        );
        outstandingAfterReadyByFulfillmentLineId.set(
          lineItem.vendorDeliveryNoticeLineItemId,
          outstandingAfterReady,
        );
      }
    }
  }

  let isFinalDeliveryDefault = false;
  if (activeNotice) {
    if (activeNotice.declaration === "full") {
      isFinalDeliveryDefault = true;
    } else {
      isFinalDeliveryDefault = (po.lineItems || []).every((li: any) => {
        const outstanding = outstandingByPurchaseOrderLineId.get(li.purchaseOrderLineItemId) || 0;
        const noticeItem = (activeNotice.lineItems || []).find(
          (nli: any) => nli.purchaseOrderLineItemId === li.purchaseOrderLineItemId
        );
        const maxReceivable = noticeItem?.quantityAwaitingReceipt ?? noticeItem?.quantityReady ?? noticeItem?.quantity ?? 0;
        return outstanding - maxReceivable <= 0;
      });
    }
  }

  const stage = (po.status || "").toLowerCase();
  const isDelivered =
    stage === "partially_delivered" ||
    stage === "partially_delivered_with_exceptions" ||
    stage === "delivered" ||
    stage === "delivered_with_exceptions";

  const timelineByAction = (po.timeline || []).reduce((acc: any, event: any) => {
    acc[event.action] = event;
    return acc;
  }, {});

  const getPerson = (event: any, fallback?: string) => {
    if (!event || !event.performedBy) return fallback;
    const p = event.performedBy;
    if (p.actorType === "vendor") return p.vendorName || "Vendor";
    const name = `${p.firstName || ""} ${p.lastName || ""}`.trim();
    return name || fallback;
  };

  const isApproved = stage === "approved" || stage === "ready_to_issue" || stage === "issued" || stage === "acknowledged" || stage === "ready_for_delivery" || isDelivered || stage === "closed";

  const isConfirmationEvent = (event: any) => {
    if (!event || !event.action) return false;
    return (
      event.action === "partially_delivered" ||
      event.action === "delivered" ||
      event.action === "delivery_confirmed" ||
      event.action === "receipt_confirmed" ||
      event.action === "confirmed" ||
      event.action === "confirmed_with_exceptions"
    );
  };

  const confirmationEvents = (po.timeline || []).filter(isConfirmationEvent);

  const confirmationSteps = ((po as any)?.receiptConfirmations && Array.isArray((po as any).receiptConfirmations) && (po as any).receiptConfirmations.length > 0)
    ? [...((po as any).receiptConfirmations)]
        .sort((a: any, b: any) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime())
        .map((rc: DeliveryReceiptRecord, idx: number, arr: DeliveryReceiptRecord[]) => {
          const isLast = idx === arr.length - 1;
          const hasExc = rc.confirmationOutcome === "confirmed_with_exceptions" || (rc.lineItems || []).some((li) => (li.quantityRejected || 0) > 0 || (li.quantityMissing || 0) > 0);
          const isFull = (stage === "delivered" || stage === "delivered_with_exceptions") && isLast;
          const resLabel = rc.resolutionStatus ? RESOLUTION_STATUS_LABELS[rc.resolutionStatus] : null;
          const label = arr.length > 1
            ? `${rc.receiptNumber || `Receipt #${idx + 1}`}`
            : (hasExc ? "Confirmed with Exceptions" : isFull ? "Delivery Confirmed" : "Partially Confirmed");
          return {
            label,
            person: rc.confirmedByName || "Authorized User",
            badge: hasExc
              ? (resLabel || "Confirmed with Exceptions")
              : (isFull ? "Fully Confirmed" : "Partially Confirmed"),
            badgeColor: hasExc
              ? (rc.resolutionStatus === "under_company_review"
                  ? "text-[#d33d44] bg-[#fdecee]"
                  : rc.resolutionStatus === "resolved_after_dispute" || rc.resolutionStatus === "resolved"
                  ? "text-[#087f70] bg-[#f0faf8]"
                  : "text-amber-700 bg-amber-50")
              : (isFull ? "text-[#087f70] bg-[#f0faf8]" : "text-amber-600 bg-amber-50"),
            timestamp: rc.receivedAt,
            done: true,
            pending: false,
          };
        })
    : confirmationEvents.length > 0
    ? confirmationEvents.map((evt: any, idx: number) => {
        const isLast = idx === confirmationEvents.length - 1;
        const isFull = evt.action === "delivered" || (isLast && stage === "delivered");
        const label = confirmationEvents.length > 1
          ? (isFull ? `Delivery Confirmed #${idx + 1}` : `Partially Confirmed #${idx + 1}`)
          : (isFull ? "Delivery Confirmed" : "Partially Confirmed");
        return {
          label,
          person: getPerson(evt, "Authorized User"),
          badge: isFull ? "Fully Confirmed" : "Partially Confirmed",
          badgeColor: isFull ? "text-[#087f70] bg-[#f0faf8]" : "text-amber-600 bg-amber-50",
          timestamp: evt.timestamp,
          done: true,
          pending: false,
        };
      })
    : [
        {
          label: "Awaiting Confirmation",
          person: undefined,
          badge: undefined,
          badgeColor: undefined,
          timestamp: undefined,
          done: false,
          pending: stage === "acknowledged" || stage === "ready_for_delivery" || stage === "partially_delivered" || stage === "partially_delivered_with_exceptions",
        }
      ];

  const pendingNextStep = (stage === "partially_delivered" || stage === "partially_delivered_with_exceptions")
    ? [
        {
          label: ((po as any)?.quantityAwaitingReceipt ?? 0) > 0 ? "Awaiting Confirmation" : "Awaiting Next Delivery",
          person: undefined,
          badge: ((po as any)?.quantityAwaitingReceipt ?? 0) > 0 ? "Pending Receipt" : "Backordered",
          badgeColor: "text-amber-600 bg-amber-50",
          timestamp: undefined,
          done: false,
          pending: true,
        }
      ]
    : [];

  const workflowSteps = [
    {
      label: "Created",
      person: getPerson(timelineByAction["created"], po.createdBy ? `${(po.createdBy as any).firstName || ""} ${(po.createdBy as any).lastName || ""}`.trim() || "System" : "System"),
      timestamp: timelineByAction["created"]?.timestamp || po.createdAt,
      done: true,
    },
    {
      label: "Submitted for Approval",
      person: getPerson(timelineByAction["submitted_for_approval"]),
      badge: stage === "pending_approval" ? "Awaiting" : "Submitted",
      badgeColor: stage === "pending_approval" ? "text-orange-600 bg-orange-50" : "text-[#087f70] bg-[#f0faf8]",
      timestamp: timelineByAction["submitted_for_approval"]?.timestamp || (po as any).submittedAt,
      done: true,
      pending: false,
    },
    {
      label: timelineByAction["rejected"] ? "Rejected" : "Approved",
      person: getPerson(timelineByAction["approved"] || timelineByAction["rejected"]),
      badge: timelineByAction["rejected"] ? "Rejected" : isApproved ? "Approved" : undefined,
      badgeColor: timelineByAction["rejected"] ? "text-[#d33d44] bg-[#fff5f5]" : "text-[#087f70] bg-[#f0faf8]",
      timestamp: timelineByAction["approved"]?.timestamp || timelineByAction["rejected"]?.timestamp || (po as any).approvedAt,
      done: isApproved || !!timelineByAction["rejected"],
      pending: stage === "pending_approval",
    },
    ...(!timelineByAction["rejected"] && stage !== "cancelled" ? [
      {
        label: "Issued to Vendor",
        person: getPerson(timelineByAction["issued"], po.vendor ? (po.vendor.displayName || po.vendor.legalName) : "Vendor"),
        badge: timelineByAction["issued"] || po.issuedAt ? "Issued" : undefined,
        badgeColor: "text-[#087f70] bg-[#f0faf8]",
        timestamp: timelineByAction["issued"]?.timestamp || po.issuedAt,
        done: !!timelineByAction["issued"] || !!po.issuedAt,
        pending: stage === "ready_to_issue",
      },
      {
        label: "Vendor Acknowledged",
        person: getPerson(timelineByAction["acknowledged"], po.vendor ? (po.vendor.displayName || po.vendor.legalName) : "Vendor"),
        badge: timelineByAction["acknowledged"] || po.acknowledgedAt ? "Acknowledged" : undefined,
        badgeColor: "text-blue-600 bg-blue-50",
        timestamp: timelineByAction["acknowledged"]?.timestamp || po.acknowledgedAt,
        done: !!timelineByAction["acknowledged"] || !!po.acknowledgedAt,
        pending: stage === "issued",
      },
      ...((po.deliveryNotices && po.deliveryNotices.length > 0)
        ? po.deliveryNotices.map((notice: any, idx: number) => {
            const isDigital = notice.fulfillmentMethod === "digital";
            return {
              label: `${isDigital ? "Digital Delivery" : "Shipment"} #${idx + 1} Ready`,
              person: getPerson(timelineByAction["ready_for_delivery"], po.vendor ? (po.vendor.displayName || po.vendor.legalName) : "Vendor"),
              badge: notice.declaration === "full" ? "Full Delivery" : "Partial Delivery",
              badgeColor: notice.declaration === "full" ? "text-[#087f70] bg-[#f0faf8]" : "text-amber-600 bg-amber-50",
              timestamp: notice.readyAt,
              done: true,
              pending: false,
            };
          })
        : []),
      ...confirmationSteps,
      ...pendingNextStep,
      {
        label: "Closed",
        person: getPerson(timelineByAction["closed"], po.closedAt ? "System" : undefined),
        badge: timelineByAction["closed"] || po.closedAt ? "Closed" : undefined,
        badgeColor: "text-gray-600 bg-gray-100",
        timestamp: timelineByAction["closed"]?.timestamp || po.closedAt,
        done: !!timelineByAction["closed"] || !!po.closedAt,
        pending: stage === "delivered",
      }
    ] : []),
    ...(stage === "cancelled" || timelineByAction["cancelled"] ? [
      {
        label: "Withdrawn",
        person: getPerson(timelineByAction["cancelled"], "System"),
        badge: "Withdrawn",
        badgeColor: "text-gray-600 bg-gray-100",
        timestamp: timelineByAction["cancelled"]?.timestamp || (po as any).cancelledAt,
        done: true,
        pending: false,
      }
    ] : [])
  ];

  const closeBlockers = (po.closeBlockers || []) as string[];
  const canConfirmFinalBilling =
    stage === "delivered" &&
    closeBlockers.includes("final_billing_confirmation_required");

  const handleAppendReceiptEvidence = async (deliveryReceiptId: string, file: File) => {
    try {
      await uploadReceiptExceptionEvidenceMut.mutateAsync({ deliveryReceiptId, file });
      toast.success("Additional evidence uploaded to receipt.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to upload evidence.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-72px)] -m-3 sm:-m-5 lg:-m-6 min-h-0 overflow-hidden bg-transparent">
      {/* Final Billing Modal */}
      {showFinalBillingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFinalBillingModal(false)} />
          <div className="relative bg-white rounded-[14px] shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#0b100e]">Finalize billing</h3>
              <p className="text-sm text-[#68726d] mt-1">Confirm that all invoices have been generated and no further vendor billing is expected. This unlocks the ability to close the PO.</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowFinalBillingModal(false)} className="px-6 h-10 rounded-[12px] border border-black/[0.06] text-sm font-medium">Cancel</button>
              <button
                disabled={finalizeBillingMut.isPending}
                onClick={async () => {
                  try {
                    await finalizeBillingMut.mutateAsync({ reason: "All invoices confirmed; no further billing expected." });
                    toast.success("Final billing confirmed. The PO can now be closed.");
                    setShowFinalBillingModal(false);
                  } catch (err: any) {
                    toast.error(err?.response?.data?.message || "Unable to confirm final billing.");
                  }
                }}
                className="flex-1 h-10 rounded-[12px] bg-[#087f70] text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {finalizeBillingMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Billing Complete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="shrink-0 pt-9 sm:pt-11 px-9 sm:px-11 pb-6">
        <div className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-[#0b100e]">{po.poNumber || "Purchase Order"}</h1>
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const outcomeKey = (po.deliveryOutcome || po.status || "").toLowerCase();
                  if (outcomeKey.includes("partially")) {
                    return (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
                        Partially Delivered
                      </span>
                    );
                  }
                  if (outcomeKey.includes("delivered") && outcomeKey !== "not_delivered") {
                    return (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f0faf8] text-[#087f70]">
                        Delivered
                      </span>
                    );
                  }
                  if (po.fulfillmentState === "fully_ready") {
                    return (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f0faf8] text-[#087f70]">
                        Ready to Receive
                      </span>
                    );
                  }
                  if (po.fulfillmentState === "partial") {
                    return (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
                        Partially Shipped
                      </span>
                    );
                  }
                  return (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      po.status === "delivered" ? "bg-[#f0faf8] text-[#087f70]" : "bg-[#f5f7f6] text-[#68726d]"
                    }`}>
                      {DELIVERY_OUTCOME_LABELS[outcomeKey] || po.status?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) || "Awaiting Delivery"}
                    </span>
                  );
                })()}
                {po.companyActionRequired ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                    <Gavel className="w-3.5 h-3.5" />
                    Action Needed: Review vendor dispute
                  </span>
                ) : po.vendorResponseRequired ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock3 className="w-3.5 h-3.5" />
                    Awaiting vendor response
                    {(po.openExceptionCount ?? 0) > 0 && ` (${po.openExceptionCount} ${po.openExceptionCount === 1 ? "issue" : "issues"})`}
                  </span>
                ) : (po.openExceptionCount ?? 0) > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {po.openExceptionCount} delivery {po.openExceptionCount === 1 ? "issue" : "issues"}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="text-sm text-[#68726d] mt-1.5">{po.vendor?.legalName || po.vendor?.displayName || "Vendor"}</p>
          </div>
          {/* Header actions */}
          <div className="flex items-center gap-3">
            {canConfirmFinalBilling && (
              <button
                onClick={() => setShowFinalBillingModal(true)}
                className="h-9 px-4 rounded-lg bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Finalize Billing
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-9 sm:px-11 pb-9 sm:pb-11 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="max-w-6xl mx-auto w-full flex flex-col">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Left Column */}
            <div className="flex-1 flex flex-col min-w-0 space-y-6">
              
              {/* Main Order Line Items */}
              <div className="bg-white rounded-[14px] border border-black/[0.06] overflow-hidden">
                <div className="px-6 py-5 border-b border-black/[0.06]">
                  <h2 className="text-base font-semibold text-[#0b100e]">Ordered Items</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/[0.06] bg-[#f9faf9]">
                    <th className="px-6 py-3 text-left font-semibold text-[#68726d]">Item</th>
                    <th className="px-4 py-3 text-center font-semibold text-[#68726d] whitespace-nowrap">Ordered</th>
                    <th className="px-6 py-3 text-left font-semibold text-[#68726d]">Delivery Breakdown</th>
                    <th className="px-4 py-3 text-right font-semibold text-[#68726d] whitespace-nowrap">Unit Price</th>
                    <th className="px-6 py-3 text-right font-semibold text-[#68726d] whitespace-nowrap">Order Total & Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {(po.lineItems || []).map((item: any, i: number) => {
                    const noticeItemWithDisp = (po.deliveryNotices || [])
                      .flatMap((n: any) => n.lineItems || [])
                      .filter((li: any) => li.purchaseOrderLineItemId === item.purchaseOrderLineItemId && li.remainingDisposition)
                      .pop();
                    
                    const orderedQty = Number(item.quantity || 0);
                    const readyQty = Number(item.quantityReady || 0);
                    const isFullyReady = readyQty >= orderedQty;
                    const disp = isFullyReady ? null : (item.remainingDisposition || noticeItemWithDisp?.remainingDisposition);
                    const expDate = isFullyReady ? null : (item.expectedReadyDate || noticeItemWithDisp?.expectedReadyDate);
                    const dispReason = isFullyReady ? null : (item.dispositionReason || noticeItemWithDisp?.dispositionReason);
                    
                    const cannotFulfillQty = Number(item.shortClosedQuantity || 0);
                    const acceptedQty = Number(item.quantityAccepted ?? item.quantityReceived ?? 0);
                    const forfeitedQty = Number(item.quantityForfeited ?? 0);

                    // Calculate rejected/missing units from receipts
                    const receiptLineItems = (po.receiptConfirmations || []).flatMap((rc: any) =>
                      (rc.lineItems || []).filter(
                        (rli: any) => rli.purchaseOrderLineItemId === item.purchaseOrderLineItemId
                      )
                    );
                    const rejectedFromReceipts = receiptLineItems.reduce(
                      (sum: number, rli: any) => sum + Number(rli.finalQuantityRejected ?? rli.quantityRejected ?? 0),
                      0
                    );
                    const missingFromReceipts = receiptLineItems.reduce(
                      (sum: number, rli: any) => sum + Number(rli.finalQuantityMissing ?? rli.quantityMissing ?? 0),
                      0
                    );
                    const rawExceptionQty = rejectedFromReceipts + missingFromReceipts;

                    // Note: Backend `quantityAwaitingReceipt` (quantitySent - quantityPhysicallyReceived)
                    // includes `missing` units from already-confirmed receipts because missing units were
                    // never physically received. Subtract `missingFromReceipts` so we only show "Ready to confirm"
                    // when there is an actual unconfirmed shipment waiting for buyer inspection.
                    const rawAwaitingReceiptQty = Number(item.quantityAwaitingReceipt ?? 0);
                    const awaitingReceiptQty = Math.max(0, rawAwaitingReceiptQty - missingFromReceipts);

                    const openIssueQty = Math.max(
                      0,
                      rawExceptionQty > 0
                        ? rawExceptionQty - forfeitedQty
                        : readyQty - acceptedQty - awaitingReceiptQty - forfeitedQty
                    );
                    const remainingToShipQty = Math.max(
                      0,
                      orderedQty - acceptedQty - openIssueQty - forfeitedQty - awaitingReceiptQty - cannotFulfillQty
                    );
                    
                    return (
                      <tr 
                        key={i} 
                        className="border-b border-black/[0.04] last:border-b-0 hover:bg-[#fcfcfc] transition-colors cursor-pointer"
                        onClick={() => setSelectedItemForDrawer(item)}
                      >
                        <td className="px-6 py-4 align-top">
                          <p className="font-semibold text-[#111815]">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-[#68726d] mt-0.5 line-clamp-2" title={item.description}>
                              {item.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center font-medium text-[#111815] align-top">{orderedQty}</td>
                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-col gap-1.5 items-start">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[#087f70] font-semibold">
                                {acceptedQty} of {orderedQty} Accepted
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {awaitingReceiptQty > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                                  {awaitingReceiptQty} Ready to confirm
                                </span>
                              )}

                              {openIssueQty > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  {rejectedFromReceipts > 0 && missingFromReceipts > 0
                                    ? `${rejectedFromReceipts} Rejected · ${missingFromReceipts} Missing`
                                    : rejectedFromReceipts > 0
                                    ? `${openIssueQty} Rejected`
                                    : missingFromReceipts > 0
                                    ? `${openIssueQty} Missing`
                                    : `${openIssueQty} Rejected / Missing`}
                                </span>
                              )}

                              {forfeitedQty > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 whitespace-nowrap">
                                  {forfeitedQty} Cancelled by vendor
                                </span>
                              )}

                              {cannotFulfillQty > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 whitespace-nowrap">
                                  <AlertCircle className="w-3 h-3" /> {cannotFulfillQty} Cannot Fulfill
                                </span>
                              )}

                              {remainingToShipQty > 0 && disp === "backordered" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#f5f7f6] text-[#34413b] border border-black/[0.08] whitespace-nowrap">
                                  <Clock3 className="w-3 h-3 text-amber-600" /> {remainingToShipQty} Backordered{expDate ? ` (due ${formatDate(expDate).split(",")[0]})` : ""}
                                </span>
                              )}

                              {disp === "cannot_fulfill" && cannotFulfillQty === 0 && remainingToShipQty > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 whitespace-nowrap">
                                  <AlertCircle className="w-3 h-3" /> {remainingToShipQty} Cannot Fulfill
                                </span>
                              )}

                              {!disp && remainingToShipQty > 0 && cannotFulfillQty === 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#f5f7f6] text-[#68726d] whitespace-nowrap">
                                  {remainingToShipQty} Remaining to ship
                                </span>
                              )}

                              {acceptedQty >= orderedQty && openIssueQty === 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#f0faf8] text-[#087f70] whitespace-nowrap">
                                  All units accepted
                                </span>
                              )}
                            </div>

                            {(item.dispositionReason || dispReason) && (
                              <p className="text-[11px] text-[#89918d] italic" title={item.dispositionReason || dispReason}>
                                Vendor note: {item.dispositionReason || dispReason}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right text-[#111815] whitespace-nowrap align-top">{formatCurrency(item.unitPrice, po.currency)}</td>
                        <td className="px-6 py-4 text-right whitespace-nowrap align-top">
                          <div className="font-semibold text-[#111815]">{formatCurrency(orderedQty * (item.unitPrice || 0), po.currency)}</div>
                          {item.invoiceableSubtotal !== undefined && item.invoiceableSubtotal !== null && (
                            <div className="text-[11px] text-[#087f70] font-medium mt-0.5">
                              Payable ({acceptedQty} accepted): {formatCurrency(item.invoiceableSubtotal, po.currency)}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {(!po.lineItems || po.lineItems.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[#89918d]">
                        No line items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fulfillment History Section */}
          {fulfillmentHistory.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-[#0b100e]">Fulfillments</h2>
              <div className="flex flex-col gap-4">
                {fulfillmentHistory.map((notice: any, idx: number) => (
                  <FulfillmentHistoryCard
                    key={notice.vendorDeliveryNoticeId || idx}
                    notice={notice}
                    index={idx}
                    canReceive={canReceive}
                    onReceive={() => setActiveNotice(notice)}
                    purchaseOrderLineItems={po.lineItems || []}
                    outstandingAfterReceiptByFulfillmentLineId={outstandingAfterReceiptByFulfillmentLineId}
                    outstandingAfterReadyByFulfillmentLineId={outstandingAfterReadyByFulfillmentLineId}
                    receiptConfirmations={po.receiptConfirmations || []}
                    onMakeFinalDecision={(receipt) => setActiveReceiptForDecision(receipt)}
                    onAppendReceiptEvidence={handleAppendReceiptEvidence}
                    isUploadingReceiptEvidence={uploadReceiptExceptionEvidenceMut.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Right Column: Timeline */}
            <div className="w-full lg:w-[300px] shrink-0 sticky top-0 pb-4">
              <div className="bg-white rounded-[14px] border border-black/[0.06] overflow-hidden">
                <div className="bg-[#1C2B36] rounded-t-[14px] px-5 py-4">
                  <h3 className="text-base font-bold text-white">Workflow Progress</h3>
                </div>
                <div className="px-5 py-4 space-y-0 pt-3 pl-1 max-h-[480px] overflow-y-auto scrollbar-thin scrollbar-thumb-black/[0.08] hover:scrollbar-thumb-black/[0.15] scrollbar-track-transparent">
                  {workflowSteps.map((step, i) => {
                    const isLast = i === workflowSteps.length - 1;
                    return (
                      <WorkflowStep 
                        key={i} 
                        label={step.label}
                        person={step.person}
                        badge={step.badge}
                        badgeColor={step.badgeColor}
                        timestamp={formatDate(step.timestamp)}
                        done={step.done}
                        pending={step.pending}
                        isLast={isLast}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ItemFulfillmentDrawer
        open={!!selectedItemForDrawer}
        onClose={() => setSelectedItemForDrawer(null)}
        item={selectedItemForDrawer}
        fulfillments={fulfillmentHistory}
      />
      {activeNotice && (
        <ConfirmReceiptModal
          open={!!activeNotice}
          onClose={() => setActiveNotice(null)}
          onConfirm={async (payload) => {
            try {
              await receiptMut.mutateAsync({
                fulfillmentId: activeNotice.vendorDeliveryNoticeId,
                payload,
              });
              toast.success(
                payload.hasExceptions
                  ? "Receipt confirmed with exceptions. Vendor has been notified."
                  : "Delivery receipt confirmed."
              );
              setActiveNotice(null);
            } catch (err: any) {
              toast.error(err.response?.data?.message || "Failed to confirm receipt");
            }
          }}
          onUploadEvidence={(file) =>
            uploadFulfillmentEvidenceMut.mutateAsync({
              fulfillmentId: activeNotice.vendorDeliveryNoticeId,
              file,
            })
          }
          isPending={receiptMut.isPending}
          lineItems={activeNotice.lineItems || []}
        />
      )}
      <CompanyFinalDecisionModal
        open={!!activeReceiptForDecision}
        onClose={() => setActiveReceiptForDecision(null)}
        purchaseOrderId={id}
        receipt={activeReceiptForDecision}
      />
    </div>
  );
}

export default withPermissions(ConfirmationDetailPage, [
  { resource: "procurement.purchase_order", action: "read_own" },
  { resource: "procurement.purchase_order", action: "read_department" },
  { resource: "procurement.purchase_order", action: "read_company" },
]);
