import { workspaceQueryKey } from "@/features/entity-workspace/store";
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { PROCUREMENT_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import {
  PurchaseOrderRecord,
  DeliveryReceiptRecord,
  ReceiptEvidenceItem,
  FinalDecisionChoice,
  DeliveryOutcome,
  ExceptionResolutionStatus,
} from "@/lib/types/purchase-request-helpers";
export type {
  PurchaseOrderRecord,
  DeliveryReceiptRecord,
  ReceiptEvidenceItem,
  FinalDecisionChoice,
  DeliveryOutcome,
  ExceptionResolutionStatus,
};

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
  options?: Omit<
    UseQueryOptions<PaginatedPurchaseOrdersResponse, Error, TData>,
    "queryKey" | "queryFn"
  > & { view?: "summary" | "count" },
) => {
  const axios = useAxios();
  const { view = "summary", ...queryOptions } = options ?? {};

  return useQuery<PaginatedPurchaseOrdersResponse, Error, TData>({
    queryKey: workspaceQueryKey([
      ...QUERY_KEYS.procurement.purchaseOrders,
      page,
      limit,
      status,
      vendorId,
      search,
      scope,
      view,
    ]),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("view", view);
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (status) params.append("status", status);
      if (vendorId) params.append("vendorId", vendorId);
      if (search) params.append("search", search);
      // Backend supports scope=my (own POs) and scope=all (company-wide)
      if (scope === "own") params.append("scope", "my");
      else if (scope === "team" || scope === "company")
        params.append("scope", "all");

      const response = await axios.get<PaginatedPurchaseOrdersResponse>(
        `${PROCUREMENT_KEYS.PURCHASE_ORDERS}?${params.toString()}`,
      );

      return response.data;
    },
    staleTime: STALE_TIMES.NORMAL,
    ...queryOptions,
  });
};

// ── Confirmation / Receiving Queue Orders ────────────────────────────────────

export interface GetConfirmationOrdersParams {
  view?: "count" | "summary";
  page?: number;
  limit?: number;
  /** Filter by status: all | ready_for_delivery | partially_delivered | delivered | partially_delivered_with_exceptions | delivered_with_exceptions */
  status?: string;
  /** Filter by deliveryOutcome: not_delivered | fully_delivered | full_delivery_with_exceptions | partially_delivered | partial_delivery_with_exceptions */
  deliveryOutcome?: string;
  /** Filter by resolutionStatus: not_required | awaiting_vendor_response | acknowledged | disputed | corrective_action_pending | resolved | backordered | forfeited | under_company_review | resolved_after_dispute */
  resolutionStatus?: string;
  vendorId?: string;
  search?: string;
}

export const useConfirmationOrders = <TData = PaginatedPurchaseOrdersResponse>(
  params: GetConfirmationOrdersParams = {},
  options?: Omit<
    UseQueryOptions<PaginatedPurchaseOrdersResponse, Error, TData>,
    "queryKey" | "queryFn"
  >,
) => {
  const axios = useAxios();
  const { page = 1, limit = 20, status, deliveryOutcome, resolutionStatus, vendorId, search, view } = params;

  return useQuery<PaginatedPurchaseOrdersResponse, Error, TData>({
    queryKey: workspaceQueryKey(
      [...QUERY_KEYS.procurement.confirmations({ page, limit, status, deliveryOutcome, resolutionStatus, vendorId, search }), view],
    ),
    queryFn: async () => {
      const qp = new URLSearchParams();
      if (view) qp.set("view", view);
      qp.append("page", page.toString());
      qp.append("limit", limit.toString());
      if (status && status !== "all") qp.append("status", status);
      if (deliveryOutcome && deliveryOutcome !== "all") qp.append("deliveryOutcome", deliveryOutcome);
      if (resolutionStatus && resolutionStatus !== "all") qp.append("resolutionStatus", resolutionStatus);
      if (vendorId) qp.append("vendorId", vendorId);
      if (search) qp.append("search", search);

      const response = await axios.get<PaginatedPurchaseOrdersResponse>(
        `${PROCUREMENT_KEYS.PURCHASE_ORDER_CONFIRMATIONS}?${qp.toString()}`,
      );
      return response.data;
    },
    staleTime: STALE_TIMES.LIVE,
    ...options,
  });
};

// ── Single Purchase Order ───────────────────────────────────────────────────

export const usePurchaseOrder = (id: string) => {
  const axios = useAxios();

  return useQuery({
    queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrder(id)),
    queryFn: async () => {
      const response = await axios.get<PurchaseOrderDetailResponse>(
        PROCUREMENT_KEYS.PURCHASE_ORDER(id),
        { _skipErrorToast: true } as any,
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
  vendorSiteId?: string;
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
      const response = await axios.post(
        PROCUREMENT_KEYS.PURCHASE_ORDERS,
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
        type: "inactive",
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
      });
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
      const response = await axios.patch(
        PROCUREMENT_KEYS.PURCHASE_ORDER(id),
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrder(id)),
      });
      queryClient.removeQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
        type: "inactive",
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
      });
    },
  });
};

// ── Add Line Items to Standalone PO ────────────────────────────────────────

export const useAddPOLineItems = (id: string) => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { lineItems: POLineItemPayload[] }) => {
      const response = await axios.post(
        PROCUREMENT_KEYS.PO_LINE_ITEMS(id),
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrder(id)),
      });
    },
  });
};

export interface UpdatePOLineItemVariables {
  purchaseOrderId?: string;
  lineItemId?: string;
  payload?: Partial<POLineItemPayload>;
  name?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  taxAmount?: number;
  sku?: string;
  unitOfMeasure?: string;
  categoryId?: string;
  departmentId?: string;
  [key: string]: any;
}

export const useUpdatePOLineItem = (poId?: string, defaultLineItemId?: string) => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: UpdatePOLineItemVariables | Partial<POLineItemPayload>) => {
      const vars = variables as UpdatePOLineItemVariables;
      const targetPoId = vars.purchaseOrderId || poId;
      const targetLineItemId = vars.lineItemId || defaultLineItemId;

      if (!targetPoId) {
        throw new Error("purchaseOrderId is required to update a line item");
      }
      if (!targetLineItemId) {
        throw new Error("lineItemId is required to update a line item");
      }

      let body: Partial<POLineItemPayload>;
      if (vars.payload) {
        body = vars.payload;
      } else {
        const { purchaseOrderId: _p, lineItemId: _l, ...rest } = vars;
        body = rest as Partial<POLineItemPayload>;
      }

      const response = await axios.patch(
        PROCUREMENT_KEYS.PO_LINE_ITEM(targetPoId, targetLineItemId),
        body,
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      const targetPoId = (variables as UpdatePOLineItemVariables)?.purchaseOrderId || poId;
      if (targetPoId) {
        queryClient.invalidateQueries({
          queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrder(targetPoId)),
        });
      }
    },
  });
};

export const useDeletePOLineItem = (poId: string) => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lineItemId: string) => {
      const response = await axios.delete(
        PROCUREMENT_KEYS.PO_LINE_ITEM(poId, lineItemId),
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrder(poId)),
      });
    },
  });
};

// ── Submit PO for Approval ──────────────────────────────────────────────────

export interface SubmitPurchaseOrderPayload {
  id?: string;
  policyJustification?: string;
  spendProgramJustification?: string;
  spendProgramWarningsAccepted?: boolean;
}

export const useSubmitPurchaseOrderForApproval = (id: string) => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload?: SubmitPurchaseOrderPayload) => {
      const response = await axios.patch(
        PROCUREMENT_KEYS.SUBMIT_PURCHASE_ORDER(id),
        payload || {},
        {
          _skipErrorToast: true,
        } as any,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrder(id)),
      });
      queryClient.removeQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
        type: "inactive",
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
      });
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
        payload,
      );
      return response.data;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrder(id)),
      });
      queryClient.removeQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
        type: "inactive",
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
      });
    },
  });
};

// ── Issue Purchase Order ────────────────────────────────────────────────────

export const useIssuePurchaseOrder = () => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.patch(
        PROCUREMENT_KEYS.ISSUE_PURCHASE_ORDER(id),
      );
      return response.data;
    },
    onSuccess: (_data, id: string) => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrder(id)),
      });
      queryClient.removeQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
        type: "inactive",
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
      });
    },
  });
};

// ── Cancel Purchase Order ───────────────────────────────────────────────────

export const useCancelPurchaseOrder = () => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await axios.patch(
        PROCUREMENT_KEYS.CANCEL_PURCHASE_ORDER(id),
        { reason },
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(
          QUERY_KEYS.procurement.purchaseOrder(variables.id),
        ),
      });
      queryClient.removeQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
        type: "inactive",
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
      });
    },
  });
};

// ── Delete Purchase Order (Draft) ───────────────────────────────────────────

export const useDeletePurchaseOrder = () => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.delete(PROCUREMENT_KEYS.PURCHASE_ORDER(id));
      return response.data;
    },
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
        type: "inactive",
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
      });
    },
  });
};

// ── Close Purchase Order ────────────────────────────────────────────────────

export const useClosePurchaseOrder = () => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.patch(
        PROCUREMENT_KEYS.CLOSE_PURCHASE_ORDER(id),
      );
      return response.data;
    },
    onSuccess: (_data, id: string) => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrder(id)),
      });
      queryClient.removeQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
        type: "inactive",
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
      });
    },
  });
};

export const useShortClosePOLine = (purchaseOrderId: string) => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lineItemId,
      quantity,
      reason,
    }: {
      lineItemId: string;
      quantity: number;
      reason: string;
    }) => {
      const response = await axios.post(
        PROCUREMENT_KEYS.SHORT_CLOSE_PO_LINE(purchaseOrderId, lineItemId),
        { quantity, reason },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(
          QUERY_KEYS.procurement.purchaseOrder(purchaseOrderId),
        ),
      });
      queryClient.removeQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
        type: "inactive",
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
      });
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
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(
          QUERY_KEYS.procurement.purchaseOrder(purchaseOrderId),
        ),
      });
      queryClient.removeQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
        type: "inactive",
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
      });
    },
  });
};

// ── Confirm Receipt & Fulfillment Exceptions ────────────────────────────────

export interface ReceiptLineItem {
  fulfillmentLineItemId: string;
  name?: string;
  quantityReceived?: number;
  quantityAccepted: number;
  quantityRejected: number;
  quantityMissing: number;
  exceptionReason?: string;
  notes?: string;
}

export interface ConfirmReceiptPayload {
  receiptReference: string;
  receivedAt: string;
  notes?: string;
  evidence?: ReceiptEvidenceItem[];
  lineItems: ReceiptLineItem[];
  /** UI-only helper metadata */
  hasExceptions?: boolean;
}

export const useConfirmPOReceipt = (id: string) => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fulfillmentId,
      payload,
    }: {
      fulfillmentId: string;
      payload: ConfirmReceiptPayload;
    }) => {
      const { hasExceptions: _hasExceptions, ...apiPayload } = payload;
      const response = await axios.post(
        PROCUREMENT_KEYS.CONFIRM_FULFILLMENT_RECEIPT(id, fulfillmentId),
        apiPayload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrder(id)),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(["procurement", "confirmations"]),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(["procurement", "fulfillment-exceptions"]),
      });
      queryClient.removeQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
        type: "inactive",
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
      });
    },
  });
};

// ── Upload Receipt Evidence (Pre-Confirmation & Post-Confirmation) ──────────

export const useUploadFulfillmentReceiptEvidence = (purchaseOrderId: string) => {
  const axios = useAxios();

  return useMutation({
    mutationFn: async ({
      fulfillmentId,
      file,
    }: {
      fulfillmentId: string;
      file: File;
    }): Promise<ReceiptEvidenceItem> => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        PROCUREMENT_KEYS.UPLOAD_FULFILLMENT_RECEIPT_EVIDENCE(purchaseOrderId, fulfillmentId),
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return (response.data?.data ?? response.data) as ReceiptEvidenceItem;
    },
  });
};

export const useUploadReceiptExceptionEvidence = (purchaseOrderId: string) => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      deliveryReceiptId,
      file,
    }: {
      deliveryReceiptId: string;
      file: File;
    }): Promise<ReceiptEvidenceItem> => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        PROCUREMENT_KEYS.UPLOAD_RECEIPT_EXCEPTION_EVIDENCE(purchaseOrderId, deliveryReceiptId),
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return (response.data?.data ?? response.data) as ReceiptEvidenceItem;
    },
    onSuccess: (_data, { deliveryReceiptId }) => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrder(purchaseOrderId)),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.poReceipt(purchaseOrderId, deliveryReceiptId)),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.fulfillmentException(deliveryReceiptId)),
      });
    },
  });
};

// ── Get Single Receipt & Fulfillment Exceptions ─────────────────────────────

export const usePOReceiptDetail = (
  purchaseOrderId?: string,
  deliveryReceiptId?: string,
) => {
  const axios = useAxios();

  return useQuery({
    queryKey: workspaceQueryKey(
      QUERY_KEYS.procurement.poReceipt(purchaseOrderId || "", deliveryReceiptId || ""),
    ),
    queryFn: async () => {
      const response = await axios.get<{ data?: DeliveryReceiptRecord } & DeliveryReceiptRecord>(
        PROCUREMENT_KEYS.PO_RECEIPT_DETAIL(purchaseOrderId!, deliveryReceiptId!),
        { _skipErrorToast: true } as any,
      );
      return (response.data?.data ?? response.data) as DeliveryReceiptRecord;
    },
    enabled: Boolean(purchaseOrderId && deliveryReceiptId),
    staleTime: STALE_TIMES.LIVE,
  });
};

export interface FulfillmentExceptionSummaryItem {
  deliveryReceiptId: string;
  receiptNumber?: string;
  purchaseOrderId: string;
  poNumber?: string;
  vendorId?: string;
  vendorName?: string;
  fulfillmentReference?: string;
  inspectionOutcome?: string;
  resolutionStatus?: ExceptionResolutionStatus | string;
  finalDecision?: FinalDecisionChoice | string | null;
  vendorActionRequired?: boolean;
  companyActionRequired?: boolean;
  receivedAt?: string;
  resolvedAt?: string | null;
  updatedAt?: string;
}

export interface PaginatedFulfillmentExceptionsResponse {
  message?: string;
  status?: number;
  data: FulfillmentExceptionSummaryItem[];
  meta?: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}

export const useFulfillmentExceptions = (
  params: { page?: number; limit?: number; resolutionStatus?: string } = {},
) => {
  const axios = useAxios();
  const { page = 1, limit = 20, resolutionStatus } = params;

  return useQuery({
    queryKey: workspaceQueryKey(
      QUERY_KEYS.procurement.fulfillmentExceptions({ page, limit, resolutionStatus }),
    ),
    queryFn: async () => {
      const qp = new URLSearchParams();
      qp.append("page", page.toString());
      qp.append("limit", limit.toString());
      if (resolutionStatus && resolutionStatus !== "all") {
        qp.append("resolutionStatus", resolutionStatus);
      }
      const response = await axios.get<PaginatedFulfillmentExceptionsResponse | FulfillmentExceptionSummaryItem[]>(
        `${PROCUREMENT_KEYS.FULFILLMENT_EXCEPTIONS}?${qp.toString()}`,
      );
      const raw = response.data;
      if (Array.isArray(raw)) {
        return { data: raw };
      }
      return raw;
    },
    staleTime: STALE_TIMES.LIVE,
  });
};

export const useFulfillmentExceptionDetail = (deliveryReceiptId?: string) => {
  const axios = useAxios();

  return useQuery({
    queryKey: workspaceQueryKey(
      QUERY_KEYS.procurement.fulfillmentException(deliveryReceiptId || ""),
    ),
    queryFn: async () => {
      const response = await axios.get<{ data?: DeliveryReceiptRecord } & DeliveryReceiptRecord>(
        PROCUREMENT_KEYS.FULFILLMENT_EXCEPTION_DETAIL(deliveryReceiptId!),
        { _skipErrorToast: true } as any,
      );
      return (response.data?.data ?? response.data) as DeliveryReceiptRecord;
    },
    enabled: Boolean(deliveryReceiptId),
    staleTime: STALE_TIMES.LIVE,
  });
};

// ── Event 3: Company Final Decision on Disputed Receipt ─────────────────────

export interface FinalDecisionLineItemPayload {
  deliveryReceiptLineItemId: string;
  quantityAccepted: number;
  quantityRejected: number;
  quantityMissing: number;
  reason?: string;
}

export interface SubmitFinalDecisionPayload {
  decision: FinalDecisionChoice;
  reason: string;
  evidence?: ReceiptEvidenceItem[];
  lineItems?: FinalDecisionLineItemPayload[];
}

export const useSubmitReceiptFinalDecision = (purchaseOrderId: string) => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      deliveryReceiptId,
      payload,
    }: {
      deliveryReceiptId: string;
      payload: SubmitFinalDecisionPayload;
    }) => {
      const response = await axios.post(
        PROCUREMENT_KEYS.RECEIPT_FINAL_DECISION(purchaseOrderId, deliveryReceiptId),
        payload,
      );
      return response.data;
    },
    onSuccess: (_data, { deliveryReceiptId }) => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrder(purchaseOrderId)),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.poReceipt(purchaseOrderId, deliveryReceiptId)),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.fulfillmentException(deliveryReceiptId)),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(["procurement", "confirmations"]),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(["procurement", "fulfillment-exceptions"]),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrders),
      });
    },
  });
};

// ── Resolve / Request Correction for Receipt Exceptions ─────────────────────

export interface ResolveReceiptExceptionPayload {
  resolutionNote: string;
  correctiveActionPending: boolean;
}

export const useResolveReceiptException = (purchaseOrderId: string) => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      deliveryReceiptId,
      payload,
    }: {
      deliveryReceiptId: string;
      payload: ResolveReceiptExceptionPayload;
    }) => {
      const response = await axios.patch(
        PROCUREMENT_KEYS.RECEIPT_RESOLUTION(purchaseOrderId, deliveryReceiptId),
        payload,
      );
      return response.data;
    },
    onSuccess: (_data, { deliveryReceiptId }) => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.purchaseOrder(purchaseOrderId)),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.poReceipt(purchaseOrderId, deliveryReceiptId)),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(QUERY_KEYS.procurement.fulfillmentException(deliveryReceiptId)),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(["procurement", "confirmations"]),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(["procurement", "fulfillment-exceptions"]),
      });
    },
  });
};