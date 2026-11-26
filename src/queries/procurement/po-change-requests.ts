import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { useAuthStore } from "@/stores/auth-stores";
import {
  useEntityWorkspaceStore,
  workspaceQueryKey,
  workspaceReadOnly,
} from "@/features/entity-workspace/store";
import { toast } from "sonner";

export interface PoChangeRequestSummary {
  priceChangeRequestId: string;
  purchaseOrderId: string;
  poNumber: string;
  vendorName: string;
  vendorLegalName: string;
  status: string;
  version: number;
  difference: string;
  currency: string;
  expiresAt: string;
}

export interface PoPricingSegment {
  from: string;
  to: string;
  unitPrice: string;
  revision: number;
}

export interface PoChangeRequestDetail {
  priceChangeRequestId: string;
  purchaseOrderId: string;
  version: number;
  status: string;
  expiresAt: string;
  basisRevision: number;
  proposal: {
    reason: string;
    supportingDocuments: { name: string; url: string }[];
  };
  comparison: {
    currency: string;
    previousTotal: string;
    totalAmount: string;
    difference: string;
    taxAmount: string;
    previousTaxAmount: string;
    discountAmount: string;
    chargeAmount: string;
    lineItems: {
      purchaseOrderLineItemId: string;
      name: string;
      quantity: string;
      proposedUnitPrice: string;
      previousAmount: string;
      proposedAmount: string;
      eligibleQuantity: string;
      pricing: PoPricingSegment[];
    }[];
  };
  history: {
    version: number;
    action: string;
    at: string;
    actorType: string;
    actorId?: string | null;
    reason: string | null;
    policyEvaluation?: {
      resolution?: string;
      message?: string;
      violations?: { ruleId?: string; message: string }[];
      warnings?: { message: string }[];
    } | null;
  }[];
  policyEvaluation: {
    resolution?: string;
    message?: string;
    violations?: { ruleId?: string; message: string }[];
    warnings?: { message: string }[];
  } | null;
  controls: {
    spendPrograms?: string;
    availableBudget?: string;
    contractValidation?: string;
    taxCalculation?: string;
    discountsAndCharges?: string;
  };
}

export interface PoChangeSettings {
  validityDays: number;
}

export interface PoLineItemEligibility {
  purchaseOrderLineItemId: string;
  name?: string;
  orderedQuantity: number | string;
  deliveredQuantity?: number | string;
  invoicedQuantity?: number | string;
  eligibleQuantity: number | string;
  currentUnitPrice: number | string;
  isEligible: boolean;
  ineligibilityReason?: string | null;
}

export interface PoEligibilityResponse {
  purchaseOrderId: string;
  isEligibleForChangeRequest: boolean;
  reason?: string | null;
  lineItems: PoLineItemEligibility[];
}

export interface PoRevisionRecord {
  revisionNumber: number;
  purchaseOrderId: string;
  totalAmount: string | number;
  subtotal: string | number;
  taxAmount?: string | number;
  currency: string;
  issuedAt?: string;
  effectiveAt?: string;
  priceChangeRequestId?: string | null;
  changeReason?: string | null;
  lineItems?: Array<{
    purchaseOrderLineItemId: string;
    name: string;
    quantity: string | number;
    unitPrice: string | number;
    subtotal: string | number;
    pricingSegments?: Array<{
      from: string;
      to: string;
      unitPrice: string;
      revision: number;
    }>;
  }>;
}

const ROOT = "/procurement/po-change-requests";

export const formatPriceChangeStatus = (status: string) => {
  if (status === "approved_pending_issue") return "Awaiting Final Issue";
  if (status === "returned_for_correction") return "Returned for Correction";
  return status.replaceAll("_", " ");
};

export const extractApiErrorMessage = (error: unknown) => {
  const data = (
    error as {
      response?: {
        data?: { message?: string | string[]; issues?: { message: string }[] };
      };
    }
  ).response?.data;
  return (
    data?.issues?.map((issue) => issue.message).join(" ") ||
    (Array.isArray(data?.message) ? data.message.join(" ") : data?.message) ||
    (error instanceof Error
      ? error.message
      : "Unable to complete this action. Please refresh and try again.")
  );
};

export interface PoChangeRequestsResponse {
  data: PoChangeRequestSummary[];
  meta: { totalPages: number; totalCount: number };
}

export function usePoChangeRequests<TData = PoChangeRequestsResponse>(
  params?: {
    page?: number;
    limit?: number;
    status?: string;
    purchaseOrderId?: string;
    legalEntityId?: string;
  },
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number | false;
    select?: (data: PoChangeRequestsResponse) => TData;
  }
) {
  const axios = useAxios();
  const selection = useEntityWorkspaceStore((state) => state.selection);
  const generation = useEntityWorkspaceStore((state) => state.generation);
  const effectiveLegalEntity =
    params?.legalEntityId ?? (selection && selection !== "all" ? selection : undefined);

  return useQuery<PoChangeRequestsResponse, Error, TData>({
    queryKey: workspaceQueryKey([
      "po-change-requests",
      params?.purchaseOrderId,
      params?.status,
      params?.page ?? 1,
      params?.limit ?? 20,
      effectiveLegalEntity,
      generation,
    ]),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 30_000,
    refetchInterval: options?.refetchInterval,
    select: options?.select,
    queryFn: async () => {
      const response = await axios.get<PoChangeRequestsResponse>(ROOT, {
        params: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
          status: params?.status || undefined,
          purchaseOrderId: params?.purchaseOrderId,
          legalEntityId: params?.purchaseOrderId ? undefined : effectiveLegalEntity,
        },
      });
      return response.data;
    },
  });
}

export function usePoChangeRequestDetail(
  requestId: string | null | undefined,
  options?: { enabled?: boolean }
) {
  const axios = useAxios();
  const generation = useEntityWorkspaceStore((state) => state.generation);

  return useQuery({
    queryKey: workspaceQueryKey(["po-change-request", requestId, generation]),
    enabled: Boolean(requestId) && (options?.enabled ?? true),
    staleTime: 30_000,
    queryFn: async () => {
      if (!requestId) return null;
      const response = await axios.get<{ data: PoChangeRequestDetail }>(
        `${ROOT}/${requestId}`
      );
      return response.data.data;
    },
  });
}

export function usePoChangeSettings(options?: { enabled?: boolean }) {
  const axios = useAxios();
  const generation = useEntityWorkspaceStore((state) => state.generation);

  return useQuery({
    queryKey: workspaceQueryKey(["po-change-settings", generation]),
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const response = await axios.get<{ data: PoChangeSettings }>(
        `${ROOT}/settings`
      );
      return response.data.data;
    },
  });
}

export function usePoChangeEligibility(
  purchaseOrderId: string | null | undefined,
  options?: { enabled?: boolean }
) {
  const axios = useAxios();
  const generation = useEntityWorkspaceStore((state) => state.generation);

  return useQuery({
    queryKey: workspaceQueryKey(["po-change-eligibility", purchaseOrderId, generation]),
    enabled: Boolean(purchaseOrderId) && (options?.enabled ?? true),
    staleTime: 15_000,
    queryFn: async () => {
      if (!purchaseOrderId) return null;
      const response = await axios.get<{ data: PoEligibilityResponse }>(
        `${ROOT}/orders/${purchaseOrderId}/eligibility`
      );
      return response.data.data;
    },
  });
}

export function usePoRevisions(
  purchaseOrderId: string | null | undefined,
  options?: { enabled?: boolean }
) {
  const axios = useAxios();
  const generation = useEntityWorkspaceStore((state) => state.generation);

  return useQuery({
    queryKey: workspaceQueryKey(["po-revisions", purchaseOrderId, generation]),
    enabled: Boolean(purchaseOrderId) && (options?.enabled ?? true),
    staleTime: 30_000,
    queryFn: async () => {
      if (!purchaseOrderId) return [];
      const response = await axios.get<{ data: PoRevisionRecord[] }>(
        `${ROOT}/orders/${purchaseOrderId}/revisions`
      );
      return response.data.data;
    },
  });
}

export function useUpdatePoChangeSettings() {
  const axios = useAxios();
  const client = useQueryClient();
  const generation = useEntityWorkspaceStore((state) => state.generation);
  const scopePrefix = workspaceQueryKey([]);

  return useMutation({
    mutationFn: async (validityDays: number) => {
      await axios.put(`${ROOT}/settings`, { validityDays });
    },
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: [...scopePrefix, "po-change-settings", generation],
      });
      toast.success("Validity period updated successfully.");
    },
    onError: (err) => {
      toast.error(extractApiErrorMessage(err));
    },
  });
}

export function useDecidePoChangeRequest() {
  const axios = useAxios();
  const client = useQueryClient();
  const readonly = workspaceReadOnly();
  const generation = useEntityWorkspaceStore((state) => state.generation);
  const scopePrefix = workspaceQueryKey([]);

  return useMutation({
    mutationFn: async ({
      detail,
      action,
      reason,
      spendProgramJustification,
      spendProgramWarningsAccepted,
    }: {
      detail: PoChangeRequestDetail;
      action: "approve" | "reject" | "return" | "cancel";
      reason?: string;
      spendProgramJustification?: string;
      spendProgramWarningsAccepted?: boolean;
    }) => {
      if (readonly) {
        throw new Error("Select an active editable legal entity to perform this action.");
      }
      const response = await axios.post<{ data: PoChangeRequestDetail }>(
        `${ROOT}/${detail.priceChangeRequestId}/${action}`,
        {
          expectedVersion: detail.version,
          reason: reason?.trim() || undefined,
          spendProgramJustification: spendProgramJustification?.trim() || undefined,
          spendProgramWarningsAccepted: spendProgramWarningsAccepted ? true : undefined,
        },
        { _skipErrorToast: true } as any
      );
      return response.data.data;
    },
    onSuccess: async (result) => {
      if (result.status === "applied") {
        toast.success("Approved and issued. Revised prices are now effective.");
      } else if (result.status === "pending_review") {
        toast.success("Approval recorded. Waiting for remaining required approvals.");
      } else if (result.status === "returned_for_correction") {
        toast.success("Proposal returned to vendor for correction.");
      } else if (result.status === "rejected") {
        toast.success("Price change proposal rejected.");
      } else if (result.status === "cancelled") {
        toast.success("Approved price change cancelled.");
      } else {
        toast.success(`Request status is now ${formatPriceChangeStatus(result.status)}.`);
      }

      client.setQueryData(
        [...scopePrefix, "po-change-request", result.priceChangeRequestId, generation],
        result
      );

      await client.invalidateQueries({
        predicate: (q) =>
          scopePrefix.every((part, index) => q.queryKey[index] === part) &&
          ((q.queryKey.some(
            (part) => typeof part === "string" && part.startsWith("po-change")
          ) &&
            !q.queryKey.includes("po-change-settings") &&
            !q.queryKey.includes("po-change-request")) ||
            (result.status === "applied" &&
              q.queryKey.some(
                (part) =>
                  typeof part === "string" &&
                  (part.includes("purchaseOrder") || part.includes("purchase-order"))
              ))),
      });
    },
    onError: (err) => {
      toast.error(extractApiErrorMessage(err));
    },
  });
}
