type CanFn = (resource: string, action: string) => boolean;

const RESOURCE = "procurement.purchase_order";

/** View company-wide PO list (All POs tab). */
export function canPOReadCompany(can: CanFn): boolean {
  return can(RESOURCE, "read_company");
}

/** View department/team PO list (All POs tab for team scope). */
export function canPOReadDepartment(can: CanFn): boolean {
  return can(RESOURCE, "read_department");
}

/** View own PO list (My POs tab). */
export function canPOReadOwn(can: CanFn): boolean {
  return can(RESOURCE, "read_own");
}

export function canPOAccessList(can: CanFn): boolean {
  return canPOReadCompany(can) || canPOReadDepartment(can) || canPOReadOwn(can);
}

export function canPOCreate(can: CanFn): boolean {
  return can(RESOURCE, "create");
}

export function canPOUpdateDraft(can: CanFn): boolean {
  return can(RESOURCE, "update_draft") || can(RESOURCE, "create");
}

export function canPOSubmit(can: CanFn): boolean {
  return can(RESOURCE, "submit") || can(RESOURCE, "create");
}

/** Approval decision — backend action is `approval_decision`. */
export function canPOApprove(can: CanFn): boolean {
  return can(RESOURCE, "approval_decision") || can(RESOURCE, "approve");
}

export function canPOIssue(can: CanFn): boolean {
  return can(RESOURCE, "issue");
}

export function canPOCancel(can: CanFn): boolean {
  return can(RESOURCE, "cancel") || can(RESOURCE, "manage");
}

export function canPOClose(can: CanFn): boolean {
  return can(RESOURCE, "close") || can(RESOURCE, "manage");
}

export function canPOReceive(can: CanFn): boolean {
  return can(RESOURCE, "receive") || can(RESOURCE, "manage");
}

export function canPOAssignVendor(can: CanFn): boolean {
  return can(RESOURCE, "assign_vendor") || can(RESOURCE, "update_draft") || can(RESOURCE, "create");
}

/** Map outer tab key to API list scope. */
export function poOuterTabToScope(
  outerTab: string,
  can: CanFn,
): "own" | "team" | "company" {
  if (outerTab === "own") return "own";
  if (canPOReadCompany(can)) return "company";
  if (canPOReadDepartment(can)) return "team";
  return "own";
}

/** Build a list-page URL preserving tab state. */
export function buildPOListUrl(outerTab?: string | null, innerTab?: string | null): string {
  const params = new URLSearchParams();
  if (outerTab) params.set("outerTab", outerTab);
  if (innerTab) params.set("innerTab", innerTab);
  const query = params.toString();
  return query ? `/procurement/purchase-order?${query}` : "/procurement/purchase-order";
}

/** Build a PO detail URL preserving tab state for back navigation. */
export function buildPODetailUrl(
  id: string,
  outerTab?: string | null,
  innerTab?: string | null,
): string {
  const params = new URLSearchParams();
  if (outerTab) params.set("outerTab", outerTab);
  if (innerTab) params.set("innerTab", innerTab);
  const query = params.toString();
  return query
    ? `/procurement/purchase-order/${id}?${query}`
    : `/procurement/purchase-order/${id}`;
}

/** Build a PO edit URL preserving tab state. */
export function buildPOEditUrl(
  id: string,
  outerTab?: string | null,
  innerTab?: string | null,
): string {
  const params = new URLSearchParams();
  if (outerTab) params.set("outerTab", outerTab);
  if (innerTab) params.set("innerTab", innerTab);
  const query = params.toString();
  return query
    ? `/procurement/purchase-order/${id}/edit?${query}`
    : `/procurement/purchase-order/${id}/edit`;
}
