import { useMutation } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";

/* ─── Rule Types ──────────────────────────────────────────────────────── */

type RuleEnforcement = "block" | "warning";

export interface SpendLimitRule {
  type: "spend_limit";
  amount: number;          // numeric — parseFloat before sending
  currency: string;        // ISO 4217: "NGN" | "GHS" | "KES" | "ZAR"
  enforcementAction: RuleEnforcement;
}

export interface ReceiptRequirementRule {
  type: "receipt_requirement";
  requiredAboveAmount: number;
  currency: string;
  enforcementAction: RuleEnforcement;
}

// Union — extend with new rule types as they are built
export type PolicyRule = SpendLimitRule | ReceiptRequirementRule;

/* ─── Scope Types ─────────────────────────────────────────────────────── */

export interface PolicyScopeAll {
  type: "all";
  location?: string;
}

export interface PolicyScopeSpecific {
  type: "specific";
  departments: string[];
  userRoles: string[];
  location?: string;
}

export type PolicyScope = PolicyScopeAll | PolicyScopeSpecific;

/* ─── Main Payload ────────────────────────────────────────────────────── */

export interface CreatePolicyPayload {
  name: string;
  description?: string;
  expenseCategories: string[];
  scope: PolicyScope;
  rules: PolicyRule[];
  approvers: string[];
  effectiveFrom?: string;           // ISO 8601
  effectiveTo?: string;             // ISO 8601
}

interface Response {
  data: any;
  error: {
    error: string;
    message?: string;
    success: boolean;
  };
  message: string;
  status: number;
  statusCode: number;
  statusText: string;
}

export const useCreatePolicyApi = () => {
  const axiosInstance = useAxios();

  return useMutation<Response, Error, CreatePolicyPayload>({
    retry: false,
    mutationFn: async (payload: CreatePolicyPayload) => {
      const res = await axiosInstance.post(API_KEYS.EXPENSE.POLICIES, payload);
      return res.data;
    },
  });
};
