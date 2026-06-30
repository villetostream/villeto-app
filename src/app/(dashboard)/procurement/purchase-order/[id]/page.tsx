"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, X, Loader2, XCircle, PackageCheck, Pencil } from "lucide-react";
import {
  usePurchaseOrder,
  useIssuePurchaseOrder,
  useClosePurchaseOrder,
  useCancelPurchaseOrder,
  useSubmitPurchaseOrderForApproval,
  usePurchaseOrderApprovalDecision,
  useConfirmPOReceipt,
  type ConfirmReceiptPayload,
} from "@/queries/procurement/purchase-orders";
import { useAuthStore } from "@/stores/auth-stores";
import { getPOStatusLabel } from "@/lib/constants/purchase-order-status";
import {
  canPOApprove,
  canPOCancel,
  canPOClose,
  canPOIssue,
  canPOReceive,
  canPOSubmit,
  canPOUpdateDraft,
  buildPOEditUrl,
  buildPOListUrl,
} from "@/lib/permissions/purchase-order-permissions";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type WFStage =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "ready_to_issue"
  | "issued"
  | "acknowledge"
  | "acknowledged"
  | "ready_for_delivery"
  | "partially_delivered"
  | "delivered"
  | "closed"
  | "cancelled";

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatCurrency = (amount: string | number, currency: string = "NGN") =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(Number(amount));

function safeFmt(date: string | null | undefined) {
  if (!date) return null;
  try { return format(new Date(date), "MMM dd, yyyy - hh:mm a"); } catch { return null; }
}

// ── Workflow Step ─────────────────────────────────────────────────────────────

type WorkflowStepType = {
  label: string; person?: string; badge?: string; badgeColor?: string;
  timestamp?: string | null; done?: boolean; pending?: boolean;
};

function WorkflowProgress({ steps }: { steps: WorkflowStepType[] }) {
  return (
    <div className="space-y-0 pt-1 pl-1">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const status = step.done ? "done" : step.pending ? "pending" : "inactive";
        return (
          <div key={idx} className={`flex items-start gap-3 ${status === "inactive" ? "opacity-45" : ""}`}>
            {/* Icon + connector */}
            <div className="flex flex-col items-center shrink-0 pt-0.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                status === "done"
                  ? "bg-primary/10"
                  : "bg-muted border border-border"
              }`}>
                {status === "done"
                  ? <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  : <div className={`w-1.5 h-1.5 rounded-full ${status === "pending" ? "bg-amber-400" : "bg-muted-foreground/40"}`} />
                }
              </div>
              {!isLast && (
                <div className="w-px bg-border/60 flex-1 min-h-[16px] mt-0.5" />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 min-w-0 ${isLast ? "pb-0" : ""}`}>
              <p className={`text-xs font-medium ${status === "done" ? "text-muted-foreground" : "text-muted-foreground/60"}`}>{step.label}</p>
              {step.person && (
                <p className={`text-sm font-semibold flex items-center gap-1.5 flex-wrap mt-0.5 ${status === "done" || status === "pending" ? "text-foreground" : "text-muted-foreground/60"}`}>
                  {step.person}
                  {step.badge && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${step.badgeColor}`}>
                      {step.badge}
                    </span>
                  )}
                </p>
              )}
              {!step.person && step.badge && (
                <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${step.badgeColor}`}>
                  {step.badge}
                </span>
              )}
              {step.timestamp && (
                <p className="text-xs text-muted-foreground mt-0.5">{safeFmt(step.timestamp)}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Reject Modal ──────────────────────────────────────────────────────────────

function RejectModal({
  open, onClose, onConfirm, isPending,
}: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void; isPending: boolean; }) {
  const [reason, setReason] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Reject Purchase Order</h3>
            <p className="text-sm text-muted-foreground mt-0.5">A reason is required so the creator can take action.</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Reason <span className="text-red-500">*</span></label>
          <textarea
            value={reason} onChange={e => setReason(e.target.value)}
            placeholder="e.g. Vendor not yet approved for this category…" rows={4}
            className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-400 transition-all"
          />
          {reason.trim().length > 0 && reason.trim().length < 10 && (
            <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> At least 10 characters required.</p>
          )}
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors">Cancel</button>
          <button
            onClick={() => reason.trim().length >= 10 && onConfirm(reason.trim())}
            disabled={reason.trim().length < 10 || isPending}
            className="flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Rejection"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Receipt Modal ─────────────────────────────────────────────────────

function ConfirmReceiptModal({
  open, onClose, onConfirm, isPending, lineItems,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: ConfirmReceiptPayload) => void;
  isPending: boolean;
  lineItems: any[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [receivedAt, setReceivedAt] = useState(today);
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries((lineItems || []).map((li: any) => [li.purchaseOrderLineItemId, li.quantity ?? 1]))
  );

  if (!open) return null;

  const handleSubmit = () => {
    onConfirm({
      receivedAt: new Date(receivedAt).toISOString(),
      notes: notes || undefined,
      lineItems: lineItems.map((li: any) => ({
        purchaseOrderLineItemId: li.purchaseOrderLineItemId,
        name: li.name,
        quantityReceived: quantities[li.purchaseOrderLineItemId] ?? li.quantity,
        notes: undefined,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <PackageCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Confirm Delivery Receipt</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Enter the quantities received for each line item.</p>
          </div>
        </div>

        {/* Received At */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Date Received <span className="text-red-500">*</span></label>
          <input
            type="date" value={receivedAt} onChange={e => setReceivedAt(e.target.value)}
            className="w-full h-9 rounded-lg border border-border px-3 text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Line Items */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Line Items</p>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/20 border-b border-border/60">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Item</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Ordered</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">Received</th>
                </tr>
              </thead>
              <tbody>
                {(lineItems || []).map((li: any) => (
                  <tr key={li.purchaseOrderLineItemId} className="border-b border-border/40 last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{li.name}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{li.quantity}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number" min={0} max={li.quantity}
                        value={quantities[li.purchaseOrderLineItemId] ?? li.quantity}
                        onChange={e => setQuantities(prev => ({
                          ...prev,
                          [li.purchaseOrderLineItemId]: Math.min(li.quantity, Math.max(0, Number(e.target.value))),
                        }))}
                        className="w-20 h-8 text-center rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors mx-auto block"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Any notes about the delivery…" rows={3}
            className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:border-primary transition-all"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors">Cancel</button>
          <button
            onClick={handleSubmit} disabled={!receivedAt || isPending}
            className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Receipt"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Simple Confirm Modal ──────────────────────────────────────────────────────

function ConfirmModal({
  open, onClose, onConfirm, isPending,
  title, description, confirmLabel, variant,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void; isPending: boolean;
  title: string; description: string; confirmLabel: string;
  variant: "danger" | "primary" | "success";
}) {
  if (!open) return null;
  const variantCls = {
    danger:  "bg-red-500 hover:bg-red-600",
    primary: "bg-primary hover:opacity-90",
    success: "bg-emerald-600 hover:bg-emerald-700",
  }[variant];
  const iconBg = {
    danger:  "bg-red-50",
    primary: "bg-amber-50",
    success: "bg-emerald-50",
  }[variant];
  const iconCls = {
    danger:  "text-red-500",
    primary: "text-amber-500",
    success: "text-emerald-600",
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={`w-14 h-14 rounded-full ${iconBg} flex items-center justify-center`}>
            <AlertCircle className={`w-7 h-7 ${iconCls}`} />
          </div>
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors">Cancel</button>
          <button
            onClick={onConfirm} disabled={isPending}
            className={`flex-1 h-10 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${variantCls}`}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Detail Page ──────────────────────────────────────────────────────────

export default function PODetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = useParams() as { id: string };
  const can    = useAuthStore(s => s.can);
  const user   = useAuthStore(s => s.user);

  const outerTab = searchParams.get("outerTab") || "own";
  const innerTab = searchParams.get("innerTab") || undefined;
  const isOwnScope = outerTab === "own";
  const listUrl = buildPOListUrl(outerTab, innerTab);

  // Permission flags
  const canSubmitPO   = canPOSubmit(can);
  const canApprovePO  = canPOApprove(can);
  const canIssuePO    = canPOIssue(can);
  const canClosePO    = canPOClose(can);
  const canCancelPO   = canPOCancel(can);
  const canReceivePO  = canPOReceive(can);
  const canUpdateDraft = canPOUpdateDraft(can);

  type ModalType = "submit" | "issue" | "close" | "cancel" | "withdraw" | "approve" | "reject" | "receipt" | null;
  const [modal, setModal] = useState<ModalType>(null);

  const { data, isLoading, isError } = usePurchaseOrder(id);
  const po = data?.data;

  const submitMut   = useSubmitPurchaseOrderForApproval(id);
  const issueMut    = useIssuePurchaseOrder();
  const closeMut    = useClosePurchaseOrder();
  const cancelMut   = useCancelPurchaseOrder();
  const approvalMut = usePurchaseOrderApprovalDecision();
  const receiptMut  = useConfirmPOReceipt(id);

  const isPending = submitMut.isPending || issueMut.isPending || closeMut.isPending ||
    cancelMut.isPending || approvalMut.isPending || receiptMut.isPending;

  const displayExpertError = (err: any, defaultFallback: string) => {
    const msg = err?.response?.data?.message || "";
    if (msg.includes("vendor_not_active")) {
      toast.error("Vendor is Inactive", {
        description: "This purchase order cannot be processed because the assigned vendor is currently inactive or pending approval.",
        duration: 5000,
      });
    } else {
      toast.error(msg || defaultFallback);
    }
  };

  const handleSimpleAction = async (type: "submit" | "issue" | "close" | "cancel" | "withdraw" | "approve") => {
    try {
      if (type === "submit")  { await submitMut.mutateAsync();    toast.success("Purchase order submitted for approval."); }
      if (type === "issue")   { await issueMut.mutateAsync(id);   toast.success("Purchase order issued to vendor."); }
      if (type === "close")   { await closeMut.mutateAsync(id);   toast.success("Purchase order closed."); }
      if (type === "cancel")  { await cancelMut.mutateAsync(id);  toast.success("Purchase order cancelled."); }
      if (type === "withdraw") { await cancelMut.mutateAsync(id); toast.success("Purchase order withdrawn."); }
      if (type === "approve") {
        await approvalMut.mutateAsync({ id, payload: { decision: "approved" } });
        await issueMut.mutateAsync(id);
        toast.success("Purchase order approved and issued.");
      }
      setModal(null);
      router.push(listUrl);
    } catch (err: any) {
      displayExpertError(err, "Action failed. Please try again.");
    }
  };

  const handleReject = async (reason: string) => {
    try {
      await approvalMut.mutateAsync({ id, payload: { decision: "rejected", reason } });
      toast.success("Purchase order rejected.");
      setModal(null);
      router.push(listUrl);
    } catch (err: any) {
      displayExpertError(err, "Failed to reject purchase order.");
    }
  };

  const handleReceipt = async (payload: ConfirmReceiptPayload) => {
    try {
      await receiptMut.mutateAsync(payload);
      toast.success("Delivery receipt confirmed.");
      setModal(null);
    } catch (err: any) {
      displayExpertError(err, "Failed to confirm receipt.");
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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <EmptyState
          title="Purchase order not found"
          description="This purchase order may have been removed or you may not have access to view it."
        />
        <button onClick={() => router.push(listUrl)} className="text-primary font-medium hover:underline">
          Back to purchase orders
        </button>
      </div>
    );
  }

  const createdById = typeof po.createdBy === "object" && po.createdBy
    ? (po.createdBy as { userId?: string }).userId
    : undefined;
  const isOwnPO = !!user?.userId && !!createdById && user.userId === createdById;
  const isSubmitterView = isOwnScope || isOwnPO;
  const stage = po.status as WFStage;
  const isDelivered = stage === "partially_delivered" || stage === "delivered";
  const submitDateStr = po.createdAt ? format(new Date(po.createdAt), "MMM dd, yyyy") : "N/A";

  // Workflow steps — updated to reflect draft→submitted→approved chain
  const workflowSteps = [
    {
      label: "Created",
      person: po.createdBy ? `${(po.createdBy as any).firstName || ""} ${(po.createdBy as any).lastName || ""}`.trim() || "System" : "System",
      timestamp: po.createdAt as string | null,
      done: true,
    },
    {
      label: "Submitted for Approval",
      person: undefined,
      badge: stage === "pending_approval" ? "Awaiting" : (stage !== "draft" ? "Submitted" : undefined),
      badgeColor: stage === "pending_approval" ? "text-orange-600 bg-orange-50" : "text-emerald-600 bg-emerald-50",
      timestamp: (po as any).submittedAt ?? null,
      done: stage !== "draft",
      pending: stage === "draft",
    },
    {
      label: "Approved",
      person: undefined,
      badge: stage === "approved" || stage === "ready_to_issue" || stage === "issued" || stage === "acknowledged" ||
             stage === "ready_for_delivery" || isDelivered || stage === "closed" ? "Approved" : undefined,
      badgeColor: "text-emerald-600 bg-emerald-50",
      timestamp: (po as any).approvedAt ?? null,
      done: stage === "approved" || stage === "ready_to_issue" || stage === "issued" || stage === "acknowledged" ||
            stage === "ready_for_delivery" || isDelivered || stage === "closed",
      pending: stage === "pending_approval",
    },
    {
      label: "Issued to Vendor",
      person: po.vendor ? (po.vendor.displayName || po.vendor.legalName) : "Vendor",
      badge: po.issuedAt ? "Issued" : undefined,
      badgeColor: "text-emerald-600 bg-emerald-50",
      timestamp: po.issuedAt,
      done: !!po.issuedAt,
      pending: stage === "ready_to_issue",
    },
    {
      label: "Vendor Acknowledged",
      person: po.vendor ? (po.vendor.displayName || po.vendor.legalName) : "Vendor",
      badge: po.acknowledgedAt ? "Acknowledged" : undefined,
      badgeColor: "text-blue-600 bg-blue-50",
      timestamp: po.acknowledgedAt,
      done: !!po.acknowledgedAt,
      pending: stage === "issued",
    },
    {
      label: "Delivery Status",
      person: isDelivered ? "Vendor" : undefined,
      badge: stage === "partially_delivered" ? "Partial" : stage === "delivered" ? "Full Delivery" : undefined,
      badgeColor: stage === "partially_delivered" ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50",
      timestamp: po.deliveredAt,
      done: isDelivered,
      pending: stage === "acknowledge" || stage === "ready_for_delivery",
    },
    {
      label: "Closed",
      person: po.closedAt ? "System" : undefined,
      badge: po.closedAt ? "Closed" : undefined,
      badgeColor: "text-gray-600 bg-gray-100",
      timestamp: po.closedAt as string | null,
      done: !!po.closedAt,
      pending: stage === "delivered",
    },
  ];

  // Derive which action buttons to show
  const showEditDraft = stage === "draft" && isSubmitterView && canUpdateDraft;
  const showSubmit  = stage === "draft" && isSubmitterView && canSubmitPO;
  const showApprove = stage === "pending_approval" && !isSubmitterView && canApprovePO;
  const showReject  = stage === "pending_approval" && !isSubmitterView && canApprovePO;
  const showIssue   = (stage === "ready_to_issue" || stage === "approved") && canIssuePO;
  const postApprovalStages: WFStage[] = [
    "approved",
    "ready_to_issue",
    "issued",
    "acknowledge",
    "acknowledged",
    "ready_for_delivery",
    "partially_delivered",
    "delivered",
  ];
  /** Withdraw (cancel endpoint) — submitter only, while pending approval */
  const showWithdraw = stage === "pending_approval" && isSubmitterView && canCancelPO;
  /** Neutral cancel for drafts (cancel endpoint) */
  const showCancelDraft = stage === "draft" && isSubmitterView && canCancelPO && !showSubmit;
  /** Close (close endpoint) — after approval, any time until already closed/cancelled */
  const showClose = postApprovalStages.includes(stage) && canClosePO;
  const showReceipt = (stage === "ready_for_delivery" || stage === "delivered") && canReceivePO;
  const statusLabel = getPOStatusLabel(stage, isSubmitterView);

  return (
    <>
      {/* Modals */}
      <ConfirmModal
        open={modal === "submit"}
        onClose={() => setModal(null)}
        onConfirm={() => handleSimpleAction("submit")}
        isPending={submitMut.isPending}
        title="Submit for Approval"
        description="This PO will be sent for approval. You will not be able to edit it afterwards."
        confirmLabel="Submit"
        variant="primary"
      />
      <ConfirmModal
        open={modal === "approve"}
        onClose={() => setModal(null)}
        onConfirm={() => handleSimpleAction("approve")}
        isPending={approvalMut.isPending || issueMut.isPending}
        title="Approve and Issue Purchase Order"
        description={`You are approving this purchase order for ${po.vendor?.displayName || po.vendor?.legalName || "the vendor"}. Once approved, the vendor will receive the order and can begin delivery and invoice against it.`}
        confirmLabel="Approve and Issue PO"
        variant="primary"
      />
      <ConfirmModal
        open={modal === "issue"}
        onClose={() => setModal(null)}
        onConfirm={() => handleSimpleAction("issue")}
        isPending={issueMut.isPending}
        title="Issue Purchase Order"
        description={`You are about to issue this PO to ${po.vendor?.displayName || po.vendor?.legalName || "Vendor"}.`}
        confirmLabel="Confirm & Issue"
        variant="primary"
      />
      <ConfirmModal
        open={modal === "close"}
        onClose={() => setModal(null)}
        onConfirm={() => handleSimpleAction("close")}
        isPending={closeMut.isPending}
        title="Close Purchase Order"
        description="This will mark the PO as closed. This action cannot be undone."
        confirmLabel="Close PO"
        variant="danger"
      />
      <ConfirmModal
        open={modal === "cancel"}
        onClose={() => setModal(null)}
        onConfirm={() => handleSimpleAction("cancel")}
        isPending={cancelMut.isPending}
        title="Withdraw Purchase Order"
        description="Are you sure you want to withdraw this purchase order?"
        confirmLabel="Withdraw PO"
        variant="danger"
      />
      <ConfirmModal
        open={modal === "withdraw"}
        onClose={() => setModal(null)}
        onConfirm={() => handleSimpleAction("withdraw")}
        isPending={cancelMut.isPending}
        title="Withdraw Purchase Order"
        description="This will withdraw the purchase order before approval. This action cannot be undone."
        confirmLabel="Withdraw PO"
        variant="danger"
      />
      <RejectModal
        open={modal === "reject"}
        onClose={() => setModal(null)}
        onConfirm={handleReject}
        isPending={approvalMut.isPending}
      />
      <ConfirmReceiptModal
        open={modal === "receipt"}
        onClose={() => setModal(null)}
        onConfirm={handleReceipt}
        isPending={receiptMut.isPending}
        lineItems={po.lineItems || []}
      />

      {/* Layout */}
      <div className="flex flex-col flex-1 min-h-0 h-full">
        {/* Header - Full width */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-4 shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground">{po.poNumber || "Unnamed PO"}</h1>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                stage === "draft"            ? "bg-gray-100 text-gray-600" :
                stage === "pending_approval" ? "bg-orange-50 text-orange-600" :
                stage === "cancelled"        ? "bg-red-50 text-red-600" :
                isDelivered                  ? "bg-emerald-50 text-emerald-600" :
                                               "bg-purple-50 text-purple-600"
              }`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Created on {submitDateStr}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
            {showEditDraft && (
              <button
                onClick={() => router.push(buildPOEditUrl(id, outerTab, innerTab))}
                className="h-9 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted/40 transition-colors flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" /> Edit Draft
              </button>
            )}
            {showWithdraw && (
              <button onClick={() => setModal("withdraw")} className="h-9 px-4 rounded-lg border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
                Withdraw PO
              </button>
            )}
            {showCancelDraft && (
              <button onClick={() => setModal("cancel")} className="h-9 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted/40 transition-colors">
                Withdraw
              </button>
            )}
            {showSubmit && (
              <>
                <button onClick={() => setModal("cancel")} className="h-9 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted/40 transition-colors">
                  Withdraw
                </button>
                <button onClick={() => setModal("submit")} className="h-9 px-5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                  Submit for Approval
                </button>
              </>
            )}
            {showReject && (
              <button onClick={() => setModal("reject")} className="h-9 px-4 rounded-lg border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
                Reject PO
              </button>
            )}
            {showApprove && (
              <button onClick={() => setModal("approve")} className="h-9 px-5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
                Approve PO
              </button>
            )}
            {showIssue && (
              <button onClick={() => setModal("issue")} className="h-9 px-5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                Issue PO
              </button>
            )}
            {showReceipt && (
              <button onClick={() => setModal("receipt")} className="h-9 px-5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2">
                <PackageCheck className="w-4 h-4" /> Confirm Receipt
              </button>
            )}
            {showClose && (
              <button onClick={() => setModal("close")} className="h-9 px-4 rounded-lg border border-red-300 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
                Close PO
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Content */}
        <div className="flex flex-1 gap-6 items-start min-h-0">
          {/* Left Column */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden space-y-4">

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
              {po.deliveryDate && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Expected Delivery</p>
                  <p className="text-sm font-semibold text-foreground">
                    {format(new Date(po.deliveryDate as string), "MMM dd, yyyy")}
                  </p>
                </div>
              )}
              {po.notes && (
                <div className="col-span-2 md:col-span-4">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-foreground">{po.notes as string}</p>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">
                Line Items <span className="text-muted-foreground font-normal ml-1">{po.lineItems?.length || 0}</span>
              </h2>
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
                      <td className="px-6 py-4 text-muted-foreground">{(item.category as any)?.name || "—"}</td>
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

        {/* Right Sidebar */}
        <div className="w-[300px] shrink-0 h-full overflow-y-auto pr-1 space-y-4 pb-4">
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            <div className="bg-[#1C2B36] rounded-t-2xl px-5 py-4">
              <h3 className="text-base font-bold text-white">Workflow Progress</h3>
            </div>
            <div className="px-5 py-4">
              <WorkflowProgress steps={workflowSteps} />
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
