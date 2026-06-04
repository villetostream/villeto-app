import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { PROCUREMENT_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";

// ── Types ──────────────────────────────────────────────────────────────────

export type PRStatus = "draft" | "submitted" | "converted_to_po" | "cancelled";
export type PRPriority = "low" | "medium" | "urgent";
export type AccountingResolutionStatus = "unresolved" | "resolved";

export interface PurchaseRequestLineItem {
  purchaseRequestLineItemId: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  taxAmount: number;
  lineTotal: number;
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
  accountingResolutionStatus: AccountingResolutionStatus;
}

export interface PurchaseRequest {
  purchaseRequestId: string;
  requestNumber: string;
  title: string;
  description?: string;
  priority: PRPriority;
  status: PRStatus;
  neededByDate: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  accountingResolutionStatus: AccountingResolutionStatus;
  departmentId: string;
  lineItems: PurchaseRequestLineItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseRequestMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

interface ApiResponse<T> {
  message: string;
  status: number;
  data: T;
  meta?: PurchaseRequestMeta;
}

// ── Create Purchase Request Header ────────────────────────────────────────

export interface CreatePurchaseRequestPayload {
  title: string;
  description?: string;
  priority: PRPriority;
  neededByDate: string;
  currency: string;
  departmentId: string;
}

export const useCreatePurchaseRequest = (): UseMutationResult<
  ApiResponse<PurchaseRequest>,
  Error,
  CreatePurchaseRequestPayload
> => {
  const axiosInstance = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await axiosInstance.post(PROCUREMENT_KEYS.PURCHASE_REQUESTS, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_REQUESTS] });
    },
  });
};

// ── List Purchase Requests ────────────────────────────────────────────────

export interface GetPurchaseRequestsParams {
  status?: string;
  priority?: string;
  search?: string;


}

export const useGetPurchaseRequests = (
  params: GetPurchaseRequestsParams = {},
  options?: Omit<UseQueryOptions<ApiResponse<PurchaseRequest[]>, Error>, "queryKey" | "queryFn">
): UseQueryResult<ApiResponse<PurchaseRequest[]>, Error> => {
  const axiosInstance = useAxios();
  return useQuery({
    queryKey: [QUERY_KEYS.PURCHASE_REQUESTS, params],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params.status) query.set("status", params.status);
      if (params.priority) query.set("priority", params.priority);
      if (params.search) query.set("search", params.search);
      const url = `${PROCUREMENT_KEYS.PURCHASE_REQUESTS}${query.toString() ? `?${query.toString()}` : ""}`;
      const res = await axiosInstance.get(url);
      return res.data;
    },
    staleTime: 0,
    ...options,
  });
};

// ── Get Single Purchase Request ───────────────────────────────────────────

export const useGetPurchaseRequestById = (
  id: string,
  options?: Omit<UseQueryOptions<ApiResponse<PurchaseRequest>, Error>, "queryKey" | "queryFn">
): UseQueryResult<ApiResponse<PurchaseRequest>, Error> => {
  const axiosInstance = useAxios();
  return useQuery({
    queryKey: [QUERY_KEYS.PURCHASE_REQUEST, id],
    queryFn: async () => {
      const res = await axiosInstance.get(PROCUREMENT_KEYS.PURCHASE_REQUEST(id));
      return res.data;
    },
    enabled: !!id,
    staleTime: 0,
    ...options,
  });
};

// ── Update Purchase Request Header ────────────────────────────────────────

export const useUpdatePurchaseRequest = (
  id: string
): UseMutationResult<ApiResponse<PurchaseRequest>, Error, Partial<CreatePurchaseRequestPayload>> => {
  const axiosInstance = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await axiosInstance.patch(PROCUREMENT_KEYS.PURCHASE_REQUEST(id), payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_REQUEST, id] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_REQUESTS] });
    },
  });
};

// ── Add Line Item ─────────────────────────────────────────────────────────

export interface LineItemPayload {
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
  accountingResolutionStatus?: AccountingResolutionStatus;
}

export const useAddLineItem = (
  purchaseRequestId: string
): UseMutationResult<ApiResponse<any>, Error, { lineItems: LineItemPayload[] }> => {
  const axiosInstance = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await axiosInstance.post(
        PROCUREMENT_KEYS.LINE_ITEMS(purchaseRequestId),
        payload
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_REQUEST, purchaseRequestId] });
    },
  });
};

// ── Update Line Item ──────────────────────────────────────────────────────

export const useUpdateLineItem = (
  purchaseRequestId: string,
  lineItemId: string
): UseMutationResult<ApiResponse<PurchaseRequestLineItem>, Error, LineItemPayload> => {
  const axiosInstance = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await axiosInstance.patch(
        PROCUREMENT_KEYS.LINE_ITEM(purchaseRequestId, lineItemId),
        payload
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_REQUEST, purchaseRequestId] });
    },
  });
};

// ── Delete Line Item ──────────────────────────────────────────────────────

export const useDeleteLineItem = (
  purchaseRequestId: string
): UseMutationResult<ApiResponse<null>, Error, string> => {
  const axiosInstance = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lineItemId: string) => {
      const res = await axiosInstance.delete(
        PROCUREMENT_KEYS.LINE_ITEM(purchaseRequestId, lineItemId)
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_REQUEST, purchaseRequestId] });
    },
  });
};

// ── Submit Purchase Request ───────────────────────────────────────────────

export const useSubmitPurchaseRequest = (
  id: string
): UseMutationResult<ApiResponse<PurchaseRequest>, Error, void> => {
  const axiosInstance = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.patch(PROCUREMENT_KEYS.SUBMIT(id));
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_REQUEST, id] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_REQUESTS] });
    },
  });
};

// ── Cancel Purchase Request ───────────────────────────────────────────────

export const useCancelPurchaseRequest = (
  id: string
): UseMutationResult<ApiResponse<PurchaseRequest>, Error, void> => {
  const axiosInstance = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.patch(PROCUREMENT_KEYS.CANCEL(id));
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_REQUEST, id] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_REQUESTS] });
    },
  });
};

// ── Convert to PO ─────────────────────────────────────────────────────────

export interface ConvertToPOPayload {
  vendorId: string;
  deliveryDate: string;
  notes?: string;
}

export const useConvertToPO = (
  id: string
): UseMutationResult<ApiResponse<PurchaseRequest>, Error, ConvertToPOPayload> => {
  const axiosInstance = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await axiosInstance.post(PROCUREMENT_KEYS.CONVERT_TO_PO(id), payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_REQUEST, id] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.PURCHASE_REQUESTS] });
    },
  });
};

// ── Procurement Categories ────────────────────────────────────────────────

export interface ProcurementCategory {
  categoryId: string;
  name: string;
  description: string | null;
  source: string;
  templateKey: string | null;
  module: string;
  isActive: boolean;
  sortOrder: number;
  parentCategoryId: string | null;
  mergedIntoCategoryId: string | null;
  isPolicyAttached: boolean;
  policies: unknown[];
  createdBy: {
      userId: string;
      firstName: string;
      lastName: string;
      email: string;
      [key: string]: unknown;
  } | null;
  children: ProcurementCategory[];
}

export const useGetProcurementCategories = (
  options?: Omit<UseQueryOptions<ApiResponse<ProcurementCategory[]>, Error>, "queryKey" | "queryFn">
): UseQueryResult<ApiResponse<ProcurementCategory[]>, Error> => {
  const axiosInstance = useAxios();
  return useQuery({
    queryKey: [QUERY_KEYS.PROCUREMENT_CATEGORIES],
    queryFn: async () => {
      const res = await axiosInstance.get(PROCUREMENT_KEYS.CATEGORIES);
      return res.data;
    },
    staleTime: 60_000,
    ...options,
  });
};

export const useCreateProcurementCategory = (): UseMutationResult<
  ApiResponse<ProcurementCategory>,
  Error,
  { name: string; description?: string; parentCategoryId?: string }
> => {
  const axiosInstance = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const data = {
        categories: [
          {
            name: payload.name,
            module: "procurement",
            ...(payload.description ? { description: payload.description } : {}),
            ...(payload.parentCategoryId ? { parentCategoryId: payload.parentCategoryId } : {}),
          }
        ]
      };
      const res = await axiosInstance.post(PROCUREMENT_KEYS.CATEGORIES, data);
      
      const responseData = res.data;
      if (Array.isArray(responseData.data)) {
         responseData.data = responseData.data[0];
      }
      return responseData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.PROCUREMENT_CATEGORIES] });
    },
  });
};