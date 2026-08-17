import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { POLICY_GOVERNANCE_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { STALE_TIMES } from "@/lib/constants/stale-times";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PolicyTarget = "expense_policy" | "procurement_policy";

export interface ApproverRole {
  roleId: string;
  name: string;
  templateKey: string;
  /** user count — not yet provided by backend, will be undefined */
  userCount?: number;
}

export interface ApprovalSetting {
  target: PolicyTarget;
  approvalRequired: boolean;
  allRolesCanApprove: boolean;
  approverRoleIds: string[];
  approverRoles: ApproverRole[];
}

export interface UpdateApprovalSettingPayload {
  approvalRequired: boolean;
  allRolesCanApprove: boolean;
  approverRoleIds: string[];
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Fetch all approval settings (both expense_policy + procurement_policy) */
export const useGetAllApprovalSettings = () => {
  const axios = useAxios();
  return useQuery<{ message: string; status: number; data: ApprovalSetting[] }, Error>({
    queryKey: QUERY_KEYS.policyGovernance.all,
    queryFn: async () => {
      const res = await axios.get(POLICY_GOVERNANCE_KEYS.APPROVAL_SETTINGS);
      return res.data;
    },
    staleTime: STALE_TIMES.NORMAL,
    retry: 1,
  });
};

/** Fetch approval setting for a single target */
export const useGetApprovalSettingByTarget = (target: PolicyTarget) => {
  const axios = useAxios();
  return useQuery<{ message: string; status: number; data: ApprovalSetting }, Error>({
    queryKey: QUERY_KEYS.policyGovernance.byTarget(target),
    queryFn: async () => {
      const res = await axios.get(POLICY_GOVERNANCE_KEYS.APPROVAL_SETTINGS_TARGET(target));
      return res.data;
    },
    staleTime: STALE_TIMES.NORMAL,
    retry: 1,
  });
};

/** Fetch eligible roles that can be configured for approving policies */
export const useGetEligibleRoles = (target: PolicyTarget) => {
  const axios = useAxios();
  return useQuery<{ message: string; status: number; data: ApproverRole[] }, Error>({
    queryKey: QUERY_KEYS.policyGovernance.eligibleRoles(target),
    queryFn: async () => {
      const res = await axios.get(POLICY_GOVERNANCE_KEYS.ELIGIBLE_ROLES(target));
      return res.data;
    },
    staleTime: STALE_TIMES.NORMAL,
    retry: 1,
  });
};

/** Create or update approval settings for a target */
export const useUpdateApprovalSettings = (target: PolicyTarget) => {
  const axios = useAxios();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateApprovalSettingPayload) => {
      const res = await axios.put(POLICY_GOVERNANCE_KEYS.UPDATE_APPROVAL_SETTINGS(target), payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.policyGovernance.all });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.policyGovernance.byTarget(target) });
    },
  });
};
