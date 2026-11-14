export interface FundingAccount {
  fundingAccountId: string;
  name: string;
  maskedIdentifier: string;
  currency: string;
  isActive: boolean;
  accountType?: string;
}
export interface Beneficiary {
  vendorBeneficiaryId: string;
  name: string;
  maskedIdentifier: string;
  currency: string;
  vendor?: { displayName?: string; legalName?: string };
}
export interface Allocation {
  paymentRequestAllocationId: string;
  allocatedAmount: string;
  financialObligation: {
    financialObligationId: string;
    outstandingAmount: string;
  };
}
export interface PaymentRequest {
  paymentRequestId: string;
  amount: string;
  currency: string;
  status: string;
  fundingAccountId: string;
  destinationAccountId: string;
  createdBy?: { firstName: string; lastName: string };
  vendor?: { displayName?: string; legalName?: string };
  allocations: Allocation[];
  vendorBeneficiary?: {
    vendorBeneficiaryId?: string;
    name?: string;
    maskedIdentifier?: string;
    currency?: string;
  };
  createdAt?: string;
  requestedExecutionDate?: string;
}
export interface Payment {
  paymentId: string;
  amount: string;
  currency: string;
  status: string;
  externalBankReference?: string;
  executionDate?: string;
  paymentRequest: PaymentRequest;
}
export interface BankTransaction {
  bankTransactionId: string;
  transactionDate: string;
  amount: string;
  currency: string;
  reference: string;
  matchStatus: string;
}

export interface PageMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PageMeta;
}
