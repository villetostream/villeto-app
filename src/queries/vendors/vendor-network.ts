import { workspaceQueryKey } from "@/features/entity-workspace/store";
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
  organizationAdmin?: boolean;
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
    queryKey: workspaceQueryKey(["vendor-network", "list", params]),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.set("status", params.status);
      if (params.onboardingStatus)
        queryParams.set("onboardingStatus", params.onboardingStatus);
      if (params.approvalStatus)
        queryParams.set("approvalStatus", params.approvalStatus);
      if (params.isPaymentEnabled !== undefined)
        queryParams.set("isPaymentEnabled", String(params.isPaymentEnabled));
      if (params.search) queryParams.set("search", params.search);
      if (params.page) queryParams.set("page", String(params.page));
      if (params.limit) queryParams.set("limit", String(params.limit));

      const queryStr = queryParams.toString();
      const url = `/vendor-network/${params.organizationAdmin ? "administration/" : ""}vendors${queryStr ? `?${queryStr}` : ""}`;

      const response = await axiosInstance.get<VendorNetworkListResponse>(url);
      return response.data;
    },
    staleTime: STALE_TIMES.NORMAL,
  });
};

/**
 * Lookup vendor details before inviting (by email, cac, or tin)
 */
export const useVendorLookup = (
  type: "email" | "cac" | "tin",
  value: string,
  enabled: boolean = true,
) => {
  const axiosInstance = useAxios();

  return useQuery({
    queryKey: workspaceQueryKey(["vendor-network", "lookup", type, value]),
    queryFn: async () => {
      if (!value) return null;
      const response = await axiosInstance.get(
        `/vendor-network/vendor-lookup?type=${encodeURIComponent(type)}&value=${encodeURIComponent(value)}`,
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
      const response = await axiosInstance.post(
        "/vendor-network/invitations",
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(["vendor-network", "list"]),
      });
    },
  });
};

/**
 * Get a single vendor's detail from the V2 endpoint
 */
export const useVendorNetworkDetail = (
  vendorId: string,
  organizationAdmin = false,
) => {
  const axiosInstance = useAxios();

  return useQuery({
    queryKey: workspaceQueryKey([
      "vendor-network",
      "detail",
      vendorId,
      organizationAdmin,
    ]),
    queryFn: async () => {
      if (!vendorId) return null;
      const response = await axiosInstance.get(
        `/vendor-network/${organizationAdmin ? "administration/" : ""}vendors/${vendorId}`,
      );
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
    mutationFn: async (payload: {
      decision: "approved" | "rejected";
      note?: string;
    }) => {
      const response = await axiosInstance.patch(
        `/vendor-network/vendors/${vendorId}/review`,
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(["vendor-network", "detail", vendorId]),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(["vendor-network", "list"]),
      });
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
      const response = await axiosInstance.patch(
        `/vendor-network/vendors/${vendorId}/status`,
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(["vendor-network", "detail", vendorId]),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(["vendor-network", "list"]),
      });
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
      const response = await axiosInstance.patch(
        `/vendor-network/vendors/${vendorId}/payment-status`,
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(["vendor-network", "detail", vendorId]),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(["vendor-network", "list"]),
      });
    },
  });
};

// ─── Payment Terms ────────────────────────────────────────────────────────────

export interface VendorPaymentTerm {
  paymentTermId: string;
  companyId: string;
  companyName: string;
  vendorId: string;
  vendorName: string;
  code: string;
  name: string;
  days: number;
  status: "pending_review" | "approved" | "rejected";
  revision: number;
  isCurrent: boolean;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * List vendor payment terms awaiting or carrying company decisions.
 */
export const useCompanyPaymentTermsList = (params?: {
  status?: string;
  vendorId?: string;
  companyId?: string;
  page?: number;
  limit?: number;
}) => {
  const axiosInstance = useAxios();

  return useQuery({
    queryKey: workspaceQueryKey(["vendor-network", "payment-terms", "list", params]),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.set("status", params.status);
      if (params?.vendorId) queryParams.set("vendorId", params.vendorId);
      if (params?.companyId) queryParams.set("companyId", params.companyId);
      if (params?.page) queryParams.set("page", String(params.page));
      if (params?.limit) queryParams.set("limit", String(params.limit || 50));

      const queryStr = queryParams.toString();
      const response = await axiosInstance.get(
        `/vendor-network/payment-terms${queryStr ? `?${queryStr}` : ""}`,
      );

      const body: any = response.data;
      const items = Array.isArray(body?.data?.data)
        ? body.data.data
        : Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body)
        ? body
        : [];
      return items as VendorPaymentTerm[];
    },
    staleTime: STALE_TIMES.LIVE,
  });
};

/**
 * Fetch a single payment term submission by ID.
 */
export const useVendorPaymentTerms = (
  paymentTermId: string | null | undefined,
) => {
  const axiosInstance = useAxios();

  return useQuery({
    queryKey: workspaceQueryKey(["vendor-network", "payment-terms", paymentTermId]),
    queryFn: async () => {
      const response = await axiosInstance.get(
        `/vendor-network/payment-terms/${paymentTermId}`,
      );
      const body: any = response.data;
      const item = body?.data?.data ?? body?.data ?? body;
      return item as VendorPaymentTerm;
    },
    enabled: !!paymentTermId,
    staleTime: STALE_TIMES.LIVE,
  });
};

/**
 * Approve a vendor's payment terms — also activates the vendor.
 */
export const useApprovePaymentTerms = (
  paymentTermId?: string,
  vendorId?: string,
) => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (overrideId?: string) => {
      const targetId = overrideId || paymentTermId;
      if (!targetId) throw new Error("Payment term ID is required to approve");
      const response = await axiosInstance.post(
        `/vendor-network/payment-terms/${targetId}/approve`,
      );
      return response.data;
    },
    onSuccess: () => {
      if (vendorId) {
        queryClient.invalidateQueries({
          queryKey: workspaceQueryKey(["vendor-network", "detail", vendorId]),
        });
      }
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(["vendor-network", "list"]),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(["vendor-network", "payment-terms"]),
      });
    },
  });
};

/**
 * Reject a vendor's payment terms with a reason.
 * The vendor remains in the approved-but-pending-payment-terms state
 * so they can resubmit from the onboarding screen.
 */
export const useRejectPaymentTerms = (
  paymentTermId?: string,
  vendorId?: string,
) => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { reason: string; paymentTermId?: string }) => {
      const targetId = payload.paymentTermId || paymentTermId;
      if (!targetId) throw new Error("Payment term ID is required to reject");
      const response = await axiosInstance.post(
        `/vendor-network/payment-terms/${targetId}/reject`,
        { reason: payload.reason },
      );
      return response.data;
    },
    onSuccess: () => {
      if (vendorId) {
        queryClient.invalidateQueries({
          queryKey: workspaceQueryKey(["vendor-network", "detail", vendorId]),
        });
      }
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(["vendor-network", "list"]),
      });
      queryClient.invalidateQueries({
        queryKey: workspaceQueryKey(["vendor-network", "payment-terms"]),
      });
    },
  });
};

