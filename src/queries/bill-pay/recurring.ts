import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { unwrap } from "@/features/bill-pay/shared/query-utils";
import type { PaginatedResult } from "@/features/bill-pay/shared/types";

export type RecurringCadence = "weekly" | "monthly" | "quarterly" | "yearly";
export type RecurringState = "active" | "paused" | "ended";
export type OccurrenceState = "upcoming" | "due" | "overdue" | "matched" | "skipped";

export interface RecurringProfile {
  recurringBillId: string;
  legalEntityId: string;
  vendorId: string;
  vendorName: string | null;
  description: string;
  cadence: RecurringCadence;
  firstExpectedInvoiceDate: string;
  nextExpectedDate: string | null;
  endDate: string | null;
  expectedAmount: string | null;
  variancePercent: string | null;
  currency: string;
  status: RecurringState;
  version: number;
}

export interface RecurringOccurrence {
  recurringBillOccurrenceId: string;
  recurringBillId: string;
  legalEntityId: string;
  vendorId: string;
  vendorName: string | null;
  description: string;
  cadence: RecurringCadence;
  currency: string;
  expectedAmount: string | null;
  periodStart: string;
  periodEnd: string;
  expectedDate: string;
  status: OccurrenceState;
  skipReason: string | null;
  vendorInvoiceId: string | null;
  linkedInvoice: {
    vendorInvoiceId: string;
    invoiceNumber: string;
    invoiceDate: string;
    amount: string;
    currency: string;
    status: string;
  } | null;
}

export interface RecurringCandidate {
  invoiceMatchId: string | null;
  vendorInvoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  servicePeriodStart: string | null;
  servicePeriodEnd: string | null;
  amount: string;
  currency: string;
  workflowStage: string;
  variancePercent: string | null;
  varianceWarning: boolean;
  reasons: string[];
}

export interface RecurringInput {
  legalEntityId: string;
  vendorId: string;
  description: string;
  cadence: RecurringCadence;
  firstExpectedInvoiceDate: string;
  endDate?: string | null;
  expectedAmount?: string | null;
  variancePercent?: number | null;
}

const recurringKey = workspaceQueryKey(["bill-pay", "recurring"]);

function useInvalidateRecurring() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: recurringKey });
}

export function useRecurringProfiles(params: {
  legalEntityId: string; status?: string; cadence?: string; vendorId?: string;
  search?: string; page?: number; limit?: number;
}, active = true) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey(["bill-pay", "recurring", "profiles", params]),
    queryFn: async ({ signal }) => unwrap<PaginatedResult<RecurringProfile>>(
      (await axios.get("/bill-pay/recurring-bills", { params, signal })).data,
    ),
    enabled: Boolean(active && params.legalEntityId && params.legalEntityId !== "all"),
  });
}

export function useRecurringProfile(id: string, page = 1) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey(["bill-pay", "recurring", "profile", id, page]),
    queryFn: async ({ signal }) => unwrap<RecurringProfile & {
      occurrences: PaginatedResult<RecurringOccurrence>;
    }>((await axios.get(`/bill-pay/recurring-bills/${id}`, { params: { page }, signal })).data),
    enabled: Boolean(id),
  });
}

export function useRecurringOccurrences(params: {
  legalEntityId: string; recurringBillId?: string; status?: string;
  vendorId?: string; from?: string; to?: string; page?: number; limit?: number;
}, active = true) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey(["bill-pay", "recurring", "occurrences", params]),
    queryFn: async ({ signal }) => unwrap<PaginatedResult<RecurringOccurrence>>(
      (await axios.get("/bill-pay/recurring-bill-occurrences", { params, signal })).data,
    ),
    enabled: Boolean(active && params.legalEntityId && params.legalEntityId !== "all"),
  });
}

export function useRecurringCandidates(occurrenceId: string, enabled = true) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey(["bill-pay", "recurring", "candidates", occurrenceId]),
    queryFn: async ({ signal }) => unwrap<RecurringCandidate[]>(
      (await axios.get(`/bill-pay/recurring-bill-occurrences/${occurrenceId}/match-candidates`, { signal })).data,
    ),
    enabled: Boolean(occurrenceId && enabled),
  });
}

export function useCreateRecurring() {
  const axios = useAxios();
  const invalidate = useInvalidateRecurring();
  return useMutation({
    mutationFn: async (input: RecurringInput) => unwrap<RecurringProfile>(
      (await axios.post("/bill-pay/recurring-bills", input)).data,
    ),
    onSuccess: invalidate,
  });
}

export function useUpdateRecurring() {
  const axios = useAxios();
  const invalidate = useInvalidateRecurring();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<RecurringInput> & { id: string; expectedVersion: number }) =>
      unwrap<RecurringProfile>((await axios.patch(`/bill-pay/recurring-bills/${id}`, input)).data),
    onSuccess: invalidate,
  });
}

export function useRecurringTransition() {
  const axios = useAxios();
  const invalidate = useInvalidateRecurring();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "pause" | "resume" | "end" }) =>
      unwrap<RecurringProfile>((await axios.post(`/bill-pay/recurring-bills/${id}/${action}`)).data),
    onSuccess: invalidate,
  });
}

export function useMatchRecurring() {
  const axios = useAxios();
  const invalidate = useInvalidateRecurring();
  return useMutation({
    mutationFn: async ({ occurrenceId, vendorInvoiceId }: { occurrenceId: string; vendorInvoiceId: string }) =>
      unwrap<RecurringOccurrence>((await axios.post(`/bill-pay/recurring-bill-occurrences/${occurrenceId}/match`, { vendorInvoiceId })).data),
    onSuccess: invalidate,
  });
}

export function useDismissRecurringMatch() {
  const axios = useAxios();
  const invalidate = useInvalidateRecurring();
  return useMutation({
    mutationFn: async ({ occurrenceId, vendorInvoiceId, invoiceMatchId, reason }: {
      occurrenceId: string; vendorInvoiceId: string; invoiceMatchId?: string | null; reason?: string;
    }) => unwrap<{ dismissed: boolean }>((await axios.post(
      `/bill-pay/recurring-bill-occurrences/${occurrenceId}/dismiss-match`,
      { vendorInvoiceId, invoiceMatchId: invoiceMatchId || undefined, reason },
    )).data),
    onSuccess: invalidate,
  });
}

export function useSkipRecurring() {
  const axios = useAxios();
  const invalidate = useInvalidateRecurring();
  return useMutation({
    mutationFn: async ({ occurrenceId, reason }: { occurrenceId: string; reason: string }) =>
      unwrap<RecurringOccurrence>((await axios.post(`/bill-pay/recurring-bill-occurrences/${occurrenceId}/skip`, { reason })).data),
    onSuccess: invalidate,
  });
}
