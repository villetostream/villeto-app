import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { PROCUREMENT_KEYS } from "@/lib/constants/apis";
import { PurchaseOrderRecord } from "@/lib/types/purchase-request-helpers";

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

export const usePurchaseOrders = (
  page: number = 1,
  limit: number = 20,
  status?: string,
  vendorId?: string,
  search?: string
) => {
  const axios = useAxios();

  return useQuery({
    queryKey: [PROCUREMENT_KEYS.PURCHASE_ORDERS, page, limit, status, vendorId, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (status) params.append("status", status);
      if (vendorId) params.append("vendorId", vendorId);
      if (search) params.append("search", search);

      const response = await axios.get<PaginatedPurchaseOrdersResponse>(
        `${PROCUREMENT_KEYS.PURCHASE_ORDERS}?${params.toString()}`
      );
      
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export interface PurchaseOrderDetailResponse {
  message: string;
  status: number;
  data: PurchaseOrderRecord;
}

export const usePurchaseOrder = (id: string) => {
  const axios = useAxios();

  return useQuery({
    queryKey: [PROCUREMENT_KEYS.PURCHASE_ORDERS, "detail", id],
    queryFn: async () => {
      const response = await axios.get<PurchaseOrderDetailResponse>(
        PROCUREMENT_KEYS.PURCHASE_ORDER(id)
      );
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCancelPurchaseOrder = () => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.patch(PROCUREMENT_KEYS.CANCEL_PURCHASE_ORDER(id));
      return response.data;
    },
    onSuccess: (_data, id: string) => {
      queryClient.invalidateQueries({ queryKey: [PROCUREMENT_KEYS.PURCHASE_ORDERS, "detail", id] });
      queryClient.invalidateQueries({ queryKey: [PROCUREMENT_KEYS.PURCHASE_ORDERS] });
    },
  });
};

export const useIssuePurchaseOrder = () => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.patch(PROCUREMENT_KEYS.ISSUE_PURCHASE_ORDER(id));
      return response.data;
    },
    onSuccess: (_data, id: string) => {
      queryClient.invalidateQueries({ queryKey: [PROCUREMENT_KEYS.PURCHASE_ORDERS, "detail", id] });
      queryClient.invalidateQueries({ queryKey: [PROCUREMENT_KEYS.PURCHASE_ORDERS] });
    },
  });
};

export const useClosePurchaseOrder = () => {
  const axios = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.patch(PROCUREMENT_KEYS.CLOSE_PURCHASE_ORDER(id));
      return response.data;
    },
    onSuccess: (_data, id: string) => {
      queryClient.invalidateQueries({ queryKey: [PROCUREMENT_KEYS.PURCHASE_ORDERS, "detail", id] });
      queryClient.invalidateQueries({ queryKey: [PROCUREMENT_KEYS.PURCHASE_ORDERS] });
    },
  });
};
