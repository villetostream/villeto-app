"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, X, Loader2, XCircle, PackageCheck, Pencil, Plus, Trash2 } from "lucide-react";
import {
  usePurchaseOrder,
  useIssuePurchaseOrder,
  useClosePurchaseOrder,
  useCancelPurchaseOrder,
  useSubmitPurchaseOrderForApproval,
  usePurchaseOrderApprovalDecision,
  useAddPOLineItems,
  useUpdatePOLineItem,
  useDeletePOLineItem,
  useDeletePurchaseOrder,
  useShortClosePOLine,
  useConfirmPOFinalBilling,
} from "@/queries/procurement/purchase-orders";
import withPermissions from "@/components/permissions/permission-protected-routes";
import LineItemBatchModal from "@/components/procurement/LineItemBatchModal";
import EditPOHeaderModal from "@/components/procurement/EditPOHeaderModal";
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
import { ManagerOverrideBanner } from "@/components/procurement/ManagerOverrideBanner";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type WFStage =
  | "draft"
  | "pending_approval"
  | "submitted"
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
                  ? "bg-[#f0faf8]"
                  : "bg-[#f5f7f6] border border-black/[0.06]"
              }`}>
                {status === "done"
                  ? <svg className="w-3 h-3 text-[#087f70]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  : <div className={`w-1.5 h-1.5 rounded-full ${status === "pending" ? "bg-amber-400" : "bg-muted-foreground/40"}`} />
                }
              </div>
              {!isLast && (
                <div className="w-px bg-border/60 flex-1 min-h-[16px] mt-0.5" />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 min-w-0 ${isLast ? "pb-0" : ""}`}>
              <p className={`text-xs font-medium ${status === "done" ? "text-[#68726d]" : "text-[#84908a]"}`}>{step.label}</p>
              {step.person && (
                <p className={`text-sm font-semibold flex items-center gap-1.5 flex-wrap mt-0.5 ${status === "done" || status === "pending" ? "text-[#0b100e]" : "text-[#84908a]"}`}>
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
                <p className="text-xs text-[#68726d] mt-0.5">{safeFmt(step.timestamp)}</p>
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
      <div className="relative bg-white rounded-[14px] shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f9faf9] transition-colors">
          <X className="w-4 h-4 text-[#68726d]" />
        </button>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-[#fff5f5] flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-[#d33d44]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0b100e]">Reject Purchase Order</h3>
            <p className="text-sm text-[#68726d] mt-0.5">A reason is required so the creator can take action.</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#0b100e]">Reason <span className="text-[#d33d44]">*</span></label>
          <textarea
            value={reason} onChange={e => setReason(e.target.value)}
            placeholder="e.g. Vendor not yet approved for this category…" rows={4}
            className="w-full rounded-[12px] border border-black/[0.06] px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-400 transition-all"
          />
          {reason.trim().length > 0 && reason.trim().length < 10 && (
            <p className="text-xs text-[#d33d44] flex items-center gap-1"><AlertCircle className="w-3 h-3" /> At least 10 characters required.</p>
          )}
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="px-6 h-10 rounded-[12px] border border-black/[0.06] text-sm font-medium hover:bg-[#f9faf9] transition-colors">Cancel</button>
          <button
            onClick={() => reason.trim().length >= 10 && onConfirm(reason.trim())}
            disabled={reason.trim().length < 10 || isPending}
            className="flex-1 h-10 rounded-[12px] bg-[#d33d44] text-white text-sm font-semibold hover:bg-[#b83038] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Rejection"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Withdraw Modal ────────────────────────────────────────────────────────────

function WithdrawModal({
  open, onClose, onConfirm, isPending,
}: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void; isPending: boolean; }) {
  const [reason, setReason] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[14px] shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f9faf9] transition-colors">
          <X className="w-4 h-4 text-[#68726d]" />
        </button>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-[#fff5f5] flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-[#d33d44]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0b100e]">Withdraw Purchase Order</h3>
            <p className="text-sm text-[#68726d] mt-0.5">Please provide a reason for withdrawing this PO.</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#0b100e]">Reason <span className="text-[#d33d44]">*</span></label>
          <textarea
            value={reason} onChange={e => setReason(e.target.value)}
            placeholder="e.g. Budget changed, alternative supplier found…" rows={4}
            className="w-full rounded-[12px] border border-black/[0.06] px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-400 transition-all"
          />
          {reason.trim().length > 0 && reason.trim().length < 10 && (
            <p className="text-xs text-[#d33d44] flex items-center gap-1"><AlertCircle className="w-3 h-3" /> At least 10 characters required.</p>
          )}
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="px-6 h-10 rounded-[12px] border border-black/[0.06] text-sm font-medium hover:bg-[#f9faf9] transition-colors">Cancel</button>
          <button
            onClick={() => reason.trim().length >= 10 && onConfirm(reason.trim())}
            disabled={reason.trim().length < 10 || isPending}
            className="flex-1 h-10 rounded-[12px] bg-[#d33d44] text-white text-sm font-semibold hover:bg-[#b83038] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Withdraw PO"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShortCloseModal({
  open, item, onClose, onConfirm, isPending,
}: { open: boolean; item: any; onClose: () => void; onConfirm: (quantity: number, reason: string) => void; isPending: boolean; }) {
  const remaining = Number(item?.quantityRemainingToReady || 0);
  const [quantity, setQuantity] = useState(remaining);
  const [reason, setReason] = useState("");
  if (!open || !item) return null;
  const isValid = quantity > 0 && quantity <= remaining && reason.trim().length >= 10;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[14px] shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f9faf9]"><X className="w-4 h-4 text-[#68726d]" /></button>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-[#fff5f5] flex items-center justify-center shrink-0"><AlertCircle className="w-5 h-5 text-[#d33d44]" /></div>
          <div><h3 className="text-base font-bold text-[#0b100e]">Short-close unavailable quantity</h3><p className="text-sm text-[#68726d] mt-0.5">This preserves the original order and removes only the approved unavailable balance from delivery and invoicing.</p></div>
        </div>
        <p className="text-sm text-[#0b100e]"><span className="font-semibold">{item.name}</span> — up to {remaining} units can be short-closed.</p>
        <div className="space-y-1.5"><label className="text-xs font-semibold text-[#0b100e]">Quantity to short-close</label><input type="number" min="0.01" max={remaining} step="0.01" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full rounded-[12px] border border-black/[0.06] px-3.5 py-2.5 text-sm" /></div>
        <div className="space-y-1.5"><label className="text-xs font-semibold text-[#0b100e]">Approval reason <span className="text-[#d33d44]">*</span></label><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Why is this quantity being short-closed?" className="w-full rounded-[12px] border border-black/[0.06] px-3.5 py-2.5 text-sm resize-none" /></div>
        <div className="flex gap-3 pt-1"><button onClick={onClose} className="px-6 h-10 rounded-[12px] border border-black/[0.06] text-sm font-medium">Cancel</button><button onClick={() => isValid && onConfirm(quantity, reason.trim())} disabled={!isValid || isPending} className="flex-1 h-10 rounded-[12px] bg-[#d33d44] text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">{isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve Short-close"}</button></div>
      </div>
    </div>
  );
}

function FinalBillingModal({ open, onClose, onConfirm, isPending }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void; isPending: boolean; }) {
  const [reason, setReason] = useState("");
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center"><div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} /><div className="relative bg-white rounded-[14px] shadow-2xl w-full max-w-md mx-4 p-6 space-y-5"><button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f9faf9]"><X className="w-4 h-4 text-[#68726d]" /></button><div><h3 className="text-base font-bold text-[#0b100e]">Confirm final billing</h3><p className="text-sm text-[#68726d] mt-1">Confirm that all invoices are resolved and no further vendor billing is expected. New vendor invoices will be blocked.</p></div><div className="space-y-1.5"><label className="text-xs font-semibold text-[#0b100e]">Confirmation note <span className="text-[#d33d44]">*</span></label><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="e.g. Final invoice paid; no further billing expected." className="w-full rounded-[12px] border border-black/[0.06] px-3.5 py-2.5 text-sm resize-none" /></div><div className="flex gap-3"><button onClick={onClose} className="px-6 h-10 rounded-[12px] border border-black/[0.06] text-sm font-medium">Cancel</button><button onClick={() => reason.trim().length >= 10 && onConfirm(reason.trim())} disabled={reason.trim().length < 10 || isPending} className="flex-1 h-10 rounded-[12px] bg-[#087f70] text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">{isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Billing Complete"}</button></div></div></div>;
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
    danger:  "bg-[#d33d44] hover:bg-[#b83038]",
    primary: "bg-[#087f70] hover:opacity-90",
    success: "bg-emerald-600 hover:bg-emerald-700",
  }[variant];
  const iconBg = {
    danger:  "bg-[#fff5f5]",
    primary: "bg-amber-50",
    success: "bg-[#f0faf8]",
  }[variant];
  const iconCls = {
    danger:  "text-[#d33d44]",
    primary: "text-amber-500",
    success: "text-[#087f70]",
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[14px] shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f9faf9] transition-colors">
          <X className="w-4 h-4 text-[#68726d]" />
        </button>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={`w-14 h-14 rounded-full ${iconBg} flex items-center justify-center`}>
            <AlertCircle className={`w-7 h-7 ${iconCls}`} />
          </div>
          <h3 className="text-base font-bold text-[#0b100e]">{title}</h3>
          <p className="text-sm text-[#68726d]">{description}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="px-6 h-10 rounded-[12px] border border-black/[0.06] text-sm font-medium hover:bg-[#f9faf9] transition-colors">Cancel</button>
          <button
            onClick={onConfirm} disabled={isPending}
            className={`flex-1 h-10 rounded-[12px] text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${variantCls}`}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Detail Page ──────────────────────────────────────────────────────────

function PODetailPage() {
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

  type ModalType = "submit" | "issue" | "close" | "cancel" | "withdraw" | "approve" | "reject" | "delete_draft" | "edit_header" | "line_items" | "delete_line_item" | "final_billing" | null;
  const [modal, setModal] = useState<ModalType>(null);
  const [editingLineItem, setEditingLineItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [shortCloseItem, setShortCloseItem] = useState<any>(null);
  const [overrideUnlocked, setOverrideUnlocked] = useState(false);

  const { data, isLoading, isFetching, isError } = usePurchaseOrder(id);
  // Use isFetching (not just isLoading) so we block rendering while React Query
  // silently refreshes stale cached data — this prevents the old-status flash.
  const isPageLoading = isLoading || isFetching;
  const po = data?.data;

  const submitMut   = useSubmitPurchaseOrderForApproval(id);
  const issueMut    = useIssuePurchaseOrder();
  const closeMut    = useClosePurchaseOrder();
  const cancelMut   = useCancelPurchaseOrder();
  const approvalMut = usePurchaseOrderApprovalDecision();
  const addLineItemsMut = useAddPOLineItems(id);
  const updateLineItemMut = useUpdatePOLineItem(id, editingLineItem?.purchaseOrderLineItemId || "");
  const deleteLineItemMut = useDeletePOLineItem(id);
  const deletePOMut = useDeletePurchaseOrder();
  const shortCloseMut = useShortClosePOLine(id);
  const finalBillingMut = useConfirmPOFinalBilling(id);

  const isPending = submitMut.isPending || issueMut.isPending || closeMut.isPending ||
    cancelMut.isPending || approvalMut.isPending || shortCloseMut.isPending || finalBillingMut.isPending;

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

  const handleSimpleAction = async (type: "submit" | "issue" | "close" | "approve") => {
    try {
      if (type === "submit")  { await submitMut.mutateAsync();    toast.success("Purchase order submitted for approval."); }
      if (type === "issue")   { await issueMut.mutateAsync(id);   toast.success("Purchase order issued to vendor."); }
      if (type === "close")   { await closeMut.mutateAsync(id);   toast.success("Purchase order closed."); }
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

  const handleWithdraw = async (reason: string) => {
    try {
      await cancelMut.mutateAsync({ id, reason });
      toast.success("Purchase order withdrawn.");
      setModal(null);
      router.push(listUrl);
    } catch (err: any) {
      displayExpertError(err, "Failed to withdraw purchase order.");
    }
  };

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#087f70]" />
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
        <button onClick={() => router.push(listUrl)} className="text-[#087f70] font-medium hover:underline">
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
  const stage = (po.status || "").toLowerCase() as WFStage;

  // Render drafts inline without early return
  // if (stage === "draft") {
  //   return <EditPurchaseOrderPage />;
  // }

  const isDelivered = stage === "partially_delivered" || stage === "delivered";
  const submitDateStr = po.createdAt ? format(new Date(po.createdAt), "MMM dd, yyyy") : "N/A";

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

  // Workflow steps — updated to reflect draft→submitted→approved chain and backend timeline
  const isCompanyScope = outerTab === "company";
  const isSubmitted = stage === "pending_approval" || stage === "submitted";
  const showOverrideBanner = isCompanyScope && !isOwnPO && (
    (isSubmitted && canApprovePO) ||
    ((isSubmitted || isApproved) && (canCancelPO || canApprovePO))
  );

  const workflowSteps = [
    {
      label: "Created",
      person: getPerson(timelineByAction["created"], po.createdBy ? `${(po.createdBy as any).firstName || ""} ${(po.createdBy as any).lastName || ""}`.trim() || "System" : "System"),
      timestamp: timelineByAction["created"]?.timestamp || po.createdAt as string | null,
      done: true,
    },
    {
      label: "Submitted for Approval",
      person: getPerson(timelineByAction["submitted_for_approval"]),
      // After the draft early-return above, stage can never be "draft" here,
      // so submitted = true always, and we show "Awaiting" if pending approval.
      badge: stage === "pending_approval" ? "Awaiting" : "Submitted",
      badgeColor: stage === "pending_approval" ? "text-orange-600 bg-orange-50" : "text-[#087f70] bg-[#f0faf8]",
      timestamp: timelineByAction["submitted_for_approval"]?.timestamp || ((po as any).submittedAt ?? null),
      done: true,
      pending: false,
    },
    {
      label: timelineByAction["rejected"] ? "Rejected" : "Approved",
      person: getPerson(timelineByAction["approved"] || timelineByAction["rejected"]),
      badge: timelineByAction["rejected"] ? "Rejected" : isApproved ? "Approved" : undefined,
      badgeColor: timelineByAction["rejected"] ? "text-[#d33d44] bg-[#fff5f5]" : "text-[#087f70] bg-[#f0faf8]",
      timestamp: timelineByAction["approved"]?.timestamp || timelineByAction["rejected"]?.timestamp || ((po as any).approvedAt ?? null),
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
      {
        label: "Delivery Status",
        person: getPerson(timelineByAction["partially_delivered"] || timelineByAction["delivered"] || timelineByAction["ready_for_delivery"], isDelivered ? "Vendor" : undefined),
        badge: stage === "partially_delivered" || timelineByAction["partially_delivered"] ? "Partial" : stage === "delivered" || timelineByAction["delivered"] ? "Full Delivery" : timelineByAction["ready_for_delivery"] ? "Ready for Delivery" : undefined,
        badgeColor: stage === "partially_delivered" || timelineByAction["partially_delivered"] ? "text-amber-600 bg-amber-50" : "text-[#087f70] bg-[#f0faf8]",
        timestamp: timelineByAction["delivered"]?.timestamp || timelineByAction["partially_delivered"]?.timestamp || timelineByAction["ready_for_delivery"]?.timestamp || po.deliveredAt,
        done: !!timelineByAction["delivered"] || !!timelineByAction["partially_delivered"] || isDelivered,
        pending: stage === "acknowledged" || stage === "ready_for_delivery",
      },
      {
        label: "Closed",
        person: getPerson(timelineByAction["closed"], po.closedAt ? "System" : undefined),
        badge: timelineByAction["closed"] || po.closedAt ? "Closed" : undefined,
        badgeColor: "text-gray-600 bg-gray-100",
        timestamp: timelineByAction["closed"]?.timestamp || po.closedAt as string | null,
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
        timestamp: timelineByAction["cancelled"]?.timestamp || (po as any).cancelledAt as string | null,
        done: true,
        pending: false,
      }
    ] : [])
  ];

  // Derive which action buttons to show.
  const showEditDraft  = stage === "draft" && isSubmitterView && canUpdateDraft;
  const showDeleteDraft = stage === "draft" && isSubmitterView && canUpdateDraft;
  const showSubmit     = stage === "draft" && isSubmitterView && canUpdateDraft && (po.lineItems?.length || 0) > 0;
  const showIssue      = (stage === "ready_to_issue" || stage === "approved") && canIssuePO;
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
  const hasApprovePermission = canApprovePO;
  
  const showApprove    = stage === "pending_approval" && !isSubmitterView && canApprovePO && (!isCompanyScope || overrideUnlocked);
  const showReject     = stage === "pending_approval" && !isSubmitterView && canApprovePO && (!isCompanyScope || overrideUnlocked);
  
  const showWithdraw = stage === "pending_approval" && (
    (isOwnScope && isOwnPO && canCancelPO) ||
    (isCompanyScope && hasApprovePermission && overrideUnlocked)
  );
  /** Neutral cancel for drafts — always false here (handled in the edit page) */
  const showCancelDraft = false;
  /** Close (close endpoint) — after approval, any time until already closed/cancelled */
  const showClose = stage === "delivered" && canClosePO && po.canClose === true;
  const showReceipt = (stage === "ready_for_delivery" || stage === "delivered") && canReceivePO;
  const closeBlockers = (po.closeBlockers || []) as string[];
  const canConfirmFinalBilling = canClosePO && stage === "delivered" &&
    closeBlockers.length === 1 && closeBlockers[0] === "final_billing_confirmation_required";
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
      <ShortCloseModal
        open={!!shortCloseItem}
        item={shortCloseItem}
        onClose={() => setShortCloseItem(null)}
        isPending={shortCloseMut.isPending}
        onConfirm={async (quantity, reason) => {
          try {
            await shortCloseMut.mutateAsync({ lineItemId: shortCloseItem.purchaseOrderLineItemId, quantity, reason });
            toast.success("Unfulfilled quantity short-closed.");
            setShortCloseItem(null);
          } catch (err: any) {
            displayExpertError(err, "Unable to short-close this quantity.");
          }
        }}
      />
      <FinalBillingModal
        open={modal === "final_billing"}
        onClose={() => setModal(null)}
        isPending={finalBillingMut.isPending}
        onConfirm={async (reason) => {
          try {
            await finalBillingMut.mutateAsync({ reason });
            toast.success("Final billing confirmed. The PO can now be closed.");
            setModal(null);
          } catch (err: any) {
            displayExpertError(err, "Unable to confirm final billing.");
          }
        }}
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
      <WithdrawModal
        open={modal === "cancel" || modal === "withdraw"}
        onClose={() => setModal(null)}
        onConfirm={handleWithdraw}
        isPending={cancelMut.isPending}
      />
      <RejectModal
        open={modal === "reject"}
        onClose={() => setModal(null)}
        onConfirm={handleReject}
        isPending={approvalMut.isPending}
      />
      <ConfirmModal
        open={modal === "delete_draft"}
        onClose={() => setModal(null)}
        onConfirm={async () => {
          try {
            await deletePOMut.mutateAsync(id);
            toast.success("Draft purchase order deleted.");
            router.push(listUrl);
          } catch(e) {
            displayExpertError(e, "Failed to delete PO");
          }
        }}
        isPending={deletePOMut.isPending}
        title="Delete Draft PO"
        description="Are you sure you want to delete this draft? This action cannot be undone."
        confirmLabel="Delete Draft"
        variant="danger"
      />
      <ConfirmModal
        open={modal === "delete_line_item"}
        onClose={() => { setModal(null); setItemToDelete(null); }}
        onConfirm={async () => {
          if (!itemToDelete) return;
          try {
            await deleteLineItemMut.mutateAsync(itemToDelete.purchaseOrderLineItemId);
            toast.success("Line item deleted");
            setModal(null);
            setItemToDelete(null);
          } catch(e: any) {
            toast.error(e?.response?.data?.message || "Failed to delete line item");
          }
        }}
        isPending={deleteLineItemMut.isPending}
        title="Delete Line Item"
        description="Are you sure you want to delete this line item? This action cannot be undone."
        confirmLabel="Delete Item"
        variant="danger"
      />
      {po && modal === "edit_header" && (
        <EditPOHeaderModal
          open={true}
          onClose={() => setModal(null)}
          po={po}
        />
      )}
      {po && modal === "line_items" && (
        <LineItemBatchModal
          open={true}
          onClose={() => { setModal(null); setEditingLineItem(null); }}
          currency={po.currency || "NGN"}
          saving={addLineItemsMut.isPending}
          onSaveAll={async (items) => {
             await addLineItemsMut.mutateAsync({ 
                lineItems: items.map(item => ({ ...item, unitPrice: item.unitPrice ?? 0 })) as any 
             });
             toast.success("Line items added successfully");
             setModal(null);
          }}
          editInitial={editingLineItem ? {
             _stagingId: "edit-current",
             categoryName: (editingLineItem.category as any)?.name || "",
             ...editingLineItem,
          } : undefined}
          editSaving={updateLineItemMut.isPending}
          onEditSaved={async (payload) => {
             if (editingLineItem?.purchaseOrderLineItemId) {
                await updateLineItemMut.mutateAsync(payload as any);
                toast.success("Line item updated");
                setModal(null);
                setEditingLineItem(null);
             }
          }}
          persistKey={`po_${id}`}
        />
      )}

      {/* Layout */}
      <div className="flex flex-col h-[calc(100vh-64px)] -m-3 sm:-m-5 min-h-0">
        {/* Header - Transparent with exact original padding */}
        <div className="shrink-0 pt-9 sm:pt-11 px-9 sm:px-11 pb-6">
          <div className="max-w-6xl mx-auto w-full flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#0b100e]">{po.poNumber || "Unnamed PO"}</h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  stage === "pending_approval" ? "bg-orange-50 text-orange-600" :
                  stage === "cancelled"        ? "bg-[#fff5f5] text-[#d33d44]" :
                  isDelivered                  ? "bg-[#f0faf8] text-[#087f70]" :
                                                "bg-purple-50 text-purple-600"
                }`}>
                  {statusLabel}
                </span>
              </div>
              <p className="text-sm text-[#68726d] mt-1">Created on {submitDateStr}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
              {showEditDraft && (
                <button
                  onClick={() => setModal("edit_header")}
                  className="h-9 px-4 rounded-lg border border-black/[0.06] text-[#0b100e] text-sm font-medium hover:bg-[#f9faf9] transition-colors flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" /> Edit PO Details
                </button>
              )}
              {showDeleteDraft && (
                <button onClick={() => setModal("delete_draft")} className="h-9 px-4 rounded-lg border border-red-300 text-[#d33d44] text-sm font-medium hover:bg-[#fff5f5] transition-colors">
                  Delete Draft
                </button>
              )}
              {showWithdraw && (
                <button onClick={() => setModal("withdraw")} className="h-9 px-4 rounded-lg border border-red-300 text-[#d33d44] text-sm font-medium hover:bg-[#fff5f5] transition-colors">
                  Withdraw PO
                </button>
              )}
              {showSubmit && (
                <button onClick={() => setModal("submit")} className="h-9 px-5 rounded-lg bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                  Submit for Approval
                </button>
              )}
              {showReject && (
                <button onClick={() => setModal("reject")} className="h-9 px-4 rounded-lg border border-red-300 text-[#d33d44] text-sm font-medium hover:bg-[#fff5f5] transition-colors">
                  Reject PO
                </button>
              )}
              {showApprove && (
                <button onClick={() => setModal("approve")} className="h-9 px-5 rounded-lg bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
                  Approve PO
                </button>
              )}
              {showIssue && (
                <button onClick={() => setModal("issue")} className="h-9 px-5 rounded-lg bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                  Issue PO
                </button>
              )}
              {showReceipt && (
                <button onClick={() => router.push(`/procurement/confirmation/${id}`)} className="h-9 px-5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2">
                  <PackageCheck className="w-4 h-4" /> Select Shipment to Receive
                </button>
              )}
              {canConfirmFinalBilling && (
                <button onClick={() => setModal("final_billing")} className="h-9 px-4 rounded-lg bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                  Confirm Final Billing
                </button>
              )}
              {showClose && (
                <button onClick={() => setModal("close")} className="h-9 px-4 rounded-lg border border-red-300 text-[#d33d44] text-sm font-medium hover:bg-[#fff5f5] transition-colors">
                  Close PO
                </button>
              )}
            </div>
          </div>
        </div>


        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 px-9 sm:px-11 pb-9 sm:pb-11">
          <div className="max-w-6xl mx-auto flex flex-col">
            {/* Split layout */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Column */}
          <div className="flex-1 flex flex-col min-w-0 space-y-4">

          {/* Rejection / Withdrawal Reason */}
          {po.rejectionReason && (stage === "rejected" || stage === "cancelled") && (
            <div className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${stage === "rejected" ? "border-[#d33d44]/20 bg-[#fff5f5] text-red-800" : "border-gray-200 bg-gray-50 text-gray-800"}`}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">{stage === "rejected" ? "Reason for Rejection" : "Reason for Withdrawal"}</p>
                <p className="mt-0.5">{po.rejectionReason}</p>
              </div>
            </div>
          )}

          {canClosePO && stage !== "closed" && closeBlockers.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div><p className="font-semibold">PO closure requirements</p><p className="mt-0.5">{closeBlockers.map((blocker) => String(({ delivery_incomplete: "Complete receipt or an approved short-close for every line", fulfillment_exception_unresolved: "Resolve the vendor cannot-fulfill exception", final_billing_confirmation_required: "Confirm that no further vendor billing is expected", open_invoice: "Resolve every submitted, approved, or unpaid invoice" } as Record<string, string>)[blocker] || blocker)).join(" · ")}</p></div>
            </div>
          )}

          {/* PO Details */}
          <div className="bg-white rounded-[14px] border border-black/[0.06] p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#0b100e]">PO Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-[#68726d] mb-1">Requester</p>
                <p className="text-sm font-semibold text-[#0b100e]">{po.requesterName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-[#68726d] mb-1">Department</p>
                <p className="text-sm font-semibold text-[#0b100e]">{po.departmentName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-[#68726d] mb-1">Vendor</p>
                <p className="text-sm font-semibold text-[#0b100e]">{po.vendor?.displayName || po.vendor?.legalName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-[#68726d] mb-1">Priority</p>
                <span className="text-sm font-semibold text-amber-500 capitalize">{po.priority || "Medium"}</span>
              </div>
              {po.deliveryDate && (
                <div>
                  <p className="text-xs text-[#68726d] mb-1">Expected Delivery</p>
                  <p className="text-sm font-semibold text-[#0b100e]">
                    {format(new Date(po.deliveryDate as string), "MMM dd, yyyy")}
                  </p>
                </div>
              )}
              {po.notes && (
                <div className="col-span-2 md:col-span-4">
                  <p className="text-xs text-[#68726d] mb-1">Notes</p>
                  <p className="text-sm text-[#0b100e]">{po.notes as string}</p>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-[14px] border border-black/[0.06] overflow-hidden">
            <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#0b100e]">
                Line Items <span className="text-[#68726d] font-normal ml-1">{po.lineItems?.length || 0}</span>
              </h2>
              {stage === "draft" && isSubmitterView && (
                <button
                  onClick={() => {
                    setEditingLineItem(null);
                    setModal("line_items");
                  }}
                  className="h-8 px-3 rounded-lg bg-[#f0faf8] text-[#087f70] text-xs font-semibold hover:bg-[#e0f5f0] transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Items
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-[#f9faf9]">
                    <th className="px-6 py-3 text-left font-semibold text-[#0b100e]">Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-[#0b100e]">Category</th>
                    <th className="px-6 py-3 text-center font-semibold text-[#0b100e]">Qty</th>
                    <th className="px-6 py-3 text-left font-semibold text-[#0b100e]">Fulfillment</th>
                    <th className="px-6 py-3 text-right font-semibold text-[#0b100e]">Unit Price</th>
                    <th className="px-6 py-3 text-right font-semibold text-[#0b100e]">Subtotal</th>
                    {stage === "draft" && isSubmitterView && (
                      <th className="px-6 py-3 w-20"></th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {po.lineItems?.length ? po.lineItems.map((item: any) => (
                    <tr key={item.purchaseOrderLineItemId} className="border-b border-border/40">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#0b100e]">{item.name}</p>
                        {item.description ? <p className="text-xs text-[#68726d]">{item.description as string}</p> : null}
                      </td>
                      <td className="px-6 py-4 text-[#68726d]">{(item.category as any)?.name || "—"}</td>
                      <td className="px-6 py-4 text-center">{Number(item.quantity)}</td>
                      <td className="px-6 py-4">
                        {item.fulfillmentState === "cannot_fulfill" ? <div className="space-y-1"><span className="inline-flex rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">{Number(item.quantityRemainingToReady || 0)} cannot fulfill</span>{canClosePO && Number(item.quantityRemainingToReady || 0) > 0 && <button onClick={() => setShortCloseItem(item)} className="block text-xs font-semibold text-[#087f70] hover:underline">Short-close quantity</button>}</div> : Number(item.shortClosedQuantity || 0) > 0 ? <div className="space-y-1"><span className="inline-flex rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{Number(item.shortClosedQuantity)} short-closed</span>{item.shortCloseReason && <p className="max-w-[180px] text-xs text-[#68726d]">{item.shortCloseReason}</p>}</div> : <span className="text-xs text-[#68726d]">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right">{formatCurrency(item.unitPrice, po.currency)}</td>
                      <td className="px-6 py-4 text-right text-[#0b100e] font-medium">{formatCurrency(item.subtotal as string, po.currency as string)}</td>
                      {stage === "draft" && isSubmitterView && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setEditingLineItem(item); setModal("line_items"); }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#68726d] hover:bg-[#f5f7f6] transition-colors"
                              title="Edit item"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setItemToDelete(item);
                                setModal("delete_line_item");
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-[#fff5f5] hover:text-[#d33d44] transition-colors"
                              title="Delete item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={stage === "draft" && isSubmitterView ? 7 : 6} className="px-6 py-8 text-center text-[#68726d]">No line items attached</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-border/40 bg-[#f9faf9]">
              <div className="flex items-center gap-8">
                <span className="text-sm font-semibold text-[#087f70]">Total Amount</span>
                <span className="text-lg font-bold text-[#0b100e]">{formatCurrency(po.totalAmount as string, po.currency as string)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-[300px] shrink-0 lg:h-full lg:overflow-y-auto pr-1 space-y-4 pb-4">
          {/* Manager Override Banner */}
          {showOverrideBanner && (
            <ManagerOverrideBanner
              isUnlocked={overrideUnlocked}
              onUnlock={() => setOverrideUnlocked(true)}
              onLock={() => setOverrideUnlocked(false)}
            />
          )}

          <div className="bg-white rounded-[14px] border border-black/[0.06] overflow-hidden">
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
        </div>
      </div>
    </>
  );
}

export default withPermissions(PODetailPage, [
  { resource: "procurement.purchase_order", action: "read_own" },
  { resource: "procurement.purchase_order", action: "read_department" },
  { resource: "procurement.purchase_order", action: "read_company" },
]);
