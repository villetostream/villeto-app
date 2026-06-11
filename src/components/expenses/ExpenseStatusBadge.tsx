"use client";

import { Badge } from "@/components/ui/badge";
import { getStatusIcon } from "@/lib/helper";
import type { PersonalExpenseStatus } from "@/components/expenses/table/personalColumns";

export type ExpenseStatusContext = "personal" | "manager";

/** PR list page styling — only used for submitted (my expenses) */
const SUBMITTED_CFG = {
  label: "Submitted",
  className: "text-blue-600 bg-blue-50",
};

export function isPendingExpenseStatus(status: string): boolean {
  return ["pending", "pending_policy_check", "submitted"].includes(status);
}

export function normalizeExpenseDisplayStatus(
  rawStatus: string,
  context: ExpenseStatusContext = "personal",
): string {
  if (rawStatus === "pending_policy_check" || rawStatus === "pending") {
    return context === "personal" ? "submitted" : "pending";
  }
  return rawStatus;
}

export function normalizeExpenseReportStatus(rawStatus: string): PersonalExpenseStatus {
  if (rawStatus === "pending_policy_check") {
    return "pending";
  }
  return rawStatus as PersonalExpenseStatus;
}

function getBadgeVariant(status: string): PersonalExpenseStatus | "pending" {
  if (status === "submitted") return "pending";
  if (status === "declined") return "rejected";
  if (status === "flagged") return "pending";
  return status as PersonalExpenseStatus;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "declined":
      return "Rejected";
    case "paid":
      return "Paid Out";
    case "flagged":
      return "Flagged";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export function ExpenseStatusBadge({
  status,
  context = "personal",
}: {
  status: string;
  context?: ExpenseStatusContext;
}) {
  const displayStatus = normalizeExpenseDisplayStatus(status, context);
  const isSubmittedState =
    context === "personal" &&
    (status === "pending" || status === "pending_policy_check");

  // My Expenses: pending / pending_policy_check → PR-style "Submitted" (blue only)
  if (isSubmittedState) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${SUBMITTED_CFG.className}`}
      >
        {getStatusIcon("submitted")}
        <span className="ml-1">{SUBMITTED_CFG.label}</span>
      </span>
    );
  }

  // All other statuses: existing Badge variants (pending stays orange, etc.)
  const variant = getBadgeVariant(displayStatus);

  return (
    <Badge variant={variant}>
      {getStatusIcon(displayStatus)}
      <span className="ml-1 capitalize">{getStatusLabel(displayStatus)}</span>
    </Badge>
  );
}
