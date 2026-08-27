import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { unwrapPaginatedList } from "@/queries/pagination";

export interface FundingAccount { fundingAccountId: string; name: string; maskedIdentifier: string; currency: string; isActive: boolean; }
export interface Beneficiary { vendorBeneficiaryId: string; name: string; maskedIdentifier: string; currency: string; vendor?: { displayName?: string; legalName?: string }; }
export interface Allocation { paymentRequestAllocationId: string; allocatedAmount: string; financialObligation: { financialObligationId: string; outstandingAmount: string }; }
export interface PaymentRequest { paymentRequestId: string; amount: string; currency: string; status: string; fundingAccountId: string; destinationAccountId: string; createdBy?: { firstName: string; lastName: string }; vendor?: { displayName?: string; legalName?: string }; allocations: Allocation[]; }
export interface Payment { paymentId: string; amount: string; currency: string; status: string; externalBankReference?: string; executionDate?: string; paymentRequest: PaymentRequest; }
export interface BankTransaction { bankTransactionId: string; transactionDate: string; amount: string; currency: string; reference: string; matchStatus: string; }

export function useBillPayData(legalEntityId?: string) {
  const axios = useAxios();
  const enabled = Boolean(legalEntityId);
  const get = async <T,>(path: string, limit = 20) =>
    unwrapPaginatedList<T>(
      (await axios.get(path, { params: { legalEntityId, page: 1, limit } })).data,
    );

  const requestsPage = useQuery({ queryKey: ["bill-pay", "requests", legalEntityId], queryFn: () => get<PaymentRequest>("bill-pay/payment-requests"), enabled });
  const paymentsPage = useQuery({ queryKey: ["bill-pay", "payments", legalEntityId], queryFn: () => get<Payment>("bill-pay/payments"), enabled });
  const fundingPage = useQuery({ queryKey: ["bill-pay", "funding", legalEntityId], queryFn: () => get<FundingAccount>("bill-pay/funding-accounts", 100), enabled });
  const beneficiariesPage = useQuery({ queryKey: ["bill-pay", "beneficiaries", legalEntityId], queryFn: () => get<Beneficiary>("bill-pay/beneficiaries", 100), enabled });
  const bankTransactionsPage = useQuery({ queryKey: ["bill-pay", "bank", legalEntityId], queryFn: () => get<BankTransaction>("bill-pay/bank-transactions"), enabled });

  return {
    requests: { ...requestsPage, data: requestsPage.data?.items },
    payments: { ...paymentsPage, data: paymentsPage.data?.items },
    funding: { ...fundingPage, data: fundingPage.data?.items },
    beneficiaries: { ...beneficiariesPage, data: beneficiariesPage.data?.items },
    bankTransactions: { ...bankTransactionsPage, data: bankTransactionsPage.data?.items },
    pagination: {
      requests: requestsPage.data?.meta,
      payments: paymentsPage.data?.meta,
      funding: fundingPage.data?.meta,
      beneficiaries: beneficiariesPage.data?.meta,
      bankTransactions: bankTransactionsPage.data?.meta,
    },
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
