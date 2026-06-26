/**
 * Single source of truth for Purchase Request status display config.
 *
 * Dual-context labelling:
 * - Submitter (own view):  status==="submitted" → key "submitted"  → "Pending Review"
 * - Approver (team/co.):   status==="submitted" → key "pending_approval" → "Awaiting Approval"
 *
 * `pending_approval` is a derived display key, never stored on the server.
 * It exists only for UI rendering on elevated (team/company) scopes.
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
  draft:               { label: "Draft",            className: "text-amber-600 bg-amber-50" },
  /**
   * submitted        → submitter's own view  → "Pending Review"   (lifecycle language)
   * pending_approval → approver's view       → "Awaiting Approval" (action language)
   * Both use orange — the unified pending color across the app.
   */
  submitted:           { label: "Pending Review",    className: "text-orange-600 bg-orange-50" },
  pending_approval:    { label: "Awaiting Approval", className: "text-orange-600 bg-orange-50" },
  approved:            { label: "Approved",          className: "text-emerald-600 bg-emerald-50" },
  rejected:            { label: "Rejected",          className: "text-red-500 bg-red-50" },
  partially_converted: { label: "Partially Converted", className: "text-purple-600 bg-purple-50" },
  converted_to_po:     { label: "Converted to PO",  className: "text-teal-600 bg-teal-50" },
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
 * @param status         - The raw status string from the API (e.g. "submitted").
 * @param _approvalStatus - Unused; kept for backwards-compatibility of call sites.
 * @param isOwnRequest   - When true, the viewer is the requester (own scope).
 *                         They see "Pending Review" (lifecycle language).
 *                         When false/undefined, the viewer is an approver.
 *                         They see "Awaiting Approval" (action language).
 */
export function getPRDisplayStatus(
  status: string,
  _approvalStatus?: string | null,
  isOwnRequest?: boolean,
): string {
  if (status === "submitted") {
    // Requester's own view → lifecycle language ("Pending Review")
    if (isOwnRequest) return "submitted";
    // Approver's view → action language ("Awaiting Approval")
    return "pending_approval";
  }
  return status;
}
