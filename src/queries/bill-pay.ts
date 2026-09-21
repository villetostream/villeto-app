import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";

export interface FundingAccount { fundingAccountId: string; name: string; maskedIdentifier: string; currency: string; isActive: boolean; accountType?: string; }
export interface Beneficiary { vendorBeneficiaryId: string; name: string; maskedIdentifier: string; currency: string; vendor?: { displayName?: string; legalName?: string }; }
export interface Allocation { paymentRequestAllocationId: string; allocatedAmount: string; financialObligation: { financialObligationId: string; outstandingAmount: string }; }
export interface PaymentRequest { paymentRequestId: string; amount: string; currency: string; status: string; fundingAccountId: string; destinationAccountId: string; createdBy?: { firstName: string; lastName: string }; vendor?: { displayName?: string; legalName?: string }; allocations: Allocation[]; vendorBeneficiary?: { vendorBeneficiaryId?: string; name?: string; maskedIdentifier?: string; currency?: string; }; createdAt?: string; requestedExecutionDate?: string; }
export interface Payment { paymentId: string; amount: string; currency: string; status: string; externalBankReference?: string; executionDate?: string; paymentRequest: PaymentRequest; }
export interface BankTransaction { bankTransactionId: string; transactionDate: string; amount: string; currency: string; reference: string; matchStatus: string; }

const unwrap = <T,>(value: { data?: T } | T): T => value && typeof value === "object" && "data" in value ? (value as { data: T }).data : value as T;

export function useBillPayData(legalEntityId?: string) {
  const axios = useAxios();
  const enabled = Boolean(legalEntityId);
  const get = async <T,>(path: string) => unwrap<T>((await axios.get(path, { params: { legalEntityId } })).data);
  return {
    requests: useQuery({ queryKey: ["bill-pay", "requests", legalEntityId], queryFn: () => get<PaymentRequest[]>("bill-pay/payment-requests"), enabled }),
    payments: useQuery({ queryKey: ["bill-pay", "payments", legalEntityId], queryFn: () => get<Payment[]>("bill-pay/payments"), enabled }),
    funding: useQuery({ queryKey: ["bill-pay", "funding", legalEntityId], queryFn: () => get<FundingAccount[]>("bill-pay/funding-accounts"), enabled }),
    beneficiaries: useQuery({ queryKey: ["bill-pay", "beneficiaries", legalEntityId], queryFn: () => get<Beneficiary[]>("bill-pay/beneficiaries"), enabled }),
    bankTransactions: useQuery({ queryKey: ["bill-pay", "bank", legalEntityId], queryFn: () => get<BankTransaction[]>("bill-pay/bank-transactions"), enabled }),
  };
}

export function useBillPayAction() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, body = {} }: { path: string; body?: Record<string, unknown> }) => (await axios.post(path, body)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: ["bill-pay"] }),
  });
}

export interface BillPayIntakePayload {
  legalEntityId: string;
  source: string;
  externalReference?: string;
  senderType?: string;
  senderName?: string;
  senderEmail?: string;
  messageSubject?: string;
  messageBody?: string;
  structuredInput?: Record<string, any>;
}

export function useCreateBillPayIntake() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BillPayIntakePayload) => {
      // Generate a UUID for Idempotency-Key. If crypto.randomUUID is not available (older browsers), fallback to a pseudo-random string
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
      const res = await axios.post("/bill-pay/intakes", payload, {
        headers: {
          "Idempotency-Key": idempotencyKey
        }
      });
      return res.data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["bill-pay"] }),
  });
}

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
}

export interface GetBillPayIntakesParams {
  page?: number;
  limit?: number;
  legalEntityId?: string;
  status?: string;
  source?: string;
}

export function useGetBillPayIntakes(params: GetBillPayIntakesParams = {}) {
  const axios = useAxios();
  return useQuery({
    queryKey: ["bill-pay", "intakes", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.limit) searchParams.append("limit", params.limit.toString());
      if (params.legalEntityId) searchParams.append("legalEntityId", params.legalEntityId);
      if (params.status) searchParams.append("status", params.status);
      if (params.source) searchParams.append("source", params.source);
      
      const res = await axios.get(`/bill-pay/intakes?${searchParams.toString()}`);
      return res.data.data as { data: BillPayIntake[]; meta: { totalCount: number; totalPages: number; currentPage: number; limit: number; } };
    }
  });
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
  structuredInput: Record<string, any>;
  failureMessage: string | null;
  lastQueuedAt: string | null;
  cancelledAt: string | null;
  vendorId: string | null;
  vendorEntityRelationshipId: string | null;
  vendorSiteId: string | null;
  vendorRelationshipConfigurationVersion: number | null;
  company: Record<string, any>;
  createdBy: Record<string, any>;
  documents: any[];
  canonicalInvoice: any | null;
}

export function useGetBillPayIntakeById(id: string, options?: { enabled?: boolean }) {
  const axios = useAxios();
  return useQuery({
    queryKey: ["bill-pay", "intakes", id],
    queryFn: async () => {
      const res = await axios.get(`/bill-pay/intakes/${id}`);
      return res.data as { data: BillPayIntakeDetail };
    },
    enabled: !!id && (options?.enabled ?? true),
  });
}

export function useSubmitBillPayIntake() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.post(`/bill-pay/intakes/${id}/invoice/submit`);
      return res.data;
    },
    onSuccess: (_, id) => {
      client.invalidateQueries({ queryKey: ["bill-pay", "intakes"] });
      client.invalidateQueries({ queryKey: ["bill-pay", "intakes", id] });
    },
  });
}

export function useRetryBillPayIntake() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.post(`/bill-pay/intakes/${id}/retry`);
      return res.data;
    },
    onSuccess: (_, id) => {
      client.invalidateQueries({ queryKey: ["bill-pay", "intakes"] });
      client.invalidateQueries({ queryKey: ["bill-pay", "intakes", id] });
    },
  });
}

export function useCancelBillPayIntake() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.post(`/bill-pay/intakes/${id}/cancel`);
      return res.data;
    },
    onSuccess: (_, id) => {
      client.invalidateQueries({ queryKey: ["bill-pay", "intakes"] });
      client.invalidateQueries({ queryKey: ["bill-pay", "intakes", id] });
    },
  });
}

export function useUpdateBillPayIntake() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, any> }) => {
      const res = await axios.put(`/bill-pay/intakes/${id}`, payload);
      return res.data;
    },
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: ["bill-pay", "intakes"] });
      client.invalidateQueries({ queryKey: ["bill-pay", "intakes", id] });
    },
  });
}

export function useUploadBillPayIntake() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await axios.post(`/bill-pay/intakes/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        }
      });
      return res.data;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["bill-pay", "intakes"] });
    },
  });
}

// Funding Accounts
export interface CreateFundingAccountPayload {
  legalEntityId: string;
  name: string;
  accountType: string;
  maskedIdentifier: string;
  externalReference: string;
  currency: string;
}

export function useCreateFundingAccount() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateFundingAccountPayload) => {
      const res = await axios.post(`/bill-pay/funding-accounts`, payload);
      return res.data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["bill-pay", "funding"] }),
  });
}

export function useGetFundingAccounts(legalEntityId: string, page = 1, limit = 20) {
  const axios = useAxios();
  return useQuery({
    queryKey: ["bill-pay", "funding", legalEntityId, page, limit],
    queryFn: async () => {
      const res = await axios.get(`/bill-pay/funding-accounts?legalEntityId=${legalEntityId}&page=${page}&limit=${limit}`);
      return res.data.data as { data: FundingAccount[]; meta: any };
    },
    enabled: !!legalEntityId,
  });
}

// Beneficiaries
export interface CreateBeneficiaryPayload {
  legalEntityId: string;
  vendorId: string;
  name: string;
  maskedIdentifier: string;
  externalReference: string;
  currency: string;
}

export function useCreateBeneficiary() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBeneficiaryPayload) => {
      const res = await axios.post(`/bill-pay/beneficiaries`, payload);
      return res.data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["bill-pay", "beneficiaries"] }),
  });
}

export function useGetBeneficiaries(legalEntityId: string, page = 1, limit = 20) {
  const axios = useAxios();
  return useQuery({
    queryKey: ["bill-pay", "beneficiaries", legalEntityId, page, limit],
    queryFn: async () => {
      const res = await axios.get(`/bill-pay/beneficiaries?legalEntityId=${legalEntityId}&page=${page}&limit=${limit}`);
      return res.data.data as { data: Beneficiary[]; meta: any };
    },
    enabled: !!legalEntityId,
  });
}

// Approval Rules
export interface CreateApprovalRulePayload {
  legalEntityId: string;
  minimumAmount: string;
  maximumAmount?: string | null;
  requiredApprovals: number;
  requireDistinctFromCreator: boolean;
}

export interface ApprovalRule {
  paymentApprovalRuleId: string;
  minimumAmount: string;
  maximumAmount: string | null;
  requiredApprovals: number;
  requireDistinctFromCreator: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useCreateApprovalRule() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateApprovalRulePayload) => {
      const res = await axios.post(`/bill-pay/approval-rules`, payload);
      return res.data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["bill-pay", "approval-rules"] }),
  });
}

export function useGetApprovalRules(legalEntityId: string, page = 1, limit = 20) {
  const axios = useAxios();
  return useQuery({
    queryKey: ["bill-pay", "approval-rules", legalEntityId, page, limit],
    queryFn: async () => {
      const res = await axios.get(`/bill-pay/approval-rules?legalEntityId=${legalEntityId}&page=${page}&limit=${limit}`);
      return res.data.data as { data: ApprovalRule[]; meta: any };
    },
    enabled: !!legalEntityId,
  });
}

// Payment Requests
export interface CreatePaymentRequestPayload {
  legalEntityId: string;
  fundingAccountId: string;
  beneficiaryId: string;
  vendorSiteId: string;
  currency: string;
  amount: string;
  paymentMethod: string;
  requestedExecutionDate: string;
  idempotencyKey: string;
  allocations: {
    financialObligationId: string;
    amount: string;
  }[];
}

export function useCreatePaymentRequest() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePaymentRequestPayload) => {
      const res = await axios.post(`/bill-pay/payment-requests`, payload, {
        headers: {
          "Idempotency-Key": payload.idempotencyKey
        }
      });
      return res.data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["bill-pay", "requests"] }),
  });
}

export function useGetPaymentRequests(legalEntityId: string, page = 1, limit = 20) {
  const axios = useAxios();
  return useQuery({
    queryKey: ["bill-pay", "requests", "paginated", legalEntityId, page, limit],
    queryFn: async () => {
      const res = await axios.get(`/bill-pay/payment-requests?legalEntityId=${legalEntityId}&page=${page}&limit=${limit}`);
      return res.data.data as { data: PaymentRequest[]; meta: any };
    },
    enabled: !!legalEntityId,
  });
}

export function useGetPaymentRequestById(paymentRequestId: string) {
  const axios = useAxios();
  return useQuery({
    queryKey: ["bill-pay", "requests", paymentRequestId],
    queryFn: async () => {
      const res = await axios.get(`/bill-pay/payment-requests/${paymentRequestId}`);
      return res.data as { data: PaymentRequest };
    },
    enabled: !!paymentRequestId,
  });
}

// Payment Request Lifecycle Hooks

export function useSubmitPaymentRequest() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.post(`/bill-pay/payment-requests/${id}/submit`);
      return res.data;
    },
    onSuccess: (_, id) => {
      client.invalidateQueries({ queryKey: ["bill-pay", "requests"] });
      client.invalidateQueries({ queryKey: ["bill-pay", "requests", id] });
    },
  });
}

export function useAuthorizePaymentRequest() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { reason: string } }) => {
      const res = await axios.post(`/bill-pay/payment-requests/${id}/authorize`, payload);
      return res.data;
    },
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: ["bill-pay", "requests"] });
      client.invalidateQueries({ queryKey: ["bill-pay", "requests", id] });
    },
  });
}

export function useRejectPaymentRequest() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { reason: string } }) => {
      const res = await axios.post(`/bill-pay/payment-requests/${id}/reject`, payload);
      return res.data;
    },
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: ["bill-pay", "requests"] });
      client.invalidateQueries({ queryKey: ["bill-pay", "requests", id] });
    },
  });
}

export function useSchedulePaymentRequest() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { executionDate: string } }) => {
      const res = await axios.post(`/bill-pay/payment-requests/${id}/schedule`, payload);
      return res.data;
    },
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: ["bill-pay", "requests"] });
      client.invalidateQueries({ queryKey: ["bill-pay", "requests", id] });
    },
  });
}

export interface RecordExternalPaymentPayload {
  fundingAccountId: string;
  beneficiaryId: string;
  executionDate: string;
  amount: string;
  bankReference: string;
  idempotencyKey: string;
}

export function useRecordExternalPayment() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: RecordExternalPaymentPayload }) => {
      const res = await axios.post(`/bill-pay/payment-requests/${id}/record-external`, payload);
      return res.data;
    },
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: ["bill-pay", "requests"] });
      client.invalidateQueries({ queryKey: ["bill-pay", "requests", id] });
    },
  });
}

export function useInitiatePaymentRequest() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axios.post(`/bill-pay/payment-requests/${id}/initiate`);
      return res.data;
    },
    onSuccess: (_, id) => {
      client.invalidateQueries({ queryKey: ["bill-pay", "requests"] });
      client.invalidateQueries({ queryKey: ["bill-pay", "requests", id] });
    },
  });
}

// Payments

export function useGetPayments(legalEntityId: string, page = 1, limit = 20) {
  const axios = useAxios();
  return useQuery({
    queryKey: ["bill-pay", "payments", "paginated", legalEntityId, page, limit],
    queryFn: async () => {
      const res = await axios.get(`/bill-pay/payments?legalEntityId=${legalEntityId}&page=${page}&limit=${limit}`);
      return res.data.data as { data: Payment[]; meta: any };
    },
    enabled: !!legalEntityId,
  });
}

export function useGetPaymentById(paymentId: string) {
  const axios = useAxios();
  return useQuery({
    queryKey: ["bill-pay", "payments", paymentId],
    queryFn: async () => {
      const res = await axios.get(`/bill-pay/payments/${paymentId}`);
      return res.data as { data: Payment };
    },
    enabled: !!paymentId,
  });
}

export function useReconcilePayment() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { bankTransactionId: string } }) => {
      const res = await axios.post(`/bill-pay/payments/${id}/reconcile`, payload);
      return res.data;
    },
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: ["bill-pay", "payments"] });
      client.invalidateQueries({ queryKey: ["bill-pay", "payments", id] });
      client.invalidateQueries({ queryKey: ["bill-pay", "bank"] });
    },
  });
}

export function useReversePaymentReconciliation() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { reason: string } }) => {
      const res = await axios.post(`/bill-pay/payments/${id}/reconciliation/reverse`, payload);
      return res.data;
    },
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: ["bill-pay", "payments"] });
      client.invalidateQueries({ queryKey: ["bill-pay", "payments", id] });
      client.invalidateQueries({ queryKey: ["bill-pay", "bank"] });
    },
  });
}

// Bank Transactions

export function useGetBankTransactions(legalEntityId: string, page = 1, limit = 20) {
  const axios = useAxios();
  return useQuery({
    queryKey: ["bill-pay", "bank", "paginated", legalEntityId, page, limit],
    queryFn: async () => {
      const res = await axios.get(`/bill-pay/bank-transactions?legalEntityId=${legalEntityId}&page=${page}&limit=${limit}`);
      return res.data.data as { data: BankTransaction[]; meta: any };
    },
    enabled: !!legalEntityId,
  });
}

export function useGetBankTransactionById(bankTransactionId: string) {
  const axios = useAxios();
  return useQuery({
    queryKey: ["bill-pay", "bank", bankTransactionId],
    queryFn: async () => {
      const res = await axios.get(`/bill-pay/bank-transactions/${bankTransactionId}`);
      return res.data as { data: BankTransaction };
    },
    enabled: !!bankTransactionId,
  });
}

export interface ImportBankTransactionsPayload {
  legalEntityId: string;
  fundingAccountId: string;
  csv: string;
}

export function useImportBankTransactions() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ImportBankTransactionsPayload) => {
      const res = await axios.post(`/bill-pay/bank-transactions/import`, payload);
      return res.data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["bill-pay", "bank"] }),
  });
}

export function useMatchBankTransaction() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { paymentId: string } }) => {
      const res = await axios.post(`/bill-pay/bank-transactions/${id}/match`, payload);
      return res.data;
    },
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: ["bill-pay", "bank"] });
      client.invalidateQueries({ queryKey: ["bill-pay", "bank", id] });
      client.invalidateQueries({ queryKey: ["bill-pay", "payments"] });
    },
  });
}
