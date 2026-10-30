"use client";

import { X, Loader2, AlertCircle, Trash2, XCircle } from "lucide-react";
import { useGetSpendProgramById, mapSpendProgramFromBackend } from "@/queries/procurement/policies";
import type { ProcurementPolicyApiRecord } from "@/queries/procurement/policies";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuthStore } from "@/stores/auth-stores";
import { asRecord, pickString, getApiErrorMessage } from "@/lib/types/api-error";
import { useState } from "react";
import { useExceptionFormatter } from "./hooks/useExceptionFormatter";
import { buildConditionSummary, getActionLabel, getActionStyle, CURRENCY_OPTIONS } from "./constants";
import { RejectPolicyReasonModal } from "@/components/policies/RejectPolicyReasonModal";
import { saveSpendProgramRejection, getSpendProgramRejection } from "@/lib/policies/rejection-store";
import { isUserCreatorOfSpendProgram } from "@/lib/policies/spend-program-creator-store";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch { return "—"; }
}

function formatUser(userObj: unknown, fallbackStr = "—") {
  if (!userObj) return fallbackStr;
  if (typeof userObj === "string") return userObj || fallbackStr;
  const user = asRecord(userObj);
  const fullName = `${pickString(user, "firstName")} ${pickString(user, "lastName")}`.trim();
  return fullName || pickString(user, "email") || fallbackStr;
}

function formatUserRole(userObj: unknown) {
  if (!userObj || typeof userObj === "string") return "";
  const user = asRecord(userObj);
  const villetoRole = asRecord(user.villetoRole);
  const role = asRecord(user.role);
  const roleName =
    pickString(villetoRole, "name") ||
    pickString(role, "name") ||
    pickString(user, "jobTitle", "position", "roleName");
  return roleName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());
}

const GROUP_ORDER = [
  { code: "pr_submission", label: "Purchase Request" },
  { code: "pr_to_po",      label: "PR to PO" },
  { code: "po_submission", label: "Purchase Order" },
];

const formatAmountConfig = (cc: any) => {
  if (cc.amounts || (cc.amountThresholds && Array.isArray(cc.amountThresholds) && cc.amountThresholds.length > 0)) {
    let entries = [];
    if (cc.amountThresholds && cc.amountThresholds.length > 0) {
       entries = cc.amountThresholds.map((t: any) => [t.currency, t.amount]);
    } else if (cc.amounts) {
       entries = Object.entries(cc.amounts);
    }
    if (entries.length === 1) {
       const [cur, amt] = entries[0];
       const symbol = CURRENCY_OPTIONS.find((c: any) => c.value === cur)?.symbol || cur;
       return `${symbol}${Number(amt).toLocaleString()}`;
    }
    if (entries.length > 1) {
      const formatted = entries.map(([cur, amt]: any) => {
         const symbol = CURRENCY_OPTIONS.find((c: any) => c.value === cur)?.symbol || cur;
         return `${symbol}${Number(amt).toLocaleString()}`;
      });
      return `(${formatted.join(", ")})`;
    }
  }
  
  const amt = cc.amount || 0;
  const cur = cc.currency || "NGN";
  const symbol = CURRENCY_OPTIONS.find((c: any) => c.value === cur)?.symbol || cur;
  return `${symbol}${Number(amt).toLocaleString()}`;
}

const getConditionText = (rule: any): string => {
  const { ruleType, ruleName, conditionConfig: cc } = rule;
  if (!cc) return "—";

  if (cc.amount !== undefined || cc.amounts || cc.amountThresholds) {
    const typeStr = (ruleType || "").toLowerCase();
    const nameStr = (ruleName || "").toLowerCase();
    
    const isBelow = typeStr.includes("automatic_approval") || nameStr.includes("auto");
    const operator = isBelow ? "<" : ">";
    
    let prefix = "Amount";
    if (typeStr.includes("line_item") || nameStr.includes("line item")) prefix = "Line item amount";
    else if (typeStr.includes("pr_") || typeStr.endsWith("_pr") || nameStr.includes("purchase request")) prefix = "PR amount";
    else if (typeStr.includes("po_") || typeStr.endsWith("_po") || nameStr.includes("purchase order")) prefix = "PO amount";
    
    return `${prefix} ${operator} ${formatAmountConfig(cc)}`;
  }

  switch (ruleType) {
    case "min_quotes_required":   return `Minimum ${cc.numberOfQuotes} quote(s) required`;
    case "final_amount_required": return "Final amount required before PO submission";
    case "contract_required":     return "Valid contract required for conversion";
    default:
      const summary = buildConditionSummary(cc, rule);
      return summary || ruleType.replace(/_/g, " ");
  }
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ProcurementPolicyDetailsModal({
  policyId,
  isDraft = false,
  isReviewMode = false,
  onClose,
  onEdit,
  onArchive,
  onSubmitDraft,
  onDeleteDraft,
  onApprove,
  onReject,
  initialData,
}: {
  policyId: string | null;
  isDraft?: boolean;
  isReviewMode?: boolean;
  onClose: () => void;
  onEdit?: (p: any) => void;
  onArchive?: (p: any) => void;
  onSubmitDraft?: (p: any) => void;
  onDeleteDraft?: (draftId: string) => void;
  onApprove?: (p: any) => void;
  onReject?: (p: any, reason?: string) => void | Promise<void>;
  /** Row data already in memory — used as placeholder so the modal renders instantly. */
  initialData?: any;
}) {
  const canDeactivate = useAuthStore((s) => s.can)("policy", "deactivate");
  const canUpdate     = useAuthStore((s) => s.can)("policy", "update");

  const [activeTab, setActiveTab] = useState<string>("");
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const currentUser = useAuthStore((s) => s.user);

  const { data: programData, isLoading } = useGetSpendProgramById(policyId ?? "", {
    enabled: !!policyId,
    // If the row data was already in memory, seed the cache with it so we
    // render immediately rather than showing a spinner on every click.
    placeholderData: initialData ? { data: initialData, message: "", status: 200 } : undefined,
  });
  // Use the fetched data preferentially; fall back to initialData while loading.
  const policy = programData?.data ? mapSpendProgramFromBackend(programData.data) : initialData;

  const { formatExceptionSummary } = useExceptionFormatter();
  const currentUserId = currentUser?.userId || (currentUser as any)?.id || (currentUser as any)?._id || "";
  const userFullName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim().toLowerCase();
  const userEmail = (currentUser?.email || '').trim().toLowerCase();

  const rawStatus = (programData?.data as any)?.status || policy?.status;
  const programId = policy?.procurementSpendProgramId || policy?.procurementPolicyId || policy?.id || policyId;
  const storedRejection = getSpendProgramRejection(programId);
  const isRejected =
    rawStatus?.toLowerCase() === "rejected" ||
    rawStatus?.toLowerCase() === "declined" ||
    !!storedRejection;
  const rejectionReason =
    (programData?.data as any)?.rejectionReason ||
    (programData?.data as any)?.reason ||
    (policy as any)?.rejectionReason ||
    (policy as any)?.reason ||
    storedRejection?.reason;
  const rejectedBy =
    (programData?.data as any)?.rejectedBy ||
    (policy as any)?.rejectedBy ||
    storedRejection?.rejectedBy;
  const rejectedAt =
    (programData?.data as any)?.rejectedAt ||
    (policy as any)?.rejectedAt ||
    storedRejection?.rejectedAt;
  const isAutoApproved = Boolean(
    (programData?.data as any)?.autoApproved ??
    (policy as any)?.autoApproved ??
    (programData?.data as any)?.isAutoApproved ??
    (policy as any)?.isAutoApproved ??
    (programData?.data as any)?.autoApprove ??
    (policy as any)?.autoApprove ??
    (((programData?.data as any)?.approvalSetting || (policy as any)?.approvalSetting)?.approvalRequired === false && rawStatus === "active")
  );

  // Check if current user is the creator
  let isCreator = isUserCreatorOfSpendProgram({
    id: programId,
    name: policy?.name,
    userId: currentUserId,
    userName: userFullName,
    userEmail: userEmail,
  });

  if (!isCreator) {
    const cb = policy?.createdBy || (policy as any)?.creator || (policy as any)?.user;
    const creatorId = typeof cb === "object" && cb !== null
      ? ((cb as any).userId ?? (cb as any).id ?? (cb as any)._id ?? "")
      : ((policy as any)?.createdById ?? (policy as any)?.creatorId ?? (policy as any)?.userId ?? "");
    isCreator = Boolean(currentUserId) && Boolean(creatorId) && creatorId === currentUserId;

    if (!isCreator && currentUser) {
      let creatorName = "";
      if (typeof cb === 'string') {
        creatorName = cb.trim().toLowerCase();
      } else if (typeof cb === 'object' && cb !== null) {
        creatorName = `${(cb as any).firstName || ''} ${(cb as any).lastName || ''}`.trim().toLowerCase() ||
                      ((cb as any).name || (cb as any).fullName || '').trim().toLowerCase();
      } else if (typeof (policy as any)?.createdByName === 'string') {
        creatorName = (policy as any).createdByName.trim().toLowerCase();
      }
      if (userFullName && creatorName && userFullName === creatorName) {
        isCreator = true;
      }

      const creatorEmail = (typeof cb === 'object' && cb !== null ? (cb as any).email : '') ||
                           (policy as any)?.creatorEmail || '';
      if (userEmail && creatorEmail && userEmail === creatorEmail.trim().toLowerCase()) {
        isCreator = true;
      }
    }
  }

  const currentUserRoleId = 
    currentUser?.companyRole?.roleId || 
    (currentUser as any)?.companyRole?.id || 
    (currentUser as any)?.villetoRole?.roleId || 
    (currentUser as any)?.villetoRole?.id || 
    (currentUser as any)?.role?.roleId || 
    (currentUser as any)?.role?.id || 
    "";

  const canApprove = useAuthStore.getState().can("policy", "approve");
  let isApproverRole = canApprove;
  const approvalSetting = (policy as any)?.approvalSetting;
  if (approvalSetting?.allRolesCanApprove) {
    isApproverRole = true;
  } else if (approvalSetting?.approverRoleIds?.length) {
    isApproverRole = approvalSetting.approverRoleIds.includes(currentUserRoleId);
  }

  const isPendingStatus = policy?.status === "pending" || policy?.status === "pending_approval";
  const canShowReviewActions = isReviewMode && !isCreator && isApproverRole && isPendingStatus;

  if (!policyId) return null;

  const handleApprove = async () => {
    if (!onApprove || !policy) return;
    setPendingAction("approve");
    setError(null);
    try {
      await onApprove(policy);
      onClose();
    } catch (err: unknown) {
      setError((err as any)?.response?.data?.message || "Failed to approve policy");
      setPendingAction(null);
    }
  };

  const handleRejectClick = () => {
    setIsRejectModalOpen(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!onReject || !policy) return;
    setPendingAction("reject");
    setError(null);
    const targetId = policy.procurementSpendProgramId || policy.procurementPolicyId || policy.id || policyId;
    try {
      await onReject(policy, reason);
      saveSpendProgramRejection({
        id: targetId,
        reason,
        rejectedBy: currentUser ? {
          userId: currentUser.userId,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          roleName: (currentUser as any).roleName,
          jobTitle: (currentUser as any).jobTitle,
        } : undefined,
        rejectedAt: new Date().toISOString(),
      });
      setIsRejectModalOpen(false);
      onClose();
    } catch (err: unknown) {
      setError((err as any)?.response?.data?.message || (err as any)?.message || "Failed to reject policy");
      setPendingAction(null);
      setIsRejectModalOpen(false);
    }
  };

  const availableGroups: any[] = policy?.groups || [];
  const visibleTabs = GROUP_ORDER.filter(t => availableGroups.some(g => g.group === t.code));
  const currentTab = activeTab || visibleTabs[0]?.code || "pr_submission";
  const activeGroupData = availableGroups.find(g => g.group === currentTab);
  const rulesToDisplay: any[] = activeGroupData?.rules || [];

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => {
          if (!isReviewMode && e.target === e.currentTarget && !isRejectModalOpen) {
            onClose();
          }
        }}
      >
        <div
          className="relative bg-white rounded-[20px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] w-full max-w-[580px] flex flex-col border border-black/[0.06]"
          style={{ maxHeight: "88vh" }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.1] flex items-center justify-center transition-colors z-10"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        {/* While the full detail is loading, show a subtle inline skeleton
            rather than hiding everything — basic info is already visible
            from initialData / placeholderData. */}
        {isLoading && !policy ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-7 h-7 animate-spin text-[#087f70]" />
          </div>
        ) : (
          <>
            {/* ── Header (fixed, never scrolls) ── */}
            <div className="px-6 pt-6 pb-4 shrink-0">
              <div className="flex items-center gap-2.5 flex-wrap pr-10">
                <h2 className="text-[20px] font-bold text-gray-900 leading-tight">{policy.name}</h2>
                <StatusBadge status={policy.status} />
                {isDraft && canUpdate && onDeleteDraft && (
                  <button
                    onClick={() => onDeleteDraft(policy.procurementSpendProgramId || policy.procurementPolicyId || policy.id)}
                    className="p-1 rounded-md hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                    title="Delete Draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[12px] font-medium text-gray-400 mt-1">v{policy.versionNumber ?? 1}</p>
              <div className="h-px bg-black/[0.06] w-full mt-4" />
            </div>

            {/* ── Scrollable body ── */}
            <div
              className="flex-1 overflow-y-auto px-6 pb-4 space-y-3 min-h-0"
              style={{ scrollbarWidth: "thin", scrollbarColor: "#d1d5db transparent" }}
            >
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em]">SPEND PROGRAM DETAILS</p>

              {/* REJECTION REASON CARD */}
              {isRejected && (
                <div className="rounded-[16px] border border-red-200 bg-[#fff8f8] p-4">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 text-[#d33d44]">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <p className="text-[10px] font-bold uppercase tracking-wider">Rejection Reason</p>
                    </div>
                    {(rejectedAt || storedRejection?.rejectedAt) && (
                      <span className="text-[11px] text-[#84908a]">
                        {formatDate(rejectedAt || storedRejection?.rejectedAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-[#521c20] leading-relaxed pl-6">
                    {rejectionReason || "No specific reason provided."}
                  </p>
                  {(rejectedBy || storedRejection?.rejectedBy) && (
                    <p className="text-[11px] text-[#84908a] pl-6 mt-1.5">
                      Rejected by{" "}
                      <span className="font-semibold text-[#0b100e]">
                        {formatUser(rejectedBy || storedRejection?.rejectedBy)}
                      </span>
                      {formatUserRole(rejectedBy || storedRejection?.rejectedBy) && (
                        <span> ({formatUserRole(rejectedBy || storedRejection?.rejectedBy)})</span>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* NAME & DESCRIPTION */}
              <div className="rounded-[12px] border border-black/[0.06] bg-[#fafaf9] p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">NAME & DESCRIPTION</p>
                <p className="text-[14px] font-semibold text-gray-900">{policy.name}</p>
                {policy.description && (
                  <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">{policy.description}</p>
                )}
              </div>

              {/* APPLIES TO */}
              <div className="rounded-[12px] border border-black/[0.06] bg-[#fafaf9] p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">PROCUREMENT CATEGORIES</p>
                <div className="flex flex-wrap gap-1.5">
                  {policy.categories?.length > 0 ? (
                    policy.categories.map((c: any) => (
                      <span key={c.categoryId} className="bg-[#e8f5f3] text-[#087f70] px-3 py-1 rounded-full text-[12px] font-semibold border border-[#a6e6df]/40">
                        {c.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[12px] text-gray-400 italic">No categories selected</span>
                  )}
                </div>
              </div>

              {/* ENFORCEMENT RULES */}
              <div className="rounded-[12px] border border-black/[0.06] bg-[#fafaf9] p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">ENFORCEMENT RULES</p>

                {/* Stage tabs */}
                {visibleTabs.length > 0 && (
                  <div className="flex items-center gap-0.5 bg-black/[0.04] p-0.5 rounded-[10px] mb-3 w-fit">
                    {visibleTabs.map(t => (
                      <button
                        key={t.code}
                        onClick={() => setActiveTab(t.code)}
                        className={`px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all whitespace-nowrap ${
                          currentTab === t.code
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Rule cards */}
                <div className="space-y-2">
                  {rulesToDisplay.length === 0 ? (
                    <p className="text-[12px] text-gray-400 italic py-1">No rules configured for this stage.</p>
                  ) : (
                    rulesToDisplay.map((r: any, i: number) => {
                      let appliesToText = "All selected categories";
                      if (r.appliesToCategories?.length > 0) {
                        const policyCatIds = [...(policy.categoryIds || [])].sort().join(",");
                        const ruleCatIds = [...(r.appliesToCategoryIds || [])].sort().join(",");
                        if (ruleCatIds && policyCatIds !== ruleCatIds) {
                          appliesToText = r.appliesToCategories.map((c: any) => c.name).join(", ");
                        }
                      }
                      const exceptionSummary = formatExceptionSummary(r.exceptionConfig);

                      return (
                        <div key={i} className="rounded-[10px] border border-black/[0.06] bg-white p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                          <p className="text-[13px] font-bold text-gray-900 mb-1.5">{r.ruleName}</p>
                          <div className="space-y-0.5 mb-2.5">
                            <p className="text-[12px] text-gray-500">{getConditionText(r)}</p>
                            <p className="text-[12px] font-semibold text-gray-800">{r.actionLabel || r.action}</p>
                          </div>
                          <div className="border-t border-black/[0.04] pt-2 space-y-1">
                            <p className="text-[11px] text-gray-400">
                              Applies to: <span className="font-semibold text-gray-600">{appliesToText}</span>
                            </p>
                            {(exceptionSummary || r.exceptionConfig?.action || Object.keys(r.exceptionConfig?.conditionConfig || {}).length > 0) && (
                              <div className="mt-2 pt-2 border-t border-black/[0.04] flex flex-col gap-1 text-[11px]">
                                {Object.keys(r.exceptionConfig?.conditionConfig || {}).length > 0 && (
                                  <p className="text-gray-600">
                                    <span className="font-semibold text-gray-700">Exception Condition:</span> {buildConditionSummary(r.exceptionConfig.conditionConfig, r)}
                                  </p>
                                )}
                                {r.exceptionConfig?.action && (
                                  <p className="flex items-center gap-1.5 text-gray-600">
                                    <span className="font-semibold text-gray-700">Exception Action:</span>
                                    <span
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold"
                                      style={{
                                        color: getActionStyle(r.exceptionConfig.action).color,
                                        backgroundColor: getActionStyle(r.exceptionConfig.action).bgColor
                                      }}
                                    >
                                      {getActionLabel(r.exceptionConfig.action)}
                                    </span>
                                  </p>
                                )}
                                {exceptionSummary && (
                                  <p className="text-[#c07a10]">
                                    <span className="font-semibold">Exceptions:</span> {exceptionSummary}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* ── Created & Approved Info (fixed) ── */}
            <div className="px-6 pt-3 pb-2 shrink-0 border-t border-black/[0.05]">
              <div className="flex justify-between gap-4 text-[11px]">
                <div>
                  <p className="text-gray-400 mb-0.5 font-medium">Created by</p>
                  <p className="text-gray-900 font-semibold">
                    {policy?.createdBy
                      ? typeof policy.createdBy === "string"
                        ? policy.createdBy
                        : `${policy.createdBy.firstName ?? ""} ${policy.createdBy.lastName ?? ""}`.trim() + (policy.createdBy.userId === currentUserId || isCreator ? " (You)" : "")
                      : isCreator && currentUser
                      ? `${currentUser.firstName ?? ""} ${currentUser.lastName ?? ""}`.trim() + " (You)"
                      : "—"}
                  </p>
                  <p className="text-gray-400">{formatDate(policy.createdAt)}</p>
                </div>
                {isRejected ? (
                  <div className="text-right">
                    <p className="text-[#d33d44] mb-0.5 font-medium">Rejected by</p>
                    <p className="text-gray-900 font-semibold">
                      {formatUser(rejectedBy || storedRejection?.rejectedBy, "Reviewer")}
                      {formatUserRole(rejectedBy || storedRejection?.rejectedBy) && (
                        <span className="text-gray-400 font-normal"> ({formatUserRole(rejectedBy || storedRejection?.rejectedBy)})</span>
                      )}
                    </p>
                    <p className="text-gray-400">{formatDate(rejectedAt || storedRejection?.rejectedAt)}</p>
                  </div>
                ) : isAutoApproved ? (
                  <div className="text-right">
                    <p className="text-[#087f70] mb-0.5 font-medium">Approval</p>
                    <p className="text-[#087f70] font-semibold">
                      Auto-approved
                    </p>
                    <p className="text-gray-400">{formatDate(policy?.approvedAt || policy?.updatedAt || policy?.createdAt)}</p>
                  </div>
                ) : policy?.approvedBy ? (
                  <div className="text-right">
                    <p className="text-gray-400 mb-0.5 font-medium">Approved by</p>
                    <p className="text-gray-900 font-semibold">
                      {formatUser(policy.approvedBy)}
                      {formatUserRole(policy.approvedBy) && (
                        <span className="text-gray-400 font-normal"> ({formatUserRole(policy.approvedBy)})</span>
                      )}
                    </p>
                    <p className="text-gray-400">{formatDate(policy.approvedAt || policy.updatedAt)}</p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* ── Error ── */}
            {error && (
              <div className="px-6 pb-2 shrink-0">
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-700 leading-snug">{error}</p>
                </div>
              </div>
            )}

            {/* ── Footer buttons ── */}
            <div className="px-6 pb-5 pt-3 shrink-0 flex justify-end gap-2.5">
              {canShowReviewActions ? (
                <>
                  {onReject && (
                    <button onClick={handleRejectClick} disabled={pendingAction !== null} className="h-10 px-7 rounded-full border border-red-400 text-red-500 text-[13px] font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]">
                      {pendingAction === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
                    </button>
                  )}
                  {onApprove && (
                    <button onClick={handleApprove} disabled={pendingAction !== null} className="h-10 px-7 rounded-full bg-[#087f70] text-white text-[13px] font-semibold hover:bg-[#076b5e] transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]">
                      {pendingAction === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
                    </button>
                  )}
                </>
              ) : isDraft ? (
                <>
                  {canUpdate && onEdit && (
                    <button onClick={() => { onEdit(policy); onClose(); }} className="h-10 px-7 rounded-[9px] border border-[#c07a10] text-[#c07a10] text-[13px] font-semibold hover:bg-[#fffbf0] transition-colors">
                      Edit
                    </button>
                  )}
                  {canUpdate && onSubmitDraft && (
                    <button onClick={() => { onSubmitDraft(policy); onClose(); }} className="h-10 px-7 rounded-[9px] bg-[#087f70] text-white text-[13px] font-semibold hover:bg-[#076b5e] transition-colors">
                      Submit
                    </button>
                  )}
                </>
              ) : (
                <>
                  {canDeactivate && onArchive && policy.status !== "pending" && policy.status !== "pending_approval" && policy.status !== "archived" && policy.status !== "inactive" && (
                    <button onClick={() => { onArchive(policy); onClose(); }} className="h-10 px-7 rounded-[9px] border border-[#c07a10] text-[#c07a10] text-[13px] font-semibold hover:bg-[#fffbf0] transition-colors">
                      Move to Archive
                    </button>
                  )}
                  {canUpdate && onEdit && policy.status !== "pending" && policy.status !== "pending_approval" && policy.status !== "archived" && policy.status !== "inactive" && (
                    <button onClick={() => { onEdit(policy); onClose(); }} className="h-10 px-7 rounded-[9px] bg-[#087f70] text-white text-[13px] font-semibold hover:bg-[#076b5e] transition-colors">
                      Edit
                    </button>
                  )}
                  {(policy.status === "pending" || policy.status === "pending_approval" || isReviewMode) && (
                    <button onClick={onClose} className="h-10 px-7 rounded-[9px] border border-black/[0.1] text-gray-700 text-[13px] font-semibold hover:bg-black/[0.03] transition-colors">
                      Close
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
      </div>

      <RejectPolicyReasonModal
        open={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleRejectConfirm}
        isLoading={pendingAction === "reject"}
        title="Reject Spend Program"
        entityName={policy?.name}
      />
    </>
  );
}
