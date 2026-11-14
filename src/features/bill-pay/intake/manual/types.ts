import type { BillPayInvoiceDetail } from "@/queries/bill-pay/invoices";

export interface EditableBillLineItem {
  description: string;
  quantity: number;
  unitPrice?: number;
  detail?: string;
  taxAmount?: string;
  categoryId?: string;
  departmentId?: string;
}

export function loadedLineItems(
  draft?: BillPayInvoiceDetail,
): EditableBillLineItem[] {
  return (draft?.lineItems || []).map((line) => ({
    description: line.name,
    detail: line.description || undefined,
    quantity: Number(line.quantity),
    unitPrice: Number(line.unitPrice),
    taxAmount: line.taxAmount != null ? String(line.taxAmount) : undefined,
    categoryId: line.category?.categoryId,
    departmentId: line.department?.departmentId,
  }));
}
