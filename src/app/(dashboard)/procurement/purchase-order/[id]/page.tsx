"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, X, Loader2, ArrowLeft } from "lucide-react";
import { 
  usePurchaseOrder, 
  useIssuePurchaseOrder, 
  useClosePurchaseOrder, 
  useCancelPurchaseOrder 
} from "@/queries/procurement/purchase-orders";
import { format } from "date-fns";
import { toast } from "sonner";

type WFStage = "draft" | "ready_to_issue" | "issued" | "acknowledge" | "ready_for_delivery" | "partially_delivered" | "delivered" | "closed" | "cancelled";

function WorkflowStep({ label, person, badge, badgeColor, timestamp, done, pending }: {
  label: string; person?: string; badge?: string; badgeColor?: string; timestamp?: string | null; done?: boolean; pending?: boolean;
}) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex flex-col items-center">
        <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 ${
          done ? "border-primary bg-primary" : pending ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-white"
        }`} />
      </div>
      <div className="pb-4">
        <p className={`text-xs font-semibold ${!done && !pending ? "text-gray-400" : "text-foreground"}`}>{label}</p>
        {person && (
          <p className={`text-xs mt-0.5 ${!done && !pending ? "text-gray-300" : "text-muted-foreground"}`}>
            {person}
            {badge && (
              <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${badgeColor}`}>{badge}</span>
            )}
          </p>
        )}
        {timestamp && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{format(new Date(timestamp), "MMM dd, yyyy - hh:mm a")}</p>}
      </div>
    </div>
  );
}

const formatCurrency = (amount: string | number, currency: string = "NGN") => {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(Number(amount));
};

export default function PODetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [modal, setModal] = useState<"approve" | "reject" | "withdraw" | "close" | null>(null);

  const { data, isLoading, isError } = usePurchaseOrder(id);
  const po = data?.data;

  const issueMut = useIssuePurchaseOrder();
  const closeMut = useClosePurchaseOrder();
  const cancelMut = useCancelPurchaseOrder();

  const handleAction = async () => {
    if (!modal) return;
    try {
      if (modal === "approve") {
        await issueMut.mutateAsync(id);
        toast.success("Purchase order issued successfully.");
      } else if (modal === "close") {
        await closeMut.mutateAsync(id);
        toast.success("Purchase order closed successfully.");
      } else if (modal === "withdraw" || modal === "reject") {
        await cancelMut.mutateAsync(id);
        toast.success(`Purchase order ${modal === "withdraw" ? "withdrawn" : "rejected"} successfully.`);
      }
      setModal(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "An action error occurred.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !po) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Failed to load purchase order details.</p>
        <button onClick={() => router.back()} className="mt-4 text-primary font-medium hover:underline">
          Go back
        </button>
      </div>
    );
  }

  // Helper flags
  const stage = po.status as WFStage;
  const isDelivered = stage === "partially_delivered" || stage === "delivered";
  
  const submitDateStr = po.createdAt ? format(new Date(po.createdAt), "MMM dd, yyyy") : "N/A";
  
  // Dynamic steps mapping based on payload tracking fields
  const workflowSteps = [
    { 
      label: "Created", 
      person: po.createdBy ? `${(po.createdBy as any).firstName || ""} ${(po.createdBy as any).lastName || ""}`.trim() || "System" : "System", 
      timestamp: po.createdAt as string | null, 
      done: true 
    },
    {
      label: "Issued to Vendor",
      person: po.vendor ? (po.vendor.displayName || po.vendor.legalName) : "Vendor",
      badge: po.issuedAt ? "Issued" : undefined,
      badgeColor: "text-emerald-600 bg-emerald-50",
      timestamp: po.issuedAt,
      done: !!po.issuedAt,
      pending: stage === "ready_to_issue"
    },
    {
      label: "Vendor Acknowledged",
      person: po.vendor ? (po.vendor.displayName || po.vendor.legalName) : "Vendor",
      badge: po.acknowledgedAt ? "Acknowledged" : undefined,
      badgeColor: "text-blue-600 bg-blue-50",
      timestamp: po.acknowledgedAt,
      done: !!po.acknowledgedAt,
      pending: stage === "issued"
    },
    {
      label: "Delivery Status",
      person: isDelivered ? "Vendor" : undefined,
      badge: stage === "partially_delivered" ? "Partial" : stage === "delivered" ? "Full Delivery" : undefined,
      badgeColor: stage === "partially_delivered" ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50",
      timestamp: po.deliveredAt,
      done: isDelivered,
      pending: stage === "acknowledge" || stage === "ready_for_delivery"
    },
    {
      label: "Closed",
      person: po.closedAt ? "System" : undefined,
      badge: po.closedAt ? "Closed" : undefined,
      badgeColor: "text-gray-600 bg-gray-100",
      timestamp: po.closedAt as string | null,
      done: !!po.closedAt,
      pending: stage === "delivered"
    }
  ];

  return (
    <>
      {modal === "approve" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-base font-bold text-foreground">Issue Purchase Order</h3>
              <p className="text-sm text-muted-foreground">
                You are about to issue this PO to <strong>{po.vendor?.displayName || po.vendor?.legalName || "Vendor"}</strong>.
              </p>
            </div>
            <button 
              onClick={handleAction}
              disabled={issueMut.isPending}
              className="w-full h-11 rounded-xl bg-primary flex items-center justify-center text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              {issueMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Issue"}
            </button>
          </div>
        </div>
      )}

      {(modal === "reject" || modal === "withdraw" || modal === "close") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-base font-bold">
              {modal === "close" ? "Close PO" : modal === "withdraw" ? "Withdraw PO" : "Reject PO"}
            </h3>
            <p className="text-sm text-muted-foreground">Are you sure you want to proceed?</p>
            <button 
              onClick={handleAction}
              disabled={closeMut.isPending || cancelMut.isPending}
              className="w-full h-11 rounded-xl bg-red-500 flex items-center justify-center text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              {closeMut.isPending || cancelMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
            </button>
          </div>
        </div>
      )}

      {/* Layout Spacer */}


      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left */}
        <div className="flex-1 space-y-4 w-full">
          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-foreground">{po.poNumber || "Unnamed PO"}</h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  stage === "draft" ? "bg-gray-100 text-gray-600" :
                  isDelivered ? "bg-emerald-50 text-emerald-600" :
                  "bg-purple-50 text-purple-600"
                }`}>
                  {stage.replace(/_/g, " ").toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Created on {submitDateStr}</p>
            </div>
            <div className="flex items-center gap-3">
              {stage === "ready_to_issue" && (
                <>
                  <button onClick={() => setModal("close")}
                    className="h-9 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted/40 transition-colors">
                    Close
                  </button>
                  <button onClick={() => setModal("approve")}
                    className="h-9 px-5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                    Issue PO
                  </button>
                </>
              )}
              {stage === "issued" && (
                <button onClick={() => setModal("withdraw")}
                  className="h-9 px-4 rounded-lg border border-red-400 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
                  Withdraw
                </button>
              )}
            </div>
          </div>

          {/* PO Details */}
          <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
            <h2 className="text-base font-semibold text-foreground">PO Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Requester</p>
                <p className="text-sm font-semibold text-foreground">{po.requesterName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Department</p>
                <p className="text-sm font-semibold text-foreground">{po.departmentName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Vendor</p>
                <p className="text-sm font-semibold text-foreground">{po.vendor?.displayName || po.vendor?.legalName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Priority</p>
                <span className="text-sm font-semibold text-amber-500 capitalize">{po.priority || "Medium"}</span>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Line Items <span className="text-muted-foreground font-normal ml-1">{po.lineItems?.length || 0}</span></h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    <th className="px-6 py-3 text-left font-semibold text-foreground">Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-foreground">Category</th>
                    <th className="px-6 py-3 text-center font-semibold text-foreground">Qty</th>
                    <th className="px-6 py-3 text-right font-semibold text-foreground">Unit Price</th>
                    <th className="px-6 py-3 text-right font-semibold text-foreground">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {po.lineItems?.length ? po.lineItems.map((item: any) => (
                    <tr key={item.purchaseOrderLineItemId} className="border-b border-border/40">
                      <td className="px-6 py-4">
                         <p className="font-semibold text-foreground">{item.name}</p>
                         {item.description ? <p className="text-xs text-muted-foreground">{item.description as string}</p> : null}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {(item.category as any)?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-center">{Number(item.quantity)}</td>
                      <td className="px-6 py-4 text-right">{formatCurrency(item.unitPrice, po.currency)}</td>
                      <td className="px-6 py-4 text-right text-foreground font-medium">{formatCurrency(item.subtotal as string, po.currency as string)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No line items attached</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-border/40 bg-muted/5">
              <div className="flex items-center gap-8">
                <span className="text-sm font-semibold text-primary">Total Amount</span>
                <span className="text-lg font-bold text-foreground">{formatCurrency(po.totalAmount as string, po.currency as string)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Workflow */}
        <div className="w-full lg:w-72 shrink-0 bg-white rounded-2xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-5">Workflow Progress</h3>
          <div className="space-y-0">
            {workflowSteps.map((s, i) => (
              <WorkflowStep key={i} {...s} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
