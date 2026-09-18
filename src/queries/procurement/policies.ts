import { useMutation, useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { PROCUREMENT_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import type { SpendProgramDraft, SpendProgramGroup, RuleDefinition } from "@/components/policies/procurement/types";

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



// ─── Spend Programs V1 Hooks ─────────────────────────────────────────────────

export interface SpendProgramSettings {
  enabled: boolean;
  coverageMode: "none" | "all_categories" | "specific_categories";
  categoryIds?: string[];
  categories?: string[]; // Fallback
  approvalRequired: boolean;
  allRolesCanApprove?: boolean;
  approverRoleIds?: string[];
  enabledGroups?: string[];
  activeStages?: string[]; // Fallback
}

export const useGetSpendProgramRuleDefinitions = (group?: SpendProgramGroup) => {
  const axios = useAxios();
  return useQuery<{ data: RuleDefinition[] }, Error>({
    queryKey: QUERY_KEYS.procurement.spendProgramRuleDefs(group),
    queryFn: async () => {
      const url = group 
        ? `${PROCUREMENT_KEYS.SPEND_PROGRAM_RULE_DEFINITIONS}?group=${group}&includeInactive=false`
        : `${PROCUREMENT_KEYS.SPEND_PROGRAM_RULE_DEFINITIONS}?includeInactive=false`;
      const res = await axios.get(url);
      return res.data;
    },
    staleTime: STALE_TIMES.SLOW,
  });
};

export interface UpdateRuleDefinitionPayload {
  ruleType: string;
  name: string;
  description: string;
  groups: string[];
  allowedActions: string[];
  conditionSchema: Record<string, any>;
  actionSchema: Record<string, any>;
  isActive: boolean;
}

export const useUpdateSpendProgramRuleDefinition = () => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateRuleDefinitionPayload) => {
      const res = await axios.put(PROCUREMENT_KEYS.SPEND_PROGRAM_RULE_DEFINITIONS, payload);
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.spendProgramRuleDefs(), refetchType: "all" });
    },
  });
};

export const useDeleteSpendProgramRuleDefinition = () => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ruleType: string) => {
      const res = await axios.delete(PROCUREMENT_KEYS.SPEND_PROGRAM_RULE_DEFINITION_DELETE(ruleType));
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.spendProgramRuleDefs(), refetchType: "all" });
    },
  });
};

export const useSeedDefaultRuleDefinitions = () => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await axios.post(PROCUREMENT_KEYS.SPEND_PROGRAM_RULE_DEFINITIONS_SEED);
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.spendProgramRuleDefs(), refetchType: "all" });
    },
  });
};

export const useGetSpendProgramSettings = (options?: { enabled?: boolean }) => {
  const axios = useAxios();
  return useQuery<{ data: SpendProgramSettings }, Error>({
    queryKey: QUERY_KEYS.procurement.spendProgramSettings,
    queryFn: async () => {
      const res = await axios.get(PROCUREMENT_KEYS.SPEND_PROGRAM_SETTINGS);
      return res.data;
    },
    staleTime: STALE_TIMES.NORMAL,
    refetchInterval: 15000, // actively check every 15s in case another user changes settings
    enabled: options?.enabled ?? true,
  });
};

export const useUpdateSpendProgramSettings = () => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Partial<SpendProgramSettings>) => {
      const res = await axios.put(PROCUREMENT_KEYS.SPEND_PROGRAM_SETTINGS, settings);
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.spendProgramSettings, refetchType: "all" });
    },
  });
};

export interface SpendProgramSettingsCategory {
  categoryId: string;
  name: string;
  inSettings: boolean;
  settingStatus: "included" | "not_in_settings" | "included_by_all_categories";
  hasSpendProgram: boolean;
}

export const useGetSpendProgramSettingsCategories = (inSettings?: boolean) => {
  const axios = useAxios();
  return useQuery<{ data: { enabled: boolean; coverageMode: string; categories: SpendProgramSettingsCategory[] } }, Error>({
    queryKey: [...QUERY_KEYS.procurement.spendProgramCategories, { inSettings }],
    queryFn: async () => {
      const url = inSettings !== undefined 
        ? `${PROCUREMENT_KEYS.SPEND_PROGRAM_SETTINGS_CATEGORIES}?inSettings=${inSettings}`
        : PROCUREMENT_KEYS.SPEND_PROGRAM_SETTINGS_CATEGORIES;
      const res = await axios.get(url);
      return res.data;
    },
    staleTime: STALE_TIMES.NORMAL,
  });
};

export const useGetSpendProgramEligibleRoles = () => {
  const axios = useAxios();
  return useQuery<{ data: any[] }, Error>({
    queryKey: QUERY_KEYS.procurement.spendProgramEligibleRoles,
    queryFn: async () => {
      const res = await axios.get(PROCUREMENT_KEYS.SPEND_PROGRAM_ELIGIBLE_ROLES);
      return res.data;
    },
    staleTime: STALE_TIMES.SLOW,
  });
};

// ─── Spend Program Payload builder ───────────────────────────────────────────

export function buildSpendProgramPayload(draft: SpendProgramDraft, isUpdate: boolean = false) {
  return {
    draftId: draft.draftId,
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    categoryIds: draft.categoryIds,
    groups: draft.groups
      .filter(g => g.rules.length > 0)
      .map(g => ({
        group: g.group,
        rules: g.rules.map((r, idx) => ({
          procurementSpendProgramRuleId: r.procurementSpendProgramRuleId || (r.id && !r.id.startsWith("rule-") ? r.id : undefined),
          ruleDefinitionId: r.ruleDefinitionId,
          ruleType: r.ruleType,
          appliesToCategoryIds: r.appliesToAll ? draft.categoryIds : (r.appliesToCategoryIds || []),
          legalEntityIds: r.legalEntityIds || [],
          conditionConfig: r.conditionConfig,
          action: r.action,
          actionConfig: r.actionConfig,
          exceptionConfig: r.exceptionConfig ? {
            departmentIds: r.exceptionConfig.departmentIds || [],
            roleIds: r.exceptionConfig.roleIds || [],
            jobGradeIds: r.exceptionConfig.jobGradeIds || [],
            managementLevelIds: r.exceptionConfig.managementLevelIds || [],
            userIds: r.exceptionConfig.userIds || [],
            exceptionRule: {
              conditionConfig: r.exceptionConfig.conditionConfig || {},
              action: r.exceptionConfig.action || "allow",
              actionConfig: r.exceptionConfig.actionConfig || {},
            }
          } : undefined,
          sortOrder: idx,
          isActive: r.isActive ?? true,
        })),
        ...(isUpdate ? { isActive: g.isActive ?? true } : {}),
      })),
  };
}

export function mapSpendProgramFromBackend(data: any): SpendProgramDraft {
  if (!data) return data;
  return {
    ...data,
    groups: (data.groups || []).map((g: any) => ({
      ...g,
      rules: (g.rules || []).map((r: any, idx: number) => {
        // Flatten exceptionRule into exceptionConfig for the UI
        let exceptionConfig = r.exceptionConfig;
        if (exceptionConfig && exceptionConfig.exceptionRule) {
          exceptionConfig = {
            ...exceptionConfig,
            conditionConfig: exceptionConfig.exceptionRule.conditionConfig || {},
            action: exceptionConfig.exceptionRule.action || "",
            actionConfig: exceptionConfig.exceptionRule.actionConfig || {},
          };
          delete exceptionConfig.exceptionRule;
        }

        return {
          ...r,
          id: r.procurementSpendProgramRuleId || `rule-${Date.now()}-${idx}`,
          procurementSpendProgramRuleId: r.procurementSpendProgramRuleId,
          exceptionConfig: exceptionConfig || {
            departmentIds: [],
            roleIds: [],
            jobGradeIds: [],
            managementLevelIds: [],
            userIds: [],
            logic: "OR",
            conditionConfig: {},
            action: "",
            actionConfig: {},
          },
        };
      }),
    })),
  };
}

// ─── Spend Programs CRUD Hooks ───────────────────────────────────────────────

export const useGetSpendPrograms = (
  page = 1,
  limit = 20,
  group?: string,
  status?: string,
  options?: Omit<UseQueryOptions<any, Error>, "queryKey" | "queryFn">
) => {
  const axios = useAxios();
  return useQuery<any, Error>({
    queryKey: [...QUERY_KEYS.procurement.spendPrograms, { page, limit, group, status }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (group) params.append("group", group);
      if (status) params.append("status", status);
      
      const res = await axios.get(`${PROCUREMENT_KEYS.SPEND_PROGRAMS}?${params.toString()}`);
      return res.data;
    },
    staleTime: STALE_TIMES.NORMAL,
    retry: 1,
    ...options,
  });
};

export const useGetSpendProgramById = (
  id: string,
  options?: Omit<UseQueryOptions<any, Error>, "queryKey" | "queryFn">
) => {
  const axios = useAxios();
  return useQuery<any, Error>({
    queryKey: QUERY_KEYS.procurement.spendProgram(id),
    queryFn: async () => {
      const res = await axios.get(PROCUREMENT_KEYS.SPEND_PROGRAM(id));
      return res.data;
    },
    enabled: !!id,
    staleTime: STALE_TIMES.NORMAL,
    ...options,
  });
};

export const useCreateSpendProgram = () => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: SpendProgramDraft) => {
      const payload = buildSpendProgramPayload(draft);
      delete payload.draftId;
      const res = await axios.post(PROCUREMENT_KEYS.SPEND_PROGRAMS, payload);
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.spendPrograms, refetchType: "all" });
    },
  });
};

export const useUpdateSpendProgram = (id: string) => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: SpendProgramDraft) => {
      const payload = buildSpendProgramPayload(draft, true);
      delete payload.draftId;
      const res = await axios.patch(PROCUREMENT_KEYS.SPEND_PROGRAM(id), payload);
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.spendPrograms, refetchType: "all" });
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.spendProgram(id), refetchType: "all" });
    },
  });
};

export const useDeleteSpendProgram = () => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.delete(PROCUREMENT_KEYS.SPEND_PROGRAM(id));
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.spendPrograms, refetchType: "all" });
    },
  });
};

export const useApproveSpendProgram = () => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.patch(PROCUREMENT_KEYS.SPEND_PROGRAM_ACTION(id, "approve"));
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.spendPrograms, refetchType: "all" });
    },
  });
};

export const useRejectSpendProgram = () => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.patch(PROCUREMENT_KEYS.SPEND_PROGRAM_ACTION(id, "reject"));
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.spendPrograms, refetchType: "all" });
    },
  });
};

export const useGetSpendProgramDraftById = (
  draftId: string,
  options?: Omit<UseQueryOptions<any, Error>, "queryKey" | "queryFn">
) => {
  const axios = useAxios();
  return useQuery<any, Error>({
    queryKey: [...QUERY_KEYS.procurement.spendProgram(draftId), "draft"],
    queryFn: async () => {
      const res = await axios.get(PROCUREMENT_KEYS.SPEND_PROGRAM(draftId));
      return res.data;
    },
    enabled: !!draftId,
    staleTime: STALE_TIMES.NORMAL,
    ...options,
  });
};

export const useCreateSpendProgramDraft = () => {
  const axios = useAxios();
  return useMutation({
    mutationFn: async (draft: SpendProgramDraft) => {
      const res = await axios.post(PROCUREMENT_KEYS.SPEND_PROGRAM_DRAFTS, buildSpendProgramPayload(draft));
      return res.data;
    },
  });
};

export const useUpdateSpendProgramDraft = () => {
  const axios = useAxios();
  return useMutation({
    mutationFn: async ({ draftId, payload }: { draftId: string; payload: SpendProgramDraft }) => {
      const p = buildSpendProgramPayload(payload, true);
      p.draftId = draftId;
      const res = await axios.patch(PROCUREMENT_KEYS.SPEND_PROGRAM_DRAFT(draftId), p);
      return res.data;
    },
  });
};

// ─── Toggle rule-definition active status ─────────────────────────────────────

export interface ToggleRuleStatusPayload {
  ruleDefinitionId: string;
  ruleType: string;
  isActive: boolean;
}

export const useToggleSpendProgramRuleStatus = () => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rules: ToggleRuleStatusPayload[]) => {
      const res = await axios.patch(PROCUREMENT_KEYS.SPEND_PROGRAM_RULE_DEFINITIONS_STATUS, { rules });
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.spendPrograms, refetchType: "all" });
    },
  });
};

export const useDeleteSpendProgramDraft = () => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draftId: string) => {
      const res = await axios.delete(PROCUREMENT_KEYS.SPEND_PROGRAM_DRAFT(draftId));
      return res.data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.procurement.spendPrograms, refetchType: "all" });
    },
  });
};
