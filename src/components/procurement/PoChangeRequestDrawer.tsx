"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { format } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  History,
  Info,
  Loader2,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-stores";
import { workspaceReadOnly } from "@/features/entity-workspace/store";
import {
  PoChangeRequestDetail,
  useDecidePoChangeRequest,
  usePoChangeRequestDetail,
  usePoChangeEligibility,
  usePoRevisions,
  extractApiErrorMessage,
} from "@/queries/procurement/po-change-requests";
import { useGetAllUsersApi } from "@/queries/users/get-all-users";
import { formatCurrency } from "@/lib/utils/currency";
import {
  isProcurementPolicyViolationError,
  getProcurementPolicyViolations,
  type ProcurementPolicyViolation,
} from "@/lib/types/api-error";

interface PoChangeRequestModalProps {
  requestId: string | null;
  onClose: () => void;
  poStatus?: string;
  poAcknowledgedAt?: string | null;
  vendorName?: string;
}

export function PoChangeRequestModal({
  requestId,
  onClose,
  poStatus,
  poAcknowledgedAt,
  vendorName,
}: PoChangeRequestModalProps) {
  const isOpen = Boolean(requestId);
  const pathname = usePathname();
  const isCurrentPODetail =
    Boolean(pathname?.startsWith("/procurement/purchase-order/")) &&
    !pathname?.endsWith("/edit");
  const readonly = workspaceReadOnly();
  const currentUser = useAuthStore((state) => state.user);
  const can = useAuthStore((state) => state.canPermission);
  const { data: usersData } = useGetAllUsersApi({ params: { limit: 100 } });

  const { data: detail, isLoading, error } = usePoChangeRequestDetail(requestId, {
    enabled: isOpen,
  });

  // Backend integration: Fresh quantity eligibility revalidation & complete revision history
  const { data: eligibilityData } = usePoChangeEligibility(detail?.purchaseOrderId, {
    enabled: Boolean(detail?.purchaseOrderId),
  });

  const { data: revisionsData } = usePoRevisions(detail?.purchaseOrderId, {
    enabled: Boolean(detail?.purchaseOrderId),
  });

  const staleLines = useMemo(() => {
    if (!detail || !eligibilityData?.lineItems) return [];
    return detail.comparison.lineItems.filter((item) => {
      const elig = eligibilityData.lineItems.find(
        (el) => el.purchaseOrderLineItemId === item.purchaseOrderLineItemId
      );
      return elig && Number(item.quantity) > Number(elig.eligibleQuantity);
    });
  }, [detail, eligibilityData]);

  const hasStaleLines = staleLines.length > 0;

  const mutation = useDecidePoChangeRequest();

  const [reason, setReason] = useState("");
  const [justification, setJustification] = useState("");
  const [policyError, setPolicyError] = useState<{
    message: string;
    violations?: ProcurementPolicyViolation[];
  } | null>(null);

  const hardBlocks = useMemo(
    () => (policyError?.violations || []).filter((v) => v.resolution === "BLOCK"),
    [policyError]
  );
  const softWarnings = useMemo(
    () => (policyError?.violations || []).filter((v) => v.resolution !== "BLOCK"),
    [policyError]
  );
  const hasHardBlock = hardBlocks.length > 0;
  const hasSoftWarnings = !hasHardBlock && softWarnings.length > 0;

  const violatingItemNames = useMemo(() => {
    const names = new Set<string>();
    for (const v of policyError?.violations || []) {
      for (const li of v.lineItems || []) {
        if (li.lineItemName) {
          names.add(String(li.lineItemName).toLowerCase().trim());
        }
      }
    }
    return names;
  }, [policyError]);

  const resetForm = () => {
    setReason("");
    setJustification("");
    setPolicyError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleApprove = () => {
    if (!detail) return;
    if (hasHardBlock) {
      toast.error(
        "Cannot approve: This proposal exceeds spend control policy limits. Return for correction or reject."
      );
      return;
    }
    if (hasSoftWarnings && !justification.trim()) {
      toast.error(
        "Spend policy warning: Please provide a justification before approving."
      );
      return;
    }
    setPolicyError(null);
    mutation.mutate(
      {
        detail,
        action: "approve",
        reason,
        spendProgramJustification: justification,
        spendProgramWarningsAccepted: hasSoftWarnings ? true : undefined,
      },
      {
        onError: (err: any) => {
          if (isProcurementPolicyViolationError(err)) {
            const violations = getProcurementPolicyViolations(err);
            setPolicyError({
              message: extractApiErrorMessage(err),
              violations: violations.length > 0 ? violations : undefined,
            });
          } else {
            toast.error(extractApiErrorMessage(err));
          }
        },
      }
    );
  };

  const canApproveOrReject = can("procurement.purchase_order.approval_decision");
  const canCancel = can("procurement.purchase_order.cancel");

  // Lifecycle & Workflow distinction:
  // Initial Price Negotiation: PO issued but not yet acknowledged.
  // PO Amendment: PO acknowledged or in fulfillment (partial delivery/backorder repricing).
  const isAmendment = Boolean(
    poAcknowledgedAt ||
      [
        "acknowledged",
        "ready_for_delivery",
        "partially_delivered",
        "delivered",
      ].includes(poStatus || "") ||
      (detail && detail.basisRevision > 1) ||
      (detail?.comparison.lineItems.some((l) => (l.pricing?.length || 0) > 1))
  );

  const isPoClosedOrCancelled = [
    "closed",
    "cancelled",
  ].includes(poStatus || "");

  const isActionableStatus =
    detail &&
    ["pending_review", "approved_pending_issue"].includes(detail.status);

  // Decision actions are permitted for both initial price negotiations and post-acknowledgment amendments,
  // provided the purchase order has not been permanently closed/cancelled and the request is awaiting buyer action.
  const canTakeAction =
    isActionableStatus &&
    !isPoClosedOrCancelled &&
    !readonly &&
    (canApproveOrReject || canCancel);

  const formatMoney = (val: string | number, curr?: string) => {
    return formatCurrency(val, curr || detail?.comparison.currency || "NGN");
  };

  const resolveActorName = (entry: { actorType: string; actorId?: string | null }) => {
    if (entry.actorType === "vendor") {
      return vendorName ? `${vendorName} (Vendor)` : "Vendor (Supplier)";
    }
    if (entry.actorType === "user") {
      if (
        entry.actorId &&
        (entry.actorId === currentUser?.userId || entry.actorId === (currentUser as any)?.id)
      ) {
        const name = `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim();
        return name ? `${name} (Buyer)` : "You (Buyer)";
      }
      const matchedUser = (usersData?.data || []).find(
        (u: any) => u.userId === entry.actorId || u.id === entry.actorId
      );
      if (matchedUser) {
        const name = `${matchedUser.firstName || ""} ${matchedUser.lastName || ""}`.trim();
        return name ? `${name} (Buyer)` : "Authorized Buyer";
      }
      return "Authorized Buyer";
    }
    return entry.actorType.replaceAll("_", " ");
  };

  const diffNum = Number(detail?.comparison.difference || 0);
  const isPriceIncrease = diffNum > 0;
  const isPriceDecrease = diffNum < 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="w-full sm:max-w-4xl lg:max-w-5xl rounded-[16px] p-0 gap-0 overflow-hidden flex flex-col max-h-[88vh] bg-[#fafafa] border border-border shadow-2xl"
        showCloseButton={true}
      >
        {/* Modal Header */}
        <DialogHeader className="px-6 py-4 bg-white border-b border-border/80 shrink-0 pr-12">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-lg font-bold text-[#0b100e]">
                  {isAmendment ? "PO Price Amendment Request" : "Price Change Request"}
                </DialogTitle>
                {detail && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f0faf8] text-[#087f70] border border-[#c8ece4]">
                    Version {detail.version}
                  </span>
                )}
                {isAmendment && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]">
                    Amendment
                  </span>
                )}
              </div>
              <p className="text-xs text-[#68726d] mt-1">
                {detail?.status === "applied"
                  ? `Approved & Applied to Purchase Order as Revision ${(detail.basisRevision ?? 1) + 1}`
                  : detail?.basisRevision !== undefined
                  ? `Based on Purchase Order Revision ${detail.basisRevision}`
                  : "Review vendor proposed revisions"}
              </p>
            </div>
            {detail && <StatusBadge status={detail.status} />}
          </div>
        </DialogHeader>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-[#68726d]">
              <Loader2 className="w-8 h-8 animate-spin text-[#087f70] mb-3" />
              <p className="text-sm">Loading price change request details...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Failed to load request details</p>
                <p className="text-xs mt-0.5">
                  {(error as Error)?.message || "Please refresh and try again."}
                </p>
              </div>
            </div>
          )}

          {detail && (
            <>
              {/* Contextual Lifecycle Status Banners */}
              {readonly && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Workspace is in read-only scope. Select an active legal entity to approve, reject, or return this change.
                  </span>
                </div>
              )}

              {isAmendment && isActionableStatus && (
                <div className="p-3.5 rounded-xl bg-[#f0f6ff] border border-[#bfdbfe] text-[#1e40af] text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 shrink-0 text-[#1d4ed8] mt-0.5" />
                  <div className="space-y-0.5 leading-relaxed">
                    <p className="font-semibold text-[#1d4ed8]">
                      Post-Acknowledgment Amendment: Repricing Outstanding Quantity
                    </p>
                    <p className="text-[#334155]">
                      The vendor has acknowledged this order. This amendment proposal adjusts the unit price of <strong>outstanding / backordered units only</strong>. Quantities already delivered and accepted retain their original contract price.
                    </p>
                  </div>
                </div>
              )}

              {hasStaleLines && isActionableStatus && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-900">
                      Stale Proposal Detected (Quantities Have Changed)
                    </p>
                    <p className="text-amber-800 leading-relaxed">
                      Additional deliveries were confirmed received after this proposal was submitted. Under procurement financial controls, proposals cannot be approved when requested quantities exceed remaining eligible unfulfilled balances. Please <strong>Return for Correction</strong> so the vendor can adjust the affected quantity.
                    </p>
                  </div>
                </div>
              )}

              {isPoClosedOrCancelled && (
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-gray-500 mt-0.5" />
                  <div>
                    <span className="font-semibold">Immutable Commercial Record: </span>
                    This purchase order is {poStatus}. Historical terms and amendment records are view-only.
                  </div>
                </div>
              )}

              {detail.status === "applied" && (
                <div className="p-3.5 rounded-xl bg-[#f0faf8] border border-[#c8ece4] text-[#087f70] text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Approved & Applied: </span>
                    Revised unit prices have been issued and are currently effective on this purchase order.
                  </div>
                </div>
              )}

              {detail.status === "returned_for_correction" && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                  <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Awaiting Vendor Revision: </span>
                    This proposal was returned to the vendor for correction. The buyer review will resume when the vendor resubmits.
                  </div>
                </div>
              )}

              {detail.status === "rejected" && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Proposal Rejected: </span>
                    This price revision proposal was rejected. Original purchase order pricing remains unchanged.
                  </div>
                </div>
              )}

              {/* Summary Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-xl bg-white border border-border shadow-xs">
                  <p className="text-[11px] font-medium text-[#68726d] uppercase tracking-wider">
                    Previous Total
                  </p>
                  <p className="text-lg font-bold text-[#0b100e] mt-1.5">
                    {formatMoney(
                      detail.comparison.previousTotal,
                      detail.comparison.currency
                    )}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-border shadow-xs">
                  <p className="text-[11px] font-medium text-[#68726d] uppercase tracking-wider">
                    Proposed Total
                  </p>
                  <p className="text-lg font-bold text-[#087f70] mt-1.5">
                    {formatMoney(
                      detail.comparison.totalAmount,
                      detail.comparison.currency
                    )}
                  </p>
                </div>

                <div
                  className={`p-4 rounded-xl border shadow-xs ${
                    isPriceIncrease
                      ? "bg-amber-50/60 border-amber-200"
                      : isPriceDecrease
                      ? "bg-emerald-50/60 border-emerald-200"
                      : "bg-white border-border"
                  }`}
                >
                  <p className="text-[11px] font-medium text-[#68726d] uppercase tracking-wider">
                    Net Variance
                  </p>
                  <p
                    className={`text-lg font-bold mt-1.5 ${
                      isPriceIncrease
                        ? "text-amber-800"
                        : isPriceDecrease
                        ? "text-emerald-700"
                        : "text-[#0b100e]"
                    }`}
                  >
                    {isPriceIncrease ? "+" : ""}
                    {formatMoney(
                      detail.comparison.difference,
                      detail.comparison.currency
                    )}
                  </p>
                </div>
              </div>

              {/* Vendor Justification */}
              <div className="p-4.5 rounded-xl bg-white border border-border shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[#0b100e] uppercase tracking-wider">
                    Vendor Proposal Reason
                  </h4>
                  {detail.expiresAt && (
                    <span className="text-[11px] text-[#68726d]">
                      Valid until: {format(new Date(detail.expiresAt), "MMM dd, yyyy")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#374151] whitespace-pre-wrap leading-relaxed">
                  {detail.proposal.reason || "No reason provided."}
                </p>

                {/* Supporting Documents */}
                {detail.proposal.supportingDocuments?.length > 0 && (
                  <div className="pt-2.5 border-t border-border/60">
                    <p className="text-xs font-medium text-[#68726d] mb-1.5">
                      Supporting Documents:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {detail.proposal.supportingDocuments.map((doc, idx) => (
                        <a
                          key={idx}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#f5f7f6] hover:bg-[#e7f6f2] text-[#087f70] transition-colors border border-black/[0.06]"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#087f70]" />
                          <span>{doc.name || "Attachment"}</span>
                          <ExternalLink className="w-3 h-3 text-[#68726d]" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Line Items Comparison Table (Now with ample width, no ugly horizontal scrollbar) */}
              <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/70 flex items-center justify-between bg-[#fafafa]">
                  <h4 className="text-xs font-semibold text-[#0b100e] uppercase tracking-wider">
                    Line Item Price Comparison
                  </h4>
                  <span className="text-xs text-[#68726d] font-medium">
                    {detail.comparison.lineItems.length} affected item(s)
                  </span>
                </div>
                <div className="w-full">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-[#f9faf9] text-[#68726d]">
                        <th className="px-5 py-3 font-medium">Item & Scope</th>
                        <th className="px-3 py-3 font-medium text-center">
                          {isAmendment ? "Outstanding Qty" : "Affected Qty"}
                        </th>
                        <th className="px-4 py-3 font-medium text-right">Previous Price</th>
                        <th className="px-4 py-3 font-medium text-right">Proposed Price</th>
                        <th className="px-5 py-3 font-medium text-right">Difference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {detail.comparison.lineItems.map((line) => {
                        const oldPrice = Number(line.previousAmount) / Number(line.quantity || 1);
                        const newPrice = Number(line.proposedUnitPrice || 0);
                        const lineDiff = Number(line.proposedAmount) - Number(line.previousAmount);
                        const isViolatingLine = violatingItemNames.has(line.name.toLowerCase().trim());

                        return (
                          <tr
                            key={line.purchaseOrderLineItemId}
                            className={`transition-colors ${
                              isViolatingLine
                                ? "bg-red-50/60 hover:bg-red-50/80 border-l-4 border-l-red-500"
                                : "hover:bg-black/[0.01]"
                            }`}
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-sm text-[#0b100e]">{line.name}</p>
                                {isViolatingLine && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                                    <AlertCircle className="w-3 h-3 text-red-600" />
                                    Exceeds Spend Control
                                  </span>
                                )}
                              </div>
                              {line.eligibleQuantity && (
                                <p className="text-[11px] text-[#68726d] mt-0.5">
                                  Eligible outstanding: {line.eligibleQuantity}
                                </p>
                              )}
                              {/* Pricing schedule if multi-segment */}
                              {line.pricing && line.pricing.length > 1 && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-[9px] font-semibold text-[#68726d] uppercase tracking-wider">
                                    Segmented Schedule:
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {line.pricing.map((seg, sIdx) => {
                                      const segQty = Math.max(0, Number(seg.to) - Number(seg.from));
                                      const isAmended = seg.revision > (detail.basisRevision ?? 1);
                                      return (
                                        <span
                                          key={sIdx}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                                            isAmended
                                              ? "bg-[#e7f6f2] text-[#087f70] border-[#c8ece4]"
                                              : "bg-[#f5f7f6] text-[#4b5563] border-black/[0.06]"
                                          }`}
                                        >
                                          <span>{segQty} × {formatMoney(seg.unitPrice, detail.comparison.currency)}</span>
                                          <span className="text-[9px] opacity-75">
                                            (Rev {seg.revision} {isAmended ? (detail.status === "applied" ? "Applied" : "Proposed") : "Accepted"})
                                          </span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3.5 text-center font-medium text-[#0b100e] text-sm">
                              {line.quantity}
                            </td>
                            <td className="px-4 py-3.5 text-right text-[#68726d]">
                              <div className="font-medium text-xs text-[#374151]">
                                {formatMoney(line.proposedUnitPrice ? oldPrice : line.previousAmount, detail.comparison.currency)}
                              </div>
                              <div className="text-[10px] text-[#9ca3af] mt-0.5">
                                Total: {formatMoney(line.previousAmount, detail.comparison.currency)}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="font-semibold text-xs text-[#087f70]">
                                {formatMoney(line.proposedUnitPrice, detail.comparison.currency)}
                              </div>
                              <div className="text-[10px] text-[#087f70] mt-0.5">
                                Total: {formatMoney(line.proposedAmount, detail.comparison.currency)}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-right font-semibold text-xs">
                              <span
                                className={
                                  lineDiff > 0
                                    ? "text-amber-700"
                                    : lineDiff < 0
                                    ? "text-emerald-700"
                                    : "text-[#68726d]"
                                }
                              >
                                {lineDiff > 0 ? "+" : ""}
                                {formatMoney(lineDiff, detail.comparison.currency)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Spend Controls & Policy Evaluation */}
              {detail.policyEvaluation && (
                <div className="p-4.5 rounded-xl bg-white border border-border shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-[#0b100e] uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#087f70]" />
                      Purchasing Controls & Policy
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        detail.policyEvaluation.resolution === "ALLOW"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : detail.policyEvaluation.resolution === "WARN"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {detail.policyEvaluation.resolution}
                    </span>
                  </div>

                  {detail.policyEvaluation.violations &&
                  detail.policyEvaluation.violations.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {detail.policyEvaluation.violations.map((v, i) => (
                        <div
                          key={i}
                          className="text-xs text-amber-800 bg-amber-50/70 p-2 rounded-lg border border-amber-100 flex items-start gap-1.5"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{v.message}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#68726d]">
                      All company purchasing policy and spend program checks passed.
                    </p>
                  )}
                  <p className="text-[11px] text-[#68726d] pt-1.5 border-t border-border/50">
                    <strong>V1 Procurement Constraints:</strong> Taxes follow effective PO tax rates. Contract-level validation and budget ledger checks are unavailable in V1. Buyer counterpricing is outside current scope.
                  </p>
                </div>
              )}

              {/* Action Decision Form (Strict Lifecycle & Permission Gated) */}
              {canTakeAction ? (
                <div className="p-4.5 rounded-xl bg-white border border-[#c8ece4] shadow-xs space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-[#0b100e] uppercase tracking-wider">
                      Commercial Decision
                    </h4>
                    <p className="text-xs text-[#68726d] mt-0.5">
                      Review proposal notes and record justification for audit compliance.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-[#374151]">
                          Decision Note / Reason{" "}
                          <span className="text-[#68726d] font-normal">
                            (Required for rejection or return)
                          </span>
                        </label>
                        {hasHardBlock && !reason.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              const firstMsg =
                                hardBlocks[0]?.message || policyError?.message || "";
                              setReason(
                                `Exceeds spend control limit: ${firstMsg}. Please revise pricing before resubmitting.`
                              );
                            }}
                            className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline cursor-pointer"
                          >
                            Use policy error as note
                          </button>
                        )}
                      </div>
                      <textarea
                        placeholder="Provide reasoning for approval, rejection, or instructions for correction..."
                        value={reason}
                        onChange={(e) => {
                          setReason(e.target.value);
                          if (policyError && !hasHardBlock && !hasSoftWarnings) {
                            setPolicyError(null);
                          }
                        }}
                        className="w-full text-xs min-h-[75px] rounded-lg border border-black/[0.12] p-2.5 text-[#0b100e] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#087f70] transition-colors resize-none"
                        maxLength={4000}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-[#374151]">
                          Spend Policy Justification{" "}
                          {hasHardBlock ? (
                            <span className="text-red-600 font-semibold">
                              (Not applicable for Hard Blocks)
                            </span>
                          ) : hasSoftWarnings ? (
                            <span className="text-amber-700 font-semibold">
                              (Required to approve exception)
                            </span>
                          ) : (
                            <span className="text-[#68726d] font-normal">
                              (Optional)
                            </span>
                          )}
                        </label>
                      </div>
                      <textarea
                        placeholder={
                          hasHardBlock
                            ? "Spend policy hard blocks cannot be bypassed with a justification. Return for correction or reject the proposal."
                            : hasSoftWarnings
                            ? "Explain the business reason / exception for exceeding spend policy limits to approve..."
                            : "Optional policy justification or commercial exception note..."
                        }
                        value={justification}
                        disabled={hasHardBlock}
                        onChange={(e) => {
                          setJustification(e.target.value);
                          if (policyError && !hasHardBlock) setPolicyError(null);
                        }}
                        className={`w-full text-xs min-h-[75px] rounded-lg border p-2.5 text-[#0b100e] placeholder:text-[#9ca3af] transition-colors resize-none ${
                          hasHardBlock
                            ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed"
                            : hasSoftWarnings
                            ? "border-amber-400 bg-amber-50/20 focus:border-amber-600 focus:outline-none"
                            : "border-black/[0.12] focus:border-[#087f70] focus:outline-none"
                        }`}
                        maxLength={4000}
                      />
                    </div>
                  </div>

                  {/* Spend Control Policy Error / Hard Block Banner */}
                  {hasHardBlock && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-3">
                      <div className="flex items-start gap-2.5">
                        <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-red-900 text-sm">
                              Spend Control Policy Hard Block
                            </p>
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold tracking-wide uppercase border border-red-200">
                              Hard Block
                            </span>
                          </div>
                          <p className="text-red-800 leading-relaxed font-medium">
                            {policyError?.message}
                          </p>

                          <div className="space-y-1.5 pt-1">
                            {hardBlocks.map((v, i) => (
                              <div
                                key={i}
                                className="text-xs bg-white/90 p-2.5 rounded-lg border border-red-200/80 space-y-1"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-red-950">
                                    {v.policyName || "Spend Program"}
                                  </span>
                                  <span className="text-[11px] font-medium text-red-700">
                                    • {v.rule}
                                  </span>
                                </div>
                                <p className="text-red-900">{v.message}</p>
                                {v.details && (
                                  <div className="flex items-center gap-3 text-[11px] text-red-700 pt-0.5 font-medium">
                                    <span>
                                      Proposed: {v.details.currency}{" "}
                                      {v.details.actualAmount?.toLocaleString()}
                                    </span>
                                    <span>
                                      Limit: {v.details.thresholdCurrency}{" "}
                                      {v.details.threshold?.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-red-200/60">
                            <p className="text-red-700 text-[11px]">
                              Approval is blocked. <strong>Return for Correction</strong> to ask the vendor to adjust prices within limits, or <strong>Reject</strong> the proposal.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const firstMsg =
                                  hardBlocks[0]?.message || policyError?.message || "";
                                setReason(
                                  `Exceeds spend control limit: ${firstMsg}. Please revise pricing before resubmitting.`
                                );
                              }}
                              className="text-[11px] font-semibold text-red-800 hover:text-red-950 underline self-start sm:self-auto cursor-pointer"
                            >
                              Copy reason into Return note
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Spend Control Policy Warning / Soft Exception Banner */}
                  {hasSoftWarnings && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-3">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-amber-900 text-sm">
                              Spend Policy Warning — Exception Justification Required
                            </p>
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold tracking-wide uppercase border border-amber-200">
                              Exception Allowed
                            </span>
                          </div>
                          <p className="text-amber-800 leading-relaxed">
                            {policyError?.message}
                          </p>

                          <div className="space-y-1.5 pt-1">
                            {softWarnings.map((v, i) => (
                              <div
                                key={i}
                                className="text-xs bg-white/90 p-2.5 rounded-lg border border-amber-200/80 space-y-1"
                              >
                                <span className="font-semibold text-amber-950">
                                  {v.policyName || "Spend Program"}: {v.rule}
                                </span>
                                <p className="text-amber-900">{v.message}</p>
                              </div>
                            ))}
                          </div>

                          <p className="text-[11px] text-amber-700 pt-1">
                            Provide a <strong>Spend Policy Justification</strong> above to record the commercial exception and proceed with approval.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fallback Generic Policy Error Banner */}
                  {policyError && !hasHardBlock && !hasSoftWarnings && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold text-red-900">
                            Spend Control Policy Restriction
                          </p>
                          <p className="text-red-800 leading-relaxed">
                            {policyError.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5 border-t border-border/50">
                    {/* Reject Proposal */}
                    {detail.status === "pending_review" && canApproveOrReject && (
                      <button
                        type="button"
                        disabled={mutation.isPending || !reason.trim()}
                        onClick={() =>
                          mutation.mutate({
                            detail,
                            action: "reject",
                            reason,
                          })
                        }
                        className="h-9 px-4 rounded-lg border border-red-300 bg-white hover:bg-red-50 text-[#d33d44] text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                      >
                        Reject Proposal
                      </button>
                    )}

                    {/* Return for Correction */}
                    {detail.status === "pending_review" && canApproveOrReject && (
                      <button
                        type="button"
                        disabled={mutation.isPending || !reason.trim()}
                        onClick={() =>
                          mutation.mutate({
                            detail,
                            action: "return",
                            reason,
                          })
                        }
                        className={`h-9 px-4 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer ${
                          hasHardBlock
                            ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                            : "border border-amber-300 bg-white hover:bg-amber-50 text-amber-800"
                        }`}
                      >
                        Return for Correction
                      </button>
                    )}

                    {/* Approve & Issue Revised PO */}
                    {canApproveOrReject && (
                      <button
                        type="button"
                        disabled={
                          mutation.isPending ||
                          hasStaleLines ||
                          hasHardBlock ||
                          (hasSoftWarnings && !justification.trim())
                        }
                        title={
                          hasHardBlock
                            ? "Cannot approve: Proposal exceeds hard spend control limits. Return for correction or reject."
                            : hasStaleLines
                            ? "Cannot approve: requested quantities exceed remaining eligible balance. Return for correction."
                            : hasSoftWarnings && !justification.trim()
                            ? "Provide a spend policy justification to approve this exception."
                            : undefined
                        }
                        onClick={handleApprove}
                        className="h-9 px-5 rounded-lg bg-[#087f70] hover:bg-[#076a5e] text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                      >
                        {mutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Approve & Issue Revised PO
                      </button>
                    )}

                    {/* Cancel Approved Change */}
                    {detail.status === "approved_pending_issue" && canCancel && (
                      <button
                        type="button"
                        disabled={mutation.isPending || !reason.trim()}
                        onClick={() =>
                          mutation.mutate({
                            detail,
                            action: "cancel",
                            reason,
                          })
                        }
                        className="h-9 px-4 rounded-lg border border-red-300 bg-white hover:bg-red-50 text-[#d33d44] text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                      >
                        Cancel Approved Change
                      </button>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Revision Schedule & Audit History (2-column layout in desktop dialog) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Submission and Decision History Timeline */}
                {detail.history && detail.history.length > 0 && (
                  <div className="p-4 rounded-xl bg-white border border-border shadow-xs space-y-3">
                    <h4 className="text-xs font-semibold text-[#0b100e] uppercase tracking-wider flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[#68726d]" />
                      Audit & Decision History
                    </h4>
                    <div className="space-y-3 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-border/60">
                      {detail.history.map((entry, i) => (
                        <div key={i} className="relative pl-6 text-xs space-y-0.5">
                          <div className="absolute left-1 top-1 w-2.5 h-2.5 rounded-full bg-[#087f70] border-2 border-white" />
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#0b100e] capitalize">
                              Version {entry.version} · {entry.action.replaceAll("_", " ")}
                            </span>
                            <span className="text-[10px] text-[#68726d]">
                              {format(new Date(entry.at), "MMM dd, yyyy HH:mm")}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#0b100e] font-medium">
                            Actor: <span className="text-[#374151] font-normal">{resolveActorName(entry)}</span>
                          </p>
                          {entry.policyEvaluation && (
                            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Policy: {entry.policyEvaluation.resolution}
                              </span>
                              {entry.policyEvaluation.message && (
                                <span className="text-[#68726d] text-[10px]">{entry.policyEvaluation.message}</span>
                              )}
                            </div>
                          )}
                          {entry.reason && (
                            <div className="mt-1 p-2 rounded bg-[#f5f7f6] text-[#374151] whitespace-pre-wrap text-[11px]">
                              {entry.reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Historical PO Revisions Log (Consumes Backend Revisions Endpoint) */}
                {revisionsData && revisionsData.length > 0 && (
                  <div className="p-4 rounded-xl bg-white border border-border shadow-xs space-y-3">
                    <h4 className="text-xs font-semibold text-[#0b100e] uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#087f70]" />
                      Purchase Order Revision Schedule
                    </h4>
                    <div className="divide-y divide-border/60">
                      {revisionsData.map((rev, rIdx) => {
                        const revNum = rev.revisionNumber ?? (rev as any).revision ?? (rev as any).version ?? (rIdx + 1);
                        const rawRevTotal = rev.totalAmount ?? (rev as any).total ?? (rev as any).revisedTotal ?? (rev as any).amount;
                        const revTotal =
                          rawRevTotal !== undefined && rawRevTotal !== null && Number(rawRevTotal) > 0
                            ? rawRevTotal
                            : revNum === 1
                            ? detail?.comparison.previousTotal ?? 0
                            : detail?.comparison.totalAmount ?? 0;
                        const revCurr = rev.currency || detail?.comparison.currency || "NGN";

                        return (
                          <div
                            key={revNum}
                            className="py-2.5 first:pt-0 last:pb-0 text-xs flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#0b100e]">
                                  Revision {revNum}
                                </span>
                                {revNum === 1 ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                                    Initial Commitment
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e7f6f2] text-[#087f70]">
                                    Approved Amendment
                                  </span>
                                )}
                              </div>
                              {rev.effectiveAt && (
                                <p className="text-[10px] text-[#68726d] mt-0.5">
                                  Effective: {format(new Date(rev.effectiveAt), "MMM dd, yyyy")}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-[#0b100e]">
                                {formatMoney(revTotal, revCurr)}
                              </span>
                              {rev.changeReason && (
                                <p className="text-[10px] text-[#68726d] truncate max-w-[180px]">
                                  {rev.changeReason}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-border flex items-center justify-between shrink-0">
          {!isCurrentPODetail && detail?.purchaseOrderId ? (
            <Link
              href={`/procurement/purchase-order/${detail.purchaseOrderId}?from=po-change-requests`}
              onClick={() => {
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("poReturnUrl", "/procurement/po-change-requests");
                }
              }}
              className="text-xs font-semibold text-[#087f70] hover:underline flex items-center gap-1"
            >
              <span>View Full Purchase Order</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={handleClose}
            className="h-9 px-4 rounded-lg border border-black/[0.12] bg-white text-[#0b100e] text-xs font-semibold hover:bg-black/[0.03] transition-colors"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export both names for backwards compatibility
export const PoChangeRequestDrawer = PoChangeRequestModal;
