"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight, AlertCircle, Clock3, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { usePurchaseOrder, useConfirmPOReceipt } from "@/queries/procurement/purchase-orders";
import ConfirmReceiptModal from "@/components/procurement/modals/ConfirmReceiptModal";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateStr));
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

function FulfillmentHistoryCard({ notice, index, canReceive, onReceive, purchaseOrderLineItems, outstandingAfterReceiptByFulfillmentLineId }: { notice: any; index: number; canReceive: boolean; onReceive: () => void; purchaseOrderLineItems: any[]; outstandingAfterReceiptByFulfillmentLineId: Map<string, number>; }) {
  const [expanded, setExpanded] = useState(false);
  const isDigital = notice.fulfillmentMethod === "digital";
  const titlePrefix = isDigital ? "Digital Delivery" : "Shipment";
  const canReceiveThisFulfillment =
    canReceive &&
    notice.dispatchStatus === "dispatched" &&
    (notice.lineItems || []).some((item: any) => Number(item.quantityAwaitingReceipt || 0) > 0);

  return (
    <div className="bg-white rounded-[14px] border border-black/[0.06] overflow-hidden">
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
          </p>
        </div>
        <div className="flex items-center gap-4">
          {notice.dispatchStatus && notice.dispatchStatus !== "not_applicable" && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
              notice.dispatchStatus === "dispatched" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600"
            }`}>
              {notice.dispatchStatus === "dispatched" ? "Dispatched" : "Pending Dispatch"}
            </span>
          )}
          {canReceiveThisFulfillment && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReceive();
              }}
              className="h-8 px-4 rounded-md bg-[#087f70] text-white text-xs font-semibold hover:bg-[#076a5e] transition-colors whitespace-nowrap"
            >
              Receive {isDigital ? "Delivery" : "Shipment"}
            </button>
          )}
          {expanded ? <ChevronDown className="w-5 h-5 text-[#89918d]" /> : <ChevronRight className="w-5 h-5 text-[#89918d]" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-black/[0.06]">
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
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-[#68726d] whitespace-nowrap">Included Qty</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-[#68726d] whitespace-nowrap">Received in Shipment</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-[#68726d] whitespace-nowrap">Awaiting Receipt</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-[#68726d] whitespace-nowrap">PO Outstanding After Receipt</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-[#68726d] whitespace-nowrap">Remaining Disposition</th>
                </tr>
              </thead>
              <tbody>
                {(notice.lineItems || []).map((item: any, i: number) => {
                  const poLineItem = purchaseOrderLineItems.find(
                    (lineItem: any) => lineItem.purchaseOrderLineItemId === item.purchaseOrderLineItemId,
                  );
                  const orderedQuantity = Number(poLineItem?.quantity ?? item.quantityOrdered ?? item.quantity ?? 0);
                  const outstandingAfterReceipt = outstandingAfterReceiptByFulfillmentLineId.get(
                    item.vendorDeliveryNoticeLineItemId,
                  );
                  const remainingQty = Math.max(0, orderedQuantity - (item.quantityReady || 0));
                  return (
                  <tr key={i} className="border-b border-black/[0.04] last:border-b-0">
                    <td className="px-5 py-3 font-medium text-[#111815]">{item.name || "Item"}</td>
                    <td className="px-5 py-3 text-[#111815]">{item.quantityReady || 0} included</td>
                    <td className="px-5 py-3 text-[#111815]">{item.quantityReceived || 0}</td>
                    <td className="px-5 py-3 text-[#111815]">{item.quantityAwaitingReceipt || 0}</td>
                    <td className="px-5 py-3 text-[#111815]">
                      {outstandingAfterReceipt === undefined ? (
                        "—"
                      ) : (
                        <div>
                          <p className="font-medium">{outstandingAfterReceipt} remaining</p>
                          <p className="text-[11px] text-[#89918d]">of {orderedQuantity} ordered</p>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        {item.remainingDisposition === "cannot_fulfill" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium whitespace-nowrap">
                            <AlertCircle className="w-3.5 h-3.5" /> {remainingQty} Cannot Fulfill
                          </span>
                        ) : item.remainingDisposition === "backordered" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium whitespace-nowrap">
                            <Clock3 className="w-3.5 h-3.5" /> {remainingQty} Backordered (exp. {formatDate(item.expectedReadyDate).split(",")[0]})
                          </span>
                        ) : notice.declaration === "full" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#f0faf8] text-[#087f70] text-xs font-medium whitespace-nowrap">
                            Fully Fulfilled
                          </span>
                        ) : (
                          <span className="text-[#68726d]">—</span>
                        )}
                        {item.dispositionReason && (
                          <p className="text-[11px] text-[#89918d] italic truncate max-w-[200px]" title={item.dispositionReason}>
                            Reason: {item.dispositionReason}
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


function ConfirmationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const receiptMut = useConfirmPOReceipt(id);
  const [activeNotice, setActiveNotice] = useState<any>(null);

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
  const canReceive = po.status === "ready_for_delivery" || po.status === "partially_delivered";
  const fulfillmentHistory = [...(po.deliveryNotices || [])].sort(
    (left: any, right: any) =>
      new Date(left.readyAt || left.shippedAt).getTime() -
      new Date(right.readyAt || right.shippedAt).getTime(),
  );
  const outstandingAfterReceiptByFulfillmentLineId = new Map<string, number>();
  const outstandingByPurchaseOrderLineId = new Map<string, number>(
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
      if (outstandingBeforeReceipt === undefined) continue;

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
  }

  const stage = (po.status || "").toLowerCase();
  const isDelivered = stage === "partially_delivered" || stage === "delivered";

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
        ? po.deliveryNotices.map((notice: any, idx: number) => ({
            label: `Shipment #${idx + 1} Ready`,
            person: getPerson(timelineByAction["ready_for_delivery"], po.vendor ? (po.vendor.displayName || po.vendor.legalName) : "Vendor"),
            badge: notice.declaration === "full" ? "Full Delivery" : "Partial Delivery",
            badgeColor: notice.declaration === "full" ? "text-[#087f70] bg-[#f0faf8]" : "text-amber-600 bg-amber-50",
            timestamp: notice.readyAt,
            done: true,
            pending: false,
          }))
        : [
            {
              label: "Delivery Status",
              person: getPerson(timelineByAction["partially_delivered"] || timelineByAction["delivered"] || timelineByAction["ready_for_delivery"], isDelivered ? "Vendor" : undefined),
              badge: stage === "partially_delivered" || timelineByAction["partially_delivered"] ? "Partial" : stage === "delivered" || timelineByAction["delivered"] ? "Full Delivery" : timelineByAction["ready_for_delivery"] ? "Ready for Delivery" : undefined,
              badgeColor: stage === "partially_delivered" || timelineByAction["partially_delivered"] ? "text-amber-600 bg-amber-50" : "text-[#087f70] bg-[#f0faf8]",
              timestamp: timelineByAction["delivered"]?.timestamp || timelineByAction["partially_delivered"]?.timestamp || timelineByAction["ready_for_delivery"]?.timestamp || po.deliveredAt,
              done: !!timelineByAction["delivered"] || !!timelineByAction["partially_delivered"] || isDelivered,
              pending: stage === "acknowledged" || stage === "ready_for_delivery",
            }
          ]
      ),
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

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-3 sm:-m-5 min-h-0 bg-transparent">
      {/* Header - Transparent with exact original padding */}
      <div className="shrink-0 pt-9 sm:pt-11 px-9 sm:px-11 pb-6">
        <div className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#0b100e]">{po.poNumber || "Purchase Order"}</h1>
              <div className="flex items-center gap-2">
                {(() => {
                  if (po.fulfillmentState === "fully_ready") {
                    return (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f0faf8] text-[#087f70]">
                        Fully Fulfilled
                      </span>
                    );
                  }
                  if (po.fulfillmentState === "partial") {
                    return (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
                        Partially Fulfilled
                      </span>
                    );
                  }
                  return (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      po.status === "delivered" ? "bg-[#f0faf8] text-[#087f70]" : "bg-blue-50 text-blue-600"
                    }`}>
                      {po.status?.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) || "Pending"}
                    </span>
                  );
                })()}
              </div>
            </div>
            <p className="text-sm text-[#68726d] mt-1.5">{po.vendor?.legalName || po.vendor?.displayName || "Vendor"}</p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-9 sm:px-11 pb-9 sm:pb-11">
        <div className="max-w-6xl mx-auto w-full flex flex-col">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Left Column */}
            <div className="flex-1 flex flex-col min-w-0 space-y-6">
              
              {/* Main Order Line Items */}
              <div className="bg-white rounded-[14px] border border-black/[0.06] overflow-hidden">
                <div className="px-6 py-5 border-b border-black/[0.06]">
                  <h2 className="text-base font-semibold text-[#0b100e]">Order Items</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/[0.06] bg-[#f9faf9]">
                    <th className="px-6 py-3 text-left font-semibold text-[#68726d] whitespace-nowrap">Item</th>
                    <th className="px-6 py-3 text-left font-semibold text-[#68726d] whitespace-nowrap">Description</th>
                    <th className="px-6 py-3 text-left font-semibold text-[#68726d] whitespace-nowrap">Quantity</th>
                    <th className="px-6 py-3 text-left font-semibold text-[#68726d] whitespace-nowrap">Fulfillment</th>
                    <th className="px-6 py-3 text-right font-semibold text-[#68726d] whitespace-nowrap">Unit Price</th>
                    <th className="px-6 py-3 text-right font-semibold text-[#68726d] whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(po.lineItems || []).map((item: any, i: number) => {
                    const noticeItemWithDisp = (po.deliveryNotices || [])
                      .flatMap((n: any) => n.lineItems || [])
                      .filter((li: any) => li.purchaseOrderLineItemId === item.purchaseOrderLineItemId && li.remainingDisposition)
                      .pop();
                    
                    const isFullyReady = item.quantityReady >= item.quantity;
                    const disp = isFullyReady ? null : (item.remainingDisposition || noticeItemWithDisp?.remainingDisposition);
                    const expDate = isFullyReady ? null : (item.expectedReadyDate || noticeItemWithDisp?.expectedReadyDate);
                    const dispReason = isFullyReady ? null : (item.dispositionReason || noticeItemWithDisp?.dispositionReason);
                    const remainingQty = Math.max(0, (item.quantity || 0) - (item.quantityReady || 0));
                    
                    return (
                      <tr key={i} className="border-b border-black/[0.04] last:border-b-0 hover:bg-[#fcfcfc] transition-colors">
                        <td className="px-6 py-4 font-medium text-[#111815] min-w-[120px]">{item.name}</td>
                        <td className="px-6 py-4 text-[#68726d] max-w-[200px] truncate" title={item.description}>{item.description || "—"}</td>
                        <td className="px-6 py-4 text-[#111815]">{item.quantity}</td>
                        <td className="px-6 py-4 min-w-[150px]">
                          <div className="flex flex-col gap-1.5 items-start">
                            <span className="text-[#111815] font-medium">{item.quantityReady || 0} / {item.quantity} Ready</span>
                            {disp === "cannot_fulfill" && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-600 whitespace-nowrap">
                                <AlertCircle className="w-3 h-3 mr-1" /> {remainingQty} Cannot Fulfill
                              </span>
                            )}
                            {disp === "backordered" && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-600 whitespace-nowrap">
                                <Clock3 className="w-3 h-3 mr-1" /> {remainingQty} Backordered (exp. {formatDate(expDate).split(",")[0]})
                              </span>
                            )}
                            {!disp && item.quantityReady >= item.quantity && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#f0faf8] text-[#087f70] whitespace-nowrap">
                                Fully Fulfilled
                              </span>
                            )}
                            {!disp && item.quantityReady > 0 && item.quantityReady < item.quantity && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 whitespace-nowrap">
                                  Pending Remaining
                                </span>
                            )}
                            {(item.dispositionReason || dispReason) && (
                              <p className="text-[11px] text-[#89918d] italic truncate max-w-[200px]" title={item.dispositionReason || dispReason}>
                                Reason: {item.dispositionReason || dispReason}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-[#111815]">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-6 py-4 text-right font-medium text-[#111815]">{formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}</td>
                      </tr>
                    );
                  })}
                  {(!po.lineItems || po.lineItems.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-[#89918d]">
                        No line items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fulfillment History Section */}
          {(po.deliveryNotices && po.deliveryNotices.length > 0) && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-[#0b100e]">Shipment History</h2>
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
                <div className="px-5 py-4 space-y-0 pt-1 pl-1">
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
              toast.success("Delivery receipt confirmed.");
              setActiveNotice(null);
            } catch (err: any) {
              toast.error(err.response?.data?.message || "Failed to confirm receipt");
            }
          }}
          isPending={receiptMut.isPending}
          lineItems={activeNotice.lineItems || []}
        />
      )}
    </div>
  );
}

export default withPermissions(ConfirmationDetailPage, [
  { resource: "procurement.purchase_order", action: "read_own" },
  { resource: "procurement.purchase_order", action: "read_department" },
  { resource: "procurement.purchase_order", action: "read_company" },
]);
