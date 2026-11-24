"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  Clock,
  Eye,
  FileCheck2,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  usePoChangeRequests,
  PoChangeRequestSummary,
} from "@/queries/procurement/po-change-requests";
import { PoChangeRequestDrawer } from "@/components/procurement/PoChangeRequestDrawer";
import { formatCurrency } from "@/lib/utils/currency";

interface POPriceChangeBannerProps {
  purchaseOrderId: string;
  stage: string;
  poStatus?: string;
  poAcknowledgedAt?: string | null;
  vendorName?: string;
}

export function POPriceChangeBanner({
  purchaseOrderId,
  stage,
  poStatus,
  poAcknowledgedAt,
  vendorName,
}: POPriceChangeBannerProps) {
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Strictly avoid querying or rendering for draft POs
  const isEligibleStage = stage !== "draft";

  const { data: responseData, isLoading } = usePoChangeRequests(
    { purchaseOrderId, limit: 10 },
    { enabled: isEligibleStage && Boolean(purchaseOrderId), staleTime: 30_000 }
  );

  if (!isEligibleStage) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-black/[0.06] bg-[#f9faf9] p-4 sm:p-5 h-[76px] animate-pulse flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-black/[0.06]" />
          <div className="space-y-1.5">
            <div className="h-4 w-44 bg-black/[0.06] rounded" />
            <div className="h-3 w-64 bg-black/[0.04] rounded" />
          </div>
        </div>
        <div className="h-8 w-28 bg-black/[0.06] rounded-lg" />
      </div>
    );
  }

  const requests = responseData?.data || [];

  // If there are zero price change requests on this PO, show NOTHING!
  if (requests.length === 0) {
    return null;
  }

  // Find active or latest request
  const activeRequest = requests.find((r) =>
    ["pending_review", "approved_pending_issue", "returned_for_correction"].includes(
      r.status
    )
  );

  const displayRequest = activeRequest || requests[0];
  const diffVal = Number(displayRequest.difference || 0);
  const isIncrease = diffVal > 0;
  const isDecrease = diffVal < 0;

  const isAmendment = Boolean(
    poAcknowledgedAt ||
      [
        "acknowledged",
        "ready_for_delivery",
        "partially_delivered",
        "delivered",
      ].includes(poStatus || "") ||
      displayRequest.version > 1
  );

  return (
    <>
      <div
        className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${
          activeRequest
            ? isAmendment
              ? "bg-blue-50/40 border-blue-200"
              : "bg-amber-50/50 border-amber-200"
            : "bg-[#f9faf9] border-border"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                activeRequest
                  ? isAmendment
                    ? "bg-blue-100 text-[#1d4ed8]"
                    : "bg-amber-100 text-amber-800"
                  : "bg-white text-[#087f70] border border-black/[0.06]"
              }`}
            >
              {activeRequest ? (
                <SlidersHorizontal className="w-4 h-4" />
              ) : (
                <FileCheck2 className="w-4 h-4" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-[#0b100e]">
                  {activeRequest
                    ? isAmendment
                      ? "Vendor Proposed PO Price Amendment"
                      : "Vendor Proposed Price Revision"
                    : isAmendment
                    ? "PO Price Amendment History"
                    : "Price Revision History"}
                </h3>
                <StatusBadge status={displayRequest.status} />
                <span className="text-[11px] font-medium text-[#68726d]">
                  (Version {displayRequest.version})
                </span>
                {isAmendment && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]">
                    Outstanding Units
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#68726d] mt-1">
                <span>
                  Proposed Variance:{" "}
                  <strong
                    className={
                      isIncrease
                        ? "text-amber-800"
                        : isDecrease
                        ? "text-emerald-700"
                        : "text-[#0b100e]"
                    }
                  >
                    {isIncrease ? "+" : ""}
                    {formatCurrency(
                      displayRequest.difference,
                      displayRequest.currency
                    )}
                  </strong>
                </span>

                {displayRequest.expiresAt && activeRequest && (
                  <span>
                    Valid until:{" "}
                    <strong>
                      {format(new Date(displayRequest.expiresAt), "MMM dd, yyyy")}
                    </strong>
                  </span>
                )}

                {requests.length > 1 && (
                  <span className="text-[11px] text-[#68726d]">
                    · {requests.length} total request(s) on this PO
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => setSelectedRequestId(displayRequest.priceChangeRequestId)}
              className={
                activeRequest
                  ? "h-8 px-3.5 rounded-lg bg-[#087f70] hover:bg-[#076c5f] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                  : "h-8 px-3.5 rounded-lg border border-black/[0.12] bg-white hover:bg-black/[0.03] text-[#374151] text-xs font-semibold transition-colors flex items-center gap-1.5"
              }
            >
              {activeRequest
                ? isAmendment
                  ? "Review Amendment"
                  : "Review Proposal"
                : "View Revision Audit"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal review and audit */}
      <PoChangeRequestDrawer
        requestId={selectedRequestId}
        onClose={() => setSelectedRequestId(null)}
        poStatus={poStatus}
        poAcknowledgedAt={poAcknowledgedAt}
        vendorName={vendorName || displayRequest.vendorName || displayRequest.vendorLegalName}
      />
    </>
  );
}
