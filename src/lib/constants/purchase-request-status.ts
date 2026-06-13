/**
 * Single source of truth for Purchase Request status display config.
 *
 * Rules:
 * - `status === "submitted"` is displayed as "Pending Approval" everywhere.
 *   The raw API value "submitted" is an internal lifecycle state; the human-
 *   readable state the user cares about is whether it is pending a decision.
 * - `pending_approval` is a synthetic display key derived from
 *   approvalStatus === "pending_approval" when status === "submitted".
 *   It is never stored on the server — it exists only for UI rendering.
 */

export type PRDisplayStatus =
  | "draft"
  | "pending_approval"
  | "submitted"
  | "approved"
  | "rejected"
  | "partially_converted"
  | "converted_to_po"
  | "cancelled";

export interface PRStatusConfig {
  label: string;
  /** Tailwind classes for both the list badge and the detail badge */
  className: string;
}

export const PR_STATUS_CFG: Record<string, PRStatusConfig> = {
  draft:               { label: "Draft",             className: "text-amber-600 bg-amber-50" },
  /**
   * submitted + pending_approval both render the same way.
   * "submitted" is kept as a fallback in case the server ever sends it
   * without a corresponding approvalStatus.
   */
  submitted:           { label: "Pending Approval",  className: "text-violet-600 bg-violet-50" },
  pending_approval:    { label: "Pending Approval",  className: "text-violet-600 bg-violet-50" },
  approved:            { label: "Approved",          className: "text-emerald-600 bg-emerald-50" },
  rejected:            { label: "Rejected",          className: "text-red-500 bg-red-50" },
  partially_converted: { label: "Partially Converted", className: "text-purple-600 bg-purple-50" },
  converted_to_po:     { label: "Converted to PO",   className: "text-teal-600 bg-teal-50" },
  cancelled:           { label: "Withdrawn",         className: "text-slate-500 bg-slate-100" },
};

export const PR_PRIORITY_CFG: Record<string, { label: string; className: string }> = {
  low:    { label: "Low",    className: "text-slate-500 bg-slate-100" },
  medium: { label: "Medium", className: "text-orange-500 bg-orange-50" },
  urgent: { label: "High",   className: "text-red-500 bg-red-50" },
};

/**
 * Derives the correct display status key from the raw API response.
 *
 * When a request has been submitted and is awaiting a decision,
 * the server sends status="submitted" and approvalStatus="pending_approval".
 * We surface "Pending Approval" to all roles (requester and approver alike)
 * so the terminology is consistent across My Requests and Team/Company tabs.
 */
export function getPRDisplayStatus(
  status: string,
  _approvalStatus?: string | null
): string {
  if (status === "submitted") {
    // Map to the unified "pending_approval" display key
    return "pending_approval";
  }
  return status;
}
