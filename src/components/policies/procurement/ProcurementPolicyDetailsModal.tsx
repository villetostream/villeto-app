"use client";

import { X } from "lucide-react";
import { POLICY_GROUPS, getActionDef, getConditionDef } from "./constants";
import { cn } from "@/lib/utils";
import type { ProcurementPolicyApiRecord } from "@/queries/procurement/policies";
import { useAuthStore } from "@/stores/auth-stores";

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toISOString().split("T")[0];
  } catch {
    return "—";
  }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-success/10 text-success",
    active:   "bg-success/10 text-success",
    pending:  "bg-pending/10 text-pending",
    draft:    "bg-draft/10 text-draft",
    inactive: "bg-[#f9faf9]/60 text-[#68726d]",
  };
  const cls = map[status?.toLowerCase()] ?? "bg-[#f9faf9]/60 text-[#68726d]";
  return (
    <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-semibold capitalize ${cls}`}>
      {status ?? "—"}
    </span>
  );
}

export function ProcurementPolicyDetailsModal({
  policy,
  onClose,
  onEdit,
  onArchive,
}: {
  policy: ProcurementPolicyApiRecord | null;
  onClose: () => void;
  onEdit?: (p: ProcurementPolicyApiRecord) => void;
  onArchive?: (p: ProcurementPolicyApiRecord) => void;
}) {
  const canDeactivate = useAuthStore((s) => s.can)("policy", "deactivate");
  const canUpdate     = useAuthStore((s) => s.can)("policy", "update");

  if (!policy) return null;

  const groupDef = POLICY_GROUPS.find((g) => g.value === policy.policyGroup);
  const groupLabel = groupDef?.title ?? policy.policyGroup;

  const scopeText =
    policy.scopeType === "company"
      ? "All Employees in the organization"
      : "Specific Scope";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-[500px] flex flex-col"
        style={{ maxHeight: "92vh" }}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-6 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-[#0b100e] leading-tight">
                  {policy.name}
                </h2>
                <StatusBadge status={policy.status} />
              </div>
              <p className="text-xs text-[#68726d] mt-0.5">{groupLabel}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#f9faf9]/40 hover:bg-[#f9faf9]/70 flex items-center justify-center transition-colors shrink-0 mt-0.5"
            >
              <X className="w-4 h-4 text-[#68726d]" />
            </button>
          </div>
          <div className="h-px bg-border w-full mt-5 mb-4 opacity-60" />
        </div>

        {/* ── Scrollable body ── */}
        <div
          className="flex-1 overflow-y-auto px-6 pb-2 space-y-3"
          style={{ scrollbarWidth: "none" }}
        >
          <style>{`div::-webkit-scrollbar{display:none}`}</style>

          {/* NAME & DESCRIPTION */}
          {policy.description && (
            <div className="rounded-[24px] border border-black/[0.06]/70 p-4">
              <p className="text-[10px] font-bold text-[#68726d] uppercase tracking-[0.12em] mb-2.5">
                Name & Description
              </p>
              <p className="text-sm font-semibold text-[#0b100e]">{policy.name}</p>
              <p className="text-xs text-[#68726d] mt-1 leading-relaxed">{policy.description}</p>
            </div>
          )}

          {/* APPLIES TO */}
          <div className="rounded-[24px] border border-black/[0.06]/70 p-4">
            <p className="text-[10px] font-bold text-[#68726d] uppercase tracking-[0.12em] mb-2.5">
              Applies To
            </p>
            <p className="text-sm text-[#0b100e]/80 leading-relaxed">{scopeText}</p>
          </div>

          {/* ENFORCEMENT RULES */}
          <div className="rounded-[24px] border border-black/[0.06]/70 p-4">
            <p className="text-[10px] font-bold text-[#68726d] uppercase tracking-[0.12em] mb-2.5">
              Enforcement Rules
            </p>
            <div className="space-y-2">
              {policy.rules.length === 0 ? (
                <p className="text-sm text-[#68726d] italic text-center py-3">
                  No enforcement rules configured.
                </p>
              ) : (
                policy.rules.map((r, i) => {
                  const cond   = getConditionDef(r.condition as Parameters<typeof getConditionDef>[0]);
                  const action = getActionDef(r.enforcementAction as Parameters<typeof getActionDef>[0]);
                  const isHard = action?.severity === "hard";

                  return (
                    <div key={i} className="rounded-[14px] border border-black/[0.06] p-3.5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-[#0b100e]">
                          {r.criteria || cond?.label || r.condition}
                        </span>
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                            isHard
                              ? "bg-red-50 text-red-500 border-red-100"
                              : "bg-amber-50 text-amber-600 border-amber-100"
                          )}
                        >
                          {isHard ? "Hard Block" : "Soft Warning"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="bg-[#087f70]/10 text-[#087f70] px-2 py-0.5 rounded font-semibold">IF</span>
                        <span className="text-[#0b100e]">{cond?.label ?? r.condition}</span>
                        {r.amount !== undefined && (
                          <>
                            <span className="bg-[#edf4ff] text-[#3b67b0] px-2 py-0.5 rounded font-semibold">IS GREATER THAN</span>
                            <span className="text-[#0b100e] font-medium">{r.currency ?? ""} {r.amount.toLocaleString()}</span>
                          </>
                        )}
                        {r.minimumQuotes !== undefined && (
                          <>
                            <span className="bg-[#edf4ff] text-[#3b67b0] px-2 py-0.5 rounded font-semibold">MIN QUOTES</span>
                            <span className="text-[#0b100e] font-medium">{r.minimumQuotes}</span>
                          </>
                        )}
                        <span className="bg-[#087f70]/10 text-[#087f70] px-2 py-0.5 rounded font-semibold">THEN</span>
                        <span className={cn("font-semibold", isHard ? "text-red-500" : "text-amber-600")}>
                          {action?.label ?? r.enforcementAction}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SCHEDULE */}
          {(policy.effectiveAt || policy.expiresAt) && (
            <div className="rounded-[24px] border border-black/[0.06]/70 p-4">
              <p className="text-[10px] font-bold text-[#68726d] uppercase tracking-[0.12em] mb-2.5">
                Schedule
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-[#68726d] mb-1">Effective from</p>
                  <p className="text-sm font-semibold text-[#0b100e]">{formatDate(policy.effectiveAt)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#68726d] mb-1">Expires on</p>
                  <p className="text-sm font-semibold text-[#0b100e]">{formatDate(policy.expiresAt)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Created info ── */}
        <div className="px-6 pt-3 pb-4 shrink-0">
          <div className="flex justify-between gap-4">
            <div>
              <p className="text-[11px] text-[#68726d] mb-1.5">Created on</p>
              <p className="text-sm font-semibold text-[#0b100e] leading-tight">{formatDate(policy.createdAt)}</p>
            </div>
            {policy.requiresApproval && (
              <div className="text-right">
                <p className="text-[11px] text-[#68726d] mb-1.5">Requires approval</p>
                <p className="text-sm font-semibold text-[#0b100e] capitalize leading-tight">{policy.approvalMode}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer buttons ── */}
        <div className="px-6 pb-6 pt-1 shrink-0 flex gap-3">
          {canDeactivate && onArchive && (
            <button
              onClick={() => { onArchive(policy); onClose(); }}
              className="flex-1 h-11 rounded-full border border-[#087f70] text-[#087f70] text-sm font-semibold hover:bg-[#087f70]/5 transition-colors"
            >
              Move to Archive
            </button>
          )}
          {canUpdate && onEdit && (
            <button
              onClick={() => { onEdit(policy); onClose(); }}
              className="flex-1 h-11 rounded-full bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
