import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { PROCUREMENT_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import { PurchaseOrderRecord } from "@/lib/types/purchase-request-helpers";

// ── Response Types ──────────────────────────────────────────────────────────

export interface PaginatedPurchaseOrdersResponse {
  message: string;
  status: number;
  data: PurchaseOrderRecord[];
  meta: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}

export interface PurchaseOrderDetailResponse {
  message: string;
  status: number;
  data: PurchaseOrderRecord;
}

// ── List Purchase Orders ────────────────────────────────────────────────────

export interface GetPurchaseOrdersParams {
  page?: number;
  limit?: number;
  status?: string;
  vendorId?: string;
  search?: string;
  /** Scope the query to the current user's own POs, their team's, or the whole company */
  scope?: "own" | "team" | "company";
}

export const usePurchaseOrders = <TData = PaginatedPurchaseOrdersResponse>(
  page: number = 1,
  limit: number = 20,
  status?: string,
  vendorId?: string,
  search?: string,
  scope?: "own" | "team" | "company",
  options?: Omit<UseQueryOptions<PaginatedPurchaseOrdersResponse, Error, TData>, "queryKey" | "queryFn">
) => {
  const axios = useAxios();

  return useQuery<PaginatedPurchaseOrdersResponse, Error, TData>({
    queryKey: [...QUERY_KEYS.procurement.purchaseOrders, page, limit, status, vendorId, search, scope],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (status) params.append("status", status);
      if (vendorId) params.append("vendorId", vendorId);
      if (search) params.append("search", search);
      // Backend supports scope=my (own POs) and scope=all (company-wide)
      if (scope === "own") params.append("scope", "my");
      else if (scope === "team" || scope === "company") params.append("scope", "all");

      const response = await axios.get<PaginatedPurchaseOrdersResponse>(
        `${PROCUREMENT_KEYS.PURCHASE_ORDERS}?${params.toString()}`
      );

      return response.data;
    },
    staleTime: STALE_TIMES.NORMAL,
    ...options,
  });
};


// ── Single Purchase Order ───────────────────────────────────────────────────

export const usePurchaseOrder = (id: string) => {
  const axios = useAxios();

  return useQuery({
    queryKey: QUERY_KEYS.procurement.purchaseOrder(id),
    queryFn: async () => {
      const response = await axios.get<PurchaseOrderDetailResponse>(
        PROCUREMENT_KEYS.PURCHASE_ORDER(id)
      );
      return response.data;
    },
    enabled: !!id,
    staleTime: STALE_TIMES.LIVE,
  });
};

// ── Create Standalone Purchase Order (without PR) ───────────────────────────

export interface POLineItemPayload {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxAmount?: number;
  sku?: string;
  unitOfMeasure?: string;
  categoryId?: string;
  departmentId?: string;
  accountingAccountRef?: string;
  accountingItemRef?: string;
  accountingClassRef?: string;
  accountingLocationRef?: string;
  accountingProjectRef?: string;
  accountingTaxCodeRef?: string;
  accountingResolutionStatus?: "unresolved" | "resolved";
  vendorSelectionMode?: "catalog" | string;
  catalogVendorId?: string;
  lockedVendorId?: string;
  preferredVendorId?: string;
}

export interface CreatePurchaseOrderPayload {
  legalEntityId?: string;
  vendorId: string;
  priority?: "low" | "medium" | "urgent";
  deliveryDate: string;
  currency?: string;
  notes?: string;
}

export const useCreatePurchaseOrder = () => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePurchaseOrderPayload) => {
      const response = await axios.post(PROCUREMENT_KEYS.PURCHASE_ORDERS, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrders });
    },
  });
};

// ── Update Purchase Order Header (draft only) ───────────────────────────────

export interface UpdatePurchaseOrderPayload {
  vendorId?: string;
  priority?: "low" | "medium" | "urgent";
  deliveryDate?: string;
  notes?: string;
}

export const useUpdatePurchaseOrder = (id: string) => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdatePurchaseOrderPayload) => {
      const response = await axios.patch(PROCUREMENT_KEYS.PURCHASE_ORDER(id), payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrder(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrders });
    },
  });
};

// ── Add Line Items to Standalone PO ────────────────────────────────────────

export const useAddPOLineItems = (id: string) => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { lineItems: POLineItemPayload[] }) => {
      const response = await axios.post(PROCUREMENT_KEYS.PO_LINE_ITEMS(id), payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrder(id) });
    },
  });
};

export const useUpdatePOLineItem = (poId: string, lineItemId: string) => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: POLineItemPayload) => {
      const response = await axios.patch(`${PROCUREMENT_KEYS.PO_LINE_ITEMS(poId)}/${lineItemId}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrder(poId) });
    },
  });
};

export const useDeletePOLineItem = (poId: string) => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lineItemId: string) => {
      const response = await axios.delete(`${PROCUREMENT_KEYS.PO_LINE_ITEMS(poId)}/${lineItemId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrder(poId) });
    },
  });
};

// ── Submit PO for Approval ──────────────────────────────────────────────────

export const useSubmitPurchaseOrderForApproval = (id: string) => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await axios.patch(PROCUREMENT_KEYS.SUBMIT_PURCHASE_ORDER(id));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrder(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrders });
    },
  });
};

// ── Approve / Reject Purchase Order ────────────────────────────────────────

export interface POApprovalDecisionPayload {
  decision: "approved" | "rejected";
  /** Required when decision === "rejected" */
  reason?: string;
}

export const usePurchaseOrderApprovalDecision = () => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: POApprovalDecisionPayload;
    }) => {
      const response = await axios.patch(
        PROCUREMENT_KEYS.APPROVE_PURCHASE_ORDER(id),
        payload
      );
      return response.data;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrder(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrders });
    },
  });
};

// ── Issue Purchase Order ────────────────────────────────────────────────────

export const useIssuePurchaseOrder = () => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.patch(PROCUREMENT_KEYS.ISSUE_PURCHASE_ORDER(id));
      return response.data;
    },
    onSuccess: (_data, id: string) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrder(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrders });
    },
  });
};

// ── Cancel Purchase Order ───────────────────────────────────────────────────

export const useCancelPurchaseOrder = () => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await axios.patch(PROCUREMENT_KEYS.CANCEL_PURCHASE_ORDER(id), { reason });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrder(variables.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrders });
    },
  });
};

// ── Delete Purchase Order (Draft) ───────────────────────────────────────────

export const useDeletePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // TODO: Implement real endpoint when backend pushes code
      // For now, simulate a successful deletion
      console.warn("delete purchase order endpoint not ready. simulating success.");
      return Promise.resolve({ success: true, id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrders });
    },
  });
};

// ── Close Purchase Order ────────────────────────────────────────────────────

export const useClosePurchaseOrder = () => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.patch(PROCUREMENT_KEYS.CLOSE_PURCHASE_ORDER(id));
      return response.data;
    },
    onSuccess: (_data, id: string) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrder(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrders });
    },
  });
};

export const useShortClosePOLine = (purchaseOrderId: string) => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lineItemId, quantity, reason }: { lineItemId: string; quantity: number; reason: string }) => {
      const response = await axios.post(
        PROCUREMENT_KEYS.SHORT_CLOSE_PO_LINE(purchaseOrderId, lineItemId),
        { quantity, reason },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrder(purchaseOrderId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrders });
    },
  });
};

export const useConfirmPOFinalBilling = (purchaseOrderId: string) => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reason }: { reason: string }) => {
      const response = await axios.post(
        PROCUREMENT_KEYS.CONFIRM_FINAL_BILLING(purchaseOrderId),
        { reason },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrder(purchaseOrderId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrders });
    },
  });
};

// ── Confirm Receipt ─────────────────────────────────────────────────────────

export interface ReceiptLineItem {
  fulfillmentLineItemId: string;
  name?: string;
  quantityReceived: number;
  notes?: string;
}

export interface ConfirmReceiptPayload {
  receiptReference: string;
  receivedAt: string;
  notes?: string;
  lineItems: ReceiptLineItem[];
}

export const useConfirmPOReceipt = (id: string) => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fulfillmentId, payload }: { fulfillmentId: string; payload: ConfirmReceiptPayload }) => {
      const response = await axios.post(
        PROCUREMENT_KEYS.CONFIRM_FULFILLMENT_RECEIPT(id, fulfillmentId),
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrder(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procurement.purchaseOrders });
    },
  });
};
