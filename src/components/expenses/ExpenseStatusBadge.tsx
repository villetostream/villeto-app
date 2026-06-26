"use client";

import type { PersonalExpenseStatus } from "@/components/expenses/table/personalColumns";

export type ExpenseStatusContext = "personal" | "manager";

// ─────────────────────────────────────────────────────────────────────────────
// Unified Color Palette (same token, used by both context maps for consistency)
//   draft              → amber
//   pending/in-review  → orange
//   approved           → emerald
//   paid               → teal
//   rejected/declined  → red
//   flagged            → purple
// ─────────────────────────────────────────────────────────────────────────────

// ─── Personal (submitter) view — lifecycle tracking language ──────────────────
// Answer: "Where is MY expense right now?"
const PERSONAL_STATUS_CFG: Record<string, { label: string; className: string }> = {
  draft:                { label: "Draft",          className: "text-amber-600 bg-amber-50" },
  submitted:            { label: "Pending Review",  className: "text-orange-600 bg-orange-50" },
  pending:              { label: "Pending Review",  className: "text-orange-600 bg-orange-50" },
  pending_policy_check: { label: "Pending Review",  className: "text-orange-600 bg-orange-50" },
  approved:             { label: "Approved",        className: "text-emerald-600 bg-emerald-50" },
  paid:                 { label: "Paid Out",        className: "text-teal-600 bg-teal-50" },
  declined:             { label: "Rejected",        className: "text-red-500 bg-red-50" },
  rejected:             { label: "Rejected",        className: "text-red-500 bg-red-50" },
  flagged:              { label: "Flagged",         className: "text-purple-600 bg-purple-50" },
};

// ─── Manager (team/company) view — action-oriented language ───────────────────
// Answer: "What do I need to DO with this expense?"
const APPROVAL_STATUS_CFG: Record<string, { label: string; className: string }> = {
  // approvalStatus values from API
  pending_approval:     { label: "Awaiting Approval", className: "text-orange-600 bg-orange-50" },
  approved:             { label: "Approved",           className: "text-emerald-600 bg-emerald-50" },
  rejected:             { label: "Rejected",           className: "text-red-500 bg-red-50" },
  declined:             { label: "Rejected",           className: "text-red-500 bg-red-50" },
  paid:                 { label: "Paid Out",           className: "text-teal-600 bg-teal-50" },
  draft:                { label: "Draft",              className: "text-amber-600 bg-amber-50" },
  // Fallback: when approvalStatus is absent, derive from report.status
  submitted:            { label: "Awaiting Approval",  className: "text-orange-600 bg-orange-50" },
  pending:              { label: "Awaiting Approval",  className: "text-orange-600 bg-orange-50" },
  pending_policy_check: { label: "Awaiting Approval",  className: "text-orange-600 bg-orange-50" },
};

const FALLBACK_CFG = { label: "", className: "text-slate-500 bg-slate-100" };

// ─── Kept for external call sites ────────────────────────────────────────────
export function isPendingExpenseStatus(status: string): boolean {
  return ["pending", "pending_policy_check", "submitted"].includes(status);
}

export function normalizeExpenseDisplayStatus(
  rawStatus: string,
  _context?: ExpenseStatusContext,
): string {
  if (rawStatus === "pending_policy_check") return "pending";
  return rawStatus;
}

export function normalizeExpenseReportStatus(rawStatus: string): PersonalExpenseStatus {
  if (rawStatus === "pending_policy_check") return "pending";
  return rawStatus as PersonalExpenseStatus;
}

// ─── Badge ────────────────────────────────────────────────────────────────────
/**
 * context="personal"  → PERSONAL_STATUS_CFG  (submitter sees lifecycle language)
 * context="manager"   → APPROVAL_STATUS_CFG   (approver sees action language)
 */
export function ExpenseStatusBadge({
  status,
  context = "personal",
}: {
  status: string;
  context?: ExpenseStatusContext;
}) {
  const cfg_map = context === "manager" ? APPROVAL_STATUS_CFG : PERSONAL_STATUS_CFG;
  const cfg = cfg_map[status] ?? {
    ...FALLBACK_CFG,
    label: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " "),
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}