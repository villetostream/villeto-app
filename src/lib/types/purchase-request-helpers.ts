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

export type DeliveryOutcome =
  | "not_delivered"
  | "fully_delivered"
  | "full_delivery_with_exceptions"
  | "partially_delivered"
  | "partial_delivery_with_exceptions"
  | "partially_delivered_with_exceptions"
  | "delivered_with_exceptions"
  | "delivered";

export type ExceptionResolutionStatus =
  | "not_required"
  | "awaiting_vendor_response"
  | "acknowledged"
  | "disputed"
  | "corrective_action_pending"
  | "resolved"
  | "backordered"
  | "forfeited"
  | "under_company_review"
  | "resolved_after_dispute";

export type FinalDecisionChoice =
  | "uphold_buyer_finding"
  | "accept_vendor_dispute"
  | "revise_buyer_finding";

export type VendorExceptionDisposition = "backorder" | "forfeit" | "dispute";

export interface ReceiptEvidenceItem {
  url: string;
  publicId: string;
  mimeType: string;
  originalName?: string;
  size?: number;
  purchaseOrderLineItemIds?: string[];
}

export interface DeliveryReceiptLineItemRecord {
  deliveryReceiptLineItemId: string;
  id?: string;
  receiptLineItemId?: string;
  deliveryReceiptLineId?: string;
  purchaseOrderLineItemId?: string;
  fulfillmentLineItemId?: string;
  name?: string;
  quantityOrdered?: number;
  quantityReceived?: number;
  quantityAccepted?: number;
  quantityRejected?: number;
  quantityMissing?: number;
  exceptionReason?: string | null;
  finalQuantityAccepted?: number | null;
  finalQuantityRejected?: number | null;
  finalQuantityMissing?: number | null;
  resolutionStatus?: ExceptionResolutionStatus | string;
  vendorDisposition?: VendorExceptionDisposition | string | null;
  expectedRedeliveryDate?: string | null;
  vendorResponseReason?: string | null;
  notes?: string | null;
}

export interface DeliveryReceiptRecord {
  deliveryReceiptId: string;
  receiptNumber?: string;
  receiptReference?: string;
  status?: string;
  confirmationOutcome?: "confirmed" | "confirmed_with_exceptions" | string;
  inspectionOutcome?: string;
  resolutionStatus?: ExceptionResolutionStatus | string;
  vendorResponse?: string | null;
  vendorResponseReason?: string | null;
  vendorRespondedAt?: string | null;
  vendorDisposition?: VendorExceptionDisposition | string | null;
  expectedRedeliveryDate?: string | null;
  finalDecision?: FinalDecisionChoice | string | null;
  decisionVersion?: number;
  decisionHistory?: Record<string, unknown>[];
  vendorActionRequired?: boolean;
  companyActionRequired?: boolean;
  resolutionNote?: string | null;
  resolvedAt?: string | null;
  resolvedByName?: string | null;
  receivedAt?: string | null;
  notes?: string | null;
  evidence?: ReceiptEvidenceItem[];
  vendorEvidence?: ReceiptEvidenceItem[];
  purchaseOrderId?: string;
  poNumber?: string;
  confirmedByName?: string | null;
  confirmedById?: string | null;
  fulfillmentId?: string | null;
  fulfillmentReference?: string | null;
  lineItems?: DeliveryReceiptLineItemRecord[];
}

export interface PurchaseOrderLineItemRecord {
  purchaseRequestLineItemId?: string;
  purchaseOrderLineItemId?: string;
  name?: string;
  description?: string | null;
  quantity?: number;
  shortClosedQuantity?: number;
  shortCloseReason?: string | null;
  shortClosedAt?: string | null;
  quantityInvoiceable?: number;
  quantityShipped?: number;
  quantityReady?: number;
  quantityRemainingToReady?: number;
  remainingDisposition?: string | null;
  dispositionReason?: string | null;
  expectedReadyDate?: string | null;
  fulfillmentState?: string;
  fulfillmentTransportScope?: string;
  quantityReceived?: number;
  quantityPhysicallyReceived?: number;
  quantityAccepted?: number;
  quantityForfeited?: number;
  invoiceableSubtotal?: number;
  quantityDispatched?: number;
  quantityAwaitingDispatch?: number;
  quantityAwaitingReceipt?: number;
  deliveryState?: string;
  quantityOutstanding?: number;
  unitPrice?: number;
  subtotal?: number;
  taxAmount?: number;
  lineTotal?: number;
  sku?: string | null;
  unitOfMeasure?: string | null;
  deliveryDate?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  category?: { id?: string; categoryId?: string; name?: string };
  departmentId?: string | null;
  accountingResolutionStatus?: string;
  [key: string]: unknown;
}

export interface PurchaseOrderRecord {
  purchaseOrderId?: string;
  id?: string;
  poNumber?: string;
  vendorId?: string;
  vendor?: { vendorId?: string; displayName?: string; legalName?: string; email?: string; [key: string]: unknown };
  deliveryDate?: string | null;
  notes?: string;
  status?: string;
  deliveryOutcome?: DeliveryOutcome | string;
  openExceptionCount?: number;
  vendorResponseRequired?: boolean;
  companyActionRequired?: boolean;
  createdAt?: string;
  issueDate?: string;
  issuedAt?: string | null;
  acknowledgedAt?: string | null;
  readyForDeliveryAt?: string | null;
  deliveredAt?: string | null;
  closedAt?: string | null;
  lineItems?: PurchaseOrderLineItemRecord[];
  sourcePurchaseRequestLineItemIds?: string[];
  lineItemCount?: number;
  timeline?: import("../react-query/expenses").TimelineEvent[];
  createdBy?: Record<string, unknown> | string;
  requesterName?: string;
  departmentName?: string;
  priority?: string;
  currency?: string;
  totalAmount?: string | number;
  legalEntity?: Record<string, unknown>;
  rejectionReason?: string | null;
  cancelledAt?: string | null;
  // ── Confirmation queue fields (GET /purchase-orders/confirmations) ──
  /** Vendor-side readiness: e.g. "fully_ready" | "backordered" */
  fulfillmentState?: string;
  /** True when the VENDOR still has quantity to prepare (backorder) — not a tenant action */
  fulfillmentActionRequired?: boolean;
  canClose?: boolean;
  closeBlockers?: string[];
  quantityOrdered?: number;
  quantityReady?: number;
  quantityRemainingToReady?: number;
  quantityDispatched?: number;
  quantityReceived?: number;
  quantityPhysicallyReceived?: number;
  quantityAccepted?: number;
  quantityForfeited?: number;
  quantityOutstanding?: number;
  invoiceableSubtotal?: number;
  /** Dispatched by vendor but not yet confirmed as received by the tenant */
  quantityAwaitingReceipt?: number;
  receiptConfirmations?: DeliveryReceiptRecord[];
  updatedAt?: string;
  shipmentDate?: string | null;
  digitalDeliveryDate?: string | null;
  confirmationDate?: string | null;
  approvalDate?: string | null;
  [key: string]: unknown;
}

/**
 * A PO needs the tenant's receipt confirmation when the vendor has dispatched
 * goods that haven't been confirmed as received yet.
 */
export function needsReceiptConfirmation(po: PurchaseOrderRecord): boolean {
  return Number(po.quantityAwaitingReceipt ?? 0) > 0;
}

/**
 * A PO needs the company's exception review when the vendor has disputed a finding
 * (companyActionRequired === true).
 */
export function needsCompanyExceptionDecision(po: PurchaseOrderRecord): boolean {
  return Boolean(po.companyActionRequired);
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
