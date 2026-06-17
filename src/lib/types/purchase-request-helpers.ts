import {
  asArray,
  asRecord,
  getOptionalString,
  isRecord,
  pickString,
} from "@/lib/types/api-error";
import type {
  DraftPurchaseOrder,
  LineItemPayload,
  PRPriority,
  PurchaseRequest,
  PurchaseRequestLineItem,
} from "@/queries/procurement/purchase-requests";

export function isPRPriority(value: unknown): value is PRPriority {
  return value === "low" || value === "medium" || value === "urgent";
}

export function toApiLineItemPayload(payload: LineItemPayload): LineItemPayload {
  const {
    departmentId: _departmentId,
    accountingResolutionStatus: _accountingResolutionStatus,
    ...cleanPayload
  } = payload;
  return cleanPayload;
}

export function getRequesterName(prObj: unknown): string {
  if (!isRecord(prObj)) return "";
  const directName = getOptionalString(prObj.requesterName);
  if (directName) return directName;

  const keys = ["createdBy", "user", "requester", "creator", "owner"];
  for (const key of keys) {
    const val = prObj[key];
    if (isRecord(val)) {
      const full = `${pickString(val, "firstName")} ${pickString(val, "lastName")}`.trim();
      if (full) return full;
    }
    const str = getOptionalString(val);
    if (str) return str;
  }
  return "";
}

export function getInlineDepartmentName(
  prRecord: Record<string, unknown>,
  departmentId?: string
): string | null {
  const dept = prRecord.department;
  if (isRecord(dept)) {
    return pickString(dept, "departmentName", "name") || null;
  }
  const deptName = getOptionalString(prRecord.departmentName);
  if (deptName) return deptName;
  if (typeof dept === "string" && dept !== departmentId) return dept;
  return null;
}

export function getRoleName(u: unknown): string {
  if (!isRecord(u)) return "Employee";
  for (const key of ["companyRole", "villetoRole", "role"] as const) {
    const roleObj = u[key];
    if (isRecord(roleObj)) {
      const name = getOptionalString(roleObj.name);
      if (name) return name;
    }
  }
  return "Employee";
}

export interface PurchaseOrderLineItemRecord {
  purchaseRequestLineItemId: string;
  [key: string]: unknown;
}

export interface PurchaseOrderRecord {
  purchaseOrderId?: string;
  poNumber?: string;
  vendorId?: string;
  vendor?: { vendorId?: string; displayName?: string; legalName?: string; email?: string; [key: string]: unknown };
  deliveryDate?: string;
  notes?: string;
  status?: string;
  createdAt?: string;
  lineItems?: PurchaseOrderLineItemRecord[];
  createdBy?: Record<string, unknown> | string;
  [key: string]: unknown;
}

export interface PurchaseRequestDetail extends PurchaseRequest {
  approvedBy?: Record<string, unknown>;
  approvedAt?: string;
  purchaseOrders?: PurchaseOrderRecord[];
}

export function asPurchaseRequestDetail(pr: PurchaseRequest): PurchaseRequestDetail {
  return pr as PurchaseRequestDetail;
}

export function parseLineItemsFromAddResponse(data: unknown): PurchaseRequestLineItem[] {
  if (Array.isArray(data)) {
    return data.filter(isPurchaseRequestLineItem);
  }
  const record = asRecord(data);
  const lineItems = record.lineItems;
  if (Array.isArray(lineItems)) {
    return lineItems.filter(isPurchaseRequestLineItem);
  }
  if (isPurchaseRequestLineItem(data)) {
    return [data];
  }
  return [];
}

function isPurchaseRequestLineItem(value: unknown): value is PurchaseRequestLineItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.purchaseRequestLineItemId === "string" &&
    typeof value.name === "string" &&
    typeof value.quantity === "number"
  );
}

export function asDraftPurchaseOrders(value: unknown[]): DraftPurchaseOrder[] {
  return value.filter(isDraftPurchaseOrder);
}

function isDraftPurchaseOrder(value: unknown): value is DraftPurchaseOrder {
  if (!isRecord(value)) return false;
  return Array.isArray(value.lineItems);
}

export function getDepartmentRecord(user: unknown): Record<string, unknown> | undefined {
  if (!isRecord(user)) return undefined;
  const dept = user.department;
  return isRecord(dept) ? dept : undefined;
}

export function getUserDepartmentId(user: unknown): string | undefined {
  if (!isRecord(user)) return undefined;
  const direct = getOptionalString(user.departmentId);
  if (direct) return direct;
  const dept = getDepartmentRecord(user);
  return dept ? getOptionalString(dept.departmentId) : undefined;
}

export function getUserDepartmentName(user: unknown): string | undefined {
  const dept = getDepartmentRecord(user);
  if (!dept) return undefined;
  return pickString(dept, "departmentName", "name") || undefined;
}

export function resolveDepartmentLabel(
  pr: PurchaseRequest,
  departments: { label: string; value: string }[],
  user: unknown
): string {
  if (!pr.departmentId) return "—";

  const prRecord = asRecord(pr);
  const inlineName = getInlineDepartmentName(prRecord, pr.departmentId);
  if (inlineName) return inlineName;

  const found = departments.find((d) => d.value === pr.departmentId);
  if (found?.label) return found.label;

  const userDeptId = getUserDepartmentId(user);
  if (pr.departmentId === userDeptId) {
    return getUserDepartmentName(user) || pr.departmentId;
  }

  return pr.departmentId;
}

export function mergeDepartmentOption(
  departments: { label: string; value: string }[],
  pr: PurchaseRequest,
  user: unknown
): { label: string; value: string }[] {
  if (!pr.departmentId) return departments;

  const prRecord = asRecord(pr);
  const inlineName = getInlineDepartmentName(prRecord, pr.departmentId);
  const userDeptId = getUserDepartmentId(user);
  const resolvedName =
    inlineName ||
    (pr.departmentId === userDeptId ? getUserDepartmentName(user) : null);

  if (resolvedName && !departments.some((d) => d.value === pr.departmentId)) {
    return [...departments, { label: resolvedName, value: pr.departmentId }];
  }
  return departments;
}

export function getPurchaseOrderList(pr: PurchaseRequest): PurchaseOrderRecord[] {
  const record = asRecord(pr);
  return asArray(record.purchaseOrders).filter(isRecord) as PurchaseOrderRecord[];
}
