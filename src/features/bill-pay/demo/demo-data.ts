export interface DemoMatchLine {
  id: string;
  itemName: string;
  unitPrice: number;
  poOrderedQty: number;
  grAcceptedQty: number;
  grRejectedQty: number;
  invoicedQty: number;
}

export interface DemoTimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  detail: string;
  kind: "info" | "success" | "warning" | "danger";
}

export interface DemoApprovalStep {
  id: string;
  stepNumber: number;
  role: "DEPARTMENT_MANAGER" | "FINANCE_CONTROLLER" | "EXECUTIVE_DIRECTOR" | "VENDOR_COMPLIANCE";
  roleTitle: string;
  assignedToName: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CORRECTION_REQUESTED";
  decidedAt?: string;
  comments?: string;
}

export interface DemoVendorCredit {
  id: string;
  creditNoteNumber: string;
  vendorId: string;
  vendorName: string;
  originalAmount: number;
  remainingBalance: number;
  issuedDate: string;
  reason: string;
  status: "AVAILABLE" | "PARTIALLY_APPLIED" | "FULLY_EXHAUSTED";
  allocations: Array<{
    billId: string;
    billNumber: string;
    amountApplied: number;
    appliedDate: string;
  }>;
}

export interface DemoPaymentAttempt {
  id: string;
  attemptNumber: number;
  timestamp: string;
  method: "BANK_TRANSFER" | "EXTERNAL_RECORD";
  fundingAccount: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  failureReason?: string;
  providerRef?: string;
  gateway?: string;
  gatewayRef?: string;
  errorMessage?: string;
  responseMessage?: string;
}

export interface DemoVendor {
  id: string;
  name: string;
  category: string;
  portalStatus: "portal_registered" | "directory_only";
  status: "approved" | "active" | "invited" | "inactive";
  verifiedBankName: string;
  verifiedAccountNumber: string;
  pendingBankChange: {
    newBankName: string;
    newAccountNumber: string;
    requestedAt: string;
    requestedBy: string;
    reason: string;
  } | null;
  taxId?: string;
  contactEmail?: string;
  complianceRating?: "A" | "B" | "C";
}

export interface DemoAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  entityType: "BILL" | "PAYMENT" | "VENDOR" | "CARD" | "RECURRING";
  entityReference: string;
  details: string;
  status: "SUCCESS" | "WARNING" | "BLOCKED";
}

export interface DemoRoleProfile {
  id: string;
  name: string;
  title: string;
  roleKey: "DEPT_MGR" | "FINANCE_CONTROLLER" | "CFO" | "TREASURY";
  avatar: string;
  authorityLimit: number;
  canApproveBills: boolean;
  canReleasePayments: boolean;
  canManageCards: boolean;
  canVerifyBanks: boolean;
  description: string;
}

export const DEMO_ROLES: DemoRoleProfile[] = [
  {
    id: "role_dept_mgr",
    name: "Ngozi Adeyemi",
    title: "Department Manager (Admin & Ops)",
    roleKey: "DEPT_MGR",
    avatar: "NA",
    authorityLimit: 100000,
    canApproveBills: true,
    canReleasePayments: false,
    canManageCards: true,
    canVerifyBanks: false,
    description: "Authority up to ₦100,000 for department operations.",
  },
  {
    id: "role_controller",
    name: "Chidi Okafor",
    title: "Financial Controller",
    roleKey: "FINANCE_CONTROLLER",
    avatar: "CO",
    authorityLimit: 1000000,
    canApproveBills: true,
    canReleasePayments: false,
    canManageCards: true,
    canVerifyBanks: false,
    description: "Authority up to ₦1,000,000 & GL account review.",
  },
  {
    id: "role_cfo",
    name: "Adebayo Okonjo",
    title: "Chief Financial Officer (CFO)",
    roleKey: "CFO",
    avatar: "AO",
    authorityLimit: Infinity,
    canApproveBills: true,
    canReleasePayments: true,
    canManageCards: true,
    canVerifyBanks: true,
    description: "Enterprise authority > ₦1,000,000 & Dual Control sign-off.",
  },
  {
    id: "role_treasury",
    name: "Chioma Eze",
    title: "Treasury Lead",
    roleKey: "TREASURY",
    avatar: "CE",
    authorityLimit: Infinity,
    canApproveBills: false,
    canReleasePayments: true,
    canManageCards: false,
    canVerifyBanks: false,
    description: "Executes payment release & bank feed reconciliation.",
  },
];

export interface DemoBill {
  id: string;
  billNumber: string;
  invoiceNumber: string;
  vendorId: string;
  vendorName: string;
  entityName: string;
  department: string;
  category: string;
  glAccount: string;
  supportType: "non_po" | "po_backed" | "no_invoice_voucher";
  invoiceAttached?: boolean;
  voucherType?: "contract_lease" | "advance_deposit" | "statutory_fee" | "payment_voucher";
  voucherReference?: string;
  source:
    | "vendor_portal"
    | "email_ocr"
    | "whatsapp"
    | "pdf_upload"
    | "manual"
    | "recurring_schedule";
  sourceChannelLabel: string;
  invoiceDate: string;
  dueDate: string;
  currency: "NGN";
  originalAmount: number;
  creditApplied: number;
  paidAmount: number;
  outstandingAmount: number;
  approvalStatus: "DRAFT" | "PENDING_APPROVAL" | "CORRECTION_REQUESTED" | "APPROVED" | "REJECTED";
  approvalSteps?: DemoApprovalStep[];
  currentApprovalStepIndex?: number;
  correctionReason?: string;
  isOverdue?: boolean;
  departmentBudget?: {
    monthlyBudget: number;
    currentMonthSpend: number;
  };
  matchingStatus: "NOT_APPLICABLE" | "MATCHED" | "EXCEPTION_HOLD" | "OVERRIDE_APPROVED";
  paymentStatus:
    | "UNPAID"
    | "PARTIALLY_PAID"
    | "AWAITING_RELEASE"
    | "SCHEDULED"
    | "PROCESSING"
    | "AWAITING_CONFIRMATION"
    | "PAID"
    | "FAILED";
  reconciliationStatus: "NOT_STARTED" | "PENDING" | "RECONCILED";
  ocrConfidence?: number;
  duplicateWarning?: string;
  poReference?: {
    poNumber: string;
    grNumber: string;
    lines: DemoMatchLine[];
  };
  recurringScheduleId?: string;
  timeline: DemoTimelineEvent[];
}

export interface DemoRecurringSchedule {
  id: string;
  name: string;
  vendorId: string;
  vendorName: string;
  department: string;
  category: string;
  glAccount: string;
  frequency: "monthly" | "quarterly" | "yearly";
  billingDay: number;
  amountType: "fixed" | "variable";
  expectedAmount: number;
  invoiceRequired: boolean;
  approvalMode: "each_occurrence" | "auto_within_tolerance";
  tolerancePercent: number;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  nextOccurrenceDate: string;
  contractEndDate?: string;
  autoRenew?: boolean;
  cancellationNoticeDays?: number;
}

export interface DemoRecurringOccurrence {
  id: string;
  scheduleId: string;
  periodLabel: string;
  expectedDate: string;
  expectedAmount: number;
  actualAmount: number | null;
  variancePercent: number | null;
  variancePolicyOutcome: "within_tolerance" | "finance_review" | "renewed_approval" | null;
  invoiceAttached: boolean;
  billId: string | null;
  status:
    | "UPCOMING"
    | "AWAITING_INVOICE"
    | "VARIANCE_HOLD"
    | "BILL_CREATED"
    | "PAID"
    | "SKIPPED";
  skippedReason?: string;
  skippedBy?: string;
}

export interface DemoSubscriptionCard {
  id: string;
  subscriptionName: string;
  vendorName: string;
  department: string;
  glAccount: string;
  cardLast4: string;
  cardType: "VIRTUAL" | "CENTRALLY_MANAGED";
  issuerCardholder: string;
  accountableOwner: string;
  cardAdmin: string;
  cadence: "monthly" | "yearly";
  expectedAmount: number;
  monthlyLimit: number;
  perTransactionLimit: number;
  latestChargeAmount: number;
  remainingLimit: number;
  nextRenewalDate: string;
  cardStatus: "ACTIVE" | "FROZEN" | "EXPIRED";
  subscriptionStatus: "ACTIVE" | "PRICE_CHANGED" | "FAILED_RENEWAL" | "CANCELLED";
  declineAlert: {
    attemptedAmount: number;
    difference: number;
    timestamp: string;
    reason: string;
  } | null;
  seatsCount?: number;
  costPerSeat?: number;
  utilizationPercent?: number;
  cardReplacementHistory?: Array<{ oldCardLast4: string; replacedAt: string; reason: string }>;
}

export interface DemoPolicyCheck {
  id: string;
  ruleName: string;
  outcome: "pass" | "warning" | "violation";
  message: string;
}

export interface DemoCompanyExpenseCardTx {
  id: string;
  providerTxId: string;
  merchant: string;
  description: string;
  cardLast4: string;
  cardOwner: string;
  department: string;
  category: string;
  glAccount: string;
  amount: number;
  currency: "NGN";
  transactionDate: string;
  clearingStatus: "PENDING_CLEARING" | "CLEARED" | "DECLINED" | "REVERSED";
  workflowState: "pending" | "approved" | "flagged" | "rejected";
  autoSubmitted: true;
  linkedSubscriptionId?: string;
  receiptAttached: boolean;
  receiptFileName?: string;
  settlementVariance?: number;
  clearedAt?: string;
  isDisputed?: boolean;
  disputeReason?: string;
  policyEvaluation: {
    status: "compliant" | "flagged" | "violation";
    summary: string;
    checks: DemoPolicyCheck[];
  };
  reconciliationStatus: "PENDING" | "RECONCILED";
  reconciledBankTxId?: string;
}

export interface DemoPayment {
  id: string;
  paymentRef: string;
  vendorId: string;
  vendorName: string;
  method: "BANK_TRANSFER" | "EXTERNAL_RECORD";
  fundingAccount: string;
  amount: number;
  currency: "NGN";
  scheduledDate: string;
  status:
    | "AWAITING_RELEASE"
    | "SCHEDULED"
    | "PROCESSING"
    | "AWAITING_CONFIRMATION"
    | "COMPLETED"
    | "FAILED";
  failureReason?: string;
  providerRef?: string;
  allocations: Array<{
    billId: string;
    billNumber: string;
    invoiceNumber: string;
    amount: number;
  }>;
  attempts: DemoPaymentAttempt[];
  isBatchPayment?: boolean;
  batchName?: string;
  releasedBy?: string;
  releasedAt?: string;
  externalProofFileName?: string;
  reconciledBankTxId?: string;
}

export interface DemoBankStatementLine {
  id: string;
  date: string;
  description: string;
  reference: string;
  amount: number;
  channel: "NIP Bank Transfer" | "Card Settlement Feed";
  status: "UNMATCHED" | "MATCHED";
  matchedRecordType?: "ap_payment" | "card_expense";
  matchedRecordId?: string;
}

export interface DemoJournalEntry {
  id: string;
  date: string;
  stage: "Bill Posting" | "Payment Settlement" | "Card Expense Posting";
  sourceRef: string;
  memo: string;
  lines: Array<{
    account: string;
    debit: number;
    credit: number;
  }>;
  status: "POSTED" | "SYNCED_TO_ERP";
}

export interface DemoChannelIntake {
  id: string;
  channel: "whatsapp" | "email_ocr" | "vendor_portal";
  senderLabel: string;
  vendorId: string;
  vendorName: string;
  invoiceNumber: string;
  amount: number;
  description: string;
  receivedAt: string;
  poNumber?: string;
  status: "pending_review" | "converted";
  convertedBillId?: string;
}

export interface BillPayDemoState {
  vendors: DemoVendor[];
  vendorCredits: DemoVendorCredit[];
  bills: DemoBill[];
  intakes: DemoChannelIntake[];
  schedules: DemoRecurringSchedule[];
  occurrences: DemoRecurringOccurrence[];
  subscriptionCards: DemoSubscriptionCard[];
  companyCardExpenses: DemoCompanyExpenseCardTx[];
  payments: DemoPayment[];
  bankLines: DemoBankStatementLine[];
  journals: DemoJournalEntry[];
  auditLogs: DemoAuditEntry[];
  currentDemoRole: string;
}

export function generateApprovalStepsForBill(params: {
  amount: number;
  department: string;
  vendorName: string;
  isNewVendor?: boolean;
  hasBankChange?: boolean;
}): DemoApprovalStep[] {
  const steps: DemoApprovalStep[] = [];
  let stepNum = 1;

  // Step 1: Department Manager (Always required)
  const deptMgr =
    params.department === "Engineering"
      ? "Tunde Baba (Engineering Lead)"
      : params.department === "Administration"
      ? "Ngozi Adeyemi (Admin Manager)"
      : "Femi Adeleke (Operations Lead)";

  steps.push({
    id: `step_${stepNum}_mgr`,
    stepNumber: stepNum++,
    role: "DEPARTMENT_MANAGER",
    roleTitle: `${params.department} Manager Approval`,
    assignedToName: deptMgr,
    status: "PENDING",
  });

  // Step 2: Finance Controller (Required for >= ₦100,000)
  if (params.amount >= 100000) {
    steps.push({
      id: `step_${stepNum}_fin`,
      stepNumber: stepNum++,
      role: "FINANCE_CONTROLLER",
      roleTitle: "Finance Controller Review & GL Audit",
      assignedToName: "Chidi Okafor (Finance Controller)",
      status: "PENDING",
    });
  }

  // Step 3: Executive Director (Required for > ₦1,000,000)
  if (params.amount > 1000000) {
    steps.push({
      id: `step_${stepNum}_exec`,
      stepNumber: stepNum++,
      role: "EXECUTIVE_DIRECTOR",
      roleTitle: "Executive Director Authorization (> ₦1M)",
      assignedToName: "Adebayo Okonjo (Chief Financial Officer)",
      status: "PENDING",
    });
  }

  // Step 4: Vendor Compliance (If new vendor or bank detail changed)
  if (params.hasBankChange || params.isNewVendor) {
    steps.push({
      id: `step_${stepNum}_comp`,
      stepNumber: stepNum++,
      role: "VENDOR_COMPLIANCE",
      roleTitle: "Vendor Bank Detail & Compliance Gate",
      assignedToName: "Sodiq Atiku (Internal Audit)",
      status: "PENDING",
    });
  }

  return steps;
}

export function createInitialDemoState(): BillPayDemoState {
  return {
    vendors: [
      {
        id: "vnd_ekedc",
        name: "Eko Electricity Distribution",
        category: "Utilities",
        portalStatus: "directory_only",
        status: "approved",
        verifiedBankName: "Zenith Bank PLC",
        verifiedAccountNumber: "1014582901",
        pendingBankChange: null,
        taxId: "10492811-0001",
        contactEmail: "billing@ekedp.com",
        complianceRating: "A",
      },
      {
        id: "vnd_mainone",
        name: "MainOne Cable (FiberOne)",
        category: "Internet & Telecom",
        portalStatus: "directory_only",
        status: "approved",
        verifiedBankName: "Guaranty Trust Bank",
        verifiedAccountNumber: "0234891120",
        pendingBankChange: null,
        taxId: "08923419-0001",
        contactEmail: "billing@mainone.net",
        complianceRating: "A",
      },
      {
        id: "vnd_dell",
        name: "Dell Supplies Nigeria",
        category: "IT Hardware",
        portalStatus: "portal_registered",
        status: "approved",
        verifiedBankName: "Access Bank PLC",
        verifiedAccountNumber: "0094827165",
        pendingBankChange: {
          newBankName: "Providus Bank",
          newAccountNumber: "5400192837",
          requestedAt: "2026-11-18 14:20",
          requestedBy: "Vendor Portal Request",
          reason: "Treasury settlement account migration — awaiting 2nd Finance Admin verification",
        },
        taxId: "22094188-0001",
        contactEmail: "ap-support@dellng.com",
        complianceRating: "B",
      },
      {
        id: "vnd_vi_landlord",
        name: "Victoria Island Properties Ltd",
        category: "Facilities & Rent",
        portalStatus: "directory_only",
        status: "approved",
        verifiedBankName: "Stanbic IBTC Bank",
        verifiedAccountNumber: "9201445109",
        pendingBankChange: null,
        taxId: "19482014-0001",
        contactEmail: "accounts@viproperties.ng",
        complianceRating: "A",
      },
      {
        id: "vnd_lawma",
        name: "Lagos State Waste Management (LAWMA)",
        category: "Government & Regulatory",
        portalStatus: "directory_only",
        status: "approved",
        verifiedBankName: "First Bank of Nigeria",
        verifiedAccountNumber: "2019481102",
        pendingBankChange: null,
        taxId: "01928471-0001",
        contactEmail: "commercial@lawma.gov.ng",
        complianceRating: "A",
      },
    ],

    vendorCredits: [
      {
        id: "cred_dell_01",
        creditNoteNumber: "CN-DELL-2026-04",
        vendorId: "vnd_dell",
        vendorName: "Dell Supplies Nigeria",
        originalAmount: 150000,
        remainingBalance: 150000,
        issuedDate: "2026-11-15",
        reason: "Damaged monitor and accessory credit adjustment",
        status: "AVAILABLE",
        allocations: [],
      },
    ],

    bills: [
      {
        id: "bill_elec_001",
        billNumber: "BILL-2026-101",
        invoiceNumber: "ELEC-2026-1190",
        vendorId: "vnd_ekedc",
        vendorName: "Eko Electricity Distribution",
        entityName: "Villeto Nigeria Ltd",
        department: "Administration",
        category: "Utilities",
        glAccount: "6100 · Electricity Expense",
        supportType: "non_po",
        source: "email_ocr",
        sourceChannelLabel: "Email Inbox (ap@villeto.ng)",
        invoiceDate: "2026-11-10",
        dueDate: "2026-11-25",
        currency: "NGN",
        originalAmount: 450000,
        creditApplied: 0,
        paidAmount: 0,
        outstandingAmount: 450000,
        approvalStatus: "PENDING_APPROVAL",
        approvalSteps: [
          {
            id: "step_1_mgr",
            stepNumber: 1,
            role: "DEPARTMENT_MANAGER",
            roleTitle: "Administration Manager Approval",
            assignedToName: "Ngozi Adeyemi (Admin Manager)",
            status: "APPROVED",
            decidedAt: "Nov 11, 10:15",
            comments: "Approved within normal monthly electricity variance budget.",
          },
          {
            id: "step_2_fin",
            stepNumber: 2,
            role: "FINANCE_CONTROLLER",
            roleTitle: "Finance Controller Review & GL Audit",
            assignedToName: "Chidi Okafor (Finance Controller)",
            status: "PENDING",
          },
        ],
        currentApprovalStepIndex: 1,
        departmentBudget: { monthlyBudget: 2500000, currentMonthSpend: 1200000 },
        matchingStatus: "NOT_APPLICABLE",
        paymentStatus: "UNPAID",
        reconciliationStatus: "NOT_STARTED",
        ocrConfidence: 0.98,
        timeline: [
          {
            id: "tl_1",
            timestamp: "Nov 10, 09:14",
            actor: "AP Mailbox Bot",
            action: "Invoice received via ap@villeto.ng",
            detail: "PDF attachment stored & scanned clean",
            kind: "info",
          },
          {
            id: "tl_2",
            timestamp: "Nov 10, 09:15",
            actor: "AI Extraction",
            action: "Draft extracted (98% confidence)",
            detail: "Duplicate fingerprint check passed — no matching invoice",
            kind: "success",
          },
          {
            id: "tl_3",
            timestamp: "Nov 10, 10:02",
            actor: "Amina Bello (Finance)",
            action: "Classified & submitted for approval",
            detail: "Department: Administration · GL: 6100 · Non-PO Utility",
            kind: "info",
          },
          {
            id: "tl_4",
            timestamp: "Nov 11, 10:15",
            actor: "Ngozi Adeyemi (Admin Manager)",
            action: "Step 1: Department Manager Approved",
            detail: "Approved within normal monthly electricity variance budget. Routed to Finance Controller.",
            kind: "success",
          },
        ],
      },
      {
        id: "bill_dell_002",
        billNumber: "BILL-2026-102",
        invoiceNumber: "INV-DELL-2026-88",
        vendorId: "vnd_dell",
        vendorName: "Dell Supplies Nigeria",
        entityName: "Villeto Nigeria Ltd",
        department: "Engineering",
        category: "IT Equipment",
        glAccount: "1520 · Computer Hardware",
        supportType: "po_backed",
        source: "vendor_portal",
        sourceChannelLabel: "Vendor Portal",
        invoiceDate: "2026-11-14",
        dueDate: "2026-11-28",
        currency: "NGN",
        originalAmount: 10000000,
        creditApplied: 0,
        paidAmount: 0,
        outstandingAmount: 10000000,
        approvalStatus: "PENDING_APPROVAL",
        approvalSteps: [
          {
            id: "step_1_mgr",
            stepNumber: 1,
            role: "DEPARTMENT_MANAGER",
            roleTitle: "Engineering Lead Approval",
            assignedToName: "Tunde Baba (Engineering Lead)",
            status: "PENDING",
          },
          {
            id: "step_2_fin",
            stepNumber: 2,
            role: "FINANCE_CONTROLLER",
            roleTitle: "Finance Controller Review & GL Audit",
            assignedToName: "Chidi Okafor (Finance Controller)",
            status: "PENDING",
          },
          {
            id: "step_3_exec",
            stepNumber: 3,
            role: "EXECUTIVE_DIRECTOR",
            roleTitle: "Executive Director Authorization (> ₦1M)",
            assignedToName: "Adebayo Okonjo (Chief Financial Officer)",
            status: "PENDING",
          },
          {
            id: "step_4_comp",
            stepNumber: 4,
            role: "VENDOR_COMPLIANCE",
            roleTitle: "Vendor Bank Detail & Compliance Gate",
            assignedToName: "Sodiq Atiku (Internal Audit)",
            status: "PENDING",
          },
        ],
        currentApprovalStepIndex: 0,
        departmentBudget: { monthlyBudget: 15000000, currentMonthSpend: 4500000 },
        matchingStatus: "EXCEPTION_HOLD",
        paymentStatus: "UNPAID",
        reconciliationStatus: "NOT_STARTED",
        poReference: {
          poNumber: "PO-1794469015843-317",
          grNumber: "GR-2026-089",
          lines: [
            {
              id: "line_laptop",
              itemName: "Business Laptop (16GB RAM, 512GB SSD)",
              unitPrice: 500000,
              poOrderedQty: 20,
              grAcceptedQty: 18,
              grRejectedQty: 0,
              invoicedQty: 20,
            },
          ],
        },
        timeline: [
          {
            id: "tl_d1",
            timestamp: "Nov 12, 08:19",
            actor: "Procurement",
            action: "PO issued for 20 laptops (₦10,000,000)",
            detail: "PO-1794469015843-317 sent to Dell Supplies Nigeria",
            kind: "info",
          },
          {
            id: "tl_d2",
            timestamp: "Nov 13, 11:00",
            actor: "Receiving Officer",
            action: "Goods Receipt GR-2026-089 confirmed 18 of 20 units",
            detail: "2 units remaining on vendor backorder (₦9,000,000 received value)",
            kind: "warning",
          },
          {
            id: "tl_d3",
            timestamp: "Nov 14, 15:40",
            actor: "Dell Vendor Portal",
            action: "Submitted Invoice INV-DELL-2026-88 for 20 units",
            detail: "3-Way Match Hold: +2 units (₦1,000,000) billed ahead of delivery",
            kind: "danger",
          },
        ],
      },
      {
        id: "bill_isp_feb",
        billNumber: "BILL-2026-103",
        invoiceNumber: "MAINONE-2026-021",
        vendorId: "vnd_mainone",
        vendorName: "MainOne Cable (FiberOne)",
        entityName: "Villeto Nigeria Ltd",
        department: "Engineering",
        category: "Internet & Telecom",
        glAccount: "6210 · Bandwidth & Fiber",
        supportType: "non_po",
        source: "recurring_schedule",
        sourceChannelLabel: "Recurring Contract · Email PDF",
        invoiceDate: "2026-11-16",
        dueDate: "2026-11-25",
        currency: "NGN",
        originalAmount: 310000,
        creditApplied: 0,
        paidAmount: 0,
        outstandingAmount: 310000,
        approvalStatus: "PENDING_APPROVAL",
        approvalSteps: [
          {
            id: "step_1_mgr",
            stepNumber: 1,
            role: "DEPARTMENT_MANAGER",
            roleTitle: "Engineering Lead Approval",
            assignedToName: "Tunde Baba (Engineering Lead)",
            status: "PENDING",
          },
          {
            id: "step_2_fin",
            stepNumber: 2,
            role: "FINANCE_CONTROLLER",
            roleTitle: "Finance Controller Review & GL Audit",
            assignedToName: "Chidi Okafor (Finance Controller)",
            status: "PENDING",
          },
        ],
        currentApprovalStepIndex: 0,
        departmentBudget: { monthlyBudget: 15000000, currentMonthSpend: 5000000 },
        matchingStatus: "EXCEPTION_HOLD",
        paymentStatus: "UNPAID",
        reconciliationStatus: "NOT_STARTED",
        recurringScheduleId: "rec_isp_001",
        timeline: [
          {
            id: "tl_r1",
            timestamp: "Nov 16, 00:05",
            actor: "Recurring Engine",
            action: "Generated occurrence from Monthly Office Internet",
            detail: "Expected ₦180,000 · Policy: Variable amount, invoice required",
            kind: "info",
          },
          {
            id: "tl_r2",
            timestamp: "Nov 16, 13:12",
            actor: "AP Mailbox Bot",
            action: "Linked invoice MAINONE-2026-021 (₦310,000)",
            detail: "Variance Warning: +72.2% (+₦130,000) above 15% threshold — renewed approval triggered",
            kind: "warning",
          },
        ],
      },
      {
        id: "bill_rent_prev",
        billNumber: "BILL-2026-098",
        invoiceNumber: "VIPROP-NOV-2026",
        vendorId: "vnd_vi_landlord",
        vendorName: "Victoria Island Properties Ltd",
        entityName: "Villeto Nigeria Ltd",
        department: "Administration",
        category: "Facilities & Rent",
        glAccount: "6010 · Office Lease Expense",
        supportType: "non_po",
        source: "recurring_schedule",
        sourceChannelLabel: "Recurring Contract · Auto-Generated",
        invoiceDate: "2026-11-01",
        dueDate: "2026-11-15",
        currency: "NGN",
        originalAmount: 1000000,
        creditApplied: 0,
        paidAmount: 600000,
        outstandingAmount: 400000,
        approvalStatus: "APPROVED",
        approvalSteps: [
          {
            id: "step_1_mgr",
            stepNumber: 1,
            role: "DEPARTMENT_MANAGER",
            roleTitle: "Administration Manager Approval",
            assignedToName: "Ngozi Adeyemi (Admin Manager)",
            status: "APPROVED",
            decidedAt: "Nov 01, 14:00",
          },
          {
            id: "step_2_fin",
            stepNumber: 2,
            role: "FINANCE_CONTROLLER",
            roleTitle: "Finance Controller Review & GL Audit",
            assignedToName: "Chidi Okafor (Finance Controller)",
            status: "APPROVED",
            decidedAt: "Nov 02, 11:30",
          },
        ],
        currentApprovalStepIndex: 2,
        departmentBudget: { monthlyBudget: 2500000, currentMonthSpend: 2200000 },
        matchingStatus: "MATCHED",
        paymentStatus: "PARTIALLY_PAID",
        reconciliationStatus: "PENDING",
        recurringScheduleId: "rec_rent_002",
        timeline: [
          {
            id: "tl_p1",
            timestamp: "Nov 01, 08:00",
            actor: "Recurring Engine",
            action: "Auto-generated from Fixed Lease Agreement",
            detail: "Fixed contractual schedule — no new invoice PDF required",
            kind: "info",
          },
          {
            id: "tl_p2",
            timestamp: "Nov 02, 11:30",
            actor: "Chidi Okafor (Finance Controller)",
            action: "Approved & posted to AP",
            detail: "DR 6010 Lease Expense ₦1,000,000 / CR 2000 AP ₦1,000,000",
            kind: "success",
          },
          {
            id: "tl_p3",
            timestamp: "Nov 10, 14:15",
            actor: "Treasury Payment Run",
            action: "Partial payment of ₦600,000 completed",
            detail: "₦400,000 remaining payable balance tracked independently",
            kind: "info",
          },
        ],
      },
      {
        id: "bill_voucher_lawma",
        billNumber: "BILL-2026-105",
        invoiceNumber: "PV-LAWMA-2026-Q4",
        vendorId: "vnd_lawma",
        vendorName: "Lagos State Waste Management (LAWMA)",
        entityName: "Villeto Nigeria Ltd",
        department: "Administration",
        category: "Government & Regulatory",
        glAccount: "6410 · Statutory & Regulatory Levies",
        supportType: "no_invoice_voucher",
        voucherType: "statutory_fee",
        voucherReference: "LAWMA/REV/HQ/2026/881",
        invoiceAttached: false,
        source: "manual",
        sourceChannelLabel: "Payment Voucher (No Invoice)",
        invoiceDate: "2026-11-18",
        dueDate: "2026-11-30",
        currency: "NGN",
        originalAmount: 85000,
        creditApplied: 0,
        paidAmount: 0,
        outstandingAmount: 85000,
        approvalStatus: "PENDING_APPROVAL",
        approvalSteps: [
          {
            id: "step_1_mgr",
            stepNumber: 1,
            role: "DEPARTMENT_MANAGER",
            roleTitle: "Administration Manager Approval",
            assignedToName: "Ngozi Adeyemi (Admin Manager)",
            status: "PENDING",
          },
        ],
        currentApprovalStepIndex: 0,
        departmentBudget: { monthlyBudget: 2500000, currentMonthSpend: 2285000 },
        matchingStatus: "NOT_APPLICABLE",
        paymentStatus: "UNPAID",
        reconciliationStatus: "NOT_STARTED",
        timeline: [
          {
            id: "tl_v1",
            timestamp: "Nov 18, 14:00",
            actor: "Finance Officer",
            action: "Payment Voucher created without supplier invoice",
            detail: "Statutory environmental waste fee authorized by Lagos State assessment notice LAWMA/REV/HQ/2026/881",
            kind: "info",
          },
          {
            id: "tl_v2",
            timestamp: "Nov 18, 14:05",
            actor: "Compliance Check",
            action: "Voucher policy evaluation passed",
            detail: "Verified statutory exemption: processed under Payment Voucher rules without vendor invoice attachment",
            kind: "success",
          },
        ],
      },
      {
        id: "bill_draft_cleaning",
        billNumber: "BILL-2026-106",
        invoiceNumber: "INV-CLEAN-NOV26",
        vendorId: "vnd_ekedc",
        vendorName: "Eko Facility & Cleaning Services",
        entityName: "Villeto Nigeria Ltd",
        department: "Administration",
        category: "Facilities & Rent",
        glAccount: "6150 · Facility Cleaning & Sanitation",
        supportType: "non_po",
        source: "pdf_upload",
        sourceChannelLabel: "PDF Invoice Upload",
        invoiceDate: "2026-11-17",
        dueDate: "2026-11-30",
        currency: "NGN",
        originalAmount: 125000,
        creditApplied: 0,
        paidAmount: 0,
        outstandingAmount: 125000,
        approvalStatus: "DRAFT",
        matchingStatus: "NOT_APPLICABLE",
        paymentStatus: "UNPAID",
        reconciliationStatus: "NOT_STARTED",
        ocrConfidence: 0.94,
        departmentBudget: { monthlyBudget: 2500000, currentMonthSpend: 1650000 },
        timeline: [
          {
            id: "tl_clean_1",
            timestamp: "Nov 17, 16:20",
            actor: "Finance Officer",
            action: "Uploaded invoice PDF",
            detail: "Draft bill created. Awaiting human verification and submission for approval.",
            kind: "info",
          },
        ],
      },
      {
        id: "bill_ready_servers",
        billNumber: "BILL-2026-099",
        invoiceNumber: "SRV-NG-8891",
        vendorId: "vnd_mainone",
        vendorName: "MainOne Cable (FiberOne)",
        entityName: "Villeto Nigeria Ltd",
        department: "Engineering",
        category: "Internet & Telecom",
        glAccount: "6210 · Bandwidth & Fiber",
        supportType: "non_po",
        source: "email_ocr",
        sourceChannelLabel: "Email Inbox (ap@villeto.ng)",
        invoiceDate: "2026-11-12",
        dueDate: "2026-11-26",
        currency: "NGN",
        originalAmount: 205000,
        creditApplied: 0,
        paidAmount: 0,
        outstandingAmount: 205000,
        approvalStatus: "APPROVED",
        approvalSteps: [
          {
            id: "step_1_mgr",
            stepNumber: 1,
            role: "DEPARTMENT_MANAGER",
            roleTitle: "Engineering Lead Approval",
            assignedToName: "Tunde Baba (Engineering Lead)",
            status: "APPROVED",
            decidedAt: "Nov 13, 09:30",
          },
          {
            id: "step_2_fin",
            stepNumber: 2,
            role: "FINANCE_CONTROLLER",
            roleTitle: "Finance Controller Review & GL Audit",
            assignedToName: "Chidi Okafor (Finance Controller)",
            status: "APPROVED",
            decidedAt: "Nov 14, 16:30",
          },
        ],
        currentApprovalStepIndex: 2,
        departmentBudget: { monthlyBudget: 15000000, currentMonthSpend: 5205000 },
        matchingStatus: "NOT_APPLICABLE",
        paymentStatus: "AWAITING_RELEASE",
        reconciliationStatus: "NOT_STARTED",
        timeline: [
          {
            id: "tl_srv_1",
            timestamp: "Nov 12, 10:00",
            actor: "AP Mailbox Bot",
            action: "Invoice received",
            detail: "Secondary fiber link for backup data room",
            kind: "info",
          },
          {
            id: "tl_srv_2",
            timestamp: "Nov 14, 16:30",
            actor: "Tunde Baba & Chidi Okafor",
            action: "2-tier approval completed",
            detail: "Approved for payment. Eligible for scheduled Treasury Payment Run batch.",
            kind: "success",
          },
        ],
      },
      {
        id: "bill_overdue_legal",
        billNumber: "BILL-2026-092",
        invoiceNumber: "AD-LEGAL-2026-04",
        vendorId: "vnd_vi_landlord",
        vendorName: "Adepoju & Partners LP",
        entityName: "Villeto Nigeria Ltd",
        department: "Administration",
        category: "Professional Services",
        glAccount: "6500 · Legal & Advisory",
        supportType: "non_po",
        source: "email_ocr",
        sourceChannelLabel: "Email Inbox (ap@villeto.ng)",
        invoiceDate: "2026-10-15",
        dueDate: "2026-11-05",
        isOverdue: true,
        currency: "NGN",
        originalAmount: 350000,
        creditApplied: 0,
        paidAmount: 0,
        outstandingAmount: 350000,
        approvalStatus: "APPROVED",
        approvalSteps: [
          {
            id: "step_1_mgr",
            stepNumber: 1,
            role: "DEPARTMENT_MANAGER",
            roleTitle: "Administration Manager Approval",
            assignedToName: "Ngozi Adeyemi (Admin Manager)",
            status: "APPROVED",
            decidedAt: "Oct 18, 11:20",
          },
          {
            id: "step_2_fin",
            stepNumber: 2,
            role: "FINANCE_CONTROLLER",
            roleTitle: "Finance Controller Review & GL Audit",
            assignedToName: "Chidi Okafor (Finance Controller)",
            status: "APPROVED",
            decidedAt: "Oct 20, 14:10",
          },
        ],
        currentApprovalStepIndex: 2,
        departmentBudget: { monthlyBudget: 2500000, currentMonthSpend: 2000000 },
        matchingStatus: "NOT_APPLICABLE",
        paymentStatus: "AWAITING_RELEASE",
        reconciliationStatus: "NOT_STARTED",
        timeline: [
          {
            id: "tl_leg_1",
            timestamp: "Oct 15, 11:00",
            actor: "AP Mailbox Bot",
            action: "Received invoice for regulatory compliance filing",
            detail: "Extracted: ₦350,000 due Nov 05, 2026",
            kind: "info",
          },
          {
            id: "tl_leg_2",
            timestamp: "Oct 20, 14:10",
            actor: "Chidi Okafor (Finance Controller)",
            action: "Multi-tier approval completed",
            detail: "Approved & posted to AP ledger. Overdue escalation triggered on Nov 06.",
            kind: "danger",
          },
        ],
      },
    ],

    schedules: [
      {
        id: "rec_isp_001",
        name: "Monthly Office Internet",
        vendorId: "vnd_mainone",
        vendorName: "MainOne Cable (FiberOne)",
        department: "Engineering",
        category: "Internet & Telecom",
        glAccount: "6210 · Bandwidth & Fiber",
        frequency: "monthly",
        billingDay: 25,
        amountType: "variable",
        expectedAmount: 180000,
        invoiceRequired: true,
        approvalMode: "auto_within_tolerance",
        tolerancePercent: 5,
        status: "ACTIVE",
        nextOccurrenceDate: "2026-12-25",
      },
      {
        id: "rec_rent_002",
        name: "Lagos HQ Maintenance & Service Charge",
        vendorId: "vnd_vi_landlord",
        vendorName: "Victoria Island Properties Ltd",
        department: "Administration",
        category: "Facilities & Rent",
        glAccount: "6010 · Office Lease Expense",
        frequency: "monthly",
        billingDay: 1,
        amountType: "fixed",
        expectedAmount: 300000,
        invoiceRequired: false,
        approvalMode: "auto_within_tolerance",
        tolerancePercent: 0,
        status: "ACTIVE",
        nextOccurrenceDate: "2026-12-01",
      },
    ],

    occurrences: [
      {
        id: "occ_01",
        scheduleId: "rec_isp_001",
        periodLabel: "September 2026 Cycle",
        expectedDate: "2026-09-25",
        expectedAmount: 180000,
        actualAmount: 180000,
        variancePercent: 0,
        variancePolicyOutcome: "within_tolerance",
        invoiceAttached: true,
        billId: null,
        status: "PAID",
      },
      {
        id: "occ_02",
        scheduleId: "rec_isp_001",
        periodLabel: "October 2026 Cycle",
        expectedDate: "2026-10-25",
        expectedAmount: 180000,
        actualAmount: 205000,
        variancePercent: 13.9,
        variancePolicyOutcome: "finance_review",
        invoiceAttached: true,
        billId: null,
        status: "PAID",
      },
      {
        id: "occ_03",
        scheduleId: "rec_isp_001",
        periodLabel: "November 2026 Cycle",
        expectedDate: "2026-11-25",
        expectedAmount: 180000,
        actualAmount: 310000,
        variancePercent: 72.2,
        variancePolicyOutcome: "renewed_approval",
        invoiceAttached: true,
        billId: "bill_isp_feb",
        status: "VARIANCE_HOLD",
      },
      {
        id: "occ_04",
        scheduleId: "rec_rent_002",
        periodLabel: "December 2026 Cycle",
        expectedDate: "2026-12-01",
        expectedAmount: 300000,
        actualAmount: null,
        variancePercent: null,
        variancePolicyOutcome: null,
        invoiceAttached: false,
        billId: null,
        status: "UPCOMING",
      },
    ],

    subscriptionCards: [
      {
        id: "sub_aws_001",
        subscriptionName: "AWS Production Infrastructure",
        vendorName: "Amazon Web Services",
        department: "Engineering",
        glAccount: "6300 · Cloud Hosting",
        cardLast4: "4821",
        cardType: "VIRTUAL",
        issuerCardholder: "Villeto Nigeria Ltd (Corporate Program)",
        accountableOwner: "Tunde Baba (Engineering Lead)",
        cardAdmin: "Amina Bello (Finance Admin)",
        cadence: "monthly",
        expectedAmount: 250000,
        monthlyLimit: 300000,
        perTransactionLimit: 280000,
        latestChargeAmount: 250000,
        remainingLimit: 50000,
        nextRenewalDate: "2026-12-19",
        cardStatus: "ACTIVE",
        subscriptionStatus: "ACTIVE",
        declineAlert: null,
      },
      {
        id: "sub_figma_002",
        subscriptionName: "Figma Organization",
        vendorName: "Figma Inc.",
        department: "Product & Design",
        glAccount: "6310 · SaaS Licenses",
        cardLast4: "5901",
        cardType: "VIRTUAL",
        issuerCardholder: "Villeto Nigeria Ltd (Corporate Program)",
        accountableOwner: "Zainab Musa (Design Lead)",
        cardAdmin: "Amina Bello (Finance Admin)",
        cadence: "monthly",
        expectedAmount: 180000,
        monthlyLimit: 220000,
        perTransactionLimit: 200000,
        latestChargeAmount: 180000,
        remainingLimit: 40000,
        nextRenewalDate: "2026-12-22",
        cardStatus: "ACTIVE",
        subscriptionStatus: "ACTIVE",
        declineAlert: null,
      },
      {
        id: "sub_github_003",
        subscriptionName: "GitHub Enterprise",
        vendorName: "GitHub Inc.",
        department: "Engineering",
        glAccount: "6310 · SaaS Licenses",
        cardLast4: "6320",
        cardType: "VIRTUAL",
        issuerCardholder: "Villeto Nigeria Ltd (Corporate Program)",
        accountableOwner: "Tunde Baba (Engineering Lead)",
        cardAdmin: "Amina Bello (Finance Admin)",
        cadence: "monthly",
        expectedAmount: 90000,
        monthlyLimit: 150000,
        perTransactionLimit: 150000,
        latestChargeAmount: 125000,
        remainingLimit: 25000,
        nextRenewalDate: "2026-12-12",
        cardStatus: "ACTIVE",
        subscriptionStatus: "PRICE_CHANGED",
        declineAlert: null,
      },
    ],

    companyCardExpenses: [
      {
        id: "exp_card_001",
        providerTxId: "prov_txn_994821",
        merchant: "Figma",
        description: "Additional FigJam Seats — Design Sprint",
        cardLast4: "4821",
        cardOwner: "Kemi Adeyemi (Product Designer)",
        department: "Product & Design",
        category: "Software & SaaS",
        glAccount: "6310 · SaaS Licenses",
        amount: 80000,
        currency: "NGN",
        transactionDate: "2026-11-19",
        clearingStatus: "CLEARED",
        workflowState: "flagged",
        autoSubmitted: true,
        receiptAttached: false,
        policyEvaluation: {
          status: "violation",
          summary: "Auto-submitted to Pending · Blocked by 1 Expense Policy",
          checks: [
            {
              id: "chk_1",
              ruleName: "Receipt Requirement (> ₦25,000)",
              outcome: "violation",
              message: "Receipt required for corporate card expenses above ₦25,000.",
            },
            {
              id: "chk_2",
              ruleName: "Software Category Cap (₦150,000)",
              outcome: "pass",
              message: "Within Product & Design single-transaction limit.",
            },
          ],
        },
        reconciliationStatus: "PENDING",
      },
      {
        id: "exp_card_002",
        providerTxId: "prov_txn_994902",
        merchant: "GitHub Inc.",
        description: "GitHub Enterprise Monthly Auto-Charge",
        cardLast4: "6320",
        cardOwner: "Tunde Baba (Accountable Owner)",
        department: "Engineering",
        category: "Software & SaaS",
        glAccount: "6310 · SaaS Licenses",
        amount: 125000,
        currency: "NGN",
        transactionDate: "2026-11-18",
        clearingStatus: "CLEARED",
        workflowState: "flagged",
        autoSubmitted: true,
        linkedSubscriptionId: "sub_github_003",
        receiptAttached: true,
        receiptFileName: "github-inv-nov-2026.pdf",
        policyEvaluation: {
          status: "flagged",
          summary: "Auto-submitted to Pending · Flagged for Subscription Price Increase",
          checks: [
            {
              id: "chk_3",
              ruleName: "Receipt Requirement (> ₦25,000)",
              outcome: "pass",
              message: "Merchant receipt attached automatically.",
            },
            {
              id: "chk_4",
              ruleName: "Subscription Expected Variance (±15%)",
              outcome: "warning",
              message: "Charged ₦125,000 vs expected ₦90,000 (+38.9% price change).",
            },
          ],
        },
        reconciliationStatus: "PENDING",
      },
      {
        id: "exp_card_003",
        providerTxId: "prov_txn_994110",
        merchant: "Amazon Web Services",
        description: "AWS Production Infrastructure Renewal",
        cardLast4: "4821",
        cardOwner: "Tunde Baba (Accountable Owner)",
        department: "Engineering",
        category: "Cloud Infrastructure",
        glAccount: "6300 · Cloud Hosting",
        amount: 250000,
        currency: "NGN",
        transactionDate: "2026-11-19",
        clearingStatus: "CLEARED",
        workflowState: "pending",
        autoSubmitted: true,
        linkedSubscriptionId: "sub_aws_001",
        receiptAttached: true,
        receiptFileName: "aws-stmt-nov26.pdf",
        policyEvaluation: {
          status: "compliant",
          summary: "Auto-submitted to Pending · Compliant with all expense policies",
          checks: [
            {
              id: "chk_5",
              ruleName: "Receipt Requirement (> ₦25,000)",
              outcome: "pass",
              message: "Receipt verified.",
            },
            {
              id: "chk_6",
              ruleName: "Subscription Match (Expected ₦250,000)",
              outcome: "pass",
              message: "Exact match to active AWS subscription schedule.",
            },
          ],
        },
        reconciliationStatus: "PENDING",
      },
    ],

    payments: [
      {
        id: "pay_001",
        paymentRef: "PAY-2026-441",
        vendorId: "vnd_vi_landlord",
        vendorName: "Victoria Island Properties Ltd",
        method: "BANK_TRANSFER",
        fundingAccount: "Zenith Operating NGN · *8821",
        amount: 600000,
        currency: "NGN",
        scheduledDate: "2026-11-10",
        status: "COMPLETED",
        providerRef: "NIP-20261110-99102",
        releasedBy: "Adebayo Okonjo (CFO)",
        releasedAt: "2026-11-10 14:10",
        allocations: [
          {
            billId: "bill_rent_prev",
            billNumber: "BILL-2026-098",
            invoiceNumber: "VIPROP-NOV-2026",
            amount: 600000,
          },
        ],
        attempts: [
          {
            id: "att_001_1",
            attemptNumber: 1,
            timestamp: "2026-11-10 14:15",
            method: "BANK_TRANSFER",
            fundingAccount: "Zenith Operating NGN · *8821",
            status: "SUCCESS",
            providerRef: "NIP-20261110-99102",
          },
        ],
      },
      {
        id: "pay_002",
        paymentRef: "PAY-2026-449",
        vendorId: "vnd_mainone",
        vendorName: "MainOne Cable (FiberOne)",
        method: "BANK_TRANSFER",
        fundingAccount: "Zenith Operating NGN · *8821",
        amount: 205000,
        currency: "NGN",
        scheduledDate: "2026-11-18",
        status: "AWAITING_CONFIRMATION",
        providerRef: "NIP-PENDING-77821",
        releasedBy: "Chidi Okafor (Finance Controller)",
        releasedAt: "2026-11-18 16:25",
        allocations: [
          {
            billId: "bill_ready_servers",
            billNumber: "BILL-2026-099",
            invoiceNumber: "SRV-NG-8891",
            amount: 205000,
          },
        ],
        attempts: [
          {
            id: "att_002_1",
            attemptNumber: 1,
            timestamp: "2026-11-18 16:30",
            method: "BANK_TRANSFER",
            fundingAccount: "Zenith Operating NGN · *8821",
            status: "PENDING",
            providerRef: "NIP-PENDING-77821",
          },
        ],
      },
    ],

    bankLines: [
      {
        id: "bnk_01",
        date: "2026-11-10",
        description: "NIP TRF VICTORIA ISLAND PROPERTIES LTD / VIPROP-NOV",
        reference: "NIP-20261110-99102",
        amount: 600000,
        channel: "NIP Bank Transfer",
        status: "UNMATCHED",
      },
      {
        id: "bnk_02",
        date: "2026-11-19",
        description: "CARD SETTLEMENT / AMAZON WEB SERVICES *4821",
        reference: "prov_txn_994110",
        amount: 250000,
        channel: "Card Settlement Feed",
        status: "UNMATCHED",
      },
      {
        id: "bnk_03",
        date: "2026-11-19",
        description: "CARD SETTLEMENT / FIGMA.COM *4821",
        reference: "prov_txn_994821",
        amount: 80000,
        channel: "Card Settlement Feed",
        status: "UNMATCHED",
      },
    ],

    journals: [
      {
        id: "jrn_01",
        date: "2026-11-02",
        stage: "Bill Posting",
        sourceRef: "BILL-2026-098",
        memo: "Accrue Victoria Island Properties Nov Lease",
        lines: [
          { account: "6010 · Office Lease Expense", debit: 1000000, credit: 0 },
          { account: "2000 · Accounts Payable", debit: 0, credit: 1000000 },
        ],
        status: "SYNCED_TO_ERP",
      },
      {
        id: "jrn_02",
        date: "2026-11-10",
        stage: "Payment Settlement",
        sourceRef: "PAY-2026-441",
        memo: "Partial AP settlement to Victoria Island Properties",
        lines: [
          { account: "2000 · Accounts Payable", debit: 600000, credit: 0 },
          { account: "1010 · Zenith Operating NGN", debit: 0, credit: 600000 },
        ],
        status: "POSTED",
      },
    ],

    intakes: [
      {
        id: "int_wa_1",
        channel: "whatsapp",
        senderLabel: "WhatsApp Bot (+234 803 555 0142)",
        vendorId: "vnd_ekedc",
        vendorName: "Eko Electricity Distribution",
        invoiceNumber: "INV-WA-2026-09",
        amount: 95000,
        description: "Backup generator diesel & surge servicing photo uploaded",
        receivedAt: "Nov 19, 10:15",
        status: "pending_review",
      },
      {
        id: "int_em_2",
        channel: "email_ocr",
        senderLabel: "Email Inbox (ap@villeto.ng) · billing@mainone.net",
        vendorId: "vnd_mainone",
        vendorName: "MainOne Cable (FiberOne)",
        invoiceNumber: "MAINONE-DEC-2026",
        amount: 180000,
        description: "December fiber bandwidth renewal invoice PDF",
        receivedAt: "Nov 19, 11:02",
        status: "pending_review",
      },
      {
        id: "int_vp_3",
        channel: "vendor_portal",
        senderLabel: "Dell Supplies Vendor Portal",
        vendorId: "vnd_dell",
        vendorName: "Dell Supplies Nigeria",
        invoiceNumber: "INV-DELL-2026-99",
        amount: 1000000,
        description: "Remaining 2 Business Laptops (backorder delivery)",
        receivedAt: "Nov 19, 12:30",
        poNumber: "PO-1794469015843-317",
        status: "pending_review",
      },
    ],
    auditLogs: [
      {
        id: "aud_01",
        timestamp: "2026-11-19 09:14:22",
        actor: "Chidi Okafor",
        actorRole: "Finance Controller",
        action: "BILL_APPROVAL_STEP",
        entityType: "BILL",
        entityReference: "BILL-2026-098",
        details: "Approved Step 2 (Finance Controller Review & GL Audit) for Victoria Island Properties lease",
        status: "SUCCESS",
      },
      {
        id: "aud_02",
        timestamp: "2026-11-19 10:20:05",
        actor: "System Security Bot",
        actorRole: "Automated Control",
        action: "VENDOR_BANK_CHANGE_DETECTED",
        entityType: "VENDOR",
        entityReference: "Dell Supplies Nigeria",
        details: "Bank account change detected from Access Bank to Providus Bank. Payout freeze applied pending dual-control executive sign-off.",
        status: "WARNING",
      },
      {
        id: "aud_03",
        timestamp: "2026-11-19 11:35:10",
        actor: "Tunde Baba",
        actorRole: "Engineering Lead",
        action: "CARD_CHARGE_RECORDED",
        entityType: "CARD",
        entityReference: "AWS Production Infrastructure (*4821)",
        details: "Recorded cloud hosting charge of ₦250,000 against monthly budget.",
        status: "SUCCESS",
      },
      {
        id: "aud_04",
        timestamp: "2026-11-19 12:45:00",
        actor: "Chioma Eze",
        actorRole: "Treasury Lead",
        action: "PAYMENT_RUN_CREATED",
        entityType: "PAYMENT",
        entityReference: "PAY-RUN-20261119-01",
        details: "Initiated multi-bill batch payout for ₦1,400,000 from Zenith Bank Operating.",
        status: "SUCCESS",
      },
    ],
    currentDemoRole: "FINANCE_CONTROLLER",
  };
}
