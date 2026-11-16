import { format } from "date-fns";
import type { BillPayInvoiceDetail } from "@/queries/bill-pay/invoices";
import type { ManualBillDraftInput } from "./queries";
import type { EditableBillLineItem } from "./types";

type InvoicePayload = Omit<
  ManualBillDraftInput,
  "legalEntityId" | "idempotencyKey"
>;

interface ManualBillSaveInput {
  companyWorkspaceEnabled: boolean;
  legalEntityId: string;
  vendorId: string;
  vendorSelected: boolean;
  vendorSiteId: string;
  siteRequired: boolean;
  invoiceNumber: string;
  invoiceDate?: Date;
  dueDate?: Date;
  description: string;
  currency: string;
  lineItems: EditableBillLineItem[];
  invoiceId?: string;
  draft?: BillPayInvoiceDetail;
}

type SavePreparation =
  | { ok: true; payload: InvoicePayload }
  | { ok: false; message: string };

export function prepareManualBillSave(
  input: ManualBillSaveInput,
): SavePreparation {
  const {
    companyWorkspaceEnabled,
    legalEntityId,
    vendorId,
    vendorSelected,
    vendorSiteId,
    siteRequired,
    invoiceNumber,
    invoiceDate,
    dueDate,
    description,
    currency,
    lineItems,
    invoiceId,
    draft,
  } = input;

  if (!companyWorkspaceEnabled) {
    return {
      ok: false,
      message:
        "Enable the company legal entity workspace before saving this bill.",
    };
  }
  if (
    !legalEntityId ||
    !vendorSelected ||
    !invoiceDate ||
    !invoiceNumber.trim()
  ) {
    return {
      ok: false,
      message: "Complete the invoice details before saving.",
    };
  }
  if (siteRequired && !vendorSiteId) {
    return { ok: false, message: "Select an invoicing site for this vendor." };
  }
  if (
    !lineItems.length ||
    lineItems.some(
      (item) =>
        !item.description.trim() ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0 ||
        !Number.isFinite(item.unitPrice) ||
        !item.unitPrice ||
        item.unitPrice <= 0,
    )
  ) {
    return {
      ok: false,
      message: "Add at least one line item with a unit price.",
    };
  }
  if (dueDate && dueDate < invoiceDate) {
    return {
      ok: false,
      message: "Due date must be on or after the invoice date.",
    };
  }
  if (
    invoiceId &&
    (!draft ||
      draft.status !== "draft" ||
      !draft.intake?.invoiceIntakeId ||
      draft.legalEntity?.legalEntityId !== legalEntityId)
  ) {
    return {
      ok: false,
      message: "Select this draft's legal entity before editing it.",
    };
  }

  return {
    ok: true,
    payload: {
      vendorId,
      vendorSiteId: vendorSiteId || undefined,
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate: format(invoiceDate, "yyyy-MM-dd"),
      dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : undefined,
      deliveryDate: invoiceId
        ? draft?.deliveryDate?.slice(0, 10) || undefined
        : undefined,
      currency,
      shippingAmount: invoiceId ? draft?.shippingAmount : undefined,
      discountAmount: invoiceId ? draft?.discountAmount : undefined,
      withholdingAmount: invoiceId ? draft?.withholdingAmount : undefined,
      notes: description.trim() || undefined,
      lineItems: lineItems.map((item) => ({
        name: item.description.trim(),
        description: item.detail,
        quantity: item.quantity.toFixed(4),
        unitPrice: Number(item.unitPrice).toFixed(4),
        taxAmount: item.taxAmount,
        categoryId: item.categoryId,
        departmentId: item.departmentId,
      })),
    },
  };
}
