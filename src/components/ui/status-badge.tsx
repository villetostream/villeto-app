import { cn } from "@/lib/utils";

export type UnifiedStatus = 
  | "active" | "approved" | "posted" | "verified" | "delivered" | "confirmed" | "done"
  | "pending" | "submitted" | "resubmitted" | "pending_approval" | "under_review" | "pending_policy_check" | "awaiting_authorization" | "partially_delivered"
  | "draft" | "provisional"
  | "rejected" | "declined" | "returned" | "cancelled" | "withdrawn"
  | "paid" 
  | "flagged" | "scheduled"
  | "inactive" | "deactivated"
  | "invited" | "onboarding" | "processing"
  | "upcoming" | "due" | "overdue" | "matched" | "skipped" | "paused" | "ended";

interface StatusBadgeProps {
  status: string | null | undefined;
  className?: string;
  label?: string;
}

export function StatusBadge({ status, className, label }: StatusBadgeProps) {
  const normalizedStatus = (status || "").toLowerCase().trim();
  
  // Base style shared across all badges
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap shrink-0";
  
  let colorClasses = "";
  let defaultLabel = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1).replace(/_/g, " ");

  switch (normalizedStatus) {
    // Teal (Success)
    case "active":
    case "approved":
    case "applied":
    case "posted":
    case "verified":
    case "delivered":
    case "confirmed":
    case "done":
    case "converted_to_po":
    case "partially_converted_to_po":
    case "matched":
      colorClasses = "text-[#087f70] bg-[#f0faf8] border-[#c8ece4]";
      if (normalizedStatus === "applied") defaultLabel = "Applied";
      if (normalizedStatus === "posted") defaultLabel = "Posted";
      if (normalizedStatus === "converted_to_po") defaultLabel = "Converted to PO";
      if (normalizedStatus === "partially_converted_to_po") defaultLabel = "Partially Converted to PO";
      if (normalizedStatus === "matched") defaultLabel = "Matched";
      break;
      
    // Deep Teal (Financial Success)
    case "paid":
      colorClasses = "text-[#065f55] bg-[#e7f6f2] border-[#c8ece8]";
      break;
      
    // Amber (Pending Action)
    case "pending":
    case "submitted":
    case "resubmitted":
    case "pending_approval":
    case "pending_review":
    case "returned_for_correction":
    case "pending_policy_check":
    case "under_review":
    case "awaiting_authorization":
    case "partially_delivered":
    case "partially_delivered_with_exceptions":
    case "delivered_with_exceptions":
    case "full_delivery_with_exceptions":
    case "due":
    case "paused":
      colorClasses = "text-[#b27b00] bg-[#fff9e6] border-[#ffe099]";
      if (normalizedStatus === "resubmitted") {
        defaultLabel = "Resubmitted";
      } else if (normalizedStatus === "pending_review") {
        defaultLabel = "Pending Review";
      } else if (normalizedStatus === "returned_for_correction") {
        defaultLabel = "Returned for Correction";
      } else if (["pending_approval", "pending_policy_check", "under_review", "awaiting_authorization"].includes(normalizedStatus)) {
        defaultLabel = "Pending";
      } else if (normalizedStatus === "partially_delivered") {
        defaultLabel = "Partially Delivered";
      } else if (normalizedStatus === "partially_delivered_with_exceptions") {
        defaultLabel = "Partially Delivered (Issues)";
      } else if (normalizedStatus === "delivered_with_exceptions") {
        defaultLabel = "Delivered (Issues)";
      } else if (normalizedStatus === "due") {
        defaultLabel = "Due";
      } else if (normalizedStatus === "paused") {
        defaultLabel = "Paused";
      }
      break;
      
    // Slate/Blue-gray (Work in progress)
    case "draft":
    case "provisional":
    case "not_submitted":
      colorClasses = "text-[#4a5568] bg-[#f7fafc] border-[#e2e8f0]";
      if (normalizedStatus === "not_submitted") defaultLabel = "Draft";
      break;
      
    // Blue (Informational / Onboarding / Processing / Issued / Upcoming)
    case "invited":
    case "onboarding":
    case "processing":
    case "issued":
    case "acknowledged":
    case "ready_for_delivery":
    case "ready_to_issue":
    case "approved_pending_issue":
    case "upcoming":
      colorClasses = "text-[#0066cc] bg-[#f0f6ff] border-[#d6e7ff]";
      if (normalizedStatus === "ready_for_delivery") defaultLabel = "Ready for Delivery";
      if (normalizedStatus === "ready_to_issue") defaultLabel = "Ready to Issue";
      if (normalizedStatus === "approved_pending_issue") defaultLabel = "Awaiting Final Issue";
      if (normalizedStatus === "upcoming") defaultLabel = "Upcoming";
      break;
      
    // Red (Error / Rejection / Cancellation / Overdue)
    case "rejected":
    case "declined":
    case "returned":
    case "cancelled":
    case "withdrawn":
    case "overdue":
      colorClasses = "text-[#d33d44] bg-[#fdf2f2] border-[#fbd5d5]";
      if (normalizedStatus === "declined") defaultLabel = "Rejected";
      if (normalizedStatus === "overdue") defaultLabel = "Overdue";
      break;
      
    // Purple (Warning / Flagged / Scheduled)
    case "flagged":
    case "scheduled":
      colorClasses = "text-[#7c3aed] bg-[#f5f3ff] border-[#ddd6fe]";
      break;
      
    // Gray (Dormant / Inactive / Skipped / Ended / Expired)
    case "inactive":
    case "deactivated":
    case "skipped":
    case "ended":
    case "expired":
      colorClasses = "text-[#68726d] bg-[#f5f7f6] border-[#e2e5e4]";
      if (normalizedStatus === "skipped") defaultLabel = "Skipped";
      if (normalizedStatus === "ended") defaultLabel = "Ended";
      if (normalizedStatus === "expired") defaultLabel = "Expired";
      break;

    default:
      // Fallback
      colorClasses = "text-[#68726d] bg-[#f9faf9] border-black/[0.08]";
      defaultLabel = normalizedStatus ? defaultLabel : "Unknown";
      break;
  }

  return (
    <span className={cn(baseClasses, colorClasses, className)}>
      {label || defaultLabel}
    </span>
  );
}
