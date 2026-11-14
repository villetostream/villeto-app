import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { POLL_INTERVALS, STALE_TIMES } from "@/lib/constants/stale-times";
import type { PaginatedResult } from "../shared/types";

export interface BillPayIntake {
  invoiceIntakeId: string;
  source: string;
  externalReference?: string;
  status: string;
  failureCode?: string | null;
  receivedAt: string;
  processedAt?: string;
  attemptCount: number;
  createdAt: string;
  legalEntity?: {
    code: string;
    legalName: string;
    legalEntityId: string;
  };
  documentCount: number;
  // Fields expected by Figma — will be populated once backend adds them
  invoiceId?: string;
  vendorName?: string;
  billDescription?: string;
  amount?: string;
  currency?: string;
  dueDate?: string;
}

export interface GetBillPayIntakesParams {
  page?: number;
  limit?: number;
  legalEntityId?: string;
  status?: string;
  source?: string;
}

export function useGetBillPayIntakes(
  params: GetBillPayIntakesParams = {},
  options?: Omit<
    UseQueryOptions<PaginatedResult<BillPayIntake>, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey(["bill-pay", "intakes", params]),
    queryFn: async ({ signal }) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.limit) searchParams.append("limit", params.limit.toString());
      if (params.legalEntityId)
        searchParams.append("legalEntityId", params.legalEntityId);
      if (params.status) searchParams.append("status", params.status);
      if (params.source) searchParams.append("source", params.source);

      const res = await axios.get(
        `/bill-pay/intakes?${searchParams.toString()}`,
        { signal },
      );
      return res.data.data as PaginatedResult<BillPayIntake>;
    },
    staleTime: STALE_TIMES.LIVE,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.data?.data?.some((intake: BillPayIntake) =>
        ["received", "validating", "queued", "processing"].includes(
          intake.status,
        ),
      )
        ? POLL_INTERVALS.ACTIVE_LIST
        : false,
    ...options,
  });
}

export interface InvoiceIntakeStructuredInput {
  lineItems?: Array<{ quantity?: number; unitPrice?: number }>;
  paymentMethod?: string;
  beneficiaryName?: string;
  beneficiaryBank?: string;
  accountNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  [key: string]: unknown;
}

export interface BillPayIntakeDetail extends BillPayIntake {
  updatedAt: string;
  deletedAt: string | null;
  idempotencyKey: string;
  submissionFingerprint: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string | null;
  messageSubject: string;
  messageBody: string;
  structuredInput: InvoiceIntakeStructuredInput;
  failureMessage: string | null;
  lastQueuedAt: string | null;
  cancelledAt: string | null;
  vendorId: string | null;
  vendorEntityRelationshipId: string | null;
  vendorSiteId: string | null;
  vendorRelationshipConfigurationVersion: number | null;
  company: Record<string, unknown>;
  createdBy: { firstName?: string; lastName?: string };
  documents: Array<{ fileName?: string }>;
  canonicalInvoice: unknown | null;
}

export function useGetBillPayIntakeById(
  id: string,
  options?: { enabled?: boolean },
) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey(["bill-pay", "intakes", id]),
    queryFn: async ({ signal }) => {
      const res = await axios.get(`/bill-pay/intakes/${id}`, { signal });
      return res.data as { data: BillPayIntakeDetail };
    },
    enabled: !!id && (options?.enabled ?? true),
  });
}
