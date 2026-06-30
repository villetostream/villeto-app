/**
 * Single source of truth for Purchase Order status display config.
 *
 * Dual-context labelling (mirrors purchase-request-status.ts):
 * - Submitter (own view):  status==="pending_approval" → "Pending Review"
 * - Approver (elevated):   status==="pending_approval" → "Awaiting Approval"
 */

export interface POStatusConfig {
  label: string;
  className: string;
}

export const PO_STATUS_CFG: Record<string, POStatusConfig> = {
  draft:               { label: "Draft",               className: "text-amber-600 bg-amber-50" },
  pending_review:      { label: "Pending Review",      className: "text-orange-600 bg-orange-50" },
  pending_approval:    { label: "Awaiting Approval",   className: "text-orange-600 bg-orange-50" },
  ready_to_issue:      { label: "Ready to Issue",      className: "text-violet-600 bg-violet-50" },
  approved:            { label: "Approved",            className: "text-emerald-600 bg-emerald-50" },
  issued:              { label: "Issued",              className: "text-blue-600 bg-blue-50" },
  acknowledged:        { label: "Acknowledged",        className: "text-amber-500 bg-amber-50" },
  acknowledge:         { label: "Acknowledged",        className: "text-amber-500 bg-amber-50" },
  ready_for_delivery:  { label: "Ready for Delivery",  className: "text-purple-600 bg-purple-50" },
  delivered:           { label: "Delivered",           className: "text-emerald-600 bg-emerald-50" },
  partially_delivered: { label: "Partial Delivery",    className: "text-teal-600 bg-teal-50" },
  rejected:            { label: "Rejected",            className: "text-red-500 bg-red-50" },
  closed:              { label: "Closed",              className: "text-slate-600 bg-slate-100" },
  cancelled:           { label: "Withdrawn",           className: "text-red-600 bg-red-50" },
};

/**
 * Derives the correct display status key from the raw API response.
 *
 * @param status       - Raw status from the API (e.g. "pending_approval").
 * @param isOwnView    - When true, the viewer is on My POs / submitter context.
 */
export function getPODisplayStatus(status: string, isOwnView?: boolean): string {
  if (status === "pending_approval") {
    return isOwnView ? "pending_review" : "pending_approval";
  }
  return status;
}

export function getPOStatusLabel(status: string, isOwnView?: boolean): string {
  const key = getPODisplayStatus(status, isOwnView);
  return PO_STATUS_CFG[key]?.label ?? status.replace(/_/g, " ");
}
