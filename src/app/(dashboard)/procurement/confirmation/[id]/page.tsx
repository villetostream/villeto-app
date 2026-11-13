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
  Scale,
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

function formatUnitLabel(qty: number, unitOfMeasure?: string | null) {
  const raw = (unitOfMeasure || "unit").trim();
  if (qty === 1) return raw;
  const lower = raw.toLowerCase();
  if (lower.endsWith("s")) return raw;
  if (lower.endsWith("x") || lower.endsWith("z") || lower.endsWith("ch") || lower.endsWith("sh")) {
    return `${raw}es`;
  }
  return `${raw}s`;
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

function getMatchingReceipt(notice: any, receiptConfirmations?: DeliveryReceiptRecord[]) {
  return (receiptConfirmations || []).find(
    (rc: any) =>
      (notice.vendorDeliveryNoticeId && rc.fulfillmentId === notice.vendorDeliveryNoticeId) ||
      (notice.fulfillmentReference && rc.fulfillmentReference === notice.fulfillmentReference) ||
      (notice.shipmentReference && rc.fulfillmentReference === notice.shipmentReference)
  );
}

function isFulfillmentConfirmed(notice: any, matchingReceipt?: DeliveryReceiptRecord | null) {
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
  return (
    hasConfirmedReceipt ||
    (matchingReceipt?.status === "confirmed" && totalAwaitingReceipt === 0) ||
    (totalReceived > 0 && totalAwaitingReceipt === 0) ||
    (totalReady > 0 && totalReceived >= totalReady)
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
  const matchingReceipt = getMatchingReceipt(notice, receiptConfirmations);

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

  const isConfirmed = isFulfillmentConfirmed(notice, matchingReceipt);

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
    (companyActionRequired ||
      vendorActionRequired ||
      isResolvedAfterDispute ||
      (hasExceptions && Boolean(resolutionStatus && resolutionStatus !== "not_required")) ||
      (matchingReceipt?.lineItems || []).some((li: any) => Boolean(li.dispositionAllocations?.length)));

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
          {companyActionRequired && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#fdecee] text-[#d33d44] border border-[#d33d44]/20">
              <AlertTriangle className="w-3.5 h-3.5" /> Under Company Review
            </span>
          )}
          {vendorActionRequired && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Clock3 className="w-3.5 h-3.5" /> Awaiting Vendor Response
            </span>
          )}
          {!companyActionRequired && !vendorActionRequired && (
            hasExceptions && resolutionStatus ? (
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
            ) : null
          )}

          {(companyActionRequired ||
            resolutionStatus === "under_company_review" ||
            resolutionStatus === "disputed") &&
            !isResolvedAfterDispute &&
            matchingReceipt && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMakeFinalDecision(matchingReceipt);
              }}
              className="h-8 px-3.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer bg-[#087f70] text-white hover:bg-[#076a5e]"
            >
              <Gavel className="w-3.5 h-3.5" />
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[#0b100e]">Vendor Disputed</span>
                    {matchingReceipt.lineItems?.some((l: any) => l.vendorDisposition === "dispute" || l.resolutionStatus === "under_company_review" || l.resolutionStatus === "disputed") && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-[#d33d44]">
                        on {matchingReceipt.lineItems
                          .filter((l: any) => l.vendorDisposition === "dispute" || l.resolutionStatus === "under_company_review" || l.resolutionStatus === "disputed")
                          .map((l: any) => l.name)
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                    <span className="text-[#34413b] italic">
                      {matchingReceipt.vendorResponseReason
                        ? `: "${matchingReceipt.vendorResponseReason}"`
                        : ": The vendor disputed one or more exception lines. Review their response and record the final decision."}
                    </span>
                  </div>
                </div>
              )}

              {vendorActionRequired && !companyActionRequired && matchingReceipt.finalDecision ? (
                <div className="flex flex-col gap-1 rounded-lg bg-[#f0faf8] border border-[#087f70]/20 p-3 text-xs text-[#065f55]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#087f70] flex items-center gap-1.5">
                      <Gavel className="w-3.5 h-3.5" />
                      Company Final Determination Recorded ({FINAL_DECISION_LABELS[matchingReceipt.finalDecision] || matchingReceipt.finalDecision.replace(/_/g, " ")})
                    </span>
                    {(() => {
                      const determinationEvent = (matchingReceipt.decisionHistory as any[])
                        ?.slice()
                        .reverse()
                        .find((h: any) => h.event === "company_final_determination");
                      const decidedDate = determinationEvent?.recordedAt || determinationEvent?.timestamp || matchingReceipt.resolvedAt;
                      if (!decidedDate) return null;
                      return (
                        <span className="text-[11px] text-[#68726d]">
                          Decided {formatDate(String(decidedDate))}
                        </span>
                      );
                    })()}
                  </div>
                  {matchingReceipt.resolutionNote && (
                    <p className="italic text-[#34413b]">
                      &quot;{matchingReceipt.resolutionNote}&quot;
                    </p>
                  )}
                  <p className="text-[11px] text-[#68726d] pt-0.5">
                    The company has ruled on this exception. Awaiting the vendor to acknowledge and fulfill the final disposition.
                  </p>
                </div>
              ) : vendorActionRequired && !companyActionRequired ? (
                <p className="text-xs text-[#68726d]">
                  <span className="font-semibold text-[#34413b]">Awaiting Vendor Response:</span>{" "}
                  The vendor must choose to backorder, forfeit, or dispute the reported exceptions.
                </p>
              ) : null}

              {!companyActionRequired && !vendorActionRequired && !isResolvedAfterDispute && hasExceptions && (
                <div className="flex flex-col gap-2 rounded-lg bg-amber-50/70 border border-amber-200/80 p-3.5 text-xs text-[#34413b]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                      <Clock3 className="w-3.5 h-3.5 text-amber-700" />
                      Vendor Response: {resolutionStatus === "backordered" ? "Backordered" : resolutionStatus === "forfeited" ? "Forfeited" : "Exception Acknowledged"}
                    </span>
                    {matchingReceipt.vendorRespondedAt && (
                      <span className="text-[11px] text-[#89918d]">
                        Responded {formatDate(matchingReceipt.vendorRespondedAt)}
                      </span>
                    )}
                  </div>
                  {matchingReceipt.vendorResponseReason && (
                    <p className="text-xs text-[#34413b] italic">
                      &quot;{matchingReceipt.vendorResponseReason}&quot;
                    </p>
                  )}
                  {(() => {
                    const receiptItems = matchingReceipt.lineItems || [];
                    const backorderEntries: { name: string; qty: number }[] = [];
                    const forfeitEntries: { name: string; qty: number }[] = [];
                    const disputeEntries: { name: string; qty: number }[] = [];
                    const dueDates = new Set<string>();

                    for (const li of receiptItems) {
                      const itemName = li.name || "Item";
                      const allocs = li.dispositionAllocations || [];
                      if (allocs.length > 0) {
                        for (const alloc of allocs) {
                          const qty = Number(alloc.quantity || 0);
                          if (qty <= 0) continue;
                          if (alloc.disposition === "backorder") {
                            backorderEntries.push({ name: itemName, qty });
                            if (alloc.expectedRedeliveryDate) {
                              dueDates.add(formatDate(alloc.expectedRedeliveryDate).split(",")[0]);
                            }
                          } else if (alloc.disposition === "forfeit") {
                            forfeitEntries.push({ name: itemName, qty });
                          }
                        }
                      } else {
                        const excQty = Number(li.quantityRejected || 0) + Number(li.quantityMissing || 0);
                        if (excQty > 0) {
                          if (li.vendorDisposition === "backorder") {
                            backorderEntries.push({ name: itemName, qty: excQty });
                            if (li.expectedRedeliveryDate) {
                              dueDates.add(formatDate(li.expectedRedeliveryDate).split(",")[0]);
                            }
                          } else if (li.vendorDisposition === "forfeit") {
                            forfeitEntries.push({ name: itemName, qty: excQty });
                          }
                        }
                      }

                      if (
                        li.vendorDisposition === "dispute" ||
                        li.resolutionStatus === "disputed" ||
                        li.resolutionStatus === "under_company_review"
                      ) {
                        const excQty = Number(li.quantityRejected || 0) + Number(li.quantityMissing || 0);
                        disputeEntries.push({ name: itemName, qty: excQty });
                      }
                    }

                    if (backorderEntries.length === 0 && forfeitEntries.length === 0 && disputeEntries.length === 0) {
                      return null;
                    }

                    const formatEntries = (entries: { name: string; qty: number }[]) => {
                      const visible = entries.slice(0, 3).map((e) => (e.qty > 0 ? `${e.name} (${e.qty})` : e.name));
                      if (entries.length > 3) visible.push(`+${entries.length - 3} more`);
                      return visible.join(", ");
                    };

                    const backorderedUnits = backorderEntries.reduce((s, e) => s + e.qty, 0);
                    const forfeitedUnits = forfeitEntries.reduce((s, e) => s + e.qty, 0);
                    const disputedUnits = disputeEntries.reduce((s, e) => s + e.qty, 0);
                    const singleDueDate = dueDates.size === 1 ? Array.from(dueDates)[0] : null;

                    return (
                      <div className="space-y-1 pt-1.5 border-t border-amber-200/50 text-xs">
                        {backorderedUnits > 0 && (
                          <p className="text-amber-950">
                            <span className="font-semibold">
                              {backorderedUnits} {backorderedUnits === 1 ? "unit" : "units"} backordered
                              {singleDueDate ? ` (due ${singleDueDate})` : ""}:
                            </span>{" "}
                            <span className="text-[#34413b]">{formatEntries(backorderEntries)}</span>
                          </p>
                        )}
                        {forfeitedUnits > 0 && (
                          <p className="text-amber-950">
                            <span className="font-semibold">
                              {forfeitedUnits} {forfeitedUnits === 1 ? "unit" : "units"} forfeited:
                            </span>{" "}
                            <span className="text-[#34413b]">{formatEntries(forfeitEntries)}</span>
                          </p>
                        )}
                        {disputeEntries.length > 0 && (
                          <p className="text-[#d33d44]">
                            <span className="font-semibold">
                              {disputedUnits > 0 ? `${disputedUnits} ${disputedUnits === 1 ? "unit" : "units"} disputed:` : "Disputed:"}
                            </span>{" "}
                            <span className="text-[#34413b]">{formatEntries(disputeEntries)}</span>
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
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
                  <p className="text-[10px] font-medium text-[#89918d] uppercase tracking-wide">Carrier / Dispatch Ref</p>
                  <p className="text-sm font-medium text-[#111815] mt-1">{notice.carrier || notice.dispatchReference || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[#89918d] uppercase tracking-wide">Tracking / Waybill</p>
                  <p className="text-sm font-medium text-[#111815] mt-1">{notice.trackingNumber || notice.waybillNumber || notice.shipmentReference || notice.fulfillmentReference || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[#89918d] uppercase tracking-wide">
                    {notice.packingSlipNumber ? "Packing Slip" : "Expected Delivery"}
                  </p>
                  <p className="text-sm font-medium text-[#111815] mt-1">
                    {notice.packingSlipNumber ||
                      ((notice.expectedDeliveryDate || notice.estimatedDeliveryDate)
                        ? formatDate(notice.expectedDeliveryDate || notice.estimatedDeliveryDate).split(",")[0]
                        : "—")}
                  </p>
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
                                matchingReceipt?.finalDecision ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#f0faf8] text-[#087f70] border border-[#087f70]/20">
                                    <Gavel className="w-3 h-3 text-[#087f70]" /> Company Ruling: Upheld Finding
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#fdecee] text-[#d33d44]">
                                    Vendor Disputed
                                  </span>
                                )
                              ) : lineResolutionStatus ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#f5f7f6] text-[#34413b]">
                                  {RESOLUTION_STATUS_LABELS[lineResolutionStatus] || lineResolutionStatus.replace(/_/g, " ")}
                                </span>
                              ) : null}
                            </div>
                          )}

                          {/* Recommended disposition by company */}
                          {receiptLineItem?.recommendedDisposition && (
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#f0faf8] text-[#087f70] border border-[#087f70]/20">
                                Buyer recommended:{" "}
                                {receiptLineItem.recommendedDisposition === "backorder"
                                  ? "Backorder"
                                  : receiptLineItem.recommendedDisposition === "forfeit"
                                  ? "Forfeit"
                                  : receiptLineItem.recommendedDisposition}
                              </span>
                            </div>
                          )}

                          {/* Disposition allocations if vendor split/allocated */}
                          {receiptLineItem?.dispositionAllocations && receiptLineItem.dispositionAllocations.length > 0 && (() => {
                            const poLineItem = purchaseOrderLineItems.find(
                              (pli: any) => pli.purchaseOrderLineItemId === item.purchaseOrderLineItemId
                            );
                            const uom = poLineItem?.unitOfMeasure || item.unitOfMeasure;
                            return (
                              <div className="space-y-1 pt-1">
                                {receiptLineItem.dispositionAllocations.map((alloc: any, aIdx: number) => (
                                  <p key={aIdx} className="text-[10px] text-[#68726d] bg-gray-50 px-2 py-0.5 rounded border border-black/[0.04]">
                                    <span className="font-semibold capitalize text-[#34413b]">{alloc.disposition}:</span>{" "}
                                    {alloc.quantity} {formatUnitLabel(Number(alloc.quantity || 0), uom)}
                                    {alloc.expectedRedeliveryDate ? ` (due ${formatDate(alloc.expectedRedeliveryDate).split(",")[0]})` : ""}
                                    {alloc.reason ? ` — "${alloc.reason}"` : ""}
                                  </p>
                                ))}
                              </div>
                            );
                          })()}

                          {(() => {
                            const isLineDisputed =
                              lineVendorDisposition === "dispute" ||
                              lineResolutionStatus === "disputed" ||
                              lineResolutionStatus === "under_company_review";
                            const disputeEvent = (matchingReceipt?.decisionHistory as any[])
                              ?.slice()
                              .reverse()
                              .find((h: any) => h.event === "vendor_disputed");
                            const proposedItem = Array.isArray(disputeEvent?.proposedLineItems)
                              ? disputeEvent.proposedLineItems.find(
                                  (p: any) =>
                                    (receiptLineItem?.deliveryReceiptLineItemId &&
                                      p.deliveryReceiptLineItemId === receiptLineItem.deliveryReceiptLineItemId) ||
                                    (receiptLineItem?.purchaseOrderLineItemId &&
                                      p.purchaseOrderLineItemId === receiptLineItem.purchaseOrderLineItemId) ||
                                    (p.name && p.name === item.name)
                                )
                              : undefined;
                            const lineNote =
                              receiptLineItem?.vendorResponseReason ||
                              proposedItem?.reason ||
                              (isLineDisputed ? (disputeEvent?.reason || matchingReceipt?.vendorResponseReason) : null);

                            if (matchingReceipt?.finalDecision && receiptLineItem && (isLineDisputed || receiptLineItem.finalQuantityAccepted != null)) {
                              const vendorAcceptedEvent = (matchingReceipt.decisionHistory as any[])
                                ?.slice()
                                .reverse()
                                .find((h: any) => h.event === "vendor_accepted_final_decision");
                              return (
                                <div className="rounded-[10px] p-2.5 text-xs space-y-1 mt-1.5 bg-[#f0faf8] border border-[#087f70]/20 text-[#065f55]">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold flex items-center gap-1.5 text-[#087f70]">
                                      <Gavel className="w-3.5 h-3.5" /> Company Final Determination: Upheld Inspection Finding
                                    </span>
                                    <span className="text-[9px] text-[#087f70] font-bold uppercase tracking-wider bg-white px-1.5 py-0.5 rounded border border-[#087f70]/20">
                                      Binding Ruling
                                    </span>
                                  </div>
                                  {matchingReceipt.resolutionNote && (
                                    <p className="italic text-[#34413b]">&quot;{matchingReceipt.resolutionNote}&quot;</p>
                                  )}
                                  <div className="text-[11px] text-[#68726d] pt-0.5 space-y-0.5">
                                    <p>
                                      Final determined quantities: <strong className="text-[#0b100e]">{receiptLineItem.finalQuantityAccepted ?? receiptLineItem.quantityAccepted} accepted</strong>, <strong className="text-[#d33d44]">{receiptLineItem.finalQuantityRejected ?? receiptLineItem.quantityRejected} rejected</strong>.
                                    </p>
                                    {lineNote && (
                                      <p className="italic text-[#89918d]">
                                        Overruled vendor dispute claim: &quot;{lineNote}&quot;
                                      </p>
                                    )}
                                  </div>
                                  {vendorAcceptedEvent && (
                                    <div className="mt-1 pt-1.5 border-t border-[#087f70]/20 flex items-center justify-between text-[11px]">
                                      <span className="font-semibold text-[#087f70] flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#087f70]" />
                                        Vendor Accepted Determination:
                                      </span>
                                      <span className="text-[#34413b]">
                                        {String(vendorAcceptedEvent.disposition || "backorder") === "backorder" ? "Scheduled replacement" : "Forfeited"}
                                        {vendorAcceptedEvent.expectedRedeliveryDate ? ` (due ${formatDate(String(vendorAcceptedEvent.expectedRedeliveryDate)).split(",")[0]})` : ""}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            const isDuplicateAllocationNote =
                              Boolean(lineNote) &&
                              (receiptLineItem?.dispositionAllocations || []).some(
                                (a: any) => a.reason && String(a.reason).trim() === String(lineNote).trim()
                              );

                            if (!lineNote || (!proposedItem && isDuplicateAllocationNote)) return null;

                            return (
                              <div
                                className={`rounded p-2 text-xs space-y-0.5 mt-1.5 ${
                                  isLineDisputed
                                    ? "bg-red-50/70 border border-red-200/80 text-red-950"
                                    : "bg-gray-50 border border-black/[0.05] text-[#34413b]"
                                }`}
                              >
                                <span className={`font-semibold block ${isLineDisputed ? "text-[#d33d44]" : "text-[#0b100e]"}`}>
                                  {isLineDisputed ? "Vendor Dispute Note:" : "Vendor Note:"}
                                </span>
                                <p className="italic">&quot;{lineNote}&quot;</p>
                                {proposedItem && (
                                  <p className="text-[10px] text-[#68726d] font-normal pt-0.5">
                                    Vendor proposes: {proposedItem.quantityAccepted} accepted, {proposedItem.quantityRejected} rejected
                                    {proposedItem.quantityMissing > 0 ? `, ${proposedItem.quantityMissing} missing` : ""}.
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 align-top">
                      {outstandingAfterReceipt === undefined ? (
                        <span className="text-[#68726d]">—</span>
                      ) : (
                        <div className="flex flex-col gap-1.5 items-start">
                          <div>
                            <p className="font-medium text-[#111815]">{outstandingAfterReceipt} remaining</p>
                            <p className="text-[11px] text-[#89918d]">of {orderedQuantity} ordered</p>
                          </div>
                          {item.remainingDisposition === "cannot_fulfill" ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium whitespace-nowrap mt-0.5">
                              <AlertCircle className="w-3.5 h-3.5" /> {remainingQty} Cannot Fulfill
                            </span>
                          ) : item.remainingDisposition === "backordered" ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium whitespace-nowrap mt-0.5">
                              <Clock3 className="w-3.5 h-3.5" /> {remainingQty} Backordered{item.expectedReadyDate ? ` (exp. ${formatDate(item.expectedReadyDate).split(",")[0]})` : ""}
                            </span>
                          ) : notice.declaration === "full" && outstandingAfterReceipt === 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#f0faf8] text-[#087f70] text-xs font-medium whitespace-nowrap mt-0.5">
                              Fully Fulfilled
                            </span>
                          ) : notice.declaration === "full" && outstandingAfterReceipt > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium whitespace-nowrap mt-0.5">
                              <Clock3 className="w-3.5 h-3.5" /> {outstandingAfterReceipt} awaiting replacement
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
  receiptConfirmations,
}: {
  open: boolean;
  onClose: () => void;
  item: any;
  fulfillments: any[];
  receiptConfirmations?: DeliveryReceiptRecord[];
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

  const orderedQty = Number(item.quantity || 0);
  const qtyReady = Number(item.quantityReady ?? item.quantityShipped ?? 0);
  const acceptedCount = item.quantityAccepted != null ? Number(item.quantityAccepted) : 0;
  const qtyAwaitingReceipt = Number(item.quantityAwaitingReceipt ?? 0);
  const forfeitedCount = Number(item.quantityForfeited || 0);
  const isCancelled = item.remainingDisposition === "cannot_fulfill";

  // Calculate exceptions for this item across all receipts
  let openExceptionCount = 0;
  let backorderedExceptionCount = 0;
  let forfeitedExceptionCount = 0;

  for (const rc of receiptConfirmations || []) {
    for (const rli of rc.lineItems || []) {
      if (rli.purchaseOrderLineItemId === item.purchaseOrderLineItemId) {
        const rej = Number(rli.finalQuantityRejected ?? rli.quantityRejected ?? 0);
        const miss = Number(rli.finalQuantityMissing ?? rli.quantityMissing ?? 0);
        if (rej > 0 || miss > 0) {
          const hasPerLineDisp = Boolean(rli.vendorDisposition || rli.resolutionStatus);
          const lineDisp = rli.vendorDisposition || (!hasPerLineDisp ? rc.vendorDisposition : null);
          const lineRes = rli.resolutionStatus || (!hasPerLineDisp ? rc.resolutionStatus : null);

          // Check if vendor accepted the final determination
          const vendorAcceptedEvent = ((rc.decisionHistory as any[]) || [])
            .slice()
            .reverse()
            .find((h: any) => h.event === "vendor_accepted_final_decision");
          const acceptedDisp = vendorAcceptedEvent?.disposition || (rc.finalDecision && !rc.vendorActionRequired ? (rc.vendorDisposition || "backorder") : null);

          if (rli.dispositionAllocations && Array.isArray(rli.dispositionAllocations) && rli.dispositionAllocations.length > 0) {
            for (const alloc of rli.dispositionAllocations) {
              const aQty = Number(alloc.quantity || 0);
              if (alloc.disposition === "backorder") {
                backorderedExceptionCount += aQty;
              } else if (alloc.disposition === "forfeit") {
                forfeitedExceptionCount += aQty;
              } else {
                openExceptionCount += aQty;
              }
            }
          } else if (acceptedDisp === "backorder" || lineDisp === "backorder" || lineRes === "backordered") {
            backorderedExceptionCount += rej + miss;
          } else if (acceptedDisp === "forfeit" || lineDisp === "forfeit" || lineRes === "forfeited") {
            forfeitedExceptionCount += rej + miss;
          } else {
            openExceptionCount += rej + miss;
          }
        }
      }
    }
  }

  const effectiveForfeited = Math.max(forfeitedCount, forfeitedExceptionCount);
  const totalOutstanding = isCancelled
    ? 0
    : Math.max(0, orderedQty - acceptedCount - effectiveForfeited);
  const unshippedRemaining = Math.max(0, orderedQty - qtyReady - effectiveForfeited);
  const isFullyReady = acceptedCount >= orderedQty || (!isCancelled && totalOutstanding === 0);

  const hasItemFinalDecision = (receiptConfirmations || []).some((rc: any) =>
    rc.finalDecision &&
    rc.vendorActionRequired &&
    (rc.lineItems || []).some((rli: any) =>
      (item.purchaseOrderLineItemId && rli.purchaseOrderLineItemId === item.purchaseOrderLineItemId) ||
      (rli.name && rli.name === item.name)
    )
  );

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

        <div className="overflow-y-auto modal-scrollbar flex-1 p-6 space-y-6 bg-white">
          {/* Summary Section */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-[14px] bg-[#fcfcfc] border border-black/[0.06]">
            <div>
              <p className="text-xs text-[#89918d] uppercase tracking-wide font-medium">Ordered</p>
              <p className="text-base font-semibold mt-0.5 text-[#0b100e]">{orderedQty}</p>
            </div>
            <div>
              <p className="text-xs text-[#89918d] uppercase tracking-wide font-medium">Accepted</p>
              <p className="text-base font-semibold mt-0.5 text-[#087f70]">
                {acceptedCount}
              </p>
              {acceptedCount >= orderedQty ? (
                <p className="text-[11px] text-[#087f70] font-normal mt-0.5">
                  Order fulfilled
                </p>
              ) : qtyReady > 0 ? (
                <p className="text-[11px] text-[#68726d] font-normal mt-0.5">
                  of {qtyReady} received
                </p>
              ) : (
                <p className="text-[11px] text-[#68726d] font-normal mt-0.5">
                  0 received
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-[#89918d] uppercase tracking-wide font-medium">Remaining</p>
              <p className="text-base font-semibold mt-0.5 text-[#0b100e]">
                {totalOutstanding}
              </p>
              {effectiveForfeited > 0 ? (
                <p className="text-[11px] text-[#68726d] font-normal mt-0.5">
                  {effectiveForfeited} forfeited
                </p>
              ) : openExceptionCount > 0 && unshippedRemaining > 0 ? (
                <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                  {unshippedRemaining} to ship · {openExceptionCount} in exception
                </p>
              ) : openExceptionCount > 0 ? (
                <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                  {openExceptionCount} in exception
                </p>
              ) : unshippedRemaining > 0 && (item.remainingDisposition === "backordered" || item.fulfillmentState === "backordered") ? (
                <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                  Backordered
                </p>
              ) : totalOutstanding === 0 ? (
                <p className="text-[11px] text-[#087f70] font-normal mt-0.5">
                  Complete
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-xs text-[#89918d] uppercase tracking-wide font-medium">Status</p>
              <div className="mt-1">
                {acceptedCount >= orderedQty ? (
                  <span className="inline-flex text-xs text-[#087f70] bg-[#f0faf8] border border-[#087f70]/20 px-2 py-0.5 rounded-md font-medium whitespace-nowrap">
                    Fully Fulfilled
                  </span>
                ) : openExceptionCount > 0 ? (
                  <div className="flex flex-col items-start gap-0.5">
                    <span className={`inline-flex text-xs px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${
                      hasItemFinalDecision
                        ? "text-[#087f70] bg-[#f0faf8] border border-[#087f70]/20"
                        : "text-amber-800 bg-amber-50 border border-amber-200"
                    }`}>
                      {hasItemFinalDecision ? "Ruling Issued" : "Awaiting Vendor"}
                    </span>
                    <span className="text-[11px] text-[#68726d]">
                      {hasItemFinalDecision
                        ? "Awaiting vendor action"
                        : `${openExceptionCount} ${openExceptionCount === 1 ? "issue" : "issues"} to resolve`}
                    </span>
                  </div>
                ) : isCancelled ? (
                  <span className="inline-flex text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md font-medium whitespace-nowrap">
                    {totalOutstanding} Cannot Fulfill
                  </span>
                ) : item.remainingDisposition === "backordered" || item.fulfillmentState === "backordered" ? (
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="inline-flex text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium whitespace-nowrap">
                      Backordered
                    </span>
                    {item.expectedReadyDate && (
                      <span className="text-[11px] text-[#68726d]">
                        Exp. {formatDate(item.expectedReadyDate).split(",")[0]}
                      </span>
                    )}
                  </div>
                ) : qtyReady > 0 ? (
                  <span className="inline-flex text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-medium whitespace-nowrap">
                    Partially Fulfilled
                  </span>
                ) : (
                  <span className="inline-flex text-xs text-[#68726d] font-medium bg-[#f5f7f6] px-2 py-0.5 rounded-md border border-black/[0.06] whitespace-nowrap">
                    Not Started
                  </span>
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

                    const matchingReceipt = getMatchingReceipt(f.notice, receiptConfirmations);
                    const receiptLineItem = (matchingReceipt?.lineItems || []).find(
                      (rli: any) =>
                        (li.vendorDeliveryNoticeLineItemId &&
                          rli.fulfillmentLineItemId === li.vendorDeliveryNoticeLineItemId) ||
                        (li.purchaseOrderLineItemId &&
                          rli.purchaseOrderLineItemId === li.purchaseOrderLineItemId)
                    );

                    const isReceiptConfirmed = isFulfillmentConfirmed(f.notice, matchingReceipt);
                    const liConfirmed =
                      (li.quantityReceived || 0) > 0 &&
                      (li.quantityAwaitingReceipt == null || Number(li.quantityAwaitingReceipt) === 0);
                    const liPartiallyConfirmed = !liConfirmed && Number(li.quantityReceived || 0) > 0;

                    const isResolvedAfterDispute =
                      matchingReceipt?.resolutionStatus === "resolved_after_dispute" ||
                      receiptLineItem?.resolutionStatus === "resolved_after_dispute";

                    const hasFinalDecisionNumbers =
                      receiptLineItem &&
                      (receiptLineItem.finalQuantityAccepted != null ||
                        receiptLineItem.resolutionStatus === "resolved_after_dispute" ||
                        isResolvedAfterDispute);

                    const displayAccepted = hasFinalDecisionNumbers
                      ? Number(receiptLineItem.finalQuantityAccepted ?? receiptLineItem.quantityAccepted ?? 0)
                      : Number(receiptLineItem?.quantityAccepted ?? li.quantityReceived ?? 0);
                    const displayRejected = hasFinalDecisionNumbers
                      ? Number(receiptLineItem.finalQuantityRejected ?? receiptLineItem.quantityRejected ?? 0)
                      : Number(receiptLineItem?.quantityRejected ?? 0);
                    const displayMissing = hasFinalDecisionNumbers
                      ? Number(receiptLineItem.finalQuantityMissing ?? receiptLineItem.quantityMissing ?? 0)
                      : Number(receiptLineItem?.quantityMissing ?? 0);

                    const hasLineExceptions =
                      displayRejected > 0 || displayMissing > 0 || Boolean(receiptLineItem?.exceptionReason);

                    const allocations =
                      receiptLineItem?.dispositionAllocations && receiptLineItem.dispositionAllocations.length > 0
                        ? receiptLineItem.dispositionAllocations
                        : matchingReceipt?.dispositionAllocations && matchingReceipt.dispositionAllocations.length > 0
                        ? matchingReceipt.dispositionAllocations
                        : [];

                    const disputeEvent = (matchingReceipt?.decisionHistory as any[])
                      ?.slice()
                      .reverse()
                      .find((h: any) => h.event === "vendor_disputed");
                    const proposedItem = Array.isArray(disputeEvent?.proposedLineItems)
                      ? disputeEvent.proposedLineItems.find(
                          (p: any) =>
                            (receiptLineItem?.deliveryReceiptLineItemId &&
                              p.deliveryReceiptLineItemId === receiptLineItem.deliveryReceiptLineItemId) ||
                            (receiptLineItem?.purchaseOrderLineItemId &&
                              p.purchaseOrderLineItemId === receiptLineItem.purchaseOrderLineItemId) ||
                            (p.name && p.name === item.name)
                        )
                      : undefined;
                    const vendorDisputeClaim =
                      receiptLineItem?.vendorResponseReason ||
                      proposedItem?.reason ||
                      (receiptLineItem?.vendorDisposition === "dispute"
                        ? disputeEvent?.reason || matchingReceipt?.vendorResponseReason
                        : null);

                    const vendorNote =
                      receiptLineItem?.vendorResponseReason || matchingReceipt?.vendorResponseReason;

                    let badgeText = f.notice.dispatchStatus === "dispatched" ? "Dispatched" : "Pending Dispatch";
                    let badgeColor = f.notice.dispatchStatus === "dispatched"
                      ? "bg-blue-50 text-blue-600 border-blue-200"
                      : "bg-gray-50 text-gray-600 border-gray-200";

                    if (hasLineExceptions && matchingReceipt?.companyActionRequired) {
                      badgeText = "Disputed · Action Required";
                      badgeColor = "bg-[#fdecee] text-[#d33d44] border-[#d33d44]/20";
                    } else if (hasLineExceptions && matchingReceipt?.vendorActionRequired) {
                      badgeText = matchingReceipt?.finalDecision ? "Ruling Issued · Awaiting Vendor" : "Awaiting Vendor Response";
                      badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                    } else if (
                      hasLineExceptions &&
                      (matchingReceipt?.decisionHistory?.some((h: any) => h.event === "vendor_accepted_final_decision") ||
                      (matchingReceipt?.finalDecision && !matchingReceipt?.vendorActionRequired))
                    ) {
                      badgeText = "Ruling Accepted · Backordered";
                      badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                    } else if (hasLineExceptions && matchingReceipt?.finalDecision) {
                      badgeText = "Ruling Issued";
                      badgeColor = "bg-[#f0faf8] text-[#087f70] border-[#087f70]/20";
                    } else if (hasLineExceptions && isResolvedAfterDispute) {
                      badgeText = "Resolved After Dispute";
                      badgeColor = "bg-[#f0faf8] text-[#087f70] border-[#087f70]/20";
                    } else if (
                      hasLineExceptions &&
                      (receiptLineItem?.vendorDisposition === "backorder" ||
                      matchingReceipt?.resolutionStatus === "backordered" ||
                      allocations.some((a: any) => a.disposition === "backorder"))
                    ) {
                      badgeText = "Backordered by Vendor";
                      badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                    } else if (
                      hasLineExceptions &&
                      (receiptLineItem?.vendorDisposition === "forfeit" ||
                      matchingReceipt?.resolutionStatus === "forfeited" ||
                      allocations.some((a: any) => a.disposition === "forfeit"))
                    ) {
                      badgeText = "Forfeited by Vendor";
                      badgeColor = "bg-gray-100 text-gray-700 border-gray-200";
                    } else if (hasLineExceptions) {
                      badgeText = "Confirmed with Exceptions";
                      badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                    } else if (isReceiptConfirmed || liConfirmed) {
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
                            {(isPhysical || isReceiptConfirmed || liConfirmed || liPartiallyConfirmed || matchingReceipt) && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${badgeColor}`}>
                                {badgeText}
                              </span>
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-medium text-[#111815]">
                              {li.quantityReady} Fulfilled
                              {li.remainingDisposition && (
                                <span className="text-[#89918d] font-normal">
                                  {" "}· {remainingAtTime}{" "}
                                  {li.remainingDisposition === "cannot_fulfill"
                                    ? "Cannot fulfill remaining"
                                    : `Backordered remaining (exp. ${formatDate(li.expectedReadyDate || item.expectedReadyDate).split(",")[0]})`}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-[#89918d] mt-1">
                              Via {methodLabel[method] || method}
                              {f.notice.carrier && ` (${f.notice.carrier})`}
                              {(f.notice.shipmentReference || f.notice.fulfillmentReference) &&
                                ` · Waybill ${f.notice.shipmentReference || f.notice.fulfillmentReference}`}
                              {(f.notice.expectedDeliveryDate || f.notice.estimatedDeliveryDate) &&
                                ` · Est. delivery ${formatDate(f.notice.expectedDeliveryDate || f.notice.estimatedDeliveryDate).split(",")[0]}`}
                              {matchingReceipt?.receiptNumber && ` · Receipt ${matchingReceipt.receiptNumber}`}
                            </p>
                            {(li.dispositionReason || item.dispositionReason) && (
                              <p className="text-xs text-[#68726d] italic mt-1">
                                Vendor note: &quot;{li.dispositionReason || item.dispositionReason}&quot;
                              </p>
                            )}
                          </div>

                          {/* Inspection & Receiving Outcome */}
                          {receiptLineItem ? (
                            <div className="pt-2.5 border-t border-black/[0.04] space-y-2">
                              {/* Quantity breakdown chips */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#f0faf8] text-[#087f70]">
                                  {displayAccepted} accepted
                                </span>
                                {displayRejected > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-[#e14856] border border-red-200">
                                    {displayRejected} rejected
                                  </span>
                                )}
                                {displayMissing > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    {displayMissing} missing
                                  </span>
                                )}
                              </div>

                              {/* Exception Reason */}
                              {receiptLineItem.exceptionReason && (
                                <p className="text-xs text-[#68726d]">
                                  <span className="font-semibold text-[#34413b]">Reason:</span>{" "}
                                  {formatExceptionReason(receiptLineItem.exceptionReason)}
                                </p>
                              )}

                              {/* Buyer Recommended Disposition */}
                              {receiptLineItem.recommendedDisposition && (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#f0faf8] text-[#087f70] border border-[#087f70]/20">
                                    Buyer recommended:{" "}
                                    <strong className="capitalize">{receiptLineItem.recommendedDisposition}</strong>
                                  </span>
                                </div>
                              )}

                              {/* Vendor Split / Allocations (e.g. 8 backordered, 2 forfeited) */}
                              {allocations.length > 0 ? (
                                <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 p-2.5 space-y-1.5 text-xs text-[#34413b]">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-amber-950 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                                      <Clock3 className="w-3.5 h-3.5 text-amber-700" />
                                      Vendor Resolution
                                    </span>
                                    {matchingReceipt?.vendorRespondedAt && (
                                      <span className="text-[10px] text-[#89918d]">
                                        Responded {formatDate(matchingReceipt.vendorRespondedAt)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="space-y-1 pt-0.5">
                                    {allocations.map((alloc: any, aIdx: number) => (
                                      <div
                                        key={aIdx}
                                        className="flex flex-wrap items-center justify-between gap-1 text-xs bg-white px-2.5 py-1.5 rounded border border-amber-200/70"
                                      >
                                        <div className="flex items-center gap-1.5">
                                          <span
                                            className={`w-1.5 h-1.5 rounded-full ${
                                              alloc.disposition === "backorder" ? "bg-amber-500" : "bg-red-400"
                                            }`}
                                          />
                                          <span className="capitalize font-bold text-[#0b100e]">{alloc.disposition}:</span>
                                          <span className="font-semibold text-amber-950">
                                            {alloc.quantity} {formatUnitLabel(Number(alloc.quantity || 0), item.unitOfMeasure)}
                                          </span>
                                          {alloc.expectedRedeliveryDate && (
                                            <span className="text-[#68726d]">(due {formatDate(alloc.expectedRedeliveryDate).split(",")[0]})</span>
                                          )}
                                        </div>
                                        {alloc.reason && (
                                          <span className="text-[11px] text-[#68726d] italic">&quot;{alloc.reason}&quot;</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  {vendorNote &&
                                    !allocations.some(
                                      (a: any) => a.reason && String(a.reason).trim() === String(vendorNote).trim()
                                    ) && (
                                    <p className="text-[11px] text-[#68726d] italic pt-0.5">
                                      Note: &quot;{vendorNote}&quot;
                                    </p>
                                  )}
                                </div>
                              ) : matchingReceipt?.finalDecision ? (
                                <div className="space-y-2">
                                  {/* Historical Vendor Dispute Position */}
                                  {vendorDisputeClaim && (
                                    <div className="rounded-lg bg-gray-50 border border-black/[0.06] p-2.5 text-xs space-y-1 text-[#34413b]">
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold text-[#0b100e] flex items-center gap-1.5">
                                          <Scale className="w-3.5 h-3.5 text-amber-700" />
                                          Vendor Response: Disputed Finding
                                        </span>
                                        {matchingReceipt?.vendorRespondedAt && (
                                          <span className="text-[10px] text-[#89918d]">
                                            Responded {formatDate(matchingReceipt.vendorRespondedAt)}
                                          </span>
                                        )}
                                      </div>
                                      <p className="italic text-[#68726d]">&quot;{vendorDisputeClaim}&quot;</p>
                                      {proposedItem && (
                                        <p className="text-[11px] text-[#89918d]">
                                          Vendor proposed: {proposedItem.quantityAccepted} accepted, {proposedItem.quantityRejected} rejected.
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* Company Final Binding Determination */}
                                  <div className="rounded-lg bg-[#f0faf8] border border-[#087f70]/20 p-2.5 text-xs text-[#065f55] space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold flex items-center gap-1.5 text-[#087f70]">
                                        <Gavel className="w-3.5 h-3.5 text-[#087f70]" />
                                        Company Final Decision: {FINAL_DECISION_LABELS[matchingReceipt.finalDecision] || matchingReceipt.finalDecision.replace(/_/g, " ")}
                                      </span>
                                      <span className="text-[9px] font-bold uppercase tracking-wider bg-white px-1.5 py-0.5 rounded border border-[#087f70]/20">
                                        Binding Ruling
                                      </span>
                                    </div>
                                    {matchingReceipt.resolutionNote && (
                                      <p className="italic text-[#34413b]">&quot;{matchingReceipt.resolutionNote}&quot;</p>
                                    )}
                                    <p className="text-[11px] text-[#68726d]">
                                      Final determined quantities: {receiptLineItem.finalQuantityAccepted ?? receiptLineItem.quantityAccepted} accepted, {receiptLineItem.finalQuantityRejected ?? receiptLineItem.quantityRejected} rejected
                                      {receiptLineItem.recommendedDisposition ? ` · Recommended: ${receiptLineItem.recommendedDisposition}` : ""}.
                                    </p>
                                  </div>

                                  {/* Vendor Accepted Determination & Scheduled Action */}
                                  {(() => {
                                    const vae = (matchingReceipt?.decisionHistory as any[])
                                      ?.slice()
                                      .reverse()
                                      .find((h: any) => h.event === "vendor_accepted_final_decision");
                                    if (vae) {
                                      return (
                                        <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 p-2.5 text-xs text-[#34413b] space-y-1">
                                          <div className="flex items-center justify-between">
                                            <span className="font-semibold text-amber-950 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                                              Vendor Accepted Determination
                                            </span>
                                            <span className="text-[10px] text-[#89918d]">
                                              Accepted {formatDate(vae.timestamp ? String(vae.timestamp) : null)}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 pt-0.5">
                                            <span className="capitalize font-bold text-[#0b100e]">{String(vae.disposition || "backorder")}:</span>
                                            <span className="font-semibold text-amber-950">
                                              {receiptLineItem.finalQuantityRejected ?? receiptLineItem.quantityRejected}{" "}
                                              {formatUnitLabel(
                                                Number(receiptLineItem.finalQuantityRejected ?? receiptLineItem.quantityRejected ?? 0),
                                                item.unitOfMeasure
                                              )}
                                            </span>
                                            {vae.expectedRedeliveryDate ? (
                                              <span className="text-[#68726d]">(due {formatDate(String(vae.expectedRedeliveryDate)).split(",")[0]})</span>
                                            ) : null}
                                          </div>
                                          {vae.reason ? (
                                            <p className="text-[11px] text-[#68726d] italic">&quot;{String(vae.reason)}&quot;</p>
                                          ) : null}
                                        </div>
                                      );
                                    }
                                    if (matchingReceipt.vendorActionRequired) {
                                      return (
                                        <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 p-2.5 text-xs text-amber-900 flex items-center gap-2">
                                          <Clock3 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                          <span>
                                            Awaiting vendor to acknowledge binding determination and schedule replacement or confirm forfeiture.
                                          </span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              ) : hasLineExceptions && (displayRejected + displayMissing > 0) && (matchingReceipt?.vendorActionRequired || receiptLineItem.resolutionStatus === "awaiting_vendor_response" || matchingReceipt?.resolutionStatus === "awaiting_vendor_response") ? (
                                <div className="rounded-lg bg-amber-50/60 border border-amber-200/80 p-2.5 text-xs text-amber-900 flex items-center gap-2">
                                  <Clock3 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>
                                    Vendor response is pending on the {displayRejected + displayMissing}{" "}
                                    {formatUnitLabel(displayRejected + displayMissing, item.unitOfMeasure)} in exception.
                                  </span>
                                </div>
                              ) : (receiptLineItem.vendorDisposition || matchingReceipt?.vendorDisposition) ? (
                                <div className="rounded-lg bg-gray-50 border border-black/[0.06] p-2.5 text-xs space-y-1 text-[#34413b]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-[#0b100e]">Vendor Resolution:</span>
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold capitalize bg-white border border-black/[0.08] text-amber-900">
                                      <Clock3 className="w-3 h-3 text-amber-600" />
                                      {RESOLUTION_STATUS_LABELS[receiptLineItem.vendorDisposition || matchingReceipt?.vendorDisposition || ""] ||
                                        (receiptLineItem.vendorDisposition || matchingReceipt?.vendorDisposition || "").replace(/_/g, " ")}
                                      {(receiptLineItem.expectedRedeliveryDate || matchingReceipt?.expectedRedeliveryDate) && (
                                        <span className="text-[#68726d] font-normal">
                                          {" "}(due {formatDate(receiptLineItem.expectedRedeliveryDate || matchingReceipt?.expectedRedeliveryDate).split(",")[0]})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  {vendorNote && (
                                    <p className="text-[11px] text-[#68726d] italic">&quot;{vendorNote}&quot;</p>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          ) : (li.quantityReceived || 0) > 0 ? (
                            <div className="pt-2 border-t border-black/[0.04]">
                              <p className="text-xs text-[#087f70] font-medium">{li.quantityReceived} confirmed received</p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


function ActiveDeliveryActionCard({
  notice,
  index,
  onReceive,
  poLineItems,
}: {
  notice: any;
  index: number;
  onReceive: () => void;
  poLineItems: any[];
}) {
  const method = notice.fulfillmentMethod || "carrier";
  const isDigital = method === "digital";
  const isService = method === "service";
  const isPhysical = ["carrier", "vendor_truck"].includes(method);

  let Icon = Package;
  if (isPhysical) Icon = Truck;
  else if (isDigital) Icon = Monitor;
  else if (isService) Icon = Wrench;

  const titlePrefix = isDigital ? "Digital Delivery" : isService ? "Service Delivery" : "Shipment";

  const items = (notice.lineItems || []).map((li: any) => {
    const poLine = (poLineItems || []).find(
      (p: any) => p.purchaseOrderLineItemId === li.purchaseOrderLineItemId
    );
    const qty =
      li.quantityAwaitingReceipt ??
      li.quantityReady ??
      li.quantityShipped ??
      li.quantity ??
      0;
    return {
      name: poLine?.name || li.name || "Item",
      quantity: qty,
      unitOfMeasure: poLine?.unitOfMeasure || li.unitOfMeasure || "unit",
    };
  });

  const totalUnits = items.reduce((s: number, it: any) => s + Number(it.quantity || 0), 0);

  return (
    <div className="rounded-[16px] border-2 border-[#087f70]/30 bg-gradient-to-br from-[#f0faf8]/80 via-white to-white shadow-sm overflow-hidden p-6 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-[14px] bg-[#087f70] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#087f70] text-white uppercase tracking-wider">
                Action Required
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f0faf8] text-[#087f70] border border-[#087f70]/20">
                Ready for Inspection
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#0b100e] mt-1.5">
              {titlePrefix} #{index + 1} Awaiting Receipt Confirmation
            </h3>
            <p className="text-xs text-[#68726d] mt-1">
              Dispatched {formatDate(notice.readyAt || notice.shippedAt)} • {notice.declaration === "full" ? "Full Delivery" : "Partial Delivery"}
            </p>
          </div>
        </div>

        <button
          onClick={onReceive}
          className="h-11 px-6 rounded-[12px] bg-[#087f70] text-white text-sm font-semibold hover:bg-[#076a5e] transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          Inspect & Confirm Delivery
        </button>
      </div>

      {/* Shipment metadata */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-black/[0.06] text-xs">
        <div>
          <span className="text-[#84908a] block font-medium">Delivery Method</span>
          <span className="font-semibold text-[#0b100e] mt-0.5 block capitalize">
            {method === "vendor_truck" ? "Vendor Truck" : method}
            {notice.carrier ? ` (${notice.carrier})` : ""}
          </span>
        </div>
        <div>
          <span className="text-[#84908a] block font-medium">Tracking / Waybill</span>
          <span
            className="font-semibold text-[#0b100e] mt-0.5 block truncate"
            title={
              notice.trackingNumber ||
              notice.waybillNumber ||
              notice.shipmentReference ||
              notice.fulfillmentReference ||
              notice.dispatchReference ||
              "—"
            }
          >
            {notice.trackingNumber ||
              notice.waybillNumber ||
              notice.shipmentReference ||
              notice.fulfillmentReference ||
              notice.dispatchReference ||
              "Not provided"}
          </span>
        </div>
        <div>
          <span className="text-[#84908a] block font-medium">Expected Delivery</span>
          <span className="font-semibold text-[#0b100e] mt-0.5 block">
            {notice.expectedDeliveryDate || notice.estimatedDeliveryDate
              ? formatDate(notice.expectedDeliveryDate || notice.estimatedDeliveryDate).split(",")[0]
              : "—"}
          </span>
        </div>
        <div>
          <span className="text-[#84908a] block font-medium">Quantity In Delivery</span>
          <span className="font-semibold text-[#087f70] mt-0.5 block">
            {totalUnits} {totalUnits === 1 ? "unit" : "units"}
          </span>
        </div>
      </div>

      {/* Arriving Line items preview */}
      {items.length > 0 && (
        <div className="mt-4 pt-3 border-t border-black/[0.04]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#68726d] mb-2">
            Items In This Shipment
          </p>
          <div className="flex flex-wrap gap-2">
            {items.map((it: any, idx: number) => {
              const uom = String(it.unitOfMeasure || "unit");
              const uomLabel =
                Number(it.quantity) !== 1 &&
                !uom.endsWith("s") &&
                !["kg", "g", "mg", "ml", "cl", "m", "cm", "mm", "km", "ft", "oz", "sqm", "sqft"].includes(uom.toLowerCase())
                  ? `${uom}s`
                  : uom;
              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-black/[0.08] text-xs font-medium text-[#0b100e]"
                >
                  <span className="font-semibold text-[#087f70]">{it.quantity} {uomLabel}</span>
                  <span className="text-[#68726d]">•</span>
                  <span>{it.name}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {(notice.deliveryNotes || notice.notes) && (
        <div className="mt-3 text-xs bg-white/70 rounded-lg p-2.5 border border-black/[0.04]">
          <span className="font-semibold text-[#0b100e]">Vendor Note:</span>{" "}
          <span className="text-[#68726d] italic">&quot;{notice.deliveryNotes || notice.notes}&quot;</span>
        </div>
      )}
    </div>
  );
}

function ActiveDisputeActionCard({
  receipt,
  onResolve,
}: {
  receipt: DeliveryReceiptRecord;
  onResolve: () => void;
}) {
  return (
    <div className="rounded-[14px] border border-black/[0.08] bg-white overflow-hidden transition-all">
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-[10px] bg-[#fdecee] border border-[#d33d44]/20 text-[#d33d44] flex items-center justify-center shrink-0">
            <Gavel className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-base font-bold text-[#0b100e]">
                Review Vendor Dispute on Receipt {receipt.receiptNumber || "RCPT"}
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fdecee] text-[#d33d44] border border-[#d33d44]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d33d44]" />
                Vendor Disputed Findings
              </span>
            </div>
            <p className="text-xs text-[#68726d] mt-1">
              Received {formatDate(receipt.receivedAt)} • The vendor has submitted a formal dispute on inspection exceptions.
            </p>
          </div>
        </div>

        <button
          onClick={onResolve}
          className="h-9 px-4 rounded-[10px] bg-[#087f70] text-white text-xs sm:text-sm font-semibold hover:bg-[#076a5e] transition-colors flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Gavel className="w-3.5 h-3.5" />
          Review Dispute & Resolve
        </button>
      </div>

      {receipt.vendorResponseReason && (
        <div className="px-5 sm:px-6 pb-5">
          <div className="px-3.5 py-2.5 rounded-[12px] bg-[#f9faf9] border border-black/[0.06] text-xs text-[#34413b]">
            <span className="font-semibold text-[#0b100e]">Vendor Dispute Reason:</span>{" "}
            <span className="italic">&quot;{receipt.vendorResponseReason}&quot;</span>
          </div>
        </div>
      )}

      <div className="px-5 sm:px-6 py-3 bg-[#f9faf9] border-t border-black/[0.06] text-xs text-[#68726d]">
        <strong className="font-semibold text-[#0b100e]">Action Required:</strong> Review inspection photos and vendor evidence, then record the final binding allocation (uphold original finding, accept vendor dispute, or custom allocation).
      </div>
    </div>
  );
}

function ActiveExceptionResolutionCard({
  receipt,
}: {
  receipt: DeliveryReceiptRecord;
}) {
  const lineItems = receipt.lineItems || [];
  const allAllocations = lineItems.flatMap((li: any) => li.dispositionAllocations || []);
  const backorderAlloc = allAllocations.find((a: any) => a.disposition === "backorder");
  const totalBackordered = allAllocations
    .filter((a: any) => a.disposition === "backorder")
    .reduce((s: number, a: any) => s + Number(a.quantity || 0), 0);
  const totalForfeited = allAllocations
    .filter((a: any) => a.disposition === "forfeit")
    .reduce((s: number, a: any) => s + Number(a.quantity || 0), 0);
  const totalRejected = lineItems.reduce((s: number, li: any) => s + Number(li.quantityRejected || 0), 0);
  const totalMissing = lineItems.reduce((s: number, li: any) => s + Number(li.quantityMissing || 0), 0);

  const expDate = receipt.expectedRedeliveryDate || backorderAlloc?.expectedRedeliveryDate;
  const backorderNotes = Array.from(
    new Set(
      allAllocations
        .filter((a: any) => a.disposition === "backorder" && a.reason)
        .map((a: any) => String(a.reason).trim())
    )
  );
  const forfeitNotes = Array.from(
    new Set(
      allAllocations
        .filter((a: any) => a.disposition === "forfeit" && a.reason)
        .map((a: any) => String(a.reason).trim())
    )
  );
  const hasBothDispositions = totalBackordered > 0 && totalForfeited > 0;

  return (
    <div className="rounded-[14px] border border-black/[0.08] bg-white overflow-hidden transition-all">
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-[10px] bg-[#f5f7f6] border border-black/[0.06] text-[#34413b] flex items-center justify-center shrink-0">
            <Clock3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-base font-bold text-[#0b100e]">
                Delivery Issue on Receipt {receipt.receiptNumber || "RCPT"}
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Vendor Resolution Recorded
              </span>
            </div>
            <p className="text-xs text-[#68726d] mt-1">
              Received {formatDate(receipt.receivedAt)} • {totalRejected > 0 && `${totalRejected} rejected`}
              {totalRejected > 0 && totalMissing > 0 && " · "}
              {totalMissing > 0 && `${totalMissing} missing`}
              {receipt.fulfillmentReference ? ` (Fulfillment ${receipt.fulfillmentReference})` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Resolution breakdown */}
      {(totalBackordered > 0 || totalForfeited > 0) && (
        <div className="px-5 sm:px-6 pb-5">
          <div className={`grid grid-cols-1 ${hasBothDispositions ? "sm:grid-cols-2" : ""} gap-3`}>
            {totalBackordered > 0 && (
              <div className="flex flex-col justify-between gap-1.5 px-3.5 py-3 rounded-[12px] bg-[#f9faf9] border border-black/[0.06] text-xs">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="font-semibold text-[#0b100e]">{totalBackordered} Units Backordered</span>
                  </div>
                  {expDate && (
                    <span className="text-[11px] text-[#68726d] bg-white px-2 py-0.5 rounded-md font-medium border border-black/[0.06]">
                      Expected {formatDate(expDate).split(",")[0]}
                    </span>
                  )}
                </div>
                {backorderNotes.length > 0 && (
                  <p className="text-[11px] text-[#68726d] italic pl-4">
                    &quot;{backorderNotes.join(" · ")}&quot;
                  </p>
                )}
              </div>
            )}

            {totalForfeited > 0 && (
              <div className="flex flex-col justify-between gap-1.5 px-3.5 py-3 rounded-[12px] bg-[#f9faf9] border border-black/[0.06] text-xs">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                    <span className="font-semibold text-[#0b100e]">{totalForfeited} Units Forfeited</span>
                  </div>
                  <span className="text-[11px] text-[#68726d] bg-white px-2 py-0.5 rounded-md border border-black/[0.06]">
                    Cancelled by vendor
                  </span>
                </div>
                {forfeitNotes.length > 0 && (
                  <p className="text-[11px] text-[#68726d] italic pl-4">
                    &quot;{forfeitNotes.join(" · ")}&quot;
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-5 sm:px-6 py-3 bg-[#f9faf9] border-t border-black/[0.06] text-xs text-[#68726d]">
        {totalBackordered > 0 ? (
          <p>
            <strong className="font-semibold text-[#0b100e]">Awaiting Replacement Delivery:</strong> The vendor acknowledged this exception without dispute and scheduled{" "}
            <span className="font-semibold text-[#0b100e]">{totalBackordered} replacement {totalBackordered === 1 ? "unit" : "units"}</span>
            {expDate ? ` for ${formatDate(expDate).split(",")[0]}` : ""}. Once dispatched by the vendor, a new receipt confirmation prompt will appear here.
          </p>
        ) : (
          <p>
            <strong className="font-semibold text-[#0b100e]">Exception Resolved:</strong> The vendor acknowledged this exception without dispute and forfeited the remaining {totalForfeited} {totalForfeited === 1 ? "unit" : "units"}.
          </p>
        )}
      </div>
    </div>
  );
}

function PendingDispatchInfoCard({
  notice,
  index,
}: {
  notice: any;
  index: number;
}) {
  return (
    <div className="rounded-[16px] border border-amber-200 bg-amber-50/50 shadow-sm overflow-hidden p-5 transition-all">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-[12px] bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Clock3 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
              Awaiting Vendor Dispatch
            </span>
          </div>
          <h4 className="text-sm font-bold text-[#0b100e] mt-1">
            Shipment #{index + 1} Declared — Waiting for Dispatch
          </h4>
          <p className="text-xs text-[#68726d] mt-1 leading-relaxed">
            The vendor has prepared this shipment ({notice.lineItems?.length || 0} line items), but has not yet marked it as dispatched. Receipt confirmation will automatically unlock once the shipment is on its way.
          </p>
          {(notice.carrier || notice.trackingNumber) && (
            <div className="flex items-center gap-4 mt-2 text-xs text-[#34413b]">
              {notice.carrier && <span>Carrier: <strong>{notice.carrier}</strong></span>}
              {notice.trackingNumber && <span>Tracking: <strong>{notice.trackingNumber}</strong></span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AwaitingNextDeliveryCard({
  po,
}: {
  po: any;
}) {
  const lineItems = po.lineItems || [];
  const totalOrdered = lineItems.reduce((acc: number, li: any) => acc + Number(li.quantity || 0), 0);
  const totalAccepted = lineItems.reduce((acc: number, li: any) => acc + Number(li.quantityAccepted ?? li.quantityReceived ?? 0), 0);
  const totalForfeited = lineItems.reduce((acc: number, li: any) => acc + Number(li.quantityForfeited || 0), 0);
  const remaining = Math.max(0, totalOrdered - totalAccepted - totalForfeited);
  const hasOpenExceptions = (po.openExceptionCount ?? 0) > 0 || (po.deliveryOutcome || "").includes("with_exceptions");
  const hasPendingExceptionResponse = Boolean(po.vendorResponseRequired || po.companyActionRequired);

  const receiptWithPendingFinalDecision = (po.receiptConfirmations || []).find(
    (rc: any) => rc.finalDecision && rc.vendorActionRequired
  );
  const receiptWithSettledFinalDecision = !hasPendingExceptionResponse
    ? (po.receiptConfirmations || []).find((rc: any) => rc.finalDecision)
    : null;
  const receiptWithFinalDecision = receiptWithPendingFinalDecision || receiptWithSettledFinalDecision;
  const hasCompanyFinalDecision = Boolean(receiptWithFinalDecision);

  const vendorAcceptedRuling =
    !hasPendingExceptionResponse &&
    Boolean(receiptWithSettledFinalDecision) &&
    (receiptWithSettledFinalDecision?.decisionHistory?.some(
      (h: any) => h.event === "vendor_accepted_final_decision"
    ) || !receiptWithSettledFinalDecision?.vendorActionRequired);

  const vendorAcceptedEvent = (receiptWithFinalDecision?.decisionHistory as any[])
    ?.slice()
    .reverse()
    .find((h: any) => h.event === "vendor_accepted_final_decision");

  const isAwaitingVendorAcknowledge =
    hasCompanyFinalDecision &&
    !vendorAcceptedRuling &&
    (receiptWithFinalDecision?.vendorActionRequired || po.vendorResponseRequired);

  return (
    <div
      className={`rounded-[16px] border p-5 ${
        vendorAcceptedRuling
          ? "border-[#087f70]/30 bg-gradient-to-br from-[#f0faf8]/80 via-white to-white"
          : hasCompanyFinalDecision
          ? "border-[#087f70]/30 bg-[#f0faf8]/50"
          : hasOpenExceptions
          ? "border-amber-200 bg-amber-50/40"
          : "border-black/[0.06] bg-[#f9faf9]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            vendorAcceptedRuling
              ? "bg-[#e0f5f0] text-[#087f70]"
              : hasCompanyFinalDecision
              ? "bg-[#e0f5f0] text-[#087f70]"
              : hasOpenExceptions
              ? "bg-amber-100 text-amber-800"
              : "bg-[#f0faf8] text-[#087f70]"
          }`}
        >
          {vendorAcceptedRuling ? (
            <CheckCircle2 className="w-5 h-5 text-[#087f70]" />
          ) : hasCompanyFinalDecision ? (
            <Gavel className="w-5 h-5 text-[#087f70]" />
          ) : hasOpenExceptions ? (
            <AlertCircle className="w-5 h-5 text-amber-700" />
          ) : (
            <CheckCircle2 className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-[#0b100e]">
              {vendorAcceptedRuling
                ? "Exception Dispute Settled — Awaiting Next Delivery"
                : isAwaitingVendorAcknowledge
                ? "Final Company Determination Recorded — Awaiting Vendor Action"
                : hasOpenExceptions
                ? "Partially Delivered with Open Exceptions"
                : "All Delivered Shipments Confirmed"}
            </h4>
            {vendorAcceptedRuling ? (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f0faf8] text-[#087f70] border border-[#087f70]/20">
                Resolution Agreed
              </span>
            ) : hasCompanyFinalDecision ? (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f0faf8] text-[#087f70] border border-[#087f70]/20">
                Dispute Decided
              </span>
            ) : null}
          </div>
          <p className="text-xs text-[#68726d] mt-0.5">
            {totalAccepted} of {totalOrdered} units have been confirmed.
            {vendorAcceptedRuling
              ? ` All exception findings and vendor dispositions are agreed. ${po.vendor?.displayName || po.vendor?.legalName || "The vendor"} accepted the ruling${vendorAcceptedEvent?.expectedRedeliveryDate ? ` and scheduled replacement delivery for ${formatDate(String(vendorAcceptedEvent.expectedRedeliveryDate)).split(",")[0]}` : ""}. Awaiting vendor dispatch for the remaining ${remaining} ${remaining === 1 ? "unit" : "units"}.`
              : isAwaitingVendorAcknowledge
              ? " The company has submitted its final binding decision on the disputed receipt. Awaiting the vendor to acknowledge and fulfill the final disposition."
              : hasOpenExceptions
              ? ` There ${po.openExceptionCount === 1 ? "is 1 delivery exception" : `are ${po.openExceptionCount} delivery exceptions`} being resolved. Awaiting the vendor for replacement or next delivery.`
              : ` Awaiting the vendor to initiate the next shipment for the remaining ${remaining} ${remaining === 1 ? "unit" : "units"}.`}
          </p>
        </div>
      </div>
    </div>
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

  const receiptConfirmations = (po.receiptConfirmations || []) as DeliveryReceiptRecord[];

  for (const notice of fulfillmentHistory) {
    const matchingReceipt = getMatchingReceipt(notice, receiptConfirmations);
    for (const lineItem of notice.lineItems || []) {
      const purchaseOrderLineItemId = lineItem.purchaseOrderLineItemId;
      if (!purchaseOrderLineItemId) continue;

      const receiptLineItem = (matchingReceipt?.lineItems || []).find(
        (rli: any) =>
          (lineItem.vendorDeliveryNoticeLineItemId &&
            rli.fulfillmentLineItemId === lineItem.vendorDeliveryNoticeLineItemId) ||
          (lineItem.purchaseOrderLineItemId &&
            rli.purchaseOrderLineItemId === lineItem.purchaseOrderLineItemId),
      );

      const acceptedFromReceipt = receiptLineItem
        ? Number(receiptLineItem.finalQuantityAccepted ?? receiptLineItem.quantityAccepted ?? lineItem.quantityReceived ?? 0)
        : Number(lineItem.quantityReceived || 0);
      const hasAnyPerLineDisposition = (matchingReceipt?.lineItems || []).some(
        (rli: any) => Boolean(rli.vendorDisposition || rli.resolutionStatus),
      );
      const lineDisp = receiptLineItem?.vendorDisposition || (!hasAnyPerLineDisposition ? matchingReceipt?.vendorDisposition : null);
      const lineRes = receiptLineItem?.resolutionStatus || (!hasAnyPerLineDisposition ? matchingReceipt?.resolutionStatus : null);
      const forfeitedFromReceipt =
        receiptLineItem && (lineDisp === "forfeit" || lineRes === "forfeited")
          ? Number(receiptLineItem.finalQuantityRejected ?? receiptLineItem.quantityRejected ?? 0) +
            Number(receiptLineItem.finalQuantityMissing ?? receiptLineItem.quantityMissing ?? 0)
          : 0;

      const outstandingBeforeReceipt = outstandingByPurchaseOrderLineId.get(
        purchaseOrderLineItemId,
      );
      if (outstandingBeforeReceipt !== undefined) {
        const outstandingAfterReceipt = Math.max(
          outstandingBeforeReceipt - acceptedFromReceipt - forfeitedFromReceipt,
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

  // Find any active dispute requiring company decision
  const activeDisputeReceipt = receiptConfirmations.find(
    (rc) => rc.resolutionStatus === "under_company_review" || (po.companyActionRequired && rc.companyActionRequired)
  );

  // Find any receipt with open exceptions acknowledged/allocated by vendor that does not yet have a company final decision recorded
  const activeExceptionReceipt = receiptConfirmations.find(
    (rc) =>
      !rc.finalDecision &&
      (rc.resolutionStatus === "backordered" ||
       rc.resolutionStatus === "forfeited" ||
       rc.vendorResponse === "acknowledged" ||
       (rc.lineItems || []).some((li: any) => li.dispositionAllocations && li.dispositionAllocations.length > 0)) &&
      (rc.lineItems || []).some((li: any) => Number(li.quantityRejected || 0) > 0 || Number(li.quantityMissing || 0) > 0)
  );

  // Categorize fulfillments into active/expected vs past/confirmed
  const pastFulfillments: { notice: any; originalIndex: number }[] = [];
  let pendingFulfillmentToReceive: { notice: any; originalIndex: number } | null = null;
  let pendingFulfillmentAwaitingDispatch: { notice: any; originalIndex: number } | null = null;

  for (let idx = 0; idx < fulfillmentHistory.length; idx++) {
    const notice: any = fulfillmentHistory[idx];
    const matchingReceipt = getMatchingReceipt(notice, receiptConfirmations);
    const confirmed = isFulfillmentConfirmed(notice, matchingReceipt);

    if (confirmed) {
      pastFulfillments.push({ notice, originalIndex: idx });
    } else {
      const method = notice.fulfillmentMethod || "carrier";
      const isPhysical = ["carrier", "vendor_truck"].includes(method);
      const isDispatched = notice.dispatchStatus === "dispatched" || !isPhysical;

      if (isDispatched && canReceive) {
        if (!pendingFulfillmentToReceive) {
          pendingFulfillmentToReceive = { notice, originalIndex: idx };
        } else {
          pastFulfillments.push({ notice, originalIndex: idx });
        }
      } else {
        if (!pendingFulfillmentAwaitingDispatch) {
          pendingFulfillmentAwaitingDispatch = { notice, originalIndex: idx };
        } else {
          pastFulfillments.push({ notice, originalIndex: idx });
        }
      }
    }
  }

  const activePendingToReceive = pendingFulfillmentToReceive;
  const activePendingAwaitingDispatch = pendingFulfillmentAwaitingDispatch;

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

  const vendorExceptionStep = (() => {
    const disputeEvt = timelineByAction["vendor_disputed_delivery_finding"];
    const backorderEvt = timelineByAction["vendor_backordered_exception_lines"];
    const vendorReceipt = (po.receiptConfirmations || []).find((r: any) =>
      r.vendorResponse || r.decisionHistory?.some((h: any) => h.event === "vendor_disputed" || h.event === "vendor_acknowledged")
    );

    if (disputeEvt || vendorReceipt?.vendorResponse === "dispute") {
      return [
        {
          label: "Vendor Disputed Finding",
          person: getPerson(disputeEvt, po.vendor ? (po.vendor.displayName || po.vendor.legalName) : "Vendor"),
          badge: "Disputed",
          badgeColor: "text-[#d33d44] bg-[#fdecee]",
          timestamp: disputeEvt?.timestamp || vendorReceipt?.vendorRespondedAt,
          done: true,
          pending: false,
        },
      ];
    }
    if (backorderEvt || vendorReceipt?.vendorResponse === "acknowledged") {
      return [
        {
          label: "Vendor Exception Response",
          person: getPerson(backorderEvt, po.vendor ? (po.vendor.displayName || po.vendor.legalName) : "Vendor"),
          badge: "Backordered",
          badgeColor: "text-amber-700 bg-amber-50",
          timestamp: backorderEvt?.timestamp || vendorReceipt?.vendorRespondedAt,
          done: true,
          pending: false,
        },
      ];
    }
    return [];
  })();

  const companyFinalDecisionStep = (() => {
    const finalEvt = timelineByAction["company_final_delivery_determination"];
    const rcWithFinal = (po.receiptConfirmations || []).find((r: any) => r.finalDecision);

    if (finalEvt || rcWithFinal) {
      const decisionKey = rcWithFinal?.finalDecision;
      const decisionBadge =
        decisionKey === "uphold_buyer_finding"
          ? "Upheld Finding"
          : decisionKey === "accept_vendor_dispute"
          ? "Accepted Dispute"
          : "Final Decision";

      return [
        {
          label: "Company Final Determination",
          person: getPerson(finalEvt, rcWithFinal?.confirmedByName || "Authorized User"),
          badge: decisionBadge,
          badgeColor: "text-[#087f70] bg-[#f0faf8]",
          timestamp: finalEvt?.timestamp || rcWithFinal?.resolvedAt,
          done: true,
          pending: false,
        },
      ];
    }
    return [];
  })();

  const vendorAcceptedFinalDecisionStep = (() => {
    const rcWithFinal = (po.receiptConfirmations || []).find((r: any) => r.finalDecision);
    const vendorAcceptedEvt = ((rcWithFinal?.decisionHistory as any[]) || []).find(
      (h: any) => h.event === "vendor_accepted_final_decision"
    );

    if (vendorAcceptedEvt) {
      const expDate = vendorAcceptedEvt.expectedRedeliveryDate
        ? ` (due ${formatDate(String(vendorAcceptedEvt.expectedRedeliveryDate)).split(",")[0]})`
        : "";
      return [
        {
          label: "Vendor Accepted Determination",
          person: po.vendor ? (po.vendor.displayName || po.vendor.legalName) : "Vendor",
          badge: String(vendorAcceptedEvt.disposition) === "backorder" ? `Backordered${expDate}` : "Accepted Ruling",
          badgeColor: "text-amber-700 bg-amber-50",
          timestamp: vendorAcceptedEvt.timestamp ? String(vendorAcceptedEvt.timestamp) : undefined,
          done: true,
          pending: false,
        },
      ];
    }
    return [];
  })();

  const pendingNextStep = (() => {
    if (po.vendorResponseRequired) {
      return [
        {
          label: "Awaiting Vendor Action",
          person: undefined,
          badge: "Pending Vendor",
          badgeColor: "text-amber-700 bg-amber-50",
          timestamp: undefined,
          done: false,
          pending: true,
        },
      ];
    }
    if (po.companyActionRequired) {
      return [
        {
          label: "Awaiting Company Review",
          person: undefined,
          badge: "Action Required",
          badgeColor: "text-[#d33d44] bg-[#fdecee]",
          timestamp: undefined,
          done: false,
          pending: true,
        },
      ];
    }
    if (stage === "partially_delivered" || stage === "partially_delivered_with_exceptions") {
      const hasAcceptedRuling = (po.receiptConfirmations || []).some((r: any) =>
        r.decisionHistory?.some((h: any) => h.event === "vendor_accepted_final_decision")
      );
      return [
        {
          label: pendingFulfillmentToReceive
            ? "Awaiting Confirmation"
            : hasAcceptedRuling
            ? "Awaiting Replacement Delivery"
            : "Awaiting Next Delivery",
          person: undefined,
          badge: pendingFulfillmentToReceive ? "Pending Receipt" : "Backordered",
          badgeColor: "text-amber-600 bg-amber-50",
          timestamp: undefined,
          done: false,
          pending: true,
        },
      ];
    }
    return [];
  })();

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
      ...vendorExceptionStep,
      ...companyFinalDecisionStep,
      ...vendorAcceptedFinalDecisionStep,
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
                  const isStillPartial =
                    stage === "partially_delivered" ||
                    stage === "partially_delivered_with_exceptions" ||
                    (po.closeBlockers || []).includes("delivery_incomplete");
                  const outcomeKey = isStillPartial
                    ? stage || "partially_delivered"
                    : (po.deliveryOutcome || po.status || "").toLowerCase();
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
                ) : (() => {
                  const isSettledAgreed = (po.receiptConfirmations || []).some((rc: any) =>
                    rc.decisionHistory?.some((h: any) => h.event === "vendor_accepted_final_decision") ||
                    (rc.finalDecision && !rc.vendorActionRequired)
                  );
                  const redeliveryDate = (po.receiptConfirmations || []).flatMap((rc: any) => [
                    rc.expectedRedeliveryDate,
                    ...(rc.decisionHistory || []).map((h: any) => h.expectedRedeliveryDate),
                    ...(rc.lineItems || []).flatMap((li: any) => [
                      li.expectedRedeliveryDate,
                      ...(li.dispositionAllocations || []).map((a: any) => a.expectedRedeliveryDate),
                    ]),
                  ]).filter(Boolean)[0];
                  const formattedDate = redeliveryDate ? formatDate(String(redeliveryDate)).split(",")[0] : null;

                  if (isSettledAgreed) {
                    return (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock3 className="w-3.5 h-3.5" />
                        Replacement Scheduled{formattedDate ? ` (due ${formattedDate})` : ""}
                      </span>
                    );
                  }

                  if ((po.openExceptionCount ?? 0) > 0) {
                    return (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {po.openExceptionCount} delivery {po.openExceptionCount === 1 ? "issue" : "issues"}
                      </span>
                    );
                  }

                  return null;
                })()}
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
              
              {/* === Active / Expected Delivery Hero Section === */}
              {activeDisputeReceipt ? (
                <ActiveDisputeActionCard
                  receipt={activeDisputeReceipt}
                  onResolve={() => setActiveReceiptForDecision(activeDisputeReceipt)}
                />
              ) : activePendingToReceive ? (
                <ActiveDeliveryActionCard
                  notice={activePendingToReceive.notice}
                  index={activePendingToReceive.originalIndex}
                  onReceive={() => setActiveNotice(activePendingToReceive.notice)}
                  poLineItems={po.lineItems || []}
                />
              ) : activeExceptionReceipt ? (
                <ActiveExceptionResolutionCard
                  receipt={activeExceptionReceipt}
                />
              ) : activePendingAwaitingDispatch ? (
                <PendingDispatchInfoCard
                  notice={activePendingAwaitingDispatch.notice}
                  index={activePendingAwaitingDispatch.originalIndex}
                />
              ) : (stage === "partially_delivered" || stage === "partially_delivered_with_exceptions") ? (
                <AwaitingNextDeliveryCard po={po} />
              ) : null}

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

                    // Calculate rejected/missing units from receipts, separating open vs vendor-backordered vs forfeited
                    const receiptLineEntries = (po.receiptConfirmations || []).flatMap((rc: any) =>
                      (rc.lineItems || [])
                        .filter((rli: any) => rli.purchaseOrderLineItemId === item.purchaseOrderLineItemId)
                        .map((rli: any) => ({ rc, rli }))
                    );

                    let openRejectedQty = 0;
                    let openMissingQty = 0;
                    let backorderedExceptionRejectedQty = 0;
                    let backorderedExceptionMissingQty = 0;
                    let backorderedExceptionDate: string | null = null;
                    let backorderedExceptionNote: string | null = null;
                    let forfeitedFromReceiptsQty = 0;

                    for (const { rc, rli } of receiptLineEntries) {
                      const rej = Number(rli.finalQuantityRejected ?? rli.quantityRejected ?? 0);
                      const miss = Number(rli.finalQuantityMissing ?? rli.quantityMissing ?? 0);
                      if (rej <= 0 && miss <= 0) continue;

                      const hasPerLineDispOnReceipt = (rc.lineItems || []).some(
                        (l: any) => Boolean(l.vendorDisposition || l.resolutionStatus)
                      );
                      const lineDisp = rli.vendorDisposition || (!hasPerLineDispOnReceipt ? rc.vendorDisposition : null);
                      const lineRes = rli.resolutionStatus || (!hasPerLineDispOnReceipt ? rc.resolutionStatus : null);

                      const vendorAcceptedEvent = ((rc.decisionHistory as any[]) || [])
                        .slice()
                        .reverse()
                        .find((h: any) => h.event === "vendor_accepted_final_decision");
                      const finalSettledDisp =
                        vendorAcceptedEvent?.disposition ||
                        (rc.finalDecision && !rc.vendorActionRequired ? (rc.vendorDisposition || "backorder") : null);

                      if (rli.dispositionAllocations && Array.isArray(rli.dispositionAllocations) && rli.dispositionAllocations.length > 0) {
                        for (const alloc of rli.dispositionAllocations) {
                          const allocQty = Number(alloc.quantity || 0);
                          if (alloc.disposition === "backorder") {
                            backorderedExceptionRejectedQty += allocQty;
                            if (alloc.expectedRedeliveryDate) {
                              backorderedExceptionDate = alloc.expectedRedeliveryDate;
                            }
                            if (alloc.reason) {
                              backorderedExceptionNote = alloc.reason;
                            }
                          } else if (alloc.disposition === "forfeit") {
                            forfeitedFromReceiptsQty += allocQty;
                          }
                        }
                      } else if (finalSettledDisp === "backorder" || lineDisp === "backorder" || lineRes === "backordered") {
                        backorderedExceptionRejectedQty += rej;
                        backorderedExceptionMissingQty += miss;
                        const exp = vendorAcceptedEvent?.expectedRedeliveryDate || rli.expectedRedeliveryDate || rc.expectedRedeliveryDate;
                        if (exp) {
                          backorderedExceptionDate = exp;
                        }
                        const note = vendorAcceptedEvent?.reason || rli.vendorResponseReason || rc.vendorResponseReason;
                        if (note) {
                          backorderedExceptionNote = note;
                        }
                      } else if (finalSettledDisp === "forfeit" || lineDisp === "forfeit" || lineRes === "forfeited") {
                        forfeitedFromReceiptsQty += rej + miss;
                      } else {
                        openRejectedQty += rej;
                        openMissingQty += miss;
                      }
                    }

                    const rejectedFromReceipts = openRejectedQty;
                    const missingFromReceipts = openMissingQty;
                    const backorderedExceptionQty = backorderedExceptionRejectedQty + backorderedExceptionMissingQty;
                    const effectiveForfeitedQty = Math.max(forfeitedQty, forfeitedFromReceiptsQty);
                    const totalReceiptExceptionQty =
                      openRejectedQty + openMissingQty + backorderedExceptionQty + forfeitedFromReceiptsQty;

                    // Compute true awaiting receipt quantity from unconfirmed delivery notices when available;
                    // otherwise subtract both current missing and resolved-missing delta.
                    const unconfirmedNoticeQty =
                      fulfillmentHistory.length > 0
                        ? fulfillmentHistory.reduce((sum: number, notice: any) => {
                            const matchingReceipt = getMatchingReceipt(notice, receiptConfirmations);
                            if (isFulfillmentConfirmed(notice, matchingReceipt)) return sum;
                            const method = notice.fulfillmentMethod || "carrier";
                            const isPhysical = ["carrier", "vendor_truck"].includes(method);
                            const isDispatched = notice.dispatchStatus === "dispatched" || !isPhysical;
                            if (!isDispatched) return sum;
                            const line = (notice.lineItems || []).find(
                              (nli: any) => nli.purchaseOrderLineItemId === item.purchaseOrderLineItemId
                            );
                            if (!line) return sum;
                            return sum + Number(line.quantityAwaitingReceipt ?? line.quantityReady ?? line.quantityShipped ?? line.quantity ?? 0);
                          }, 0)
                        : Math.max(
                            0,
                            Number(item.quantityAwaitingReceipt ?? 0) -
                              totalReceiptExceptionQty -
                              Math.max(0, Number(item.quantityReceived ?? 0) - Number(item.quantityPhysicallyReceived ?? item.quantityReceived ?? 0))
                          );
                    const awaitingReceiptQty = unconfirmedNoticeQty;

                    const openIssueQty = Math.max(
                      0,
                      receiptLineEntries.length > 0
                        ? openRejectedQty + openMissingQty
                        : readyQty - acceptedQty - awaitingReceiptQty - effectiveForfeitedQty
                    );
                    const remainingToShipQty = Math.max(
                      0,
                      orderedQty -
                        acceptedQty -
                        openIssueQty -
                        backorderedExceptionQty -
                        effectiveForfeitedQty -
                        awaitingReceiptQty -
                        cannotFulfillQty
                    );

                    const isBackorderedState =
                      disp === "backordered" || item.fulfillmentState === "backordered";
                    const isCannotFulfillState = disp === "cannot_fulfill";

                    const totalBackorderedQty =
                      backorderedExceptionQty + (isBackorderedState ? remainingToShipQty : 0);
                    const combinedBackorderDate = isBackorderedState
                      ? (expDate || backorderedExceptionDate)
                      : (backorderedExceptionDate || expDate);

                    const totalForfeitedQty =
                      effectiveForfeitedQty +
                      cannotFulfillQty +
                      (isCannotFulfillState && cannotFulfillQty === 0 ? remainingToShipQty : 0);

                    const unallocatedRemainingQty =
                      !isBackorderedState && !isCannotFulfillState && cannotFulfillQty === 0
                        ? remainingToShipQty
                        : 0;
                    
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

                              {totalBackorderedQty > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50/80 text-amber-800 border border-amber-200 whitespace-nowrap">
                                  <Clock3 className="w-3 h-3 text-amber-600" />
                                  {totalBackorderedQty} Backordered
                                  {combinedBackorderDate
                                    ? ` (due ${formatDate(combinedBackorderDate).split(",")[0]})`
                                    : ""}
                                </span>
                              )}

                              {totalForfeitedQty > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-[#34413b] border border-black/[0.08] whitespace-nowrap">
                                  {totalForfeitedQty} Forfeited
                                </span>
                              )}

                              {unallocatedRemainingQty > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#f5f7f6] text-[#68726d] whitespace-nowrap">
                                  {unallocatedRemainingQty} {["service", "license"].includes(String(item.unitOfMeasure || "").toLowerCase()) || item.fulfillmentState === "not_started" ? "Awaiting fulfillment" : "Remaining to ship"}
                                </span>
                              )}

                              {acceptedQty >= orderedQty && openIssueQty === 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#f0faf8] text-[#087f70] whitespace-nowrap">
                                  All units accepted
                                </span>
                              )}
                            </div>

                            {(item.dispositionReason || dispReason || backorderedExceptionNote) && (
                              <p className="text-[11px] text-[#89918d] italic" title={item.dispositionReason || dispReason || backorderedExceptionNote || ""}>
                                Vendor note: {item.dispositionReason || dispReason || backorderedExceptionNote}
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

          {/* Past Deliveries & Receipts History Section */}
          {pastFulfillments.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#0b100e]">
                    Past Deliveries & Receipts ({pastFulfillments.length})
                  </h2>
                  <p className="text-xs text-[#68726d] mt-0.5">
                    Historical record of confirmed shipments, inspection receipts, and dispute outcomes.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                {pastFulfillments.map(({ notice, originalIndex }) => (
                  <FulfillmentHistoryCard
                    key={notice.vendorDeliveryNoticeId || originalIndex}
                    notice={notice}
                    index={originalIndex}
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
                <div className="px-5 py-4 space-y-0 pt-3 pl-1 max-h-[480px] overflow-y-auto modal-scrollbar">
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
        receiptConfirmations={receiptConfirmations}
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
