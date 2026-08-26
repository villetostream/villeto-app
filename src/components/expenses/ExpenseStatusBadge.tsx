"use client";

import type { PersonalExpenseStatus } from "@/components/expenses/table/personalColumns";
import { StatusBadge } from "@/components/ui/status-badge";

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
  let label = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");

  if (context === "manager") {
    switch (status) {
      case "pending_approval":
      case "submitted":
      case "pending":
      case "pending_policy_check":
        label = "Awaiting Approval";
        break;
      case "declined":
        label = "Rejected";
        break;
    }
  } else {
    switch (status) {
      case "submitted":
      case "pending":
      case "pending_policy_check":
        label = "Pending Review";
        break;
      case "declined":
        label = "Rejected";
        break;
    }
  }

  return <StatusBadge status={status} label={label} />;
}