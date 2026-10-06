import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import { asRecord, getString } from "@/lib/types/api-error";

// --- Types ---
export interface VendorNetworkMeta {
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface VendorNetworkListResponse {
  data: {
    data: any[];
    meta: VendorNetworkMeta;
  };
  message: string;
  status: number;
}

export interface VendorNetworkListParams {
  status?: string;
  onboardingStatus?: string;
  approvalStatus?: string;
  isPaymentEnabled?: boolean | string;
  search?: string;
  page?: number;
  limit?: number;
}

// --- Hooks ---

/**
 * List vendors using the V2 endpoint.
 * Supports filters like status, onboardingStatus, approvalStatus, isPaymentEnabled, search
 */
export const useVendorNetworkList = (params: VendorNetworkListParams) => {
  const axiosInstance = useAxios();
  
  return useQuery({
    queryKey: ["vendor-network", "list", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.set("status", params.status);
      if (params.onboardingStatus) queryParams.set("onboardingStatus", params.onboardingStatus);
      if (params.approvalStatus) queryParams.set("approvalStatus", params.approvalStatus);
      if (params.isPaymentEnabled !== undefined) queryParams.set("isPaymentEnabled", String(params.isPaymentEnabled));
      if (params.search) queryParams.set("search", params.search);
      if (params.page) queryParams.set("page", String(params.page));
      if (params.limit) queryParams.set("limit", String(params.limit));

      const queryStr = queryParams.toString();
      const url = `/vendor-network/vendors${queryStr ? `?${queryStr}` : ""}`;
      
      const response = await axiosInstance.get<VendorNetworkListResponse>(url);
      return response.data;
    },
    staleTime: STALE_TIMES.NORMAL,
  });
};

/**
 * Lookup vendor details before inviting (by email, cac, or tin)
 */
export const useVendorLookup = (type: "email" | "cac" | "tin", value: string, enabled: boolean = true) => {
  const axiosInstance = useAxios();

  return useQuery({
    queryKey: ["vendor-network", "lookup", type, value],
    queryFn: async () => {
      if (!value) return null;
      const response = await axiosInstance.get(
        `/vendor-network/vendor-lookup?type=${encodeURIComponent(type)}&value=${encodeURIComponent(value)}`
      );
      return response.data;
    },
    enabled: enabled && !!value,
    staleTime: STALE_TIMES.SLOW,
    retry: false, // Don't retry lookup if it 404s (vendor not found is an expected state)
  });
};

/**
 * Invite a vendor using the V2 endpoint
 */
export const useInviteVendorV2 = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      email: string;
      legalName: string;
      verificationRequested: boolean;
      method?: string;
      identifier?: string;
      verificationId?: string;
    }) => {
      const response = await axiosInstance.post("/vendor-network/invitations", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-network", "list"] });
    },
  });
};

/**
 * Get a single vendor's detail from the V2 endpoint
 */
export const useVendorNetworkDetail = (vendorId: string) => {
  const axiosInstance = useAxios();

  return useQuery({
    queryKey: ["vendor-network", "detail", vendorId],
    queryFn: async () => {
      if (!vendorId) return null;
      const response = await axiosInstance.get(`/vendor-network/vendors/${vendorId}`);
      return response.data;
    },
    enabled: !!vendorId,
    staleTime: STALE_TIMES.LIVE,
  });
};

/**
 * Approve or Reject a vendor
 */
export const useVendorReview = (vendorId: string) => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { decision: "approved" | "rejected"; note?: string }) => {
      const response = await axiosInstance.patch(`/vendor-network/vendors/${vendorId}/review`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-network", "detail", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["vendor-network", "list"] });
    },
  });
};

/**
 * Activate or Deactivate a vendor (Status)
 */
export const useVendorStatusUpdate = (vendorId: string) => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { status: "Active" | "Inactive" }) => {
      const response = await axiosInstance.patch(`/vendor-network/vendors/${vendorId}/status`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-network", "detail", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["vendor-network", "list"] });
    },
  });
};

/**
 * Enable or Disable payments for a vendor
 */
export const useVendorPaymentStatusUpdate = (vendorId: string) => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { enabled: boolean }) => {
      const response = await axiosInstance.patch(`/vendor-network/vendors/${vendorId}/payment-status`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-network", "detail", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["vendor-network", "list"] });
    },
  });
};
