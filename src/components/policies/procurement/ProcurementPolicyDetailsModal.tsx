"use client";

import { X, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { useGetSpendProgramById, mapSpendProgramFromBackend } from "@/queries/procurement/policies";
import type { ProcurementPolicyApiRecord } from "@/queries/procurement/policies";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuthStore } from "@/stores/auth-stores";
import { getApiErrorMessage } from "@/lib/types/api-error";
import { useState } from "react";
import { useExceptionFormatter } from "./hooks/useExceptionFormatter";
import { buildConditionSummary, getActionLabel, getActionStyle, CURRENCY_OPTIONS } from "./constants";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return "—"; }
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
  onReject?: (p: any) => void;
  /** Row data already in memory — used as placeholder so the modal renders instantly. */
  initialData?: any;
}) {
  const canDeactivate = useAuthStore((s) => s.can)("policy", "deactivate");
  const canUpdate     = useAuthStore((s) => s.can)("policy", "update");

  const [activeTab, setActiveTab] = useState<string>("");
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: programData, isLoading } = useGetSpendProgramById(policyId ?? "", {
    enabled: !!policyId,
    // If the row data was already in memory, seed the cache with it so we
    // render immediately rather than showing a spinner on every click.
    placeholderData: initialData ? { data: initialData, message: "", status: 200 } : undefined,
  });
  // Use the fetched data preferentially; fall back to initialData while loading.
  const policy = programData?.data ? mapSpendProgramFromBackend(programData.data) : initialData;

  const { formatExceptionSummary } = useExceptionFormatter();
  const currentUserId = useAuthStore.getState().user?.userId;

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

  const handleReject = async () => {
    if (!onReject || !policy) return;
    setPendingAction("reject");
    setError(null);
    try {
      await onReject(policy);
      onClose();
    } catch (err: unknown) {
      setError((err as any)?.response?.data?.message || "Failed to reject policy");
      setPendingAction(null);
    }
  };

  const availableGroups: any[] = policy?.groups || [];
  const visibleTabs = GROUP_ORDER.filter(t => availableGroups.some(g => g.group === t.code));
  const currentTab = activeTab || visibleTabs[0]?.code || "pr_submission";
  const activeGroupData = availableGroups.find(g => g.group === currentTab);
  const rulesToDisplay: any[] = activeGroupData?.rules || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[20px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] w-full max-w-[580px] flex flex-col border border-black/[0.06]"
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
                          activeTab === t.code
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
                    {policy.createdBy
                      ? `${policy.createdBy.firstName} ${policy.createdBy.lastName}${policy.createdBy.userId === currentUserId ? " (You)" : ""}`
                      : "—"}
                  </p>
                  <p className="text-gray-400">{formatDate(policy.createdAt)}</p>
                </div>
                {policy.approvedBy && (
                  <div className="text-right">
                    <p className="text-gray-400 mb-0.5 font-medium">Approved by</p>
                    <p className="text-gray-900 font-semibold">
                      {policy.approvedBy.firstName} {policy.approvedBy.lastName}
                    </p>
                    <p className="text-gray-400">{formatDate(policy.approvedAt || policy.updatedAt)}</p>
                  </div>
                )}
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
              {isReviewMode ? (
                <>
                  {onReject && (
                    <button onClick={handleReject} disabled={pendingAction !== null} className="h-10 px-7 rounded-full border border-red-400 text-red-500 text-[13px] font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]">
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
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
