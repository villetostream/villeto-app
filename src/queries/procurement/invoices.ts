import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";

export interface ProcurementInvoice {
  vendorInvoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: "submitted" | "under_review" | "approved" | "rejected" | "paid";
  paymentStatus: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  accountingSyncStatus: string;
  vendor?: { vendorId: string; displayName?: string; legalName?: string } | null;
  legalEntity: { legalEntityId: string; legalName: string; baseCurrency: string; readinessStatus: string };
  purchaseOrderId?: string | null;
  poNumber?: string | null;
}

interface InvoiceListResponse {
  data: ProcurementInvoice[];
  meta?: { totalCount: number; totalPages: number; currentPage: number; limit: number };
}

export function useProcurementInvoices(status?: string) {
  const axios = useAxios();
  return useQuery<InvoiceListResponse>({
    queryKey: ["procurement-invoices", status],
    queryFn: async () => (await axios.get("procurement/invoices", { params: { page: 1, limit: 100, ...(status ? { status } : {}) } })).data,
  });
}

export function useInvoiceAction() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, action, reason }: { invoiceId: string; action: "under-review" | "approve" | "reject"; reason?: string }) =>
      (await axios.patch(`procurement/invoices/${invoiceId}/${action}`, action === "reject" ? { reason: reason || "Rejected during invoice review" } : {})).data,
    onSuccess: () => client.invalidateQueries({ queryKey: ["procurement-invoices"] }),
  });
}
