import { isAxiosError } from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateVendorManagement } from "./cache";
import {
  useEntityWorkspaceStore,
  workspaceQueryKey,
} from "@/features/entity-workspace/store";
import { useAxios } from "@/hooks/useAxios";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import { asArray, asRecord, getString, isRecord, pickString } from "@/lib/types/api-error";
import { logger } from "@/lib/logger";

// ─── Canonical V2 Types ───────────────────────────────────────────────────────

/**
 * Canonical persisted lifecycle status returned on V2 vendor list & detail endpoints.
 */
export type VendorLifecycleStatus =
  | "invited"
  | "pending_vendor_action"
  | "pending_company_approval"
  | "active"
  | "rejected"
  | "suspended"
  | "inactive";

export type VendorSitePurposeV2 = "purchasing" | "invoicing" | "remit_to";

export interface ConnectedLegalEntity {
  legalEntityId: string;
  legalName: string;
}

export interface VendorSiteV2 {
  vendorSiteId: string;
  vendorId: string;
  vendorName?: string;
  companyId?: string;
  companyName?: string;
  code: string;
  name: string;
  /** Normalized street address across `address`, `addressLine1`, and `legacyAddressText`. */
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  stateOrProvince: string | null;
  postalCode: string | null;
  countryCode: string | null;
  isPrimary: boolean;
  status: "active" | "inactive";
  isAssignedToLegalEntity: boolean;
  legalEntityCount: number;
  legalEntities: ConnectedLegalEntity[];
  inactivationReason?: string | null;
}

export interface VendorNetworkMeta {
  totalCount: number;
  currentPage: number;
  limit: number;
  totalPages: number;
}

export interface VendorNetworkSummary {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

export interface VendorNetworkListResponse {
  data: {
    data: Record<string, unknown>[];
    meta: VendorNetworkMeta;
    summary?: VendorNetworkSummary;
  };
  message: string;
  status: number;
}

export interface VendorNetworkListParams {
  view?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  status?: string;
  lifecycleStatus?: VendorLifecycleStatus | string;
  onboardingStatus?: string;
  approvalStatus?: string;
  isPaymentEnabled?: boolean | string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface EntityInvitationSiteAssignmentInput {
  vendorSiteId: string;
  /** When omitted, backend assigns site to purchasing, invoicing, and payment/remit_to. */
  purposes?: VendorSitePurposeV2[];
}

export interface EntityInvitationAttachmentRequestInput {
  key: string;
  label: string;
  required: boolean;
}

export interface EntityInvitationPayload {
  vendorId?: string;
  email?: string;
  tin?: string;
  cacNumber?: string;
  legalEntityId: string;
  message?: string;
  requestSeparatePaymentTerms?: boolean;
  requestSeparateBankDetails?: boolean;
  siteAssignments?: EntityInvitationSiteAssignmentInput[];
  attachmentRequests?: EntityInvitationAttachmentRequestInput[];
}

// ─── Normalizers & Helpers ────────────────────────────────────────────────────

const CANONICAL_LIFECYCLE_SET = new Set<VendorLifecycleStatus>([
  "invited",
  "pending_vendor_action",
  "pending_company_approval",
  "active",
  "rejected",
  "suspended",
  "inactive",
]);

/**
 * Resolves the canonical `lifecycleStatus` from a V2 payload, with safe fallback
 * for legacy vendor records that only expose `status` / `onboardingStatus` / `approvalStatus`.
 */
export function resolveVendorLifecycleStatus(
  raw: Record<string, unknown>,
): VendorLifecycleStatus {
  const explicit = getString(raw.lifecycleStatus).toLowerCase().trim() as VendorLifecycleStatus;
  if (CANONICAL_LIFECYCLE_SET.has(explicit)) {
    return explicit;
  }

  const status = getString(raw.status).toLowerCase().trim();
  const onboardingStatus = getString(raw.onboardingStatus).toLowerCase().trim();
  const approvalStatus = getString(raw.approvalStatus).toLowerCase().trim();
  const nextAction = getString(raw.nextAction).toLowerCase().trim();

  if (status === "suspended") return "suspended";
  if (status === "inactive" || status === "deactivated" || Boolean(raw.deactivatedAt)) {
    return "inactive";
  }

  const isAwaitingCompanyReview =
    nextAction === "awaiting_company_review" ||
    status === "pending_company_approval" ||
    status === "under_review" ||
    (onboardingStatus === "submitted" && approvalStatus !== "approved" && approvalStatus !== "rejected");

  if (isAwaitingCompanyReview) {
    return "pending_company_approval";
  }

  if (approvalStatus === "rejected" || status === "rejected" || status === "declined") {
    return "rejected";
  }

  if (status === "active" || approvalStatus === "approved") {
    return "active";
  }

  if (
    status === "pending_vendor_action" ||
    (onboardingStatus && onboardingStatus !== "invited")
  ) {
    return "pending_vendor_action";
  }

  return "invited";
}

export function normalizeConnectedLegalEntities(
  raw: Record<string, unknown>,
): { legalEntityCount: number; legalEntities: ConnectedLegalEntity[] } {
  const directEntities = asArray(raw.legalEntities)
    .filter(isRecord)
    .map((item) => ({
      legalEntityId: getString(item.legalEntityId) || getString(item.id),
      legalName:
        pickString(item, "legalName", "displayName", "name") || "Legal Entity",
    }))
    .filter((item) => Boolean(item.legalEntityId));

  const relationshipEntities =
    directEntities.length > 0
      ? directEntities
      : asArray(raw.entityRelationships)
          .filter(isRecord)
          .map((rel) => {
            const le = asRecord(rel.legalEntity);
            return {
              legalEntityId:
                getString(le.legalEntityId) || getString(rel.legalEntityId),
              legalName:
                pickString(le, "legalName", "displayName", "name") ||
                "Legal Entity",
            };
          })
          .filter((item) => Boolean(item.legalEntityId));

  const rawCount = Number(raw.legalEntityCount);
  const legalEntityCount = Number.isFinite(rawCount)
    ? rawCount
    : relationshipEntities.length;

  return {
    legalEntityCount,
    legalEntities: relationshipEntities,
  };
}

export function normalizeVendorSite(rawInput: unknown): VendorSiteV2 {
  const raw = asRecord(rawInput);
  const { legalEntityCount, legalEntities } = normalizeConnectedLegalEntities(raw);
  const statusRaw = getString(raw.status).toLowerCase();

  return {
    vendorSiteId: getString(raw.vendorSiteId) || getString(raw.siteId) || getString(raw.id),
    vendorId: getString(raw.vendorId),
    vendorName: getString(raw.vendorName) || undefined,
    companyId: getString(raw.companyId) || undefined,
    companyName: getString(raw.companyName) || undefined,
    code: getString(raw.code),
    name: getString(raw.name),
    addressLine1:
      getString(raw.addressLine1) ||
      getString(raw.address) ||
      getString(raw.legacyAddressText),
    addressLine2: getString(raw.addressLine2) || null,
    city: getString(raw.city) || null,
    stateOrProvince: getString(raw.stateOrProvince) || null,
    postalCode: getString(raw.postalCode) || null,
    countryCode: getString(raw.countryCode) || null,
    isPrimary: Boolean(raw.isPrimary),
    status: statusRaw === "inactive" ? "inactive" : "active",
    isAssignedToLegalEntity: Boolean(
      raw.isAssignedToLegalEntity ?? raw.isAttachedToEntity ?? false,
    ),
    legalEntityCount,
    legalEntities,
    inactivationReason: getString(raw.inactivationReason) || null,
  };
}

function normalizeListPayload(
  responseBody: unknown,
  fallbackPage = 1,
  fallbackLimit = 20,
): VendorNetworkListResponse {
  const root = asRecord(responseBody);
  const inner = isRecord(root.data) ? root.data : root;

  const list = Array.isArray(inner.data)
    ? (inner.data as Record<string, unknown>[])
    : Array.isArray(root.data)
    ? (root.data as Record<string, unknown>[])
    : Array.isArray(inner.vendors)
    ? (inner.vendors as Record<string, unknown>[])
    : Array.isArray(responseBody)
    ? (responseBody as Record<string, unknown>[])
    : [];

  const rawMeta = isRecord(inner.meta)
    ? inner.meta
    : isRecord(root.meta)
    ? root.meta
    : {};

  const totalCount = Number(rawMeta.totalCount ?? rawMeta.total ?? list.length) || 0;
  const limit = Number(rawMeta.limit ?? fallbackLimit) || fallbackLimit;
  const currentPage = Number(rawMeta.currentPage ?? rawMeta.page ?? fallbackPage) || fallbackPage;
  const totalPages =
    Number(rawMeta.totalPages) || Math.max(1, Math.ceil(totalCount / limit));

  const rawSummary = isRecord(inner.summary)
    ? inner.summary
    : isRecord(root.summary)
    ? root.summary
    : null;

  const summary: VendorNetworkSummary | undefined = rawSummary
    ? {
        total: Number(rawSummary.total ?? totalCount) || 0,
        approved: Number(rawSummary.approved ?? rawSummary.active ?? rawSummary.verified ?? 0) || 0,
        pending:
          Number(
            rawSummary.pending ??
              rawSummary.pendingCompanyApproval ??
              rawSummary.underReview ??
              0,
          ) || 0,
        rejected: Number(rawSummary.rejected ?? 0) || 0,
      }
    : undefined;

  return {
    data: {
      data: list,
      meta: { totalCount, currentPage, limit, totalPages },
      summary,
    },
    message: getString(root.message) || "OK",
    status: Number(root.status ?? root.statusCode ?? 200),
  };
}

function buildListSearchParams(params: VendorNetworkListParams): URLSearchParams {
  const queryParams = new URLSearchParams();
  if (params.view && params.view !== "all") queryParams.set("view", params.view);
  if (params.sortBy) queryParams.set("sortBy", params.sortBy);
  if (params.sortDirection) queryParams.set("sortDirection", params.sortDirection);
  if (params.status) queryParams.set("status", params.status);
  if (params.lifecycleStatus)
    queryParams.set("lifecycleStatus", params.lifecycleStatus);
  if (params.onboardingStatus)
    queryParams.set("onboardingStatus", params.onboardingStatus);
  if (params.approvalStatus)
    queryParams.set("approvalStatus", params.approvalStatus);
  if (params.isPaymentEnabled !== undefined)
    queryParams.set("isPaymentEnabled", String(params.isPaymentEnabled));
  if (params.search) queryParams.set("search", params.search.trim());
  if (params.fromDate) queryParams.set("fromDate", params.fromDate);
  if (params.toDate) queryParams.set("toDate", params.toDate);
  if (params.page) queryParams.set("page", String(params.page));
  if (params.limit) queryParams.set("limit", String(params.limit));
  return queryParams;
}

/**
 * `/vendor-network/vendors` and `/vendor-network/administration/vendors` use a
 * whitelist-validated DTO: unknown query properties (view, lifecycleStatus,
 * fromDate...) are rejected with HTTP 400. Only send what the API accepts and
 * filter the remainder client-side.
 */
function buildStrictNetworkParams(
  params: VendorNetworkListParams,
  options?: { allowSearch?: boolean },
): URLSearchParams {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (options?.allowSearch && params.search?.trim())
    query.set("search", params.search.trim());
  return query;
}

export function isLegalEntitySelectionRequiredError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  const payload = asRecord(error.response?.data);
  const nested = asRecord(payload.data);
  const code =
    getString(payload.code) ||
    getString(payload.errorCode) ||
    getString(nested.code);
  const message = getString(payload.message).toUpperCase();
  return (
    code === "LEGAL_ENTITY_SELECTION_REQUIRED" ||
    message.includes("LEGAL_ENTITY_SELECTION_REQUIRED")
  );
}

// ─── List & Detail Hooks ──────────────────────────────────────────────────────

/**
 * Legacy / shared organization vendor list hook (`/vendor-management`).
 */
export const useVendorNetworkList = (
  params: VendorNetworkListParams,
  enabled = true,
) => {
  const axiosInstance = useAxios();

  return useQuery({
    queryKey: workspaceQueryKey(["vendor-network", "list", params]),
    enabled,
    queryFn: async () => {
      const queryStr = buildListSearchParams(params).toString();
      const url = `/vendor-management${queryStr ? `?${queryStr}` : ""}`;
      const response = await axiosInstance.get(url);
      return normalizeListPayload(response.data, params.page, params.limit);
    },
    staleTime: STALE_TIMES.NORMAL,
  });
};

/**
 * Entity-scoped "My Vendors" list (`/vendor-network/vendors`).
 * Automatically carries `X-Villeto-Legal-Entity` via the workspace transport interceptor.
 * Falls back cleanly to `/vendor-management` only on HTTP 404 (never on 401/403).
 */
export const useMyVendorsList = (
  params: VendorNetworkListParams,
  enabled = true,
) => {
  const axiosInstance = useAxios();

  return useQuery({
    queryKey: workspaceQueryKey([
      "vendor-network",
      "my-vendors",
      { page: params.page, limit: params.limit },
    ]),
    enabled,
    queryFn: async () => {
      const queryStr = buildStrictNetworkParams(params).toString();
      try {
        const response = await axiosInstance.get(
          `/vendor-network/vendors${queryStr ? `?${queryStr}` : ""}`,
        );
        return normalizeListPayload(response.data, params.page, params.limit);
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          const fallback = await axiosInstance.get(
            `/vendor-management${queryStr ? `?${queryStr}` : ""}`,
          );
          return normalizeListPayload(fallback.data, params.page, params.limit);
        }
        throw error;
      }
    },
    staleTime: STALE_TIMES.NORMAL,
  });
};

/**
 * Company-wide "Master Vendor List" (`GET /vendor-network/administration/vendors`).
 * Requires `vendor.master_list.manage` permission and runs outside workspace entity filtering.
 * Includes vendors even when they have no relationship with the currently selected legal entity.
 */
export const useMasterVendorList = (
  params: VendorNetworkListParams,
  enabled = true,
) => {
  const axiosInstance = useAxios();

  return useQuery({
    queryKey: workspaceQueryKey([
      "vendor-network",
      "master-list",
      { page: params.page, limit: params.limit, search: params.search },
    ]),
    enabled,
    queryFn: async () => {
      const queryStr = buildStrictNetworkParams(params, {
        allowSearch: true,
      }).toString();
      try {
        const response = await axiosInstance.get(
          `/vendor-network/administration/vendors${queryStr ? `?${queryStr}` : ""}`,
        );
        return normalizeListPayload(response.data, params.page, params.limit);
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          const fallback = await axiosInstance.get(
            `/vendor-management${queryStr ? `?${queryStr}` : ""}`,
          );
          return normalizeListPayload(fallback.data, params.page, params.limit);
        }
        throw error;
      }
    },
    staleTime: STALE_TIMES.NORMAL,
  });
};

/**
 * Company-wide Master Vendor Detail (`GET /vendor-network/administration/vendors/:vendorId`).
 * Returns vendor identity plus `legalEntityCount` and `legalEntities` (`[{ legalEntityId, legalName }]`).
 */
export const useMasterVendorDetail = (vendorId: string, enabled = true) => {
  const axiosInstance = useAxios();

  return useQuery({
    queryKey: workspaceQueryKey(["vendor-network", "master-detail", vendorId]),
    enabled: enabled && !!vendorId,
    queryFn: async () => {
      try {
        const response = await axiosInstance.get(
          `/vendor-network/administration/vendors/${vendorId}`,
        );
        return response.data;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          const fallback = await axiosInstance.get(
            `/vendor-management/${vendorId}/profile`,
          );
          return fallback.data;
        }
        throw error;
      }
    },
    staleTime: STALE_TIMES.LIVE,
  });
};

/**
 * Find an existing organization supplier before inviting (supports email, TIN, CAC, or general query).
 * Checks the master administration directory when `canManageMasterList` is true so cross-entity
 * matches are discovered before creating a duplicate invitation.
 */
export const useVendorLookup = (
  type: "email" | "tin" | "cacNumber" | "search",
  value: string,
  enabled = true,
  options?: { useMasterDirectory?: boolean },
) => {
  const axiosInstance = useAxios();
  const trimmed = value.trim();

  return useQuery({
    queryKey: workspaceQueryKey([
      "vendor-network",
      "lookup",
      type,
      trimmed,
      Boolean(options?.useMasterDirectory),
    ]),
    queryFn: async () => {
      if (!trimmed) return null;

      let candidates: Record<string, unknown>[] = [];
      if (options?.useMasterDirectory) {
        try {
          const res = await axiosInstance.get(
            `/vendor-network/administration/vendors?search=${encodeURIComponent(trimmed)}&limit=5`,
          );
          candidates = normalizeListPayload(res.data, 1, 5).data.data;
        } catch (error) {
          if (isAxiosError(error) && error.response?.status === 404) {
            const fallback = await axiosInstance.get(
              `/vendor-management?search=${encodeURIComponent(trimmed)}&limit=5`,
            );
            candidates = normalizeListPayload(fallback.data, 1, 5).data.data;
          } else {
            throw error;
          }
        }
      } else {
        const paramKey = type === "email" ? "email" : "search";
        const res = await axiosInstance.get(
          `/vendor-management?${paramKey}=${encodeURIComponent(trimmed)}&limit=5`,
        );
        candidates = normalizeListPayload(res.data, 1, 5).data.data;
      }

      const normalizedTarget = trimmed.toLowerCase();
      const matched = candidates.find((candidate) => {
        if (type === "email") {
          return getString(candidate.email).toLowerCase() === normalizedTarget;
        }
        if (type === "tin") {
          return getString(candidate.tin).toLowerCase() === normalizedTarget;
        }
        if (type === "cacNumber") {
          return (
            getString(candidate.registrationNumber).toLowerCase() === normalizedTarget ||
            getString(candidate.cacNumber).toLowerCase() === normalizedTarget
          );
        }
        return (
          getString(candidate.email).toLowerCase() === normalizedTarget ||
          getString(candidate.tin).toLowerCase() === normalizedTarget ||
          getString(candidate.registrationNumber).toLowerCase() === normalizedTarget
        );
      });

      return { data: { found: !!matched, vendor: matched || null, candidates } };
    },
    enabled: enabled && !!trimmed,
    staleTime: STALE_TIMES.SLOW,
    retry: false,
  });
};

// ─── Invitations & Entity Connection Hooks ────────────────────────────────────

/**
 * First-time vendor invitation (`POST /vendor-network/invitations`).
 * Accepts optional `legalEntityId`; if omitted when user has multiple entities,
 * backend returns `LEGAL_ENTITY_SELECTION_REQUIRED`.
 */
export const useInviteVendorV2 = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      email: string;
      legalName: string;
      verificationRequested: boolean;
      legalEntityId?: string;
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
      void invalidateVendorManagement(queryClient);
    },
  });
};

/**
 * Invite an existing company-directory vendor to another legal entity
 * (`POST /vendor-network/v2/entity-invitations`).
 * Exactly one of `vendorId`, `email`, `tin`, or `cacNumber` must be supplied.
 */
export const useInviteVendorToEntityV2 = () => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: EntityInvitationPayload) => {
      const identifiers = [
        payload.vendorId,
        payload.email,
        payload.tin,
        payload.cacNumber,
      ].filter((v) => Boolean(v && v.trim()));

      if (identifiers.length !== 1) {
        throw new Error(
          "Provide exactly one vendor identifier (vendorId, email, TIN, or CAC number).",
        );
      }
      if (!payload.legalEntityId) {
        throw new Error("Select a target legal entity to invite this vendor.");
      }

      const response = await axiosInstance.post(
        "/vendor-network/v2/entity-invitations",
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      void invalidateVendorManagement(queryClient);
    },
  });
};

// ─── Vendor Detail, Sites & Relationship Review Hooks ─────────────────────────

/**
 * Get a single vendor's detail profile.
 * Uses entity-scoped `/vendor-network/vendors/:vendorId` when `entityScoped` is requested,
 * or `/vendor-management/:vendorId/profile` for full profile view.
 */
export const useVendorNetworkDetail = (
  vendorId: string,
  options?: { entityScoped?: boolean; enabled?: boolean },
) => {
  const axiosInstance = useAxios();
  const isEnabled = (options?.enabled ?? true) && !!vendorId;

  return useQuery({
    queryKey: workspaceQueryKey([
      "vendor-network",
      "detail",
      vendorId,
      Boolean(options?.entityScoped),
    ]),
    queryFn: async () => {
      if (!vendorId) return null;
      if (options?.entityScoped) {
        try {
          const res = await axiosInstance.get(`/vendor-network/vendors/${vendorId}`);
          return res.data;
        } catch (error) {
          if (!isAxiosError(error) || error.response?.status !== 404) {
            throw error;
          }
        }
      }
      const response = await axiosInstance.get(
        `/vendor-management/${vendorId}/profile`,
      );
      return response.data;
    },
    enabled: isEnabled,
    staleTime: STALE_TIMES.LIVE,
  });
};

/**
 * List vendor-owned sites (`GET /vendor-network/v2/vendors/:vendorId/sites`).
 * Supports `status`, `isPrimary`, `assignment` (`all` | `assigned` | `unassigned`),
 * and explicit `X-Villeto-Legal-Entity` context so caches stay isolated per entity.
 */
export const useVendorSitesV2 = (
  vendorId: string,
  params?: {
    page?: number;
    limit?: number;
    status?: "active" | "inactive";
    isPrimary?: boolean;
    assignment?: "all" | "assigned" | "unassigned";
    legalEntityId?: string | null;
  },
  enabled = true,
) => {
  const axiosInstance = useAxios();
  const workspaceSelection = useEntityWorkspaceStore((s) => s.selection);
  const effectiveEntityHeader =
    params?.legalEntityId !== undefined ? params.legalEntityId : workspaceSelection;

  return useQuery({
    queryKey: workspaceQueryKey([
      "vendor-network",
      "sites-v2",
      vendorId,
      effectiveEntityHeader || "none",
      params,
    ]),
    enabled: enabled && !!vendorId,
    queryFn: async () => {
      const query = new URLSearchParams();
      if (params?.page) query.set("page", String(params.page));
      if (params?.limit) query.set("limit", String(params.limit));
      if (params?.status) query.set("status", params.status);
      if (params?.isPrimary !== undefined)
        query.set("isPrimary", String(params.isPrimary));
      if (params?.assignment) query.set("assignment", params.assignment);

      const queryStr = query.toString();
      const headers: Record<string, string> = {};
      if (effectiveEntityHeader) {
        headers["X-Villeto-Legal-Entity"] = effectiveEntityHeader;
      }

      try {
        const response = await axiosInstance.get(
          `/vendor-network/v2/vendors/${vendorId}/sites${queryStr ? `?${queryStr}` : ""}`,
          { headers },
        );
        const body = asRecord(response.data);
        const inner = isRecord(body.data) ? body.data : body;
        const rawSites = Array.isArray(inner.data)
          ? inner.data
          : Array.isArray(inner.sites)
          ? inner.sites
          : Array.isArray(body.data)
          ? body.data
          : Array.isArray(response.data)
          ? response.data
          : [];
        return (rawSites as unknown[]).map(normalizeVendorSite);
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          const fallback = await axiosInstance.get(
            `/vendor-management/${vendorId}/sites`,
          );
          const body = asRecord(fallback.data);
          const inner = isRecord(body.data) ? body.data : body;
          const rawSites = Array.isArray(body.data)
            ? body.data
            : Array.isArray(inner.sites)
            ? inner.sites
            : Array.isArray(fallback.data)
            ? fallback.data
            : [];
          return (rawSites as unknown[]).map(normalizeVendorSite);
        }
        throw error;
      }
    },
    staleTime: STALE_TIMES.NORMAL,
  });
};

export interface RawEntityRelationshipSiteAssignment {
  vendorEntitySiteAssignmentId: string;
  vendorSiteId: string | null;
  purpose: string;
  status: "active" | "inactive";
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  inactivationReason?: string | null;
  site?: Partial<VendorSiteV2> | null;
}

export interface RawEntityRelationship {
  vendorEntityRelationshipId: string;
  legalEntityId?: string;
  legalEntity?: {
    legalEntityId: string;
    code?: string;
    legalName?: string;
    displayName?: string | null;
  } | null;
  status: "pending" | "approved" | "suspended";
  purchasingEnabled: boolean;
  invoicingEnabled?: boolean;
  paymentEnabled?: boolean;
  siteAssignments?: RawEntityRelationshipSiteAssignment[];
}

/**
 * List legal-entity relationships for a vendor with site assignments and controls.
 * Uses workspace generation to keep in sync with entity workspace switches.
 */
export const useVendorEntityRelationships = (
  vendorId: string | undefined,
  enabled = true,
) => {
  const axiosInstance = useAxios();
  const workspaceGeneration = useEntityWorkspaceStore((s) => s.generation);

  return useQuery({
    queryKey: [
      "vendor-management",
      "entity-relationships",
      vendorId,
      workspaceGeneration,
    ],
    enabled: enabled && !!vendorId,
    queryFn: async () => {
      try {
        const response = await axiosInstance.get(
          `/vendor-management/${vendorId}/entity-relationships`,
        );
        const body = asRecord(response.data);
        const data = body.data ?? response.data;
        if (Array.isArray(data)) return data as RawEntityRelationship[];
        if (isRecord(data) && Array.isArray(data.relationships)) {
          return data.relationships as RawEntityRelationship[];
        }
        return [] as RawEntityRelationship[];
      } catch (err) {
        logger.error("Failed to load vendor entity relationships:", err);
        return [] as RawEntityRelationship[];
      }
    },
    staleTime: STALE_TIMES.NORMAL,
  });
};

/**
 * View one vendor site (`GET /vendor-network/v2/sites/:siteId`).
 */
export const useVendorSiteDetailV2 = (siteId: string | null, enabled = true) => {
  const axiosInstance = useAxios();

  return useQuery({
    queryKey: workspaceQueryKey(["vendor-network", "site-detail-v2", siteId]),
    enabled: enabled && !!siteId,
    queryFn: async () => {
      const response = await axiosInstance.get(`/vendor-network/v2/sites/${siteId}`);
      const body = asRecord(response.data);
      return normalizeVendorSite(body.data ?? response.data);
    },
    staleTime: STALE_TIMES.NORMAL,
  });
};

/**
 * Add sites to a legal-entity relationship
 * (`POST /vendor-network/v2/vendors/:vendorId/entity-relationships/:relationshipId/site-assignments`).
 * Additive: retains existing assignments and adds missing site-purpose combinations.
 */
export const useAssignVendorSitesV2 = (vendorId: string, relationshipId?: string) => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      relationshipId?: string;
      siteAssignments: EntityInvitationSiteAssignmentInput[];
    }) => {
      const targetRelationshipId = payload.relationshipId || relationshipId;
      if (!targetRelationshipId) {
        throw new Error("A legal-entity relationship ID is required to assign sites.");
      }
      const response = await axiosInstance.post(
        `/vendor-network/v2/vendors/${vendorId}/entity-relationships/${targetRelationshipId}/site-assignments`,
        { siteAssignments: payload.siteAssignments },
      );
      return response.data;
    },
    onSuccess: () => {
      void invalidateVendorManagement(queryClient);
    },
  });
};

/**
 * List documents uploaded specifically for a legal-entity relationship
 * (`GET /vendor-network/v2/vendors/:vendorId/entity-relationships/:relationshipId/documents`).
 */
export const useEntityRelationshipDocumentsV2 = (
  vendorId: string,
  relationshipId: string | null | undefined,
  enabled = true,
) => {
  const axiosInstance = useAxios();

  return useQuery({
    queryKey: workspaceQueryKey([
      "vendor-network",
      "relationship-documents-v2",
      vendorId,
      relationshipId,
    ]),
    enabled: enabled && !!vendorId && !!relationshipId,
    queryFn: async () => {
      const response = await axiosInstance.get(
        `/vendor-network/v2/vendors/${vendorId}/entity-relationships/${relationshipId}/documents`,
      );
      const body = asRecord(response.data);
      const inner = isRecord(body.data) ? body.data : body;
      return Array.isArray(inner.documents)
        ? inner.documents
        : Array.isArray(body.data)
        ? body.data
        : Array.isArray(response.data)
        ? response.data
        : [];
    },
    staleTime: STALE_TIMES.LIVE,
  });
};

/**
 * Approve or reject a specific legal-entity relationship
 * (`POST /vendor-network/v2/vendors/:vendorId/entity-relationships/:relationshipId/approve`).
 * Rejection returns the relationship to `pending_vendor_action` for vendor correction/resubmission.
 */
export const useApproveEntityRelationshipV2 = (
  vendorId: string,
  relationshipId?: string,
) => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      relationshipId?: string;
      decision: "approved" | "rejected";
      reason: string;
      paymentTermsDecision?: "approved" | "rejected";
      paymentTermsReason?: string;
    }) => {
      const targetRelationshipId = payload.relationshipId || relationshipId;
      if (!targetRelationshipId) {
        throw new Error("A legal-entity relationship ID is required.");
      }
      const { relationshipId: _omit, ...body } = payload;
      const response = await axiosInstance.post(
        `/vendor-network/v2/vendors/${vendorId}/entity-relationships/${targetRelationshipId}/approve`,
        body,
      );
      return response.data;
    },
    onSuccess: () => {
      void invalidateVendorManagement(queryClient);
    },
  });
};

/**
 * First-time vendor review (`PATCH /vendor-network/vendors/:vendorId/review`).
 * Supports optional `siteIds` selection during approval.
 */
export const useVendorReview = (vendorId: string) => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      decision: "approve" | "approved" | "rejected";
      note?: string;
      reason?: string;
      siteIds?: string[];
    }) => {
      const response = await axiosInstance.patch(
        `/vendor-network/vendors/${vendorId}/review`,
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      void invalidateVendorManagement(queryClient);
    },
  });
};

/**
 * Activate or Deactivate a vendor relationship (`PATCH /vendor-network/vendors/:vendorId/status`)
 * or activate/deactivate a vendor across the entire company (`PATCH /vendor-network/administration/vendors/:vendorId/status`).
 */
export const useVendorStatusUpdate = (vendorId: string) => {
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      status: "Active" | "Inactive" | "Suspended";
      reason?: string;
      legalEntityId?: string | null;
      organizationWide?: boolean;
    }) => {
      const { legalEntityId, organizationWide, ...body } = payload;
      const headers: Record<string, string> = {};
      if (legalEntityId && !organizationWide) {
        headers["X-Villeto-Legal-Entity"] = legalEntityId;
      }
      const endpoint = organizationWide
        ? `/vendor-network/administration/vendors/${vendorId}/status`
        : `/vendor-network/vendors/${vendorId}/status`;
      const response = await axiosInstance.patch(
        endpoint,
        body,
        { headers },
      );
      return response.data;
    },
    onSuccess: () => {
      void invalidateVendorManagement(queryClient);
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
    mutationFn: async (payload: { enabled: boolean; legalEntityId?: string | null }) => {
      const { legalEntityId, ...body } = payload;
      const headers: Record<string, string> = {};
      if (legalEntityId) {
        headers["X-Villeto-Legal-Entity"] = legalEntityId;
      }
      const response = await axiosInstance.patch(
        `/vendor-network/vendors/${vendorId}/payment-status`,
        body,
        { headers },
      );
      return response.data;
    },
    onSuccess: () => {
      void invalidateVendorManagement(queryClient);
    },
  });
};

/**
 * Load eligible legal entities for vendor invitation / entity connection pickers.
 */
export const useVendorLegalEntityOptions = (enabled = true) => {
  const axiosInstance = useAxios();
  const snapshotEntities = useEntityWorkspaceStore(
    (s) => s.snapshot?.entities,
  );

  return useQuery({
    queryKey: workspaceQueryKey(["vendor-network", "legal-entities-options"]),
    enabled,
    queryFn: async () => {
      try {
        const res = await axiosInstance.get("/vendor-management/legal-entities");
        const body = asRecord(res.data);
        const inner = isRecord(body.data) ? body.data : body;
        const rawList = asArray(inner.entities ?? body.data);
        const parsed = rawList
          .filter(isRecord)
          .map((e) => ({
            legalEntityId: getString(e.legalEntityId) || getString(e.id),
            code: getString(e.code),
            legalName:
              pickString(e, "displayName", "legalName", "name") || "Legal Entity",
            status: getString(e.status) || "active",
          }))
          .filter((e) => Boolean(e.legalEntityId));
        if (parsed.length > 0) return parsed;
      } catch {
        // Fall back to workspace snapshot entities when /vendor-management/legal-entities is restricted
      }

      return (snapshotEntities ?? [])
        .filter((e) => e.status === "active")
        .map((e) => ({
          legalEntityId: e.legalEntityId,
          code: e.code,
          legalName: e.legalName,
          status: e.status,
        }));
    },
    staleTime: STALE_TIMES.SLOW,
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
  page?: number;
  limit?: number;
}) => {
  const axiosInstance = useAxios();

  return useQuery({
    queryKey: workspaceQueryKey(["vendor-network", "payment-terms", "list", params]),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.set("status", params.status);
      if (params?.page) queryParams.set("page", String(params.page));
      if (params?.limit) queryParams.set("limit", String(params.limit || 100));

      const queryStr = queryParams.toString();
      const response = await axiosInstance.get(
        `/vendor-network/payment-terms${queryStr ? `?${queryStr}` : ""}`,
      );

      const body = asRecord(response.data);
      const inner = isRecord(body.data) ? body.data : body;
      const items = Array.isArray(inner.data)
        ? inner.data
        : Array.isArray(body.data)
        ? body.data
        : Array.isArray(response.data)
        ? response.data
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
      const body = asRecord(response.data);
      const inner = isRecord(body.data) ? body.data : body;
      const item = inner.data ?? body.data ?? response.data;
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
  _vendorId?: string,
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
      void invalidateVendorManagement(queryClient);
    },
  });
};

/**
 * Reject a vendor's payment terms with a reason.
 */
export const useRejectPaymentTerms = (
  paymentTermId?: string,
  _vendorId?: string,
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
      void invalidateVendorManagement(queryClient);
    },
  });
};
