import { useMutation, useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { PROCUREMENT_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import type { PolicyDraft } from "@/components/policies/procurement/types";

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface ProcurementPolicyApiRecord {
  procurementPolicyId: string;
  name: string;
  description?: string;
  policyGroup: string;
  scopeType: string;
  status: string;
  priority: number;
  requiresApproval: boolean;
  approvalMode: string;
  effectiveAt?: string;
  expiresAt?: string;
  rules: {
    criteria?: string;
    condition: string;
    enforcementAction: string;
    amount?: number;
    currency?: string;
    minimumQuotes?: number;
    maxCount?: number;
    timeUnit?: string;
    allowedVendorIds?: string[];
    allowedRoleIds?: string[];
    allowedPositions?: string[];
    requiredAttachmentTypes?: string[];
  }[];
  categories?: any[];
  departments?: any[];
  applicableDepartments?: any[];
  applicableRoles?: any[];
  jobGrades?: any[];
  managementLevels?: any[];
  vendors?: any[];
  approvers?: any[];
  createdBy?: any;
  createdAt: string;
  updatedAt: string;
}

interface PoliciesListResponse {
  message: string;
  status: number;
  data: ProcurementPolicyApiRecord[];
  meta: { totalCount: number; totalPages: number; currentPage: number; limit: number };
}

interface PolicyDetailResponse {
  message: string;
  status: number;
  data: ProcurementPolicyApiRecord;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

async function fetchAllProcurementPoliciesLoop(axios: any, url: string, page: number, limit: number) {
  if (limit !== 1000) {
    const res = await axios.get(`${url}?page=${page}&limit=${limit}`);
    return res.data;
  }

  // Intercept limit=1000 and fetch all pages
  const firstRes = await axios.get(`${url}?page=1&limit=100`);
  const firstPageData = firstRes.data;
  
  const totalPages = Math.min(Number(firstPageData?.meta?.totalPages) || 1, 50); // Cap at 50 pages to prevent hangs
  let allData = firstPageData?.data || [];
  
  if (totalPages > 1) {
    const promises = [];
    for (let i = 2; i <= totalPages; i++) {
      promises.push(axios.get(`${url}?page=${i}&limit=100`));
    }
    const results = await Promise.all(promises);
    results.forEach(res => {
      if (res.data?.data) {
        allData = [...allData, ...res.data.data];
      }
    });
  }
  
  return {
    ...firstPageData,
    data: allData,
    meta: {
      ...firstPageData?.meta,
      totalCount: allData.length,
      limit: allData.length,
      totalPages: 1,
      currentPage: 1
    }
  };
}

/** Fetch paginated list of procurement policies */
export const useGetProcurementPolicies = (
  page = 1,
  limit = 20,
  options?: Omit<UseQueryOptions<PoliciesListResponse, Error>, "queryKey" | "queryFn">
) => {
  const axios = useAxios();
  return useQuery<PoliciesListResponse, Error>({
    queryKey: [...QUERY_KEYS.procurement.policies, { page, limit }],
    queryFn: async () => {
      return fetchAllProcurementPoliciesLoop(axios, PROCUREMENT_KEYS.PROCUREMENT_POLICIES, page, limit);
    },
    staleTime: STALE_TIMES.NORMAL,
    retry: 1, // Don't retry 3 times if the endpoint doesn't exist yet, to avoid long loading states
    ...options,
  });
};

/** Fetch a single procurement policy by ID */
export const useGetProcurementPolicyById = (
  id: string,
  options?: Omit<UseQueryOptions<PolicyDetailResponse, Error>, "queryKey" | "queryFn">
) => {
  const axios = useAxios();
  return useQuery<PolicyDetailResponse, Error>({
    queryKey: QUERY_KEYS.procurement.policy(id),
    queryFn: async () => {
      const res = await axios.get(PROCUREMENT_KEYS.PROCUREMENT_POLICY(id));
      return res.data;
    },
    enabled: !!id,
    staleTime: STALE_TIMES.NORMAL,
    ...options,
  });
};

/** Create a new procurement policy */
export const useCreateProcurementPolicy = () => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: PolicyDraft) => {
      const res = await axios.post(PROCUREMENT_KEYS.PROCUREMENT_POLICIES, buildPayload(draft));
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.policies, refetchType: "all" });
    },
  });
};

/** Update an existing procurement policy */
export const useUpdateProcurementPolicy = (id: string) => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: PolicyDraft) => {
      const payload = buildPayload(draft);
      delete payload.draftId; // Ensure draftId is not sent when updating an active policy
      const res = await axios.patch(PROCUREMENT_KEYS.PROCUREMENT_POLICY(id), payload);
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.policies, refetchType: "all" });
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.policy(id), refetchType: "all" });
    },
  });
};

// ─── Draft hooks ─────────────────────────────────────────────────────────────

export const useGetProcurementPolicyDraftById = (
  draftId: string,
  options?: Omit<UseQueryOptions<PolicyDetailResponse, Error>, "queryKey" | "queryFn">
) => {
  const axios = useAxios();
  return useQuery<PolicyDetailResponse, Error>({
    queryKey: [...QUERY_KEYS.procurement.policy(draftId), "draft"],
    queryFn: async () => {
      const res = await axios.get(PROCUREMENT_KEYS.PROCUREMENT_POLICY_DRAFT_BY_ID(draftId));
      return res.data;
    },
    enabled: !!draftId,
    staleTime: STALE_TIMES.NORMAL,
    ...options,
  });
};

export const useCreateProcurementPolicyDraft = () => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: PolicyDraft) => {
      const res = await axios.post(PROCUREMENT_KEYS.PROCUREMENT_POLICY_DRAFTS, buildPayload(draft));
      return res.data;
    },
    onSuccess: () => {
      // invalidate drafts query if exists
    },
  });
};

export const useUpdateProcurementPolicyDraft = () => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ draftId, payload }: { draftId: string; payload: PolicyDraft }) => {
      const p = buildPayload(payload);
      p.draftId = draftId; // Ensure draftId is sent
      const res = await axios.patch(PROCUREMENT_KEYS.PROCUREMENT_POLICY_DRAFT_BY_ID(draftId), p);
      return res.data;
    },
    onSuccess: () => {
      // invalidate drafts query if exists
    },
  });
};

export const useDeleteProcurementPolicyDraft = () => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draftId: string) => {
      const res = await axios.delete(PROCUREMENT_KEYS.PROCUREMENT_POLICY_DRAFT_BY_ID(draftId));
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.policies, refetchType: "all" });
    },
  });
};

/** Delete a procurement policy */
export const useDeleteProcurementPolicy = () => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.delete(PROCUREMENT_KEYS.PROCUREMENT_POLICY(id));
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.policies, refetchType: "all" });
    },
  });
};

/** Approve or reject a procurement policy */
export const useProcurementPolicyAction = () => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      const res = await axios.patch(PROCUREMENT_KEYS.PROCUREMENT_POLICY_ACTION(id, action));
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.policies, refetchType: "all" });
    },
  });
};

// ─── Payload builder ─────────────────────────────────────────────────────────

function buildPayload(draft: PolicyDraft) {
  return {
    draftId: draft.draftId,
    procurementPolicyId: draft.procurementPolicyId,
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    policyGroup: draft.policyGroup,
    scopeType: draft.scopeType,
    scopeConfig: {},
    rules: draft.rules.map((r) => {
      const rule: Record<string, unknown> = {
        criteria: r.criteriaLabel,
        condition: r.condition,
        enforcementAction: r.enforcementAction,
      };
      if (r.amount !== undefined) rule.amount = r.amount;
      if (r.currency) rule.currency = r.currency;
      if (r.minimumQuotes !== undefined) rule.minimumQuotes = r.minimumQuotes;
      if (r.maxCount !== undefined) rule.maxCount = r.maxCount;
      if (r.timeUnit) rule.timeUnit = r.timeUnit;
      if (r.allowedVendorIds?.length) rule.allowedVendorIds = r.allowedVendorIds;
      if (r.allowedRoleIds?.length) rule.allowedRoleIds = r.allowedRoleIds;
      if (r.requiredAttachmentTypes?.length) rule.requiredAttachmentTypes = r.requiredAttachmentTypes;
      return rule;
    }),
    overridePermissions: {},
    exceptionConfig: {
      userIds: draft.exceptions.user ?? [],
      departmentIds: draft.exceptions.department ?? [],
      jobGradeIds: draft.exceptions.jobGrade ?? [],
      managementLevelIds: draft.exceptions.managementLevel ?? [],
    },
    effectiveAt: draft.effectiveAt || undefined,
    expiresAt: draft.expiresAt || undefined,
    priority: draft.priority ?? 100,
    categoryIds: draft.categoryIds,
    departmentIds: draft.departmentIds,
    jobGradeIds: draft.jobGradeIds,
    managementLevelIds: draft.managementLevelIds,
    vendorIds: draft.vendorIds,
  };
}
