"use client";

import { X, Loader2, Trash2, AlertCircle } from "lucide-react";
import { POLICY_GROUPS, getActionDef, getConditionDef } from "./constants";
import { cn } from "@/lib/utils";
import { useGetProcurementPolicyById, useGetProcurementPolicyDraftById, ProcurementPolicyApiRecord } from "@/queries/procurement/policies";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuthStore } from "@/stores/auth-stores";
import { getApiErrorMessage } from "@/lib/types/api-error";
import { useState, useMemo } from "react";
import { useGetAllRolesApi } from "@/queries/role/get-all-roles";

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toISOString().split("T")[0];
  } catch {
    return "—";
  }
}

const capitalizeName = (n: string) => n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : "";

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
}: {
  policyId: string | null;
  isDraft?: boolean;
  isReviewMode?: boolean;
  onClose: () => void;
  onEdit?: (p: ProcurementPolicyApiRecord) => void;
  onArchive?: (p: ProcurementPolicyApiRecord) => void;
  onSubmitDraft?: (p: ProcurementPolicyApiRecord) => void;
  onDeleteDraft?: (draftId: string) => void;
  onApprove?: (p: ProcurementPolicyApiRecord) => void;
  onReject?: (p: ProcurementPolicyApiRecord) => void;
}) {
  const canDeactivate = useAuthStore((s) => s.can)("policy", "deactivate");
  const canUpdate     = useAuthStore((s) => s.can)("policy", "update");

  const [error, setError] = useState<string | null>(null);
  const [isPendingAction, setIsPendingAction] = useState(false);

  const { data: activeData, isLoading: isActiveLoading } = useGetProcurementPolicyById(isDraft ? "" : (policyId ?? ""), {
    enabled: !!policyId && !isDraft,
  });

  const { data: draftData, isLoading: isDraftLoading } = useGetProcurementPolicyDraftById(isDraft ? (policyId ?? "") : "", {
    enabled: !!policyId && !!isDraft,
  });

  const isLoading = isDraft ? isDraftLoading : isActiveLoading;
  const data = isDraft ? draftData : activeData;
  const policy = data?.data;

  // Fetch all roles to resolve IDs to names (useGetAllRolesApi fetches all pages automatically)
  const { data: rolesData, isLoading: isRolesLoading } = useGetAllRolesApi({ limit: 100 }, { enabled: !!policy });
  const allRoles = useMemo(() => rolesData?.data ?? [], [rolesData]);

  // Helper: resolve a role ID to its display name
  // Checks policy.applicableRoles first (already returned by the policy-by-id endpoint),
  // then falls back to the full roles list.
  const resolveRoleName = (id: string) => {
    const policyRoles: any[] = (policy as any)?.applicableRoles ?? [];
    const fromPolicy = policyRoles.find(
      (r: any) => (r.roleId ?? r.id ?? r.role_id) === id
    );
    if (fromPolicy) return fromPolicy.name ?? fromPolicy.roleName ?? fromPolicy.role_name ?? id;

    const fromAll = allRoles.find(r => r.roleId === id);
    return fromAll?.name ?? id;
  };

  if (!policyId) return null;

  const handleApprove = async () => {
    if (!onApprove || !policy) return;
    setError(null);
    setIsPendingAction(true);
    try {
      await onApprove(policy);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to approve policy"));
    } finally {
      setIsPendingAction(false);
    }
  };

  const handleReject = async () => {
    if (!onReject || !policy) return;
    setError(null);
    setIsPendingAction(true);
    try {
      await onReject(policy);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to reject policy"));
    } finally {
      setIsPendingAction(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="bg-[#fafaf9] rounded-[24px] shadow-2xl w-full max-w-[540px] flex flex-col relative"
        style={{ maxHeight: "92vh" }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors shrink-0 z-10"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {isLoading || !policy || isRolesLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="px-6 pt-6 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 pr-10">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900 leading-tight">
                      {capitalizeName(policy.name)}
                    </h2>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={policy.status} />
                      {isDraft && canUpdate && onDeleteDraft && (
                        <button
                          onClick={() => onDeleteDraft(policy.procurementPolicyId)}
                          className="ml-1 p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors"
                          title="Delete Draft"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-medium text-gray-500 mt-1.5">v{(policy as any).version ?? 1}</p>
                </div>
              </div>
              <div className="h-px bg-black/[0.06] w-full mt-5 mb-5" />
            </div>

            {/* ── Scrollable body ── */}
            <div
              className="flex-1 overflow-y-auto px-6 pb-4 space-y-4"
              style={{ scrollbarWidth: "none" }}
            >
              <style>{`div::-webkit-scrollbar{display:none}`}</style>

              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                SUBMISSION POLICY DETAILS
              </h3>

              {/* NAME & DESCRIPTION */}
              <div className="rounded-[16px] border border-black/[0.06] bg-white p-5 shadow-sm">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Name & Description
                </p>
                <p className="text-[15px] font-semibold text-gray-900">{policy.name}</p>
                {policy.description && (
                  <p className="text-[13px] text-gray-600 mt-1.5 leading-relaxed">
                    {policy.description}
                  </p>
                )}
              </div>

              {/* APPLIES TO */}
              <div className="rounded-[16px] border border-black/[0.06] bg-white p-5 shadow-sm">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Applies To
                </p>
                <div className="rounded-[8px] border border-black/[0.04] p-3">
                  <p className="text-[13px] text-gray-700 font-medium">
                    {policy.scopeType === "company"
                      ? "All Employees in the organization"
                      : "Specific Scope"}
                  </p>
                </div>
              </div>

              {/* ENFORCEMENT RULES */}
              <div className="rounded-[16px] border border-black/[0.06] bg-white p-5 shadow-sm">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Enforcement Rules
                </p>
                <div className="space-y-3">
                  {!policy.rules || policy.rules.length === 0 ? (
                    <p className="text-[13px] text-gray-500 italic py-2">
                      No enforcement rules configured.
                    </p>
                  ) : (
                    policy.rules.map((r, i) => {
                      const cond = getConditionDef(r.condition as any);
                      const action = getActionDef(r.enforcementAction as any);

                      // Resolve role IDs to human-readable names
                      const resolvedRoleNames: string[] = r.allowedRoleIds && r.allowedRoleIds.length > 0
                        ? r.allowedRoleIds.map(resolveRoleName)
                        : [];

                      const isRoleCondition =
                        r.condition === "requester_role_not_allowed" ||
                        r.condition === "requester_role_requires_manager_approval";

                      // Build human-readable rule title
                      const ruleTitle = (() => {
                        if (r.criteria && !r.criteria.includes("allowed role")) return r.criteria;
                        if (isRoleCondition && resolvedRoleNames.length > 0) {
                          const roleList = resolvedRoleNames.join(", ");
                          return r.condition === "requester_role_not_allowed"
                            ? `Apply when requester's role is not one of the permitted roles: ${roleList}`
                            : `Apply when requester's role is one of: ${roleList}`;
                        }
                        return cond?.label ?? r.condition;
                      })();

                      return (
                        <div key={i} className="rounded-[12px] border border-black/[0.04] p-4 bg-[#fafaf9]/50">
                          <div className="text-[13px] font-semibold text-gray-900 mb-2">
                            {ruleTitle}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                            <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-semibold uppercase">IF</span>
                            {isRoleCondition && resolvedRoleNames.length > 0 ? (
                              <span className="text-gray-800">
                                {r.condition === "requester_role_not_allowed"
                                  ? "Requester's role is not in the permitted list"
                                  : "Requester's role matches one of the selected roles"}
                              </span>
                            ) : (
                              <span className="text-gray-800">{cond?.label ?? r.condition}</span>
                            )}
                            {r.amount !== undefined && (
                              <>
                                <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-semibold uppercase">IS GREATER THAN</span>
                                <span className="text-gray-900 font-bold">{r.currency ?? ""} {r.amount.toLocaleString()}</span>
                              </>
                            )}
                            {r.minimumQuotes !== undefined && (
                              <>
                                <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-semibold uppercase">MIN QUOTES</span>
                                <span className="text-gray-900 font-bold">{r.minimumQuotes}</span>
                              </>
                            )}
                            {resolvedRoleNames.length > 0 && (
                              <div className="w-full mt-2 flex flex-col gap-1">
                                <span className="text-[11px] text-gray-500 font-medium">
                                  {r.condition === "requester_role_not_allowed" ? "Permitted roles (only these may submit without triggering this rule):" : "Matching roles:"}
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {resolvedRoleNames.map((name, ri) => (
                                    <span key={ri} className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[11px] font-semibold border border-teal-100">
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded font-semibold uppercase">THEN</span>
                            <span className="text-gray-900">{action?.label ?? r.enforcementAction}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* ── Created & Approved Info ── */}
            <div className="px-6 pt-4 pb-2 shrink-0">
              <div className="flex justify-between gap-4 text-[12px]">
                <div>
                  <p className="text-gray-500 mb-1">Created by</p>
                  {policy.createdBy ? (
                    <>
                      <p className="text-gray-900 font-medium">
                        {policy.createdBy.firstName} {policy.createdBy.lastName}
                        {policy.createdBy.jobTitle ? ` (${policy.createdBy.jobTitle})` : ""}
                      </p>
                      <p className="text-gray-500 mt-0.5">{formatDate(policy.createdAt)}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-900 font-medium">—</p>
                      <p className="text-gray-500 mt-0.5">{formatDate(policy.createdAt)}</p>
                    </>
                  )}
                </div>
                {/* Approver — try approvers[] array first, then approvedBy object */}
                {(() => {
                  const approverList: any[] = (policy.approvers && policy.approvers.length > 0)
                    ? policy.approvers
                    : (policy as any).approvedBy
                      ? [(policy as any).approvedBy]
                      : [];
                  if (approverList.length === 0) return null;
                  return (
                    <div className="text-right">
                      <p className="text-gray-500 mb-1">Approved by</p>
                      {approverList.map((a: any, i: number) => (
                        <div key={i} className="mb-2 last:mb-0">
                          <p className="text-gray-900 font-medium">
                            {a.firstName ?? a.first_name ?? ""} {a.lastName ?? a.last_name ?? ""}
                            {(a.jobTitle || a.job_title) ? ` (${a.jobTitle ?? a.job_title})` : ""}
                          </p>
                          <p className="text-gray-500 mt-0.5">{formatDate(a.approvedAt ?? a.approved_at ?? policy.updatedAt)}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* ── Error Message ── */}
            {error && (
              <div className="px-6 pb-2">
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 leading-snug">{error}</p>
                </div>
              </div>
            )}

            {/* ── Footer buttons ── */}
            <div className="px-6 pb-6 pt-1 shrink-0 flex gap-3">
              {isReviewMode ? (
                <>
                  {onReject && (
                    <button
                      onClick={handleReject}
                      disabled={isPendingAction}
                      className="flex-1 h-11 rounded-full border border-red-500 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      {isPendingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
                    </button>
                  )}
                  {onApprove && (
                    <button
                      onClick={handleApprove}
                      disabled={isPendingAction}
                      className="flex-1 h-11 rounded-full bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
                    >
                      {isPendingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
                    </button>
                  )}
                </>
              ) : (
                <>
                  {!isDraft && canDeactivate && onArchive && policy.status !== "pending" && policy.status !== "pending_approval" && (
                    <button
                      onClick={() => { onArchive(policy); onClose(); }}
                      className="flex-1 h-11 rounded-full border border-[#087f70] text-[#087f70] text-sm font-semibold hover:bg-[#087f70]/5 transition-colors"
                    >
                      Move to Archive
                    </button>
                  )}
                  {canUpdate && onEdit && policy.status !== "pending" && policy.status !== "pending_approval" && (
                    <button
                      onClick={() => { onEdit(policy); onClose(); }}
                      className={
                        isDraft
                          ? "flex-1 h-11 rounded-full border border-[#087f70] text-[#087f70] text-sm font-semibold hover:bg-[#087f70]/5 transition-colors"
                          : "flex-1 h-11 rounded-full bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                      }
                    >
                      Edit
                    </button>
                  )}
                  {isDraft && canUpdate && onSubmitDraft && (
                    <button
                      onClick={() => { onSubmitDraft(policy); onClose(); }}
                      className="flex-1 h-11 rounded-full bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      Submit
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
