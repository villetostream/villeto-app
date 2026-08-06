import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import type { PolicyScope, PolicyRule } from "./get-policies";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExpensePolicyDraftPayload {
  /** Required on PATCH, omitted on POST (server generates it) */
  draftId?: string;
  name: string;
  /** Boolean flag — whether this draft overrides an existing policy */
  override_policy?: boolean;
  description?: string;
  rules: PolicyRule[];
  scope: PolicyScope;
  approvers: string[];
  expenseCategories: string[];
}

export interface ExpensePolicyDraftRecord {
  draftId: string;
  name: string;
  override_policy?: string;
  description?: string;
  rules: PolicyRule[];
  scope: PolicyScope;
  approvers: string[];
  expenseCategories: string[];
  status: "draft";
  createdAt: string;
  updatedAt: string;
}

interface DraftResponse {
  message: string;
  status: number;
  data: ExpensePolicyDraftRecord;
}

interface DraftListResponse {
  message: string;
  status: number;
  data: ExpensePolicyDraftRecord[];
}

// ─── POST /policy/drafts ──────────────────────────────────────────────────────

/** Create a new expense-policy draft. `draftId` is optional in the payload. */
export const useCreateExpensePolicyDraft = () => {
  const axios = useAxios();
  const qc = useQueryClient();

  return useMutation<DraftResponse, Error, Omit<ExpensePolicyDraftPayload, "draftId">>({
    retry: false,
    mutationFn: async (payload) => {
      const res = await axios.post(API_KEYS.EXPENSE.POLICY_DRAFTS, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.POLICY_DRAFTS] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.POLICIES] });
    },
  });
};

// ─── GET /policy/drafts/{draftId} ─────────────────────────────────────────────

/** Fetch a single expense-policy draft by ID. */
export const useGetExpensePolicyDraft = (
  draftId: string | null | undefined,
  options?: Omit<UseQueryOptions<DraftResponse, Error>, "queryKey" | "queryFn">
) => {
  const axios = useAxios();

  return useQuery<DraftResponse, Error>({
    queryKey: [QUERY_KEYS.POLICY_DRAFT, draftId],
    queryFn: async () => {
      const res = await axios.get(API_KEYS.EXPENSE.POLICY_DRAFT_BY_ID(draftId!));
      return res.data;
    },
    enabled: !!draftId,
    staleTime: STALE_TIMES.NORMAL,
    ...options,
  });
};

// ─── GET /policy/drafts ───────────────────────────────────────────────────────

/** Fetch all expense-policy drafts. */
export const useGetExpensePolicyDrafts = (
  options?: Omit<UseQueryOptions<DraftListResponse, Error>, "queryKey" | "queryFn">
) => {
  const axios = useAxios();

  return useQuery<DraftListResponse, Error>({
    queryKey: [QUERY_KEYS.POLICY_DRAFTS],
    queryFn: async () => {
      const res = await axios.get(API_KEYS.EXPENSE.POLICY_DRAFTS);
      return res.data;
    },
    staleTime: STALE_TIMES.NORMAL,
    ...options,
  });
};

// ─── PATCH /policy/drafts/{draftId} ───────────────────────────────────────────

/** Update an existing expense-policy draft. `draftId` is required. */
export const useUpdateExpensePolicyDraft = () => {
  const axios = useAxios();
  const qc = useQueryClient();

  return useMutation<
    DraftResponse,
    Error,
    { draftId: string; payload: Omit<ExpensePolicyDraftPayload, "draftId"> }
  >({
    retry: false,
    mutationFn: async ({ draftId, payload }) => {
      const res = await axios.patch(API_KEYS.EXPENSE.POLICY_DRAFT_BY_ID(draftId), payload);
      return res.data;
    },
    onSuccess: (_data, { draftId }) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.POLICY_DRAFT, draftId] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.POLICY_DRAFTS] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.POLICIES] });
    },
  });
};

// ─── DELETE /policy/drafts/{draftId} ──────────────────────────────────────────

/** Delete an expense-policy draft by ID. */
export const useDeleteExpensePolicyDraft = () => {
  const axios = useAxios();
  const qc = useQueryClient();

  return useMutation<{ message: string; status: number }, Error, string>({
    retry: false,
    mutationFn: async (draftId: string) => {
      const res = await axios.delete(API_KEYS.EXPENSE.POLICY_DRAFT_BY_ID(draftId));
      return res.data;
    },
    onSuccess: (_data, draftId) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.POLICY_DRAFTS] });
      qc.removeQueries({ queryKey: [QUERY_KEYS.POLICY_DRAFT, draftId] });
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.POLICIES] });
    },
  });
};
