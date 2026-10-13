"use client";

import React, { useState } from "react";
import { X, Loader2, AlertCircle, XCircle } from "lucide-react";
import { useApproveSpendProgram, useRejectSpendProgram } from "@/queries/procurement/policies";
import { StatusBadge } from "@/components/ui/status-badge";
import { getApiErrorMessage } from "@/lib/types/api-error";
import { toast } from "sonner";
import { RejectPolicyReasonModal } from "@/components/policies/RejectPolicyReasonModal";
import { saveSpendProgramRejection, getSpendProgramRejection } from "@/lib/policies/rejection-store";
import { isUserCreatorOfSpendProgram } from "@/lib/policies/spend-program-creator-store";
import { useAuthStore } from "@/stores/auth-stores";
import type { SpendProgramListItem } from "./types";

interface ReviewSpendProgramModalProps {
  program: SpendProgramListItem | null;
  onClose: () => void;
  readOnly?: boolean;
}

const capitalizeName = (n: string) =>
  n ? n.charAt(0).toUpperCase() + n.slice(1) : "";

const groupLabel = (g: string) => {
  if (g === "pr_submission") return "Purchase Request";
  if (g === "pr_to_po") return "PR → PO";
  if (g === "po_submission") return "Purchase Order";
  return g.replace(/_/g, " ");
};

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const createdByName = (record: SpendProgramListItem) => {
  const cb = record.createdBy;
  if (!cb) return "—";
  if (typeof cb === "string") return cb;
  if (cb.firstName || cb.lastName)
    return `${cb.firstName ?? ""} ${cb.lastName ?? ""}`.trim();
  return "—";
};

export function ReviewSpendProgramModal({
  program,
  onClose,
  readOnly,
}: ReviewSpendProgramModalProps) {
  const approveMutation = useApproveSpendProgram();
  const rejectMutation = useRejectSpendProgram();
  const [error, setError] = React.useState<string | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const currentUser = useAuthStore((state) => state.user);

  if (!program) return null;

  const id = (program as any).spendProgramId || program.procurementSpendProgramId || (program as any).procurementPolicyId || (program as any).id;
  const storedRejection = getSpendProgramRejection(id);
  const isRejected = (program.status as string) === "rejected" || (program.status as string) === "declined" || !!storedRejection;
  const rejectionReason = (program as any).rejectionReason || (program as any).reason || storedRejection?.reason;
  const rejectedBy = (program as any).rejectedBy || storedRejection?.rejectedBy;
  const rejectedAt = (program as any).rejectedAt || storedRejection?.rejectedAt;

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  const currentUserId = currentUser?.userId || (currentUser as any)?.id || (currentUser as any)?._id || "";
  const userFullName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim().toLowerCase();
  const userEmail = (currentUser?.email || '').trim().toLowerCase();

  // Check if current user is the creator
  let isCreator = isUserCreatorOfSpendProgram({
    id,
    name: program.name,
    userId: currentUserId,
    userName: userFullName,
    userEmail: userEmail,
  });

  if (!isCreator) {
    const cb = program.createdBy || (program as any).creator || (program as any).user;
    const creatorId = typeof cb === "object" && cb !== null
      ? ((cb as any).userId ?? (cb as any).id ?? (cb as any)._id ?? "")
      : ((program as any).createdById ?? (program as any).creatorId ?? (program as any).userId ?? "");
    isCreator = Boolean(currentUserId) && Boolean(creatorId) && creatorId === currentUserId;

    if (!isCreator && currentUser) {
      let creatorName = "";
      if (typeof cb === 'string') {
        creatorName = cb.trim().toLowerCase();
      } else if (typeof cb === 'object' && cb !== null) {
        creatorName = `${(cb as any).firstName || ''} ${(cb as any).lastName || ''}`.trim().toLowerCase() ||
                      ((cb as any).name || (cb as any).fullName || '').trim().toLowerCase();
      } else if (typeof (program as any).createdByName === 'string') {
        creatorName = (program as any).createdByName.trim().toLowerCase();
      }
      if (userFullName && creatorName && userFullName === creatorName) {
        isCreator = true;
      }

      const creatorEmail = (typeof cb === 'object' && cb !== null ? (cb as any).email : '') ||
                           (program as any).creatorEmail || '';
      if (userEmail && creatorEmail && userEmail === creatorEmail.trim().toLowerCase()) {
        isCreator = true;
      }
    }
  }

  const { can } = useAuthStore();
  const canApprove = can("policy", "approve");
  const isPendingStatus = program.status === "pending" || program.status === "pending_approval";
  const effectiveReadOnly = readOnly || isCreator || !canApprove || !isPendingStatus;

  const handleApprove = async () => {
    setError(null);
    try {
      await approveMutation.mutateAsync(id);
      toast.success("Spend program approved successfully.");
      onClose();
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Failed to approve spend program. It may have already been reviewed."
        )
      );
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    setError(null);
    try {
      await rejectMutation.mutateAsync({ id, reason });
      saveSpendProgramRejection({
        id,
        reason,
        rejectedBy: currentUser ? {
          userId: currentUser.userId,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          jobTitle: (currentUser as any).jobTitle || (currentUser as any).roleName,
        } : undefined,
        rejectedAt: new Date().toISOString(),
      });
      setIsRejectModalOpen(false);
      toast.success("Spend program rejected.");
      onClose();
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Failed to reject spend program. It may have already been reviewed."
        )
      );
      setIsRejectModalOpen(false);
    }
  };

  const groups: string[] = (program.groups ?? []).map((g: any) => typeof g === "string" ? g : (g?.group ?? ""));
  const categories = program.categories ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="w-full max-w-[500px] bg-[#f5f7f6] rounded-[24px] p-6 shadow-xl flex flex-col max-h-[90vh] overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-xl font-bold text-[#0b100e]">
            Review Spend Program
          </h2>
          <button
            onClick={onClose}
            disabled={isPending}
            className="w-10 h-10 rounded-full bg-[#f9faf9] hover:bg-black/5 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-[#68726d]" />
          </button>
        </div>

        {/* Content card */}
        <div className="border border-black/[0.08] rounded-2xl p-6 mb-8 flex flex-col gap-6 bg-[#fcfdfc]">
          {/* Name + Status */}
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-xs text-[#84908a] mb-1">Program Name</p>
              <p className="text-[15px] font-semibold text-[#10231d]">
                {capitalizeName(program.name)}
              </p>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <p className="text-xs text-[#84908a] mb-0.5">Status</p>
              <StatusBadge status={program.status} />
            </div>
          </div>

          {/* Description */}
          {program.description && (
            <div>
              <p className="text-xs text-[#84908a] mb-1">Description</p>
              <p className="text-[14px] text-[#52605b] leading-snug">
                {program.description}
              </p>
            </div>
          )}

          {/* Stages covered */}
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-xs text-[#84908a] mb-1">Stages</p>
              {groups.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {groups.map((g) => (
                    <p
                      key={g}
                      className="text-[14px] font-medium text-[#10231d]"
                    >
                      {groupLabel(g)}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-[14px] text-[#84908a]">—</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-[#84908a] mb-1">Categories</p>
              {categories.length > 0 ? (
                <div className="flex flex-col items-end gap-0.5">
                  {categories.slice(0, 3).map((c) => (
                    <p
                      key={c.categoryId}
                      className="text-[14px] font-medium text-[#52605b]"
                    >
                      {c.name}
                    </p>
                  ))}
                  {categories.length > 3 && (
                    <p className="text-[12px] text-[#87918c]">
                      +{categories.length - 3} more
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[14px] text-[#84908a]">—</p>
              )}
            </div>
          </div>

          <div className="h-px bg-black/[0.06] w-full" />

          {/* Meta */}
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-xs text-[#84908a] mb-1">Created By</p>
              <p className="text-[14px] font-medium text-[#52605b]">
                {createdByName(program)}
              </p>
            </div>
            {isRejected && (rejectedBy || storedRejection) ? (
              <div className="text-right">
                <p className="text-xs text-[#d33d44] font-medium mb-1">Rejected By</p>
                <p className="text-[14px] font-semibold text-[#0b100e]">
                  {rejectedBy?.firstName ?? storedRejection?.rejectedBy?.firstName} {rejectedBy?.lastName ?? storedRejection?.rejectedBy?.lastName}
                </p>
                <p className="text-xs text-[#84908a] mt-0.5">
                  {formatDate(rejectedAt || storedRejection?.rejectedAt)}
                </p>
              </div>
            ) : (
              <div className="text-right">
                <p className="text-xs text-[#84908a] mb-1">Submitted</p>
                <p className="text-[14px] font-medium text-[#52605b]">
                  {formatDate(program.updatedAt ?? program.createdAt)}
                </p>
              </div>
            )}
          </div>

          {isRejected && rejectionReason && (
            <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
              <div className="flex items-center gap-1.5 mb-1 text-[#d33d44] font-semibold text-xs">
                <XCircle className="w-4 h-4" />
                <span>Rejection Reason</span>
              </div>
              <p className="text-xs text-[#521c20] leading-relaxed">{rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 leading-snug">{error}</p>
          </div>
        )}

        {/* Actions */}
        {effectiveReadOnly ? (
          <div className="flex items-center justify-center">
            <div className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border ${
              isRejected ? "bg-red-50 border-red-200" : isPendingStatus ? "bg-amber-50 border-amber-200" : "bg-[#f4f7f5] border-black/[0.06]"
            }`}>
              <span className={`text-sm font-medium ${isRejected ? "text-red-700" : isPendingStatus ? "text-amber-700" : "text-[#52605b]"}`}>
                {isRejected ? "Spend program rejected" : isPendingStatus ? "Awaiting review by an approver" : "Spend program active"}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setIsRejectModalOpen(true)}
              disabled={isPending}
              className="flex-1 max-w-[160px] h-12 rounded-xl border border-red-400 text-red-500 font-medium text-sm hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {rejectMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Reject"
              )}
            </button>
            <button
              onClick={handleApprove}
              disabled={isPending}
              className="flex-1 max-w-[160px] h-12 rounded-xl bg-[#087f70] text-white font-medium text-sm hover:bg-[#076b5e] transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {approveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Approve"
              )}
            </button>
          </div>
        )}

        <RejectPolicyReasonModal
          open={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          onConfirm={handleRejectConfirm}
          isLoading={rejectMutation.isPending}
          title="Reject Spend Program"
          entityName={program.name}
        />
      </div>
    </div>
  );
}
