import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { STALE_TIMES } from "@/lib/constants/stale-times";

export interface InvoicePaymentTerms {
  paymentTermId?: string;
  code?: string;
  name?: string;
  days?: number;
}

export interface ProcurementInvoice {
  vendorInvoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  deliveryDate?: string | null;
  paymentTerms?: InvoicePaymentTerms | null;
  status: "submitted" | "under_review" | "approved" | "rejected" | "paid";
  paymentStatus: string;
  currency: string;
  subtotal: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  outstandingAmount?: number | string | null;
  accountingSyncStatus: string;
  externalAccountingRef?: string | null;
  accountingSyncedAt?: string | null;
  accountingSyncError?: string | null;
  submittedAt?: string | null;
  underReviewAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  paidAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  workflowStage?: string;
  notes?: string | null;
  vendor?: {
    vendorId: string;
    displayName?: string;
    legalName?: string;
    email?: string;
  } | null;
  legalEntity: {
    legalEntityId: string;
    legalName: string;
    baseCurrency: string;
    readinessStatus: string;
  };
  purchaseOrderId?: string | null;
  poNumber?: string | null;
  purchaseOrder?: {
    purchaseOrderId: string;
    poNumber: string;
  } | null;
  lineItems?: Array<{
    vendorInvoiceLineItemId?: string;
    name?: string;
    description?: string | null;
    quantity?: number | string;
    unitPrice?: number | string;
    subtotal?: number | string;
    taxAmount?: number | string;
    lineTotal?: number | string;
    sku?: string | null;
    unitOfMeasure?: string | null;
    categoryId?: string | null;
    departmentId?: string | null;
    accountingResolutionStatus?: string;
  }>;
}

interface InvoiceListResponse {
  data: ProcurementInvoice[];
  meta?: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}

export function useProcurementInvoices(
  status?: string,
  options?: { enabled?: boolean; refetchInterval?: number | false; page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: "asc" | "desc" },
) {
  const axios = useAxios();
  const { enabled = true, refetchInterval, ...params } = options ?? {};
  return useQuery<InvoiceListResponse>({
    enabled,
    queryKey: workspaceQueryKey(["procurement-invoices", "summary", status, params]),
    queryFn: async ({ signal }) =>
      (
        await axios.get("procurement/invoices", {
          signal,
          params: { view: "summary", page: options?.page ?? 1, limit: options?.limit ?? 20, search: options?.search, sortBy: options?.sortBy, sortOrder: options?.sortOrder, ...(status ? { status } : {}) },
        })
      ).data,
    staleTime: STALE_TIMES.LIVE,
    refetchOnWindowFocus: true,
    refetchInterval: refetchInterval ?? false,
  });
}

export function useInvoiceAction() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceId,
      action,
      reason,
    }: {
      invoiceId: string;
      action: "under-review" | "approve" | "reject";
      reason?: string;
    }) =>
      (
        await axios.patch(
          `procurement/invoices/${invoiceId}/${action}`,
          action === "reject"
            ? { reason: reason || "Rejected during invoice review" }
            : {},
        )
      ).data,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: workspaceQueryKey(["bill-pay", "invoices"]) });
      client.removeQueries({
        queryKey: workspaceQueryKey(["procurement-invoices"]),
        type: "inactive",
      });
      return client.invalidateQueries({
        queryKey: workspaceQueryKey(["procurement-invoices"]),
      });
    },
  });
}

export function useInvoicePaymentAction() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceId,
      paymentStatus,
      reference,
    }: {
      invoiceId: string;
      paymentStatus: string;
      reference?: string;
    }) =>
      (
        await axios.patch(`procurement/invoices/${invoiceId}/payment-status`, {
          paymentStatus,
          reference,
        })
      ).data,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: workspaceQueryKey(["bill-pay", "invoices"]) });
      client.removeQueries({
        queryKey: workspaceQueryKey(["procurement-invoices"]),
        type: "inactive",
      });
      return client.invalidateQueries({
        queryKey: workspaceQueryKey(["procurement-invoices"]),
      });
    },
  });
}

export function useGetProcurementInvoiceById(invoiceId: string) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey(["procurement-invoices", invoiceId]),
    queryFn: async () => {
      const response = await axios.get(`procurement/invoices/${invoiceId}`);
      return response.data;
    },
    enabled: !!invoiceId,
  });
}
