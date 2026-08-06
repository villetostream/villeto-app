"use client";

import { X } from "lucide-react";
import { POLICY_GROUPS, getActionDef, getConditionDef } from "./constants";
import { cn } from "@/lib/utils";
import type { ProcurementPolicyApiRecord } from "@/queries/procurement/policies";

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function ProcurementPolicyDetailsModal({
  policy,
  onClose,
}: {
  policy: ProcurementPolicyApiRecord | null;
  onClose: () => void;
}) {
  if (!policy) return null;

  const groupLabel =
    POLICY_GROUPS.find((g) => g.value === policy.policyGroup)?.title ?? policy.policyGroup;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[620px] max-h-[85vh] overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#0b100e]">{policy.name}</h2>
              <p className="text-sm text-[#68726d] mt-0.5">{groupLabel}</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f9faf9] transition-colors text-[#68726d] shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Description */}
            {policy.description && (
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-[#68726d] mb-1.5">DESCRIPTION</p>
                <p className="text-sm text-[#0b100e]">{policy.description}</p>
              </div>
            )}

            {/* Scope */}
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-[#68726d] mb-1.5">SCOPE</p>
              <p className="text-sm text-[#0b100e] capitalize">{policy.scopeType === "company" ? "Entire Company" : "Specific Scope"}</p>
            </div>

            {/* Rules */}
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-[#68726d] mb-2">ENFORCEMENT RULES</p>
              {policy.rules.length === 0 ? (
                <p className="text-sm text-[#68726d]">No rules configured.</p>
              ) : (
                <div className="space-y-3">
                  {policy.rules.map((r, i) => {
                    const cond = getConditionDef(r.condition as Parameters<typeof getConditionDef>[0]);
                    const action = getActionDef(r.enforcementAction as Parameters<typeof getActionDef>[0]);
                    return (
                      <div key={i} className="rounded-[14px] border border-black/[0.06] p-3.5">
                        <p className="text-sm text-[#0b100e] mb-1">
                          <span className="font-medium">{r.criteria || cond?.label || r.condition}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="bg-[#087f70]/10 text-[#087f70] px-1.5 py-0.5 rounded font-semibold">THEN</span>
                          <span className={cn(
                            "font-semibold",
                            action?.severity === "hard" ? "text-[#ef4444]" : "text-blue-600"
                          )}>
                            {action?.label ?? r.enforcementAction}
                          </span>
                          {r.amount !== undefined && (
                            <span className="text-[#68726d]">
                              · {r.currency ?? ""} {r.amount.toLocaleString()}
                            </span>
                          )}
                          {r.minimumQuotes !== undefined && (
                            <span className="text-[#68726d]">· Min {r.minimumQuotes} quotes</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-[#68726d] mb-1">EFFECTIVE FROM</p>
                <p className="text-sm text-[#0b100e]">{formatDate(policy.effectiveAt)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-[#68726d] mb-1">EXPIRES ON</p>
                <p className="text-sm text-[#0b100e]">{formatDate(policy.expiresAt)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-[#68726d] mb-1">PRIORITY</p>
                <p className="text-sm text-[#0b100e]">{policy.priority}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-[#68726d] mb-1">REQUIRES APPROVAL</p>
                <p className="text-sm text-[#0b100e]">{policy.requiresApproval ? `Yes (${policy.approvalMode})` : "No"}</p>
              </div>
            </div>

            {/* Timestamps */}
            <div className="border-t border-black/[0.06] pt-4 text-xs text-[#68726d]">
              Created {formatDate(policy.createdAt)} · Updated {formatDate(policy.updatedAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
