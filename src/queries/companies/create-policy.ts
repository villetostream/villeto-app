import { useMutation } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import type { PolicyRule, PolicyScope } from "./get-policies";

export type { PolicyRule, PolicyScope } from "./get-policies";

export interface CreatePolicyPayload {
  name: string;
  description?: string;
  expenseCategories: string[];
  scope: PolicyScope;
  rules: PolicyRule[];
  approvers: string[];
  effectiveFrom?: string;
  effectiveTo?: string;
}

interface Response {
  data: unknown;
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
