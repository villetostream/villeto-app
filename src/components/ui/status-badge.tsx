import { cn } from "@/lib/utils";

export type UnifiedStatus = 
  | "active" | "approved" | "posted" | "verified" | "delivered" | "confirmed" | "done"
  | "pending" | "submitted" | "pending_approval" | "under_review" | "pending_policy_check" | "awaiting_authorization" | "partially_delivered"
  | "draft" | "provisional"
  | "rejected" | "declined" | "returned" | "cancelled" | "withdrawn"
  | "paid" 
  | "flagged" | "scheduled"
  | "inactive" | "deactivated"
  | "invited" | "onboarding" | "processing";

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
    case "posted":
    case "verified":
    case "delivered":
    case "confirmed":
    case "done":
      colorClasses = "text-[#087f70] bg-[#f0faf8] border-[#c8ece4]";
      if (normalizedStatus === "posted") defaultLabel = "Posted";
      break;
      
    // Deep Teal (Financial Success)
    case "paid":
      colorClasses = "text-[#065f55] bg-[#e7f6f2] border-[#c8ece8]";
      break;
      
    // Amber (Pending Action)
    case "pending":
    case "submitted":
    case "pending_approval":
    case "pending_policy_check":
    case "under_review":
    case "awaiting_authorization":
    case "partially_delivered":
      colorClasses = "text-[#b27b00] bg-[#fff9e6] border-[#ffe099]";
      if (["pending_approval", "pending_policy_check", "under_review", "awaiting_authorization"].includes(normalizedStatus)) {
        defaultLabel = "Pending";
      }
      break;
      
    // Slate/Blue-gray (Work in progress)
    case "draft":
    case "provisional":
      colorClasses = "text-[#4a5568] bg-[#f7fafc] border-[#e2e8f0]";
      break;
      
    // Blue (Informational / Onboarding / Processing)
    case "invited":
    case "onboarding":
    case "processing":
      colorClasses = "text-[#0066cc] bg-[#f0f6ff] border-[#d6e7ff]";
      break;
      
    // Red (Error / Rejection / Cancellation)
    case "rejected":
    case "declined":
    case "returned":
    case "cancelled":
    case "withdrawn":
      colorClasses = "text-[#d33d44] bg-[#fdf2f2] border-[#fbd5d5]";
      if (normalizedStatus === "declined") defaultLabel = "Rejected";
      break;
      
    // Purple (Warning / Flagged / Scheduled)
    case "flagged":
    case "scheduled":
      colorClasses = "text-[#7c3aed] bg-[#f5f3ff] border-[#ddd6fe]";
      break;
      
    // Gray (Dormant / Inactive)
    case "inactive":
    case "deactivated":
      colorClasses = "text-[#68726d] bg-[#f5f7f6] border-[#e2e5e4]";
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
