"use client";

import type { PersonalExpenseStatus } from "@/components/expenses/table/personalColumns";

export type ExpenseStatusContext = "personal" | "manager";

// ─────────────────────────────────────────────────────────────────────────────
// Unified Color Palette — design-system tokens
//   draft              → amber (warm)
//   pending/in-review  → amber-dark
//   approved           → teal
//   paid               → teal (stronger)
//   rejected/declined  → red
//   flagged            → purple (kept)
// ─────────────────────────────────────────────────────────────────────────────

const PERSONAL_STATUS_CFG: Record<string, { label: string; className: string }> = {
  draft:                { label: "Draft",          className: "text-[#b27b00] bg-[#fff9e6] border border-[#ffe099]" },
  submitted:            { label: "Pending Review",  className: "text-[#b27b00] bg-[#fff9e6] border border-[#ffe099]" },
  pending:              { label: "Pending Review",  className: "text-[#b27b00] bg-[#fff9e6] border border-[#ffe099]" },
  pending_policy_check: { label: "Pending Review",  className: "text-[#b27b00] bg-[#fff9e6] border border-[#ffe099]" },
  approved:             { label: "Approved",        className: "text-[#087f70] bg-[#f0faf8] border border-[#e7f6f2]" },
  paid:                 { label: "Paid Out",        className: "text-[#065f55] bg-[#e7f6f2] border border-[#c8ece8]" },
  declined:             { label: "Rejected",        className: "text-[#d33d44] bg-[#fdf2f2] border border-[#fbd5d5]" },
  rejected:             { label: "Rejected",        className: "text-[#d33d44] bg-[#fdf2f2] border border-[#fbd5d5]" },
  flagged:              { label: "Flagged",         className: "text-[#7c3aed] bg-[#f5f3ff] border border-[#ddd6fe]" },
};

const APPROVAL_STATUS_CFG: Record<string, { label: string; className: string }> = {
  pending_approval:     { label: "Awaiting Approval", className: "text-[#b27b00] bg-[#fff9e6] border border-[#ffe099]" },
  approved:             { label: "Approved",           className: "text-[#087f70] bg-[#f0faf8] border border-[#e7f6f2]" },
  rejected:             { label: "Rejected",           className: "text-[#d33d44] bg-[#fdf2f2] border border-[#fbd5d5]" },
  declined:             { label: "Rejected",           className: "text-[#d33d44] bg-[#fdf2f2] border border-[#fbd5d5]" },
  paid:                 { label: "Paid Out",           className: "text-[#065f55] bg-[#e7f6f2] border border-[#c8ece8]" },
  draft:                { label: "Draft",              className: "text-[#b27b00] bg-[#fff9e6] border border-[#ffe099]" },
  submitted:            { label: "Awaiting Approval",  className: "text-[#b27b00] bg-[#fff9e6] border border-[#ffe099]" },
  pending:              { label: "Awaiting Approval",  className: "text-[#b27b00] bg-[#fff9e6] border border-[#ffe099]" },
  pending_policy_check: { label: "Awaiting Approval",  className: "text-[#b27b00] bg-[#fff9e6] border border-[#ffe099]" },
};

const FALLBACK_CFG = { label: "", className: "text-[#68726d] bg-[#f9faf9] border border-black/[0.08]" };

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
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}