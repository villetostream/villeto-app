import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import type { PaginatedResult } from "@/features/bill-pay/shared/types";

export interface BillPayInvoice {
  vendorInvoiceId: string;
  invoiceNumber: string;
  description: string;
  vendor: {
    vendorId: string;
    legalName: string;
    displayName: string | null;
  } | null;
  invoiceDate: string;
  dueDate: string;
  status: string;
  workflowStage: string;
  currency: string;
  amount: string;
  outstandingAmount: string;
  source: string;
}

export interface GetBillPayInvoicesParams {
  page?: number;
  limit?: number;
  legalEntityId?: string;
  vendorId?: string;
  purchaseOrderId?: string;
  source?: string;
  status?: string;
  paymentStatus?: string;
  workflowStage?: string;
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
}

export function useGetBillPayInvoices(
  params: GetBillPayInvoicesParams = {},
  options?: Omit<
    UseQueryOptions<{ data: PaginatedResult<BillPayInvoice> }, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey(["bill-pay", "invoices", params]),
    queryFn: async ({ signal }) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.limit) searchParams.append("limit", params.limit.toString());
      if (params.legalEntityId)
        searchParams.append("legalEntityId", params.legalEntityId);
      if (params.vendorId) searchParams.append("vendorId", params.vendorId);
      if (params.purchaseOrderId)
        searchParams.append("purchaseOrderId", params.purchaseOrderId);
      if (params.source) searchParams.append("source", params.source);
      if (params.status) searchParams.append("status", params.status);
      if (params.paymentStatus)
        searchParams.append("paymentStatus", params.paymentStatus);
      if (params.workflowStage)
        searchParams.append("workflowStage", params.workflowStage);
      if (params.invoiceDateFrom)
        searchParams.append("invoiceDateFrom", params.invoiceDateFrom);
      if (params.invoiceDateTo)
        searchParams.append("invoiceDateTo", params.invoiceDateTo);
      if (params.dueDateFrom)
        searchParams.append("dueDateFrom", params.dueDateFrom);
      if (params.dueDateTo) searchParams.append("dueDateTo", params.dueDateTo);
      if (params.search) searchParams.append("search", params.search);

      const res = await axios.get(
        `/bill-pay/invoices?${searchParams.toString()}`,
        { signal },
      );
      return res.data as { data: PaginatedResult<BillPayInvoice> };
    },
    staleTime: STALE_TIMES.LIVE,
    refetchOnWindowFocus: true,
    refetchInterval: false,
    ...options,
  });
}

export interface InvoicePaymentTerms {
  paymentTermId?: string;
  code?: string;
  name?: string;
  days?: number;
}

export interface BillPayInvoiceDetail extends BillPayInvoice {
  intake?: {
    invoiceIntakeId: string;
    source: string;
    status: string;
    documents?: Array<{
      invoiceDocumentId: string;
      filename: string;
      documentType?: string | null;
      malwareScanStatus: string;
    }>;
  } | null;
  vendorSiteId?: string | null;
  supportType?: string | null;
  notes?: string | null;
  shippingAmount?: string;
  discountAmount?: string;
  withholdingAmount?: string;
  purchaseOrder?: { purchaseOrderId: string; poNumber: string } | null;
  poNumber?: string | null;
  purchaseOrderId?: string | null;
  deliveryDate?: string | null;
  paymentTerms?: InvoicePaymentTerms | null;
  paymentStatus?: string;
  submittedAt?: string | null;
  underReviewAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  paidAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  legalEntity?: {
    legalEntityId?: string;
    legalName?: string;
    baseCurrency?: string;
    readinessStatus?: string;
  } | null;
  lineItems?: Array<{
    vendorInvoiceLineItemId?: string;
    name: string;
    description?: string | null;
    quantity: string | number;
    unitPrice: string | number;
    taxAmount?: string | number;
    category?: { categoryId: string } | null;
    department?: { departmentId: string } | null;
    purchaseOrderLineItemId?: string | null;
    lineTotal: string | number;
    subtotal: string | number;
  }>;
  subtotal?: string;
  taxAmount?: string;
  totalAmount?: string;
}

export function useGetBillPayInvoiceById(vendorInvoiceId: string) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey(["bill-pay", "invoices", vendorInvoiceId]),
    queryFn: async ({ signal }) => {
      const res = await axios.get(`/bill-pay/invoices/${vendorInvoiceId}`, {
        signal,
      });
      return res.data as { data: BillPayInvoiceDetail };
    },
    enabled: !!vendorInvoiceId,
  });
}
