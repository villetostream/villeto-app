"use client";

import { create } from "zustand";
import {
  createInitialDemoState,
  generateApprovalStepsForBill,
  type BillPayDemoState,
  type DemoApprovalStep,
  type DemoAuditEntry,
  type DemoBill,
  type DemoChannelIntake,
  type DemoCompanyExpenseCardTx,
  type DemoJournalEntry,
  type DemoPayment,
  type DemoPaymentAttempt,
  type DemoPolicyCheck,
  type DemoRecurringOccurrence,
  type DemoRecurringSchedule,
  type DemoSubscriptionCard,
  type DemoVendor,
  type DemoVendorCredit,
} from "./demo-data";

export function getSourceChannelLabel(source: DemoBill["source"]): string {
  switch (source) {
    case "vendor_portal":
      return "Vendor Portal";
    case "email_ocr":
      return "Email Inbox (ap@villeto.ng)";
    case "whatsapp":
      return "WhatsApp Bot";
    case "pdf_upload":
      return "PDF Upload";
    case "manual":
      return "Manual Entry";
    case "recurring_schedule":
      return "Recurring Contract";
  }
}

interface DemoActions {
  isEmptyMode: boolean;
  resetDemo: () => void;
  clearToZero: () => void;

  // Standard Bills & 3-Way Match
  intakeBillFromOcr: (input: {
    vendorId: string;
    invoiceNumber: string;
    amount: number;
    department: string;
    category: string;
    glAccount: string;
    dueDate: string;
    source?: DemoBill["source"];
    sourceChannelLabel?: string;
    supportType?: "non_po" | "po_backed" | "no_invoice_voucher";
    invoiceAttached?: boolean;
    voucherType?: "contract_lease" | "advance_deposit" | "statutory_fee" | "payment_voucher";
    voucherReference?: string;
    poNumber?: string;
    recurringScheduleId?: string;
  }) => { ok: boolean; duplicate?: boolean; message: string; billId?: string };

  // Multi-channel Intake & Vendor Portal
  submitVendorPortalInvoice: (input: {
    vendorId: string;
    invoiceNumber: string;
    amount: number;
    supportType: "po_backed" | "non_po";
    poNumber?: string;
    orderedQty?: number;
    receivedQty?: number;
    invoicedQty?: number;
    department: string;
    category: string;
    glAccount: string;
    dueDate: string;
    notes?: string;
  }) => {
    ok: boolean;
    duplicate?: boolean;
    exceptionHold?: boolean;
    message: string;
    billId?: string;
    billNumber?: string;
  };
  createChannelIntake: (input: {
    channel: "whatsapp" | "email_ocr" | "vendor_portal";
    senderLabel?: string;
    vendorId: string;
    invoiceNumber: string;
    amount: number;
    description: string;
    poNumber?: string;
  }) => { ok: boolean; intakeId?: string; message: string };
  convertIntakeToBill: (
    intakeId: string,
    mode: "standard_non_po" | "standard_po" | "recurring_match",
    options?: {
      scheduleId?: string;
      department?: string;
      category?: string;
      glAccount?: string;
      poNumber?: string;
    },
  ) => {
    ok: boolean;
    billId?: string;
    billNumber?: string;
    duplicate?: boolean;
    exceptionHold?: boolean;
    message: string;
  };
  submitBillForApproval: (billId: string) => { ok: boolean; message: string };
  approveBill: (billId: string, actor?: string) => { ok: boolean; message: string };
  approveBillStep: (
    billId: string,
    stepId: string,
    actorName?: string,
    comments?: string,
  ) => { ok: boolean; message: string; allApproved?: boolean };
  requestBillCorrection: (
    billId: string,
    reason: string,
    actorName?: string,
  ) => { ok: boolean; message: string };
  rejectBill: (billId: string, reason: string, actorName?: string) => void;
  resolveThreeWayAcceptReceived: (billId: string) => void;
  simulateRemainingDelivery: (billId: string) => void;
  applyVendorCreditNote: (billId: string, amount: number, reason: string) => void;
  createVendorCredit: (input: {
    vendorId: string;
    creditNoteNumber: string;
    amount: number;
    reason: string;
  }) => { ok: boolean; message: string };
  applyVendorCredit: (
    creditId: string,
    billId: string,
    amount: number,
  ) => { ok: boolean; message: string };

  // Recurring Bills
  createRecurringSchedule: (input: {
    name: string;
    vendorId: string;
    department: string;
    category: string;
    glAccount: string;
    frequency: "monthly" | "quarterly" | "yearly";
    amountType: "fixed" | "variable";
    expectedAmount: number;
    invoiceRequired: boolean;
    approvalMode: "each_occurrence" | "auto_within_tolerance";
    tolerancePercent: number;
  }) => void;
  toggleScheduleStatus: (scheduleId: string) => void;
  generateAndSimulateCycle: (scheduleId: string, actualAmount?: number) => string;

  // Corporate Subscription Cards & Corporate Card Logic -> Company Expenses
  issueSubscriptionCard: (input: {
    subscriptionName: string;
    vendorName: string;
    department: string;
    glAccount: string;
    accountableOwner: string;
    expectedAmount: number;
    monthlyLimit: number;
    perTransactionLimit: number;
  }) => void;
  toggleCardFreeze: (subscriptionId: string) => void;
  simulateSubscriptionCharge: (
    subscriptionId: string,
    amount: number,
  ) => { status: "cleared" | "declined"; message: string };
  resolveCardDecline: (
    subscriptionId: string,
    action: "increase_limit_approved" | "keep_restricted",
    newLimit?: number,
  ) => void;
  simulateEmployeeCardSwipe: (input: {
    merchant: string;
    description: string;
    cardOwner: string;
    cardLast4: string;
    department: string;
    category: string;
    amount: number;
    receiptAttached: boolean;
  }) => string;
  attachCardExpenseReceipt: (expenseId: string, fileName: string) => void;
  approveCompanyCardExpense: (expenseId: string) => void;

  // Phase 2: Recurring Schedules, Card Replacement & Expense Automation
  skipOccurrence: (
    occurrenceId: string,
    reason: string,
    actorName?: string,
  ) => { ok: boolean; message: string };
  updateRecurringScheduleSeries: (
    scheduleId: string,
    updates: Partial<DemoRecurringSchedule>,
    scope: "series" | "this_occurrence",
    occurrenceId?: string,
  ) => { ok: boolean; message: string };
  replaceVirtualCard: (
    subscriptionId: string,
    reason: string,
    actorName?: string,
  ) => { ok: boolean; newCardLast4: string; message: string };
  settlePendingCardExpense: (
    expenseId: string,
    options?: { fxVariance?: number; bankFee?: number },
  ) => { ok: boolean; message: string };
  disputeCardExpense: (
    expenseId: string,
    reason: string,
  ) => { ok: boolean; message: string };

  // Payments, Dual Control & Reconciliation
  createPaymentRun: (input: {
    billIds: string[];
    fundingAccount: string;
    scheduledDate: string;
    batchName?: string;
  }) => { ok: boolean; paymentId?: string; message: string };
  releasePayment: (
    paymentId: string,
    releaserName?: string,
    mode?: "complete" | "awaiting_webhook" | "simulate_failure",
  ) => { ok: boolean; message: string };
  recordExternalPayment: (input: {
    billId: string;
    amount: number;
    paymentDate: string;
    reference: string;
    proofFileName?: string;
    memo?: string;
  }) => { ok: boolean; message: string };
  initiateBillPayment: (input: {
    billId: string;
    amount: number;
    fundingAccount: string;
    mode: "complete" | "awaiting_webhook" | "simulate_failure";
  }) => { ok: boolean; message: string };
  queryProviderStatus: (paymentId: string, outcome: "COMPLETED" | "FAILED") => void;
  retryFailedPayment: (paymentId: string) => void;
  approveVendorBankChange: (vendorId: string) => void;
  reconcileBankLine: (
    bankLineId: string,
    targetType: "ap_payment" | "card_expense",
    targetId: string,
  ) => void;

  // Phase 3: Governance, Role Switcher & Audit
  setCurrentDemoRole: (roleKey: string) => void;
  addAuditLogEntry: (entry: Omit<DemoAuditEntry, "id" | "timestamp">) => void;
  updateVendorStatus: (vendorId: string, status: DemoVendor["status"]) => void;
  onboardVendor: (input: {
    name: string;
    category: string;
    verifiedBankName: string;
    verifiedAccountNumber: string;
    taxId?: string;
    contactEmail?: string;
  }) => { ok: boolean; vendorId: string };
}

function evaluateCardPolicies(params: {
  amount: number;
  receiptAttached: boolean;
  category: string;
  subscriptionExpectedAmount?: number;
  existingTxs: DemoCompanyExpenseCardTx[];
  merchant: string;
  cardLast4: string;
}): DemoCompanyExpenseCardTx["policyEvaluation"] {
  const checks: DemoPolicyCheck[] = [];

  // Rule 1: Receipt requirement above ₦25,000
  if (params.amount > 25000 && !params.receiptAttached) {
    checks.push({
      id: `chk_rcpt_${Date.now()}`,
      ruleName: "Receipt Requirement (> ₦25,000)",
      outcome: "violation",
      message: "Receipt required for corporate card charges above ₦25,000.",
    });
  } else {
    checks.push({
      id: `chk_rcpt_${Date.now()}`,
      ruleName: "Receipt Requirement (> ₦25,000)",
      outcome: "pass",
      message: params.receiptAttached
        ? "Supporting receipt attached."
        : "Under ₦25,000 threshold; receipt optional.",
    });
  }

  // Rule 2: Duplicate charge detection
  const duplicate = params.existingTxs.some(
    (t) =>
      t.merchant.toLowerCase() === params.merchant.toLowerCase() &&
      t.cardLast4 === params.cardLast4 &&
      t.amount === params.amount,
  );
  if (duplicate) {
    checks.push({
      id: `chk_dup_${Date.now()}`,
      ruleName: "Duplicate Card Charge Check",
      outcome: "warning",
      message: `Duplicate charge detected: ${params.merchant} for ₦${params.amount.toLocaleString()} on *${params.cardLast4}.`,
    });
  }

  // Rule 3: Category / Subscription variance check
  if (params.subscriptionExpectedAmount && params.subscriptionExpectedAmount > 0) {
    const pct =
      ((params.amount - params.subscriptionExpectedAmount) /
        params.subscriptionExpectedAmount) *
      100;
    if (Math.abs(pct) > 15) {
      checks.push({
        id: `chk_var_${Date.now()}`,
        ruleName: "Subscription Variance Policy (±15%)",
        outcome: "warning",
        message: `Charged ₦${params.amount.toLocaleString()} vs expected ₦${params.subscriptionExpectedAmount.toLocaleString()} (${pct > 0 ? "+" : ""}${pct.toFixed(1)}%).`,
      });
    } else {
      checks.push({
        id: `chk_var_${Date.now()}`,
        ruleName: "Subscription Variance Policy (±15%)",
        outcome: "pass",
        message: "Matches contracted subscription expectation.",
      });
    }
  } else {
    if (params.amount > 200000) {
      checks.push({
        id: `chk_cap_${Date.now()}`,
        ruleName: "Single-Swipe Policy Cap (₦200,000)",
        outcome: "warning",
        message: "Exceeds ₦200,000 standard card cap — flagged for Finance review.",
      });
    } else {
      checks.push({
        id: `chk_cap_${Date.now()}`,
        ruleName: "Single-Swipe Policy Cap (₦200,000)",
        outcome: "pass",
        message: `Within ${params.category} category spending cap.`,
      });
    }
  }

  const hasViolation = checks.some((c) => c.outcome === "violation");
  const hasWarning = checks.some((c) => c.outcome === "warning");
  const status = hasViolation ? "violation" : hasWarning ? "flagged" : "compliant";
  const summary =
    status === "violation"
      ? "Auto-submitted to Pending · Blocked by Expense Policy"
      : status === "flagged"
      ? "Auto-submitted to Pending · Flagged for Finance Policy Review"
      : "Auto-submitted to Pending · Compliant with all Expense Policies";

  return { status, summary, checks };
}

export const useBillPayDemoStore = create<BillPayDemoState & DemoActions>((set, get) => ({
  ...createInitialDemoState(),
  isEmptyMode: false,

  resetDemo: () => set({ ...createInitialDemoState(), isEmptyMode: false }),

  clearToZero: () =>
    set((state) => ({
      vendors: state.vendors,
      vendorCredits: [],
      bills: [],
      intakes: [],
      schedules: [],
      occurrences: [],
      subscriptionCards: [],
      companyCardExpenses: [],
      payments: [],
      bankLines: [],
      journals: [],
      isEmptyMode: true,
    })),

  intakeBillFromOcr: (input) => {
    const state = get();
    const vendor = state.vendors.find((v) => v.id === input.vendorId);
    if (!vendor) return { ok: false, message: "Vendor not found." };

    const normalized = input.invoiceNumber.trim().toLowerCase();
    const existingDup = state.bills.find(
      (b) =>
        b.vendorId === input.vendorId &&
        b.invoiceNumber.trim().toLowerCase() === normalized,
    );

    const id = `bill_${Date.now()}`;
    const billNumber = `BILL-2026-${Math.floor(110 + Math.random() * 880)}`;
    const isNoInvoice = input.supportType === "no_invoice_voucher";
    const isPo = !isNoInvoice && input.supportType === "po_backed" && Boolean(input.poNumber?.trim());
    const source = input.source || (isNoInvoice ? "manual" : "pdf_upload");
    const sourceChannelLabel =
      input.sourceChannelLabel ||
      (isNoInvoice ? "Payment Voucher (No Invoice)" : getSourceChannelLabel(source));
    const usesExtraction =
      !isNoInvoice && (source === "email_ocr" || source === "pdf_upload" || source === "whatsapp");

    const newBill: DemoBill = {
      id,
      billNumber,
      invoiceNumber: input.invoiceNumber.trim(),
      vendorId: vendor.id,
      vendorName: vendor.name,
      entityName: "Villeto Nigeria Ltd",
      department: input.department,
      category: input.category,
      glAccount: input.glAccount,
      supportType: isNoInvoice ? "no_invoice_voucher" : isPo ? "po_backed" : "non_po",
      invoiceAttached: isNoInvoice ? false : input.invoiceAttached ?? true,
      voucherType: input.voucherType,
      voucherReference: input.voucherReference || (isNoInvoice ? input.invoiceNumber.trim() : undefined),
      source,
      sourceChannelLabel,
      invoiceDate: "2026-11-19",
      dueDate: input.dueDate,
      currency: "NGN",
      originalAmount: input.amount,
      creditApplied: 0,
      paidAmount: 0,
      outstandingAmount: input.amount,
      approvalStatus: "PENDING_APPROVAL",
      matchingStatus: existingDup ? "EXCEPTION_HOLD" : isPo ? "MATCHED" : "NOT_APPLICABLE",
      paymentStatus: "UNPAID",
      reconciliationStatus: "NOT_STARTED",
      ocrConfidence: usesExtraction ? 0.96 : undefined,
      duplicateWarning: existingDup
        ? `Possible duplicate of ${existingDup.billNumber} (${existingDup.invoiceNumber})`
        : undefined,
      recurringScheduleId: input.recurringScheduleId,
      poReference: isPo
        ? {
            poNumber: input.poNumber!.trim(),
            grNumber: `GR-2026-${Math.floor(100 + Math.random() * 89)}`,
            lines: [
              {
                id: `line_${Date.now()}`,
                itemName: `${input.category} Order`,
                unitPrice: input.amount,
                poOrderedQty: 1,
                grAcceptedQty: 1,
                grRejectedQty: 0,
                invoicedQty: 1,
              },
            ],
          }
        : undefined,
      timeline: [
        {
          id: `tl_${Date.now()}_1`,
          timestamp: "Just now",
          actor: isNoInvoice ? "AP Specialist" : sourceChannelLabel,
          action: isNoInvoice
            ? `Payment Voucher recorded without supplier invoice`
            : usesExtraction
            ? `Received via ${sourceChannelLabel} & extracted (96% confidence)`
            : `Bill recorded via ${sourceChannelLabel}`,
          detail: isNoInvoice
            ? `Authorized payment obligation (${input.voucherType ? input.voucherType.replace(/_/g, " ") : "direct voucher"}) — Ref: ${input.invoiceNumber.trim()}`
            : existingDup
            ? `Duplicate check flagged ${existingDup.billNumber}`
            : "Duplicate invoice check passed",
          kind: existingDup ? "danger" : "success",
        },
        {
          id: `tl_${Date.now()}_2`,
          timestamp: "Just now",
          actor: "Finance Officer",
          action: "Submitted for approval",
          detail: `${input.department} · ${input.glAccount}`,
          kind: "info",
        },
      ],
    };

    set({ bills: [newBill, ...state.bills], isEmptyMode: false });
    return {
      ok: true,
      duplicate: Boolean(existingDup),
      billId: id,
      message: existingDup
        ? `${billNumber} created with DUPLICATE WARNING against ${existingDup.billNumber}.`
        : `${billNumber} ingested & submitted for approval.`,
    };
  },

  submitBillForApproval: (billId: string) => {
    const state = get();
    const bill = state.bills.find((b) => b.id === billId);
    if (!bill) return { ok: false, message: "Bill not found." };
    if (bill.approvalStatus === "PENDING_APPROVAL" || bill.approvalStatus === "APPROVED") {
      return { ok: false, message: "Bill is already submitted or approved." };
    }

    const steps = generateApprovalStepsForBill({
      amount: bill.originalAmount,
      department: bill.department,
      vendorName: bill.vendorName,
    });

    set((state) => ({
      bills: state.bills.map((b) =>
        b.id === billId
          ? {
              ...b,
              approvalStatus: "PENDING_APPROVAL",
              approvalSteps: steps,
              currentApprovalStepIndex: 0,
              correctionReason: undefined,
              timeline: [
                ...b.timeline,
                {
                  id: `tl_${Date.now()}`,
                  timestamp: "Just now",
                  actor: "Finance Officer",
                  action: "Submitted for multi-tier approval",
                  detail: `Routing through ${steps.length} approval tier(s) based on ₦${bill.originalAmount.toLocaleString()} policy`,
                  kind: "info",
                },
              ],
            }
          : b,
      ),
    }));

    return { ok: true, message: `${bill.billNumber} submitted for ${steps.length}-tier approval.` };
  },

  approveBillStep: (billId, stepId, actorName, comments) => {
    const state = get();
    const bill = state.bills.find((b) => b.id === billId);
    if (!bill) return { ok: false, message: "Bill not found." };
    if (bill.matchingStatus === "EXCEPTION_HOLD") {
      return {
        ok: false,
        message: "Resolve the matching / variance / duplicate exception hold before approving.",
      };
    }

    const steps = bill.approvalSteps || [];
    const stepIdx = steps.findIndex((s) => s.id === stepId);
    if (stepIdx === -1) return { ok: false, message: "Approval step not found." };

    const targetStep = steps[stepIdx];
    const actor = actorName || targetStep.assignedToName;

    const updatedSteps = steps.map((s, idx) =>
      idx === stepIdx
        ? {
            ...s,
            status: "APPROVED" as const,
            decidedAt: "Just now",
            comments: comments || s.comments,
          }
        : s,
    );

    const isAllApproved = updatedSteps.every((s) => s.status === "APPROVED");
    const nextStepIdx = isAllApproved ? updatedSteps.length : stepIdx + 1;

    let updatedJournals = state.journals;
    if (isAllApproved) {
      const journal: DemoJournalEntry = {
        id: `jrn_${Date.now()}`,
        date: "2026-11-19",
        stage: "Bill Posting",
        sourceRef: bill.billNumber,
        memo: `Accrue approved payable — ${bill.vendorName} (${bill.invoiceNumber})`,
        lines: [
          { account: bill.glAccount, debit: bill.outstandingAmount + bill.paidAmount, credit: 0 },
          {
            account: "2000 · Accounts Payable",
            debit: 0,
            credit: bill.outstandingAmount + bill.paidAmount,
          },
        ],
        status: "POSTED",
      };
      updatedJournals = [journal, ...state.journals];
    }

    set({
      bills: state.bills.map((b) =>
        b.id === billId
          ? {
              ...b,
              approvalSteps: updatedSteps,
              currentApprovalStepIndex: nextStepIdx,
              approvalStatus: isAllApproved ? "APPROVED" : "PENDING_APPROVAL",
              paymentStatus: isAllApproved && b.paymentStatus === "UNPAID" ? "AWAITING_RELEASE" : b.paymentStatus,
              timeline: [
                ...b.timeline,
                {
                  id: `tl_${Date.now()}`,
                  timestamp: "Just now",
                  actor,
                  action: `Step ${targetStep.stepNumber}: ${targetStep.roleTitle} Approved`,
                  detail: comments
                    ? comments
                    : isAllApproved
                    ? `Final approval granted. Bill posted to Accounts Payable; eligible for Payment Release.`
                    : `Approved by ${actor}. Routed to Step ${targetStep.stepNumber + 1}.`,
                  kind: "success",
                },
              ],
            }
          : b,
      ),
      journals: updatedJournals,
    });

    return {
      ok: true,
      allApproved: isAllApproved,
      message: isAllApproved
        ? `${bill.billNumber} fully approved and posted to Accounts Payable (Awaiting Payment Release).`
        : `Step ${targetStep.stepNumber} approved by ${actor}. Next approver notified.`,
    };
  },

  requestBillCorrection: (billId, reason, actorName = "Reviewing Approver") => {
    const state = get();
    const bill = state.bills.find((b) => b.id === billId);
    if (!bill) return { ok: false, message: "Bill not found." };

    set({
      bills: state.bills.map((b) =>
        b.id === billId
          ? {
              ...b,
              approvalStatus: "CORRECTION_REQUESTED",
              correctionReason: reason,
              timeline: [
                ...b.timeline,
                {
                  id: `tl_${Date.now()}`,
                  timestamp: "Just now",
                  actor: actorName,
                  action: "Correction Requested",
                  detail: reason,
                  kind: "warning",
                },
              ],
            }
          : b,
      ),
    });

    return { ok: true, message: `Correction requested for ${bill.billNumber}: "${reason}"` };
  },

  approveBill: (billId, actor = "Chidi Okafor (Finance Controller)") => {
    const state = get();
    const bill = state.bills.find((b) => b.id === billId);
    if (!bill) return { ok: false, message: "Bill not found." };
    if (bill.matchingStatus === "EXCEPTION_HOLD") {
      return {
        ok: false,
        message: "Resolve the matching / variance / duplicate exception hold before approving.",
      };
    }

    const steps = (bill.approvalSteps || []).map((s) => ({
      ...s,
      status: "APPROVED" as const,
      decidedAt: s.decidedAt || "Just now",
    }));

    const journal: DemoJournalEntry = {
      id: `jrn_${Date.now()}`,
      date: "2026-11-19",
      stage: "Bill Posting",
      sourceRef: bill.billNumber,
      memo: `Accrue approved payable — ${bill.vendorName} (${bill.invoiceNumber})`,
      lines: [
        { account: bill.glAccount, debit: bill.outstandingAmount + bill.paidAmount, credit: 0 },
        {
          account: "2000 · Accounts Payable",
          debit: 0,
          credit: bill.outstandingAmount + bill.paidAmount,
        },
      ],
      status: "POSTED",
    };

    set({
      bills: state.bills.map((b) =>
        b.id === billId
          ? {
              ...b,
              approvalStatus: "APPROVED",
              approvalSteps: steps,
              currentApprovalStepIndex: steps.length,
              paymentStatus: b.paymentStatus === "UNPAID" ? "AWAITING_RELEASE" : b.paymentStatus,
              timeline: [
                ...b.timeline,
                {
                  id: `tl_${Date.now()}`,
                  timestamp: "Just now",
                  actor,
                  action: "All approval steps completed & posted to Accounts Payable",
                  detail: `DR ${b.glAccount} / CR 2000 AP for ₦${b.outstandingAmount.toLocaleString()} · Ready for Payment Release`,
                  kind: "success",
                },
              ],
            }
          : b,
      ),
      journals: [journal, ...state.journals],
    });
    return { ok: true, message: `${bill.billNumber} approved and posted to AP ledger (Ready for Release).` };
  },

  rejectBill: (billId, reason, actorName = "Approver") => {
    set((state) => ({
      bills: state.bills.map((b) =>
        b.id === billId
          ? {
              ...b,
              approvalStatus: "REJECTED",
              timeline: [
                ...b.timeline,
                {
                  id: `tl_${Date.now()}`,
                  timestamp: "Just now",
                  actor: actorName,
                  action: "Bill rejected",
                  detail: reason,
                  kind: "danger",
                },
              ],
            }
          : b,
      ),
    }));
  },

  createVendorCredit: (input) => {
    const state = get();
    const vendor = state.vendors.find((v) => v.id === input.vendorId);
    const newCredit: DemoVendorCredit = {
      id: `cred_${Date.now()}`,
      creditNoteNumber: input.creditNoteNumber.trim() || `CN-${Date.now().toString().slice(-4)}`,
      vendorId: input.vendorId,
      vendorName: vendor ? vendor.name : "Vendor",
      originalAmount: input.amount,
      remainingBalance: input.amount,
      issuedDate: "2026-11-19",
      reason: input.reason.trim() || "Supplier price adjustment / damaged goods credit",
      status: "AVAILABLE",
      allocations: [],
    };

    set({
      vendorCredits: [newCredit, ...state.vendorCredits],
    });

    return {
      ok: true,
      message: `Credit Note ${newCredit.creditNoteNumber} (₦${input.amount.toLocaleString()}) recorded for ${newCredit.vendorName}.`,
    };
  },

  applyVendorCredit: (creditId, billId, amount) => {
    const state = get();
    const credit = state.vendorCredits.find((c) => c.id === creditId);
    const bill = state.bills.find((b) => b.id === billId);
    if (!credit || !bill) return { ok: false, message: "Credit or bill not found." };
    if (amount <= 0 || amount > credit.remainingBalance) {
      return { ok: false, message: "Invalid credit allocation amount." };
    }
    if (amount > bill.outstandingAmount) {
      return { ok: false, message: "Credit applied cannot exceed bill outstanding amount." };
    }

    const nextCreditBalance = credit.remainingBalance - amount;
    const nextOutstanding = bill.outstandingAmount - amount;
    const nextCreditApplied = bill.creditApplied + amount;

    const offsetJournal: DemoJournalEntry = {
      id: `jrn_${Date.now()}`,
      date: "2026-11-19",
      stage: "Bill Posting",
      sourceRef: credit.creditNoteNumber,
      memo: `Apply Credit Note ${credit.creditNoteNumber} against ${bill.billNumber}`,
      lines: [
        { account: "2000 · Accounts Payable", debit: amount, credit: 0 },
        { account: "5100 · Purchase Adjustments & Vendor Credits", debit: 0, credit: amount },
      ],
      status: "POSTED",
    };

    set({
      vendorCredits: state.vendorCredits.map((c) =>
        c.id === creditId
          ? {
              ...c,
              remainingBalance: nextCreditBalance,
              status: nextCreditBalance === 0 ? "FULLY_EXHAUSTED" : "PARTIALLY_APPLIED",
              allocations: [
                ...c.allocations,
                {
                  billId: bill.id,
                  billNumber: bill.billNumber,
                  amountApplied: amount,
                  appliedDate: "2026-11-19",
                },
              ],
            }
          : c,
      ),
      bills: state.bills.map((b) =>
        b.id === billId
          ? {
              ...b,
              creditApplied: nextCreditApplied,
              outstandingAmount: nextOutstanding,
              timeline: [
                ...b.timeline,
                {
                  id: `tl_${Date.now()}`,
                  timestamp: "Just now",
                  actor: "AP Specialist",
                  action: `Applied Vendor Credit Note ${credit.creditNoteNumber}`,
                  detail: `Offset ₦${amount.toLocaleString()} against bill payable balance. Remaining due: ₦${nextOutstanding.toLocaleString()}`,
                  kind: "success",
                },
              ],
            }
          : b,
      ),
      journals: [offsetJournal, ...state.journals],
    });

    return {
      ok: true,
      message: `₦${amount.toLocaleString()} from ${credit.creditNoteNumber} applied to ${bill.billNumber}. Remaining due: ₦${nextOutstanding.toLocaleString()}.`,
    };
  },

  resolveThreeWayAcceptReceived: (billId) => {
    set((state) => ({
      bills: state.bills.map((b) => {
        if (b.id !== billId || !b.poReference) return b;
        const eligibleTotal = b.poReference.lines.reduce(
          (sum, l) => sum + l.grAcceptedQty * l.unitPrice,
          0,
        );
        const creditNeeded = Math.max(0, b.originalAmount - eligibleTotal);
        return {
          ...b,
          creditApplied: creditNeeded,
          outstandingAmount: Math.max(0, eligibleTotal - b.paidAmount),
          matchingStatus: "MATCHED",
          timeline: [
            ...b.timeline,
            {
              id: `tl_${Date.now()}`,
              timestamp: "Just now",
              actor: "AP Specialist",
              action: "Accepted receipt-verified quantity & applied Vendor Credit",
              detail: `Approved ₦${eligibleTotal.toLocaleString()} (18 units) · Credit Note ₦${creditNeeded.toLocaleString()} preserved separately`,
              kind: "success",
            },
          ],
        };
      }),
    }));
  },

  simulateRemainingDelivery: (billId) => {
    set((state) => ({
      bills: state.bills.map((b) => {
        if (b.id !== billId || !b.poReference) return b;
        return {
          ...b,
          matchingStatus: "MATCHED",
          poReference: {
            ...b.poReference,
            grNumber: `${b.poReference.grNumber} + GR-2026-094`,
            lines: b.poReference.lines.map((l) => ({
              ...l,
              grAcceptedQty: l.poOrderedQty,
            })),
          },
          timeline: [
            ...b.timeline,
            {
              id: `tl_${Date.now()}`,
              timestamp: "Just now",
              actor: "Receiving Officer",
              action: "Goods Receipt GR-2026-094 recorded remaining 2 units",
              detail: "3-Way Match passed (20 PO = 20 Received = 20 Invoiced)",
              kind: "success",
            },
          ],
        };
      }),
    }));
  },

  applyVendorCreditNote: (billId, amount, reason) => {
    set((state) => ({
      bills: state.bills.map((b) => {
        if (b.id !== billId) return b;
        const nextCredit = b.creditApplied + amount;
        const nextOutstanding = Math.max(0, b.originalAmount - nextCredit - b.paidAmount);
        return {
          ...b,
          creditApplied: nextCredit,
          outstandingAmount: nextOutstanding,
          matchingStatus:
            b.matchingStatus === "EXCEPTION_HOLD" ? "MATCHED" : b.matchingStatus,
          timeline: [
            ...b.timeline,
            {
              id: `tl_${Date.now()}`,
              timestamp: "Just now",
              actor: "AP Specialist",
              action: `Applied Vendor Credit Note (-₦${amount.toLocaleString()})`,
              detail: `${reason} · Original invoice ₦${b.originalAmount.toLocaleString()} preserved`,
              kind: "info",
            },
          ],
        };
      }),
    }));
  },

  createRecurringSchedule: (input) => {
    const state = get();
    const vendor = state.vendors.find((v) => v.id === input.vendorId);
    if (!vendor) return;
    const schedule: DemoRecurringSchedule = {
      id: `rec_${Date.now()}`,
      name: input.name,
      vendorId: vendor.id,
      vendorName: vendor.name,
      department: input.department,
      category: input.category,
      glAccount: input.glAccount,
      frequency: input.frequency,
      billingDay: 25,
      amountType: input.amountType,
      expectedAmount: input.expectedAmount,
      invoiceRequired: input.invoiceRequired,
      approvalMode: input.approvalMode,
      tolerancePercent: input.tolerancePercent,
      status: "ACTIVE",
      nextOccurrenceDate: "2026-12-25",
    };
    set({ schedules: [schedule, ...state.schedules] });
  },

  toggleScheduleStatus: (scheduleId) => {
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === scheduleId
          ? { ...s, status: s.status === "ACTIVE" ? "PAUSED" : "ACTIVE" }
          : s,
      ),
    }));
  },

  generateAndSimulateCycle: (scheduleId, actualAmount) => {
    const state = get();
    const schedule = state.schedules.find((s) => s.id === scheduleId);
    if (!schedule) return "Schedule not found";

    const usedAmount = actualAmount ?? schedule.expectedAmount;
    const variancePct =
      schedule.expectedAmount > 0
        ? ((usedAmount - schedule.expectedAmount) / schedule.expectedAmount) * 100
        : 0;
    const absVar = Math.abs(variancePct);

    let varianceOutcome: "within_tolerance" | "finance_review" | "renewed_approval" =
      "within_tolerance";
    if (absVar > 15) varianceOutcome = "renewed_approval";
    else if (absVar > 5) varianceOutcome = "finance_review";

    const billId = `bill_rec_${Date.now()}`;
    const billNumber = `BILL-2026-${Math.floor(200 + Math.random() * 790)}`;
    const autoApprove =
      schedule.approvalMode === "auto_within_tolerance" &&
      varianceOutcome === "within_tolerance" &&
      (!schedule.invoiceRequired || actualAmount !== undefined);

    const newBill: DemoBill = {
      id: billId,
      billNumber,
      invoiceNumber: schedule.invoiceRequired
        ? `INV-SIM-${Math.floor(1000 + Math.random() * 8999)}`
        : `CONTRACT-${schedule.id.slice(-3).toUpperCase()}`,
      vendorId: schedule.vendorId,
      vendorName: schedule.vendorName,
      entityName: "Villeto Nigeria Ltd",
      department: schedule.department,
      category: schedule.category,
      glAccount: schedule.glAccount,
      supportType: "non_po",
      source: "recurring_schedule",
      sourceChannelLabel: schedule.invoiceRequired
        ? "Recurring Contract · Invoice PDF"
        : "Recurring Contract · Auto-Generated",
      invoiceDate: "2026-12-01",
      dueDate: "2026-12-15",
      currency: "NGN",
      originalAmount: usedAmount,
      creditApplied: 0,
      paidAmount: 0,
      outstandingAmount: usedAmount,
      approvalStatus: autoApprove ? "APPROVED" : "PENDING_APPROVAL",
      matchingStatus:
        varianceOutcome === "within_tolerance" ? "MATCHED" : "EXCEPTION_HOLD",
      paymentStatus: "UNPAID",
      reconciliationStatus: "NOT_STARTED",
      recurringScheduleId: schedule.id,
      timeline: [
        {
          id: `tl_${Date.now()}_a`,
          timestamp: "Just now",
          actor: "Recurring Scheduler",
          action: `Generated independent bill ${billNumber}`,
          detail: schedule.invoiceRequired
            ? `Invoice attached · Expected ₦${schedule.expectedAmount.toLocaleString()}, Actual ₦${usedAmount.toLocaleString()} (${variancePct >= 0 ? "+" : ""}${variancePct.toFixed(1)}%)`
            : "Fixed contractual obligation — generated without supplier PDF",
          kind:
            varianceOutcome === "within_tolerance"
              ? "success"
              : varianceOutcome === "finance_review"
              ? "warning"
              : "danger",
        },
      ],
    };

    const newOccurrence: DemoRecurringOccurrence = {
      id: `occ_${Date.now()}`,
      scheduleId: schedule.id,
      periodLabel: "December 2026 Simulated Cycle",
      expectedDate: schedule.nextOccurrenceDate,
      expectedAmount: schedule.expectedAmount,
      actualAmount: usedAmount,
      variancePercent: Number(variancePct.toFixed(1)),
      variancePolicyOutcome: varianceOutcome,
      invoiceAttached: !schedule.invoiceRequired || actualAmount !== undefined,
      billId,
      status: varianceOutcome === "within_tolerance" ? "BILL_CREATED" : "VARIANCE_HOLD",
    };

    const nextJournals = [...state.journals];
    if (autoApprove) {
      nextJournals.unshift({
        id: `jrn_${Date.now()}`,
        date: "2026-12-01",
        stage: "Bill Posting",
        sourceRef: billNumber,
        memo: `Auto-approved recurring bill — ${schedule.name}`,
        lines: [
          { account: schedule.glAccount, debit: usedAmount, credit: 0 },
          { account: "2000 · Accounts Payable", debit: 0, credit: usedAmount },
        ],
        status: "POSTED",
      });
    }

    set({
      bills: [newBill, ...state.bills],
      occurrences: [newOccurrence, ...state.occurrences],
      journals: nextJournals,
    });

    if (varianceOutcome === "renewed_approval") {
      return `Variance +${absVar.toFixed(1)}% (>15%) detected! ${billNumber} placed on RENEWED APPROVAL HOLD.`;
    }
    if (varianceOutcome === "finance_review") {
      return `Variance +${absVar.toFixed(1)}% (5–15%) detected! ${billNumber} routed to Finance Review.`;
    }
    return autoApprove
      ? `Cycle generated & auto-approved (${billNumber}) within tolerance.`
      : `Cycle generated (${billNumber}) and queued for approval.`;
  },

  issueSubscriptionCard: (input) => {
    const cardLast4 = String(Math.floor(1000 + Math.random() * 8999));
    const sub: DemoSubscriptionCard = {
      id: `sub_${Date.now()}`,
      subscriptionName: input.subscriptionName,
      vendorName: input.vendorName,
      department: input.department,
      glAccount: input.glAccount,
      cardLast4,
      cardType: "VIRTUAL",
      issuerCardholder: "Villeto Nigeria Ltd (Corporate Program)",
      accountableOwner: input.accountableOwner,
      cardAdmin: "Amina Bello (Finance Admin)",
      cadence: "monthly",
      expectedAmount: input.expectedAmount,
      monthlyLimit: input.monthlyLimit,
      perTransactionLimit: input.perTransactionLimit,
      latestChargeAmount: 0,
      remainingLimit: input.monthlyLimit,
      nextRenewalDate: "2026-12-20",
      cardStatus: "ACTIVE",
      subscriptionStatus: "ACTIVE",
      declineAlert: null,
    };
    set((state) => ({ subscriptionCards: [sub, ...state.subscriptionCards] }));
  },

  toggleCardFreeze: (subscriptionId) => {
    set((state) => ({
      subscriptionCards: state.subscriptionCards.map((s) =>
        s.id === subscriptionId
          ? { ...s, cardStatus: s.cardStatus === "ACTIVE" ? "FROZEN" : "ACTIVE" }
          : s,
      ),
    }));
  },

  simulateSubscriptionCharge: (subscriptionId, amount) => {
    const state = get();
    const sub = state.subscriptionCards.find((s) => s.id === subscriptionId);
    if (!sub) return { status: "declined", message: "Subscription card not found." };

    if (sub.cardStatus === "FROZEN") {
      const alert = {
        attemptedAmount: amount,
        difference: amount,
        timestamp: "Just now",
        reason: `Card *${sub.cardLast4} is FROZEN — issuer blocked charge without cancelling subscription record.`,
      };
      set({
        subscriptionCards: state.subscriptionCards.map((s) =>
          s.id === subscriptionId
            ? { ...s, subscriptionStatus: "FAILED_RENEWAL", declineAlert: alert }
            : s,
        ),
      });
      return { status: "declined", message: alert.reason };
    }

    if (amount > sub.monthlyLimit || amount > sub.perTransactionLimit) {
      const diff = amount - sub.expectedAmount;
      const alert = {
        attemptedAmount: amount,
        difference: diff,
        timestamp: "Just now",
        reason: `Issuer declined ₦${amount.toLocaleString()} (exceeds card limit ₦${sub.monthlyLimit.toLocaleString()} / per-tx ₦${sub.perTransactionLimit.toLocaleString()}). Limit NOT auto-increased.`,
      };
      set({
        subscriptionCards: state.subscriptionCards.map((s) =>
          s.id === subscriptionId
            ? { ...s, subscriptionStatus: "FAILED_RENEWAL", declineAlert: alert }
            : s,
        ),
      });
      return { status: "declined", message: alert.reason };
    }

    // Cleared charge -> Auto-ingest into Company Expenses tab & evaluate policies!
    const policyEvaluation = evaluateCardPolicies({
      amount,
      receiptAttached: true,
      category: "Cloud & SaaS Subscriptions",
      subscriptionExpectedAmount: sub.expectedAmount,
      existingTxs: state.companyCardExpenses,
      merchant: sub.vendorName,
      cardLast4: sub.cardLast4,
    });

    const txId = `exp_card_${Date.now()}`;
    const provRef = `prov_txn_${Math.floor(100000 + Math.random() * 899999)}`;
    const priceChanged = amount > sub.expectedAmount * 1.15;

    const newExpense: DemoCompanyExpenseCardTx = {
      id: txId,
      providerTxId: provRef,
      merchant: sub.vendorName,
      description: `${sub.subscriptionName} Cycle Charge`,
      cardLast4: sub.cardLast4,
      cardOwner: `${sub.accountableOwner} (Accountable Owner)`,
      department: sub.department,
      category: "Software & SaaS",
      glAccount: sub.glAccount,
      amount,
      currency: "NGN",
      transactionDate: "2026-11-19",
      clearingStatus: "CLEARED",
      workflowState: policyEvaluation.status === "compliant" ? "pending" : "flagged",
      autoSubmitted: true,
      linkedSubscriptionId: sub.id,
      receiptAttached: true,
      receiptFileName: `${sub.vendorName.toLowerCase().replace(/\s+/g, "-")}-charge.pdf`,
      policyEvaluation,
      reconciliationStatus: "PENDING",
    };

    const newBankLine = {
      id: `bnk_${Date.now()}`,
      date: "2026-11-19",
      description: `CARD SETTLEMENT / ${sub.vendorName.toUpperCase()} *${sub.cardLast4}`,
      reference: provRef,
      amount,
      channel: "Card Settlement Feed" as const,
      status: "UNMATCHED" as const,
    };

    set({
      subscriptionCards: state.subscriptionCards.map((s) =>
        s.id === subscriptionId
          ? {
              ...s,
              latestChargeAmount: amount,
              remainingLimit: Math.max(0, s.monthlyLimit - amount),
              subscriptionStatus: priceChanged ? "PRICE_CHANGED" : "ACTIVE",
              declineAlert: null,
            }
          : s,
      ),
      companyCardExpenses: [newExpense, ...state.companyCardExpenses],
      bankLines: [newBankLine, ...state.bankLines],
    });

    return {
      status: "cleared",
      message: `₦${amount.toLocaleString()} cleared on *${sub.cardLast4} -> Auto-submitted to Company Expenses (${policyEvaluation.status.toUpperCase()}).`,
    };
  },

  resolveCardDecline: (subscriptionId, action, newLimit) => {
    set((state) => ({
      subscriptionCards: state.subscriptionCards.map((s) => {
        if (s.id !== subscriptionId) return s;
        if (action === "increase_limit_approved" && newLimit) {
          return {
            ...s,
            monthlyLimit: newLimit,
            perTransactionLimit: newLimit,
            remainingLimit: Math.max(0, newLimit - s.latestChargeAmount),
            subscriptionStatus: "ACTIVE",
            declineAlert: null,
          };
        }
        return {
          ...s,
          subscriptionStatus: "ACTIVE",
          declineAlert: null,
        };
      }),
    }));
  },

  simulateEmployeeCardSwipe: (input) => {
    const state = get();
    const policyEvaluation = evaluateCardPolicies({
      amount: input.amount,
      receiptAttached: input.receiptAttached,
      category: input.category,
      existingTxs: state.companyCardExpenses,
      merchant: input.merchant,
      cardLast4: input.cardLast4,
    });

    const provRef = `prov_txn_${Math.floor(100000 + Math.random() * 899999)}`;
    const newTx: DemoCompanyExpenseCardTx = {
      id: `exp_card_${Date.now()}`,
      providerTxId: provRef,
      merchant: input.merchant,
      description: input.description,
      cardLast4: input.cardLast4,
      cardOwner: input.cardOwner,
      department: input.department,
      category: input.category,
      glAccount: "6310 · SaaS & Card Expenses",
      amount: input.amount,
      currency: "NGN",
      transactionDate: "2026-11-19",
      clearingStatus: "CLEARED",
      workflowState: policyEvaluation.status === "compliant" ? "pending" : "flagged",
      autoSubmitted: true,
      receiptAttached: input.receiptAttached,
      receiptFileName: input.receiptAttached ? "uploaded-card-receipt.pdf" : undefined,
      policyEvaluation,
      reconciliationStatus: "PENDING",
    };

    const newBankLine = {
      id: `bnk_${Date.now()}`,
      date: "2026-11-19",
      description: `CARD SETTLEMENT / ${input.merchant.toUpperCase()} *${input.cardLast4}`,
      reference: provRef,
      amount: input.amount,
      channel: "Card Settlement Feed" as const,
      status: "UNMATCHED" as const,
    };

    set({
      companyCardExpenses: [newTx, ...state.companyCardExpenses],
      bankLines: [newBankLine, ...state.bankLines],
    });

    return `Card swipe ₦${input.amount.toLocaleString()} auto-submitted to Company Expenses (${policyEvaluation.status.toUpperCase()}) — NO unpaid AP bill created.`;
  },

  attachCardExpenseReceipt: (expenseId, fileName) => {
    set((state) => ({
      companyCardExpenses: state.companyCardExpenses.map((tx) => {
        if (tx.id !== expenseId) return tx;
        const linkedSub = tx.linkedSubscriptionId
          ? state.subscriptionCards.find((s) => s.id === tx.linkedSubscriptionId)
          : undefined;
        const updatedEval = evaluateCardPolicies({
          amount: tx.amount,
          receiptAttached: true,
          category: tx.category,
          subscriptionExpectedAmount: linkedSub?.expectedAmount,
          existingTxs: state.companyCardExpenses.filter((t) => t.id !== expenseId),
          merchant: tx.merchant,
          cardLast4: tx.cardLast4,
        });
        return {
          ...tx,
          receiptAttached: true,
          receiptFileName: fileName,
          workflowState: updatedEval.status === "compliant" ? "pending" : "flagged",
          policyEvaluation: updatedEval,
        };
      }),
    }));
  },

  approveCompanyCardExpense: (expenseId) => {
    const state = get();
    const tx = state.companyCardExpenses.find((t) => t.id === expenseId);
    if (!tx) return;

    const journal: DemoJournalEntry = {
      id: `jrn_${Date.now()}`,
      date: tx.transactionDate,
      stage: "Card Expense Posting",
      sourceRef: tx.providerTxId,
      memo: `Post approved Company Card expense — ${tx.merchant} (*${tx.cardLast4})`,
      lines: [
        { account: tx.glAccount, debit: tx.amount, credit: 0 },
        { account: "2150 · Corporate Card Liability", debit: 0, credit: tx.amount },
      ],
      status: "POSTED",
    };

    set({
      companyCardExpenses: state.companyCardExpenses.map((t) =>
        t.id === expenseId ? { ...t, workflowState: "approved" } : t,
      ),
      journals: [journal, ...state.journals],
    });
  },

  // Phase 2 Implementation: Recurring Occurrence Skip & Series Modification
  skipOccurrence: (occurrenceId, reason, actorName = "Finance Officer") => {
    const state = get();
    const occurrence = state.occurrences.find((o) => o.id === occurrenceId);
    if (!occurrence) return { ok: false, message: "Occurrence not found." };
    if (occurrence.status === "PAID") {
      return { ok: false, message: "Cannot skip an occurrence that is already paid." };
    }
    set({
      occurrences: state.occurrences.map((o) =>
        o.id === occurrenceId
          ? {
              ...o,
              status: "SKIPPED",
              skippedReason: reason,
              skippedBy: actorName,
            }
          : o,
      ),
    });
    return {
      ok: true,
      message: `Skipped ${occurrence.periodLabel}. Recurring schedule cadence preserved for next cycle.`,
    };
  },

  updateRecurringScheduleSeries: (scheduleId, updates, scope, occurrenceId) => {
    const state = get();
    const schedule = state.schedules.find((s) => s.id === scheduleId);
    if (!schedule) return { ok: false, message: "Schedule not found." };

    if (scope === "series") {
      set({
        schedules: state.schedules.map((s) =>
          s.id === scheduleId ? { ...s, ...updates } : s,
        ),
      });
      return {
        ok: true,
        message: `Updated recurring schedule series "${schedule.name}". All future cycles will use new terms.`,
      };
    } else {
      if (!occurrenceId) {
        return { ok: false, message: "Occurrence ID required for single-occurrence update." };
      }
      set({
        occurrences: state.occurrences.map((o) =>
          o.id === occurrenceId
            ? {
                ...o,
                expectedAmount: updates.expectedAmount ?? o.expectedAmount,
              }
            : o,
        ),
      });
      return {
        ok: true,
        message: `Updated this cycle only. Schedule series parameters remain unchanged.`,
      };
    }
  },

  replaceVirtualCard: (subscriptionId, reason, actorName = "Amina Bello (Card Admin)") => {
    const state = get();
    const sub = state.subscriptionCards.find((s) => s.id === subscriptionId);
    if (!sub) return { ok: false, newCardLast4: "", message: "Subscription card not found." };

    const newLast4 = Math.floor(1000 + Math.random() * 9000).toString();
    const historyEntry = {
      oldCardLast4: sub.cardLast4,
      replacedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      reason,
    };

    set({
      subscriptionCards: state.subscriptionCards.map((s) =>
        s.id === subscriptionId
          ? {
              ...s,
              cardLast4: newLast4,
              cardStatus: "ACTIVE",
              subscriptionStatus: "ACTIVE",
              declineAlert: null,
              cardReplacementHistory: [
                historyEntry,
                ...(s.cardReplacementHistory || []),
              ],
            }
          : s,
      ),
    });

    return {
      ok: true,
      newCardLast4: newLast4,
      message: `Zero-Downtime Replacement: Virtual card replaced with *${newLast4}. Commercial contracts, GL mappings, and accountable owner (${sub.accountableOwner}) retained seamlessly.`,
    };
  },

  settlePendingCardExpense: (expenseId, options) => {
    const state = get();
    const tx = state.companyCardExpenses.find((t) => t.id === expenseId);
    if (!tx) return { ok: false, message: "Expense transaction not found." };
    if (tx.clearingStatus === "CLEARED") {
      return { ok: false, message: "Transaction is already cleared." };
    }

    const variance = options?.fxVariance ?? 0;
    const bankFee = options?.bankFee ?? 0;
    const finalAmount = tx.amount + variance + bankFee;

    const clearingJournal: DemoJournalEntry = {
      id: `jrn_clr_${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      stage: "Payment Settlement",
      sourceRef: tx.providerTxId,
      memo: `Corporate Card Settlement cleared by Bank — ${tx.merchant} (*${tx.cardLast4})`,
      lines: [
        { account: "2150 · Corporate Card Liability", debit: tx.amount, credit: 0 },
        ...(variance !== 0
          ? [{ account: "6800 · FX & Card Processing Variance", debit: variance > 0 ? variance : 0, credit: variance < 0 ? Math.abs(variance) : 0 }]
          : []),
        { account: "1010 · Zenith Bank Operating", debit: 0, credit: finalAmount },
      ],
      status: "POSTED",
    };

    set({
      companyCardExpenses: state.companyCardExpenses.map((t) =>
        t.id === expenseId
          ? {
              ...t,
              clearingStatus: "CLEARED",
              workflowState: "approved",
              reconciliationStatus: "RECONCILED",
              settlementVariance: variance,
              clearedAt: "Just now",
            }
          : t,
      ),
      journals: [clearingJournal, ...state.journals],
    });

    return {
      ok: true,
      message: `Card swipe *${tx.cardLast4} cleared. Stage 2 GL settlement journal posted to Zenith Operating.`,
    };
  },

  disputeCardExpense: (expenseId, reason) => {
    const state = get();
    const tx = state.companyCardExpenses.find((t) => t.id === expenseId);
    if (!tx) return { ok: false, message: "Expense transaction not found." };

    set({
      companyCardExpenses: state.companyCardExpenses.map((t) =>
        t.id === expenseId
          ? {
              ...t,
              isDisputed: true,
              disputeReason: reason,
              workflowState: "flagged",
              clearingStatus: t.clearingStatus === "CLEARED" ? "REVERSED" : t.clearingStatus,
            }
          : t,
      ),
    });

    return {
      ok: true,
      message: `Charge of ₦${tx.amount.toLocaleString()} on *${tx.cardLast4} flagged for formal dispute with issuing bank.`,
    };
  },

  createPaymentRun: ({ billIds, fundingAccount, scheduledDate, batchName }) => {
    const state = get();
    const targetBills = state.bills.filter(
      (b) => billIds.includes(b.id) && b.approvalStatus === "APPROVED" && b.outstandingAmount > 0,
    );

    if (targetBills.length === 0) {
      return { ok: false, message: "No eligible approved bills selected for payment run." };
    }

    const totalBatchAmount = targetBills.reduce((sum, b) => sum + b.outstandingAmount, 0);
    const paymentId = `pay_batch_${Date.now()}`;
    const paymentRef = `RUN-2026-${Math.floor(100 + Math.random() * 899)}`;
    const effectiveBatchName = batchName?.trim() || `Treasury Payment Run · ${targetBills.length} Bills`;

    const allocations = targetBills.map((b) => ({
      billId: b.id,
      billNumber: b.billNumber,
      invoiceNumber: b.invoiceNumber,
      amount: b.outstandingAmount,
    }));

    const isFuture = scheduledDate > "2026-11-19";

    const newPayment: DemoPayment = {
      id: paymentId,
      paymentRef,
      vendorId: targetBills[0].vendorId,
      vendorName:
        targetBills.length === 1
          ? targetBills[0].vendorName
          : `Batch Payout (${targetBills.length} Vendors)`,
      method: "BANK_TRANSFER",
      fundingAccount,
      amount: totalBatchAmount,
      currency: "NGN",
      scheduledDate,
      status: isFuture ? "SCHEDULED" : "AWAITING_RELEASE",
      allocations,
      isBatchPayment: true,
      batchName: effectiveBatchName,
      attempts: [],
    };

    const targetBillIds = new Set(targetBills.map((b) => b.id));

    set({
      payments: [newPayment, ...state.payments],
      bills: state.bills.map((b) =>
        targetBillIds.has(b.id)
          ? {
              ...b,
              paymentStatus: isFuture ? "SCHEDULED" : "AWAITING_RELEASE",
              timeline: [
                ...b.timeline,
                {
                  id: `tl_${Date.now()}`,
                  timestamp: "Just now",
                  actor: "Treasury Manager",
                  action: `Queued in Payment Run ${paymentRef}`,
                  detail: `Batch total: ₦${totalBatchAmount.toLocaleString()} · Scheduled date: ${scheduledDate} · Awaiting dual-control release`,
                  kind: "info",
                },
              ],
            }
          : b,
      ),
    });

    return {
      ok: true,
      paymentId,
      message: `${effectiveBatchName} created (${paymentRef}) for ₦${totalBatchAmount.toLocaleString()}. Awaiting dual-control release.`,
    };
  },

  releasePayment: (paymentId, releaserName = "Adebayo Okonjo (CFO)", mode = "complete") => {
    const state = get();
    const payment = state.payments.find((p) => p.id === paymentId);
    if (!payment) return { ok: false, message: "Payment not found." };
    if (payment.status === "COMPLETED") {
      return { ok: false, message: "Payment has already been released and completed." };
    }

    const providerRef = `NIP-${Date.now().toString().slice(-8)}`;
    const attemptStatus =
      mode === "complete" ? "SUCCESS" : mode === "awaiting_webhook" ? "PENDING" : "FAILED";
    const newAttempt: DemoPaymentAttempt = {
      id: `att_${Date.now()}`,
      attemptNumber: (payment.attempts?.length || 0) + 1,
      timestamp: "Just now",
      method: payment.method,
      fundingAccount: payment.fundingAccount,
      status: attemptStatus,
      providerRef,
      failureReason:
        mode === "simulate_failure"
          ? "NIBSS central switch returned network error (Code 91) — bank retry eligible"
          : undefined,
    };

    const nextPaymentStatus =
      mode === "complete"
        ? "COMPLETED"
        : mode === "awaiting_webhook"
        ? "AWAITING_CONFIRMATION"
        : "FAILED";

    const allocMap = new Map(payment.allocations.map((a) => [a.billId, a.amount]));
    const nextJournals = [...state.journals];
    const nextBankLines = [...state.bankLines];

    if (mode === "complete") {
      nextJournals.unshift({
        id: `jrn_${Date.now()}`,
        date: "2026-11-19",
        stage: "Payment Settlement",
        sourceRef: payment.paymentRef,
        memo: `Release Payment Run ${payment.paymentRef} (${payment.allocations.length} allocations)`,
        lines: [
          { account: "2000 · Accounts Payable", debit: payment.amount, credit: 0 },
          { account: `1010 · ${payment.fundingAccount}`, debit: 0, credit: payment.amount },
        ],
        status: "POSTED",
      });

      nextBankLines.unshift({
        id: `bnk_${Date.now()}`,
        date: "2026-11-19",
        description: `NIP BATCH TRF / ${payment.paymentRef}`,
        reference: providerRef,
        amount: payment.amount,
        channel: "NIP Bank Transfer",
        status: "UNMATCHED",
      });
    }

    set({
      payments: state.payments.map((p) =>
        p.id === paymentId
          ? {
              ...p,
              status: nextPaymentStatus,
              providerRef,
              releasedBy: releaserName,
              releasedAt: "Just now",
              failureReason: newAttempt.failureReason,
              attempts: [...(p.attempts || []), newAttempt],
            }
          : p,
      ),
      bills: state.bills.map((b) => {
        const allocated = allocMap.get(b.id);
        if (!allocated) return b;
        if (mode === "simulate_failure") {
          return { ...b, paymentStatus: "FAILED" };
        }
        if (mode === "awaiting_webhook") {
          return { ...b, paymentStatus: "AWAITING_CONFIRMATION" };
        }
        const nextPaid = b.paidAmount + allocated;
        const nextOutstanding = Math.max(0, b.originalAmount - b.creditApplied - nextPaid);
        return {
          ...b,
          paidAmount: nextPaid,
          outstandingAmount: nextOutstanding,
          paymentStatus: nextOutstanding === 0 ? "PAID" : "PARTIALLY_PAID",
          reconciliationStatus: "PENDING",
          timeline: [
            ...b.timeline,
            {
              id: `tl_${Date.now()}`,
              timestamp: "Just now",
              actor: releaserName,
              action: `Dual-Control Payment Released (${payment.paymentRef})`,
              detail: `Dispatched ₦${allocated.toLocaleString()} via NIBSS NIP · Settlement reference: ${providerRef}`,
              kind: "success",
            },
          ],
        };
      }),
      journals: nextJournals,
      bankLines: nextBankLines,
    });

    return {
      ok: true,
      message:
        mode === "complete"
          ? `${payment.paymentRef} released by ${releaserName}. Dispatched ₦${payment.amount.toLocaleString()} successfully.`
          : mode === "awaiting_webhook"
          ? `${payment.paymentRef} dispatched. Awaiting bank confirmation callback.`
          : `${payment.paymentRef} failed during gateway transmission. Available to retry.`,
    };
  },

  recordExternalPayment: ({ billId, amount, paymentDate, reference, proofFileName, memo }) => {
    const state = get();
    const bill = state.bills.find((b) => b.id === billId);
    if (!bill) return { ok: false, message: "Bill not found." };
    if (amount <= 0 || amount > bill.outstandingAmount) {
      return { ok: false, message: "Invalid payment amount." };
    }

    const paymentId = `pay_ext_${Date.now()}`;
    const paymentRef = `EXT-${reference.trim().toUpperCase()}`;
    const nextPaid = bill.paidAmount + amount;
    const nextOutstanding = Math.max(0, bill.originalAmount - bill.creditApplied - nextPaid);

    const newPayment: DemoPayment = {
      id: paymentId,
      paymentRef,
      vendorId: bill.vendorId,
      vendorName: bill.vendorName,
      method: "EXTERNAL_RECORD",
      fundingAccount: "Direct Bank Portal / Manual Wire",
      amount,
      currency: "NGN",
      scheduledDate: paymentDate,
      status: "COMPLETED",
      providerRef: reference.trim(),
      externalProofFileName: proofFileName || "corporate_bank_debit_advice.pdf",
      releasedBy: "Finance Officer (Manual Entry)",
      releasedAt: "Just now",
      allocations: [
        {
          billId: bill.id,
          billNumber: bill.billNumber,
          invoiceNumber: bill.invoiceNumber,
          amount,
        },
      ],
      attempts: [
        {
          id: `att_${Date.now()}`,
          attemptNumber: 1,
          timestamp: "Just now",
          method: "EXTERNAL_RECORD",
          fundingAccount: "Direct Corporate Banking Portal",
          status: "SUCCESS",
          providerRef: reference.trim(),
        },
      ],
    };

    const journal: DemoJournalEntry = {
      id: `jrn_${Date.now()}`,
      date: paymentDate,
      stage: "Payment Settlement",
      sourceRef: paymentRef,
      memo: memo?.trim() || `Manual external settlement for ${bill.billNumber} (${bill.vendorName})`,
      lines: [
        { account: "2000 · Accounts Payable", debit: amount, credit: 0 },
        { account: "1010 · Corporate Treasury Wire Account", debit: 0, credit: amount },
      ],
      status: "POSTED",
    };

    set({
      payments: [newPayment, ...state.payments],
      bills: state.bills.map((b) =>
        b.id === billId
          ? {
              ...b,
              paidAmount: nextPaid,
              outstandingAmount: nextOutstanding,
              paymentStatus: nextOutstanding === 0 ? "PAID" : "PARTIALLY_PAID",
              reconciliationStatus: "PENDING",
              timeline: [
                ...b.timeline,
                {
                  id: `tl_${Date.now()}`,
                  timestamp: "Just now",
                  actor: "Finance Officer",
                  action: `Recorded External Settlement (${paymentRef})`,
                  detail: `₦${amount.toLocaleString()} paid outside Villeto (Ref: ${reference.trim()}) · Proof attached`,
                  kind: "success",
                },
              ],
            }
          : b,
      ),
      journals: [journal, ...state.journals],
    });

    return {
      ok: true,
      message: `External settlement of ₦${amount.toLocaleString()} recorded for ${bill.billNumber}.`,
    };
  },

  initiateBillPayment: ({ billId, amount, fundingAccount, mode }) => {
    const state = get();
    const bill = state.bills.find((b) => b.id === billId);
    if (!bill) return { ok: false, message: "Bill not found." };
    if (bill.approvalStatus !== "APPROVED") {
      return { ok: false, message: "Bill must be APPROVED before releasing payment." };
    }

    const vendor = state.vendors.find((v) => v.id === bill.vendorId);
    if (vendor?.pendingBankChange) {
      return {
        ok: false,
        message: `Dual-Control Hold: ${vendor.name} has an unverified bank account change. Approve or keep verified bank details first.`,
      };
    }

    if (amount <= 0 || amount > bill.outstandingAmount) {
      return { ok: false, message: "Invalid payment allocation amount." };
    }

    const paymentId = `pay_${Date.now()}`;
    const paymentRef = `PAY-2026-${Math.floor(450 + Math.random() * 500)}`;
    const providerRef = `NIP-${Date.now().toString().slice(-8)}`;

    const paymentStatus: DemoPayment["status"] =
      mode === "complete"
        ? "COMPLETED"
        : mode === "awaiting_webhook"
        ? "AWAITING_CONFIRMATION"
        : "FAILED";

    const newPayment: DemoPayment = {
      id: paymentId,
      paymentRef,
      vendorId: bill.vendorId,
      vendorName: bill.vendorName,
      method: "BANK_TRANSFER",
      fundingAccount,
      amount,
      currency: "NGN",
      scheduledDate: "2026-11-19",
      status: paymentStatus,
      providerRef,
      releasedBy: "Chidi Okafor (Finance Controller)",
      releasedAt: "Just now",
      failureReason:
        mode === "simulate_failure"
          ? "Beneficiary bank rejected NIBSS credit (Invalid Name Match) — bill balance retained"
          : undefined,
      allocations: [
        {
          billId: bill.id,
          billNumber: bill.billNumber,
          invoiceNumber: bill.invoiceNumber,
          amount,
        },
      ],
      attempts: [
        {
          id: `att_${Date.now()}`,
          attemptNumber: 1,
          timestamp: "Just now",
          method: "BANK_TRANSFER",
          fundingAccount,
          status:
            mode === "complete" ? "SUCCESS" : mode === "awaiting_webhook" ? "PENDING" : "FAILED",
          providerRef,
          failureReason:
            mode === "simulate_failure"
              ? "Beneficiary bank rejected NIBSS credit (Invalid Name Match)"
              : undefined,
        },
      ],
    };

    const nextPaid = mode === "complete" ? bill.paidAmount + amount : bill.paidAmount;
    const nextOutstanding = Math.max(
      0,
      bill.originalAmount - bill.creditApplied - nextPaid,
    );
    const nextBillPayStatus: DemoBill["paymentStatus"] =
      mode === "simulate_failure"
        ? "FAILED"
        : mode === "awaiting_webhook"
        ? "AWAITING_CONFIRMATION"
        : nextOutstanding === 0
        ? "PAID"
        : "PARTIALLY_PAID";

    const nextJournals = [...state.journals];
    const nextBankLines = [...state.bankLines];

    if (mode === "complete") {
      nextJournals.unshift({
        id: `jrn_${Date.now()}`,
        date: "2026-11-19",
        stage: "Payment Settlement",
        sourceRef: paymentRef,
        memo: `Settle AP ${bill.billNumber} to ${bill.vendorName}`,
        lines: [
          { account: "2000 · Accounts Payable", debit: amount, credit: 0 },
          { account: `1010 · ${fundingAccount}`, debit: 0, credit: amount },
        ],
        status: "POSTED",
      });
      nextBankLines.unshift({
        id: `bnk_${Date.now()}`,
        date: "2026-11-19",
        description: `NIP TRF ${bill.vendorName.toUpperCase()} / ${bill.invoiceNumber}`,
        reference: providerRef,
        amount,
        channel: "NIP Bank Transfer",
        status: "UNMATCHED",
      });
    }

    set({
      payments: [newPayment, ...state.payments],
      bills: state.bills.map((b) =>
        b.id === billId
          ? {
              ...b,
              paidAmount: nextPaid,
              outstandingAmount: nextOutstanding,
              paymentStatus: nextBillPayStatus,
              reconciliationStatus: mode === "complete" ? "PENDING" : b.reconciliationStatus,
              timeline: [
                ...b.timeline,
                {
                  id: `tl_${Date.now()}`,
                  timestamp: "Just now",
                  actor: "Payment Service",
                  action:
                    mode === "complete"
                      ? `Payment ${paymentRef} completed (₦${amount.toLocaleString()})`
                      : mode === "awaiting_webhook"
                      ? `Payment ${paymentRef} AWAITING_CONFIRMATION (webhook delayed)`
                      : `Payment ${paymentRef} FAILED — safe to inspect & retry`,
                  detail: `Remaining balance: ₦${nextOutstanding.toLocaleString()}`,
                  kind:
                    mode === "complete"
                      ? "success"
                      : mode === "awaiting_webhook"
                      ? "warning"
                      : "danger",
                },
              ],
            }
          : b,
      ),
      journals: nextJournals,
      bankLines: nextBankLines,
    });

    return {
      ok: true,
      message: `${paymentRef} -> ${paymentStatus}`,
    };
  },

  queryProviderStatus: (paymentId, outcome) => {
    const state = get();
    const payment = state.payments.find((p) => p.id === paymentId);
    if (!payment) return;

    const allocIds = new Set(payment.allocations.map((a) => a.billId));
    const nextJournals = [...state.journals];
    const nextBankLines = [...state.bankLines];

    if (outcome === "COMPLETED") {
      nextJournals.unshift({
        id: `jrn_${Date.now()}`,
        date: "2026-11-19",
        stage: "Payment Settlement",
        sourceRef: payment.paymentRef,
        memo: `Confirmed provider settlement for ${payment.vendorName}`,
        lines: [
          { account: "2000 · Accounts Payable", debit: payment.amount, credit: 0 },
          { account: `1010 · ${payment.fundingAccount}`, debit: 0, credit: payment.amount },
        ],
        status: "POSTED",
      });
      nextBankLines.unshift({
        id: `bnk_${Date.now()}`,
        date: "2026-11-19",
        description: `NIP TRF ${payment.vendorName.toUpperCase()} / ${payment.paymentRef}`,
        reference: payment.providerRef || payment.paymentRef,
        amount: payment.amount,
        channel: "NIP Bank Transfer",
        status: "UNMATCHED",
      });
    }

    set({
      payments: state.payments.map((p) =>
        p.id === paymentId
          ? {
              ...p,
              status: outcome,
              failureReason:
                outcome === "FAILED"
                  ? "Provider confirmed transfer reversed — safe to initiate retry."
                  : undefined,
            }
          : p,
      ),
      bills: state.bills.map((b) => {
        if (!allocIds.has(b.id)) return b;
        if (outcome === "FAILED") {
          return { ...b, paymentStatus: "FAILED" };
        }
        const paidNow = b.paidAmount + payment.amount;
        const outstanding = Math.max(0, b.originalAmount - b.creditApplied - paidNow);
        return {
          ...b,
          paidAmount: paidNow,
          outstandingAmount: outstanding,
          paymentStatus: outstanding === 0 ? "PAID" : "PARTIALLY_PAID",
          reconciliationStatus: "PENDING",
        };
      }),
      journals: nextJournals,
      bankLines: nextBankLines,
    });
  },

  retryFailedPayment: (paymentId) => {
    const state = get();
    const payment = state.payments.find((p) => p.id === paymentId);
    if (!payment) return;

    const allocIds = new Set(payment.allocations.map((a) => a.billId));
    const newProviderRef = `NIP-${Date.now().toString().slice(-8)}`;
    const retryAttempt: DemoPaymentAttempt = {
      id: `att_${Date.now()}`,
      attemptNumber: (payment.attempts?.length || 0) + 1,
      timestamp: "Just now",
      method: payment.method,
      fundingAccount: payment.fundingAccount,
      status: "SUCCESS",
      providerRef: newProviderRef,
    };

    set({
      payments: state.payments.map((p) =>
        p.id === paymentId
          ? {
              ...p,
              status: "COMPLETED",
              failureReason: undefined,
              providerRef: newProviderRef,
              attempts: [...(p.attempts || []), retryAttempt],
            }
          : p,
      ),
      bills: state.bills.map((b) => {
        if (!allocIds.has(b.id)) return b;
        const paidNow = b.paidAmount + payment.amount;
        const outstanding = Math.max(0, b.originalAmount - b.creditApplied - paidNow);
        return {
          ...b,
          paidAmount: paidNow,
          outstandingAmount: outstanding,
          paymentStatus: outstanding === 0 ? "PAID" : "PARTIALLY_PAID",
          reconciliationStatus: "PENDING",
        };
      }),
      bankLines: [
        {
          id: `bnk_${Date.now()}`,
          date: "2026-11-19",
          description: `NIP RETRY ${payment.vendorName.toUpperCase()} / ${payment.paymentRef}`,
          reference: payment.providerRef || payment.paymentRef,
          amount: payment.amount,
          channel: "NIP Bank Transfer",
          status: "UNMATCHED",
        },
        ...state.bankLines,
      ],
    });
  },

  approveVendorBankChange: (vendorId) => {
    set((state) => ({
      vendors: state.vendors.map((v) => {
        if (v.id !== vendorId || !v.pendingBankChange) return v;
        return {
          ...v,
          verifiedBankName: v.pendingBankChange.newBankName,
          verifiedAccountNumber: v.pendingBankChange.newAccountNumber,
          pendingBankChange: null,
        };
      }),
    }));
  },

  reconcileBankLine: (bankLineId, targetType, targetId) => {
    const state = get();
    const bankLine = state.bankLines.find((l) => l.id === bankLineId);
    if (!bankLine) return;

    if (targetType === "ap_payment") {
      const pay = state.payments.find((p) => p.id === targetId);
      const allocBillIds = new Set(pay?.allocations.map((a) => a.billId) || []);
      set({
        bankLines: state.bankLines.map((l) =>
          l.id === bankLineId
            ? { ...l, status: "MATCHED", matchedRecordType: "ap_payment", matchedRecordId: targetId }
            : l,
        ),
        payments: state.payments.map((p) =>
          p.id === targetId ? { ...p, reconciledBankTxId: bankLineId } : p,
        ),
        bills: state.bills.map((b) =>
          allocBillIds.has(b.id) ? { ...b, reconciliationStatus: "RECONCILED" } : b,
        ),
      });
    } else {
      set({
        bankLines: state.bankLines.map((l) =>
          l.id === bankLineId
            ? { ...l, status: "MATCHED", matchedRecordType: "card_expense", matchedRecordId: targetId }
            : l,
        ),
        companyCardExpenses: state.companyCardExpenses.map((tx) =>
          tx.id === targetId
            ? { ...tx, reconciliationStatus: "RECONCILED", reconciledBankTxId: bankLineId }
            : tx,
        ),
      });
    }
  },

  submitVendorPortalInvoice: (input) => {
    const state = get();
    const vendor = state.vendors.find((v) => v.id === input.vendorId);
    if (!vendor) return { ok: false, message: "Vendor not found." };

    const normalized = input.invoiceNumber.trim().toLowerCase();
    const existingDup = state.bills.find(
      (b) =>
        b.vendorId === input.vendorId &&
        b.invoiceNumber.trim().toLowerCase() === normalized,
    );

    const isPo = input.supportType === "po_backed";
    const orderedQty = Math.max(1, input.orderedQty ?? 10);
    const receivedQty = Math.max(0, input.receivedQty ?? orderedQty);
    const invoicedQty = Math.max(1, input.invoicedQty ?? orderedQty);
    const hasQtyMismatch = isPo && invoicedQty > receivedQty;
    const exceptionHold = Boolean(existingDup) || hasQtyMismatch;

    const id = `bill_vp_${Date.now()}`;
    const billNumber = `BILL-2026-${Math.floor(300 + Math.random() * 680)}`;
    const poNumber = input.poNumber?.trim() || "PO-1794469015843-317";
    const grNumber = `GR-2026-${Math.floor(110 + Math.random() * 880)}`;
    const unitPrice = invoicedQty > 0 ? Math.round(input.amount / invoicedQty) : input.amount;

    const timeline = [
      {
        id: `tl_${Date.now()}_1`,
        timestamp: "Just now",
        actor: `${vendor.name} (Vendor Portal)`,
        action: `Supplier submitted invoice ${input.invoiceNumber.trim()} for ₦${input.amount.toLocaleString()}`,
        detail: input.notes?.trim()
          ? input.notes.trim()
          : isPo
          ? `Linked to Purchase Order ${poNumber}`
          : "Direct service invoice (No PO)",
        kind: "info" as const,
      },
      {
        id: `tl_${Date.now()}_2`,
        timestamp: "Just now",
        actor: "Villeto Duplicate & Compliance Gate",
        action: existingDup
          ? `Duplicate invoice detected (${existingDup.billNumber})`
          : "Duplicate & supplier verification passed",
        detail: existingDup
          ? "Placed on hold pending Finance review"
          : `Verified vendor bank: ${vendor.verifiedBankName}`,
        kind: existingDup ? ("danger" as const) : ("success" as const),
      },
    ];

    if (isPo) {
      timeline.push({
        id: `tl_${Date.now()}_3`,
        timestamp: "Just now",
        actor: "3-Way PO Matching Check",
        action: hasQtyMismatch
          ? `Held: Invoiced ${invoicedQty} units > Received ${receivedQty} units`
          : `3-Way Match Passed (${orderedQty} PO · ${receivedQty} Received · ${invoicedQty} Billed)`,
        detail: hasQtyMismatch
          ? `Ordered ${orderedQty}, Goods Receipt ${grNumber} confirmed ${receivedQty} units`
          : `Verified against ${poNumber} & ${grNumber}`,
        kind: hasQtyMismatch ? ("danger" as const) : ("success" as const),
      });
    }

    const newBill: DemoBill = {
      id,
      billNumber,
      invoiceNumber: input.invoiceNumber.trim(),
      vendorId: vendor.id,
      vendorName: vendor.name,
      entityName: "Villeto Nigeria Ltd",
      department: input.department,
      category: input.category,
      glAccount: input.glAccount,
      supportType: isPo ? "po_backed" : "non_po",
      source: "vendor_portal",
      sourceChannelLabel: "Vendor Portal",
      invoiceDate: "2026-11-19",
      dueDate: input.dueDate,
      currency: "NGN",
      originalAmount: input.amount,
      creditApplied: 0,
      paidAmount: 0,
      outstandingAmount: input.amount,
      approvalStatus: "PENDING_APPROVAL",
      matchingStatus: exceptionHold ? "EXCEPTION_HOLD" : isPo ? "MATCHED" : "NOT_APPLICABLE",
      paymentStatus: "UNPAID",
      reconciliationStatus: "NOT_STARTED",
      duplicateWarning: existingDup
        ? `Possible duplicate of ${existingDup.billNumber} (${existingDup.invoiceNumber})`
        : undefined,
      poReference: isPo
        ? {
            poNumber,
            grNumber,
            lines: [
              {
                id: `line_${Date.now()}`,
                itemName: `${input.category} Supply (${poNumber})`,
                unitPrice,
                poOrderedQty: orderedQty,
                grAcceptedQty: receivedQty,
                grRejectedQty: Math.max(0, orderedQty - receivedQty),
                invoicedQty,
              },
            ],
          }
        : undefined,
      timeline,
    };

    set({ bills: [newBill, ...state.bills], isEmptyMode: false });

    return {
      ok: true,
      duplicate: Boolean(existingDup),
      exceptionHold,
      billId: id,
      billNumber,
      message: exceptionHold
        ? `${billNumber} landed in Standard Bills on Exception Hold (${existingDup ? "duplicate check" : "qty billed exceeds delivery"}).`
        : `${billNumber} passed checks and landed in Standard Bills ready for Finance approval.`,
    };
  },

  createChannelIntake: (input) => {
    const state = get();
    const vendor = state.vendors.find((v) => v.id === input.vendorId);
    if (!vendor) return { ok: false, message: "Vendor not found." };

    const intakeId = `int_${Date.now()}`;
    const defaultSender =
      input.channel === "whatsapp"
        ? "WhatsApp Bot (+234 803 555 0142)"
        : input.channel === "email_ocr"
        ? `Email Inbox (ap@villeto.ng) · billing@${vendor.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10)}.com`
        : `${vendor.name} Vendor Portal`;

    const newIntake: DemoChannelIntake = {
      id: intakeId,
      channel: input.channel,
      senderLabel: input.senderLabel?.trim() || defaultSender,
      vendorId: vendor.id,
      vendorName: vendor.name,
      invoiceNumber: input.invoiceNumber.trim(),
      amount: input.amount,
      description: input.description.trim(),
      receivedAt: "Just now",
      poNumber: input.poNumber?.trim() || undefined,
      status: "pending_review",
    };

    set({ intakes: [newIntake, ...state.intakes], isEmptyMode: false });
    return {
      ok: true,
      intakeId,
      message: `Received ${input.invoiceNumber.trim()} via ${getSourceChannelLabel(input.channel)} in Intake Inbox.`,
    };
  },

  convertIntakeToBill: (intakeId, mode, options) => {
    const state = get();
    const intake = state.intakes.find((i) => i.id === intakeId);
    if (!intake) return { ok: false, message: "Intake message not found." };
    const vendor = state.vendors.find((v) => v.id === intake.vendorId);
    if (!vendor) return { ok: false, message: "Vendor not found." };

    const normalized = intake.invoiceNumber.trim().toLowerCase();
    const existingDup = state.bills.find(
      (b) =>
        b.vendorId === intake.vendorId &&
        b.invoiceNumber.trim().toLowerCase() === normalized,
    );

    const billId = `bill_in_${Date.now()}`;
    const billNumber = `BILL-2026-${Math.floor(400 + Math.random() * 580)}`;
    const channelLabel = getSourceChannelLabel(intake.channel);

    if (mode === "recurring_match") {
      const schedule =
        (options?.scheduleId &&
          state.schedules.find((s) => s.id === options.scheduleId)) ||
        state.schedules.find((s) => s.vendorId === intake.vendorId) ||
        state.schedules[0];

      const expected = schedule?.expectedAmount ?? intake.amount;
      const variancePct = expected > 0 ? ((intake.amount - expected) / expected) * 100 : 0;
      const absVar = Math.abs(variancePct);
      const varianceOutcome: "within_tolerance" | "finance_review" | "renewed_approval" =
        absVar > 15 ? "renewed_approval" : absVar > 5 ? "finance_review" : "within_tolerance";
      const exceptionHold = Boolean(existingDup) || varianceOutcome !== "within_tolerance";
      const autoApprove =
        !exceptionHold && schedule?.approvalMode === "auto_within_tolerance";

      const newBill: DemoBill = {
        id: billId,
        billNumber,
        invoiceNumber: intake.invoiceNumber,
        vendorId: vendor.id,
        vendorName: vendor.name,
        entityName: "Villeto Nigeria Ltd",
        department: schedule?.department || options?.department || "Administration",
        category: schedule?.category || options?.category || vendor.category,
        glAccount: schedule?.glAccount || options?.glAccount || "6210 · Bandwidth & Fiber",
        supportType: "non_po",
        source: intake.channel,
        sourceChannelLabel: `${channelLabel} · Matched to Recurring`,
        invoiceDate: "2026-11-19",
        dueDate: "2026-12-03",
        currency: "NGN",
        originalAmount: intake.amount,
        creditApplied: 0,
        paidAmount: 0,
        outstandingAmount: intake.amount,
        approvalStatus: autoApprove ? "APPROVED" : "PENDING_APPROVAL",
        matchingStatus: exceptionHold ? "EXCEPTION_HOLD" : "MATCHED",
        paymentStatus: "UNPAID",
        reconciliationStatus: "NOT_STARTED",
        ocrConfidence: intake.channel === "vendor_portal" ? undefined : 0.97,
        duplicateWarning: existingDup
          ? `Possible duplicate of ${existingDup.billNumber} (${existingDup.invoiceNumber})`
          : undefined,
        recurringScheduleId: schedule?.id,
        timeline: [
          {
            id: `tl_${Date.now()}_1`,
            timestamp: "Just now",
            actor: intake.senderLabel,
            action: `Received invoice ${intake.invoiceNumber} via ${channelLabel}`,
            detail: intake.description,
            kind: "info",
          },
          {
            id: `tl_${Date.now()}_2`,
            timestamp: "Just now",
            actor: "Recurring Matcher",
            action: schedule
              ? `Matched to recurring schedule: ${schedule.name}`
              : "Classified as Recurring Vendor Bill",
            detail: schedule
              ? `Expected ₦${expected.toLocaleString()}, Received ₦${intake.amount.toLocaleString()} (${variancePct >= 0 ? "+" : ""}${variancePct.toFixed(1)}% variance)`
              : "Linked as recurring obligation",
            kind: exceptionHold ? "warning" : "success",
          },
        ],
      };

      const nextOccurrences = schedule
        ? [
            {
              id: `occ_${Date.now()}`,
              scheduleId: schedule.id,
              periodLabel: "Matched from Inbox",
              expectedDate: schedule.nextOccurrenceDate,
              expectedAmount: schedule.expectedAmount,
              actualAmount: intake.amount,
              variancePercent: Number(variancePct.toFixed(1)),
              variancePolicyOutcome: varianceOutcome,
              invoiceAttached: true,
              billId,
              status: (varianceOutcome === "within_tolerance"
                ? "BILL_CREATED"
                : "VARIANCE_HOLD") as DemoRecurringOccurrence["status"],
            },
            ...state.occurrences,
          ]
        : state.occurrences;

      set({
        bills: [newBill, ...state.bills],
        occurrences: nextOccurrences,
        intakes: state.intakes.map((i) =>
          i.id === intakeId ? { ...i, status: "converted", convertedBillId: billId } : i,
        ),
        isEmptyMode: false,
      });

      return {
        ok: true,
        billId,
        billNumber,
        duplicate: Boolean(existingDup),
        exceptionHold,
        message: `${billNumber} matched to ${schedule?.name || "Recurring Schedule"} and added to Bills.`,
      };
    }

    const isPo = mode === "standard_po";
    const poNumber = options?.poNumber?.trim() || intake.poNumber || "PO-1794469015843-317";
    const newBill: DemoBill = {
      id: billId,
      billNumber,
      invoiceNumber: intake.invoiceNumber,
      vendorId: vendor.id,
      vendorName: vendor.name,
      entityName: "Villeto Nigeria Ltd",
      department: options?.department || (isPo ? "Engineering" : "Administration"),
      category: options?.category || vendor.category,
      glAccount:
        options?.glAccount ||
        (isPo ? "1520 · Computer Hardware" : "6100 · Operating Expense"),
      supportType: isPo ? "po_backed" : "non_po",
      source: intake.channel,
      sourceChannelLabel: channelLabel,
      invoiceDate: "2026-11-19",
      dueDate: "2026-12-03",
      currency: "NGN",
      originalAmount: intake.amount,
      creditApplied: 0,
      paidAmount: 0,
      outstandingAmount: intake.amount,
      approvalStatus: "PENDING_APPROVAL",
      matchingStatus: existingDup ? "EXCEPTION_HOLD" : isPo ? "MATCHED" : "NOT_APPLICABLE",
      paymentStatus: "UNPAID",
      reconciliationStatus: "NOT_STARTED",
      ocrConfidence: intake.channel === "vendor_portal" ? undefined : 0.96,
      duplicateWarning: existingDup
        ? `Possible duplicate of ${existingDup.billNumber} (${existingDup.invoiceNumber})`
        : undefined,
      poReference: isPo
        ? {
            poNumber,
            grNumber: `GR-2026-${Math.floor(110 + Math.random() * 880)}`,
            lines: [
              {
                id: `line_${Date.now()}`,
                itemName: intake.description || `${vendor.category} PO Delivery`,
                unitPrice: intake.amount,
                poOrderedQty: 2,
                grAcceptedQty: 2,
                grRejectedQty: 0,
                invoicedQty: 2,
              },
            ],
          }
        : undefined,
      timeline: [
        {
          id: `tl_${Date.now()}_1`,
          timestamp: "Just now",
          actor: intake.senderLabel,
          action: `Received invoice ${intake.invoiceNumber} via ${channelLabel}`,
          detail: intake.description,
          kind: "info",
        },
        {
          id: `tl_${Date.now()}_2`,
          timestamp: "Just now",
          actor: "AP Classification",
          action: isPo
            ? `Converted to PO-Backed Standard Bill (${poNumber})`
            : "Converted to Standard Non-PO Bill (One-Time)",
          detail: existingDup
            ? `Duplicate warning flagged against ${existingDup.billNumber}`
            : "Duplicate check passed · Routed for Finance approval",
          kind: existingDup ? "danger" : "success",
        },
      ],
    };

    set({
      bills: [newBill, ...state.bills],
      intakes: state.intakes.map((i) =>
        i.id === intakeId ? { ...i, status: "converted", convertedBillId: billId } : i,
      ),
      isEmptyMode: false,
    });

    return {
      ok: true,
      billId,
      billNumber,
      duplicate: Boolean(existingDup),
      exceptionHold: Boolean(existingDup),
      message: `${billNumber} created from ${channelLabel} and placed in Standard Bills.`,
    };
  },

  setCurrentDemoRole: (roleKey) => {
    set({ currentDemoRole: roleKey });
  },

  addAuditLogEntry: (entry) => {
    const newLog: DemoAuditEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      ...entry,
    };
    set((state) => ({
      auditLogs: [newLog, ...(state.auditLogs || [])],
    }));
  },

  updateVendorStatus: (vendorId, status) => {
    const state = get();
    const vendor = state.vendors.find((v) => v.id === vendorId);
    if (!vendor) return;
    set((s) => ({
      vendors: s.vendors.map((v) => (v.id === vendorId ? { ...v, status } : v)),
    }));
    get().addAuditLogEntry({
      actor: "Compliance Officer",
      actorRole: "Governance",
      action: "VENDOR_STATUS_UPDATED",
      entityType: "VENDOR",
      entityReference: vendor.name,
      details: `Vendor status changed from ${vendor.status} to ${status}.`,
      status: "SUCCESS",
    });
  },

  onboardVendor: (input) => {
    const vendorId = `vnd_${Date.now()}`;
    const newVendor: DemoVendor = {
      id: vendorId,
      name: input.name,
      category: input.category,
      portalStatus: "directory_only",
      status: "approved",
      verifiedBankName: input.verifiedBankName,
      verifiedAccountNumber: input.verifiedAccountNumber,
      pendingBankChange: null,
      taxId: input.taxId || `TIN-${Math.floor(10000000 + Math.random() * 89999999)}-0001`,
      contactEmail: input.contactEmail || `billing@${input.name.toLowerCase().replace(/[^a-z]/g, "")}.ng`,
      complianceRating: "A",
    };
    set((s) => ({
      vendors: [newVendor, ...s.vendors],
    }));
    get().addAuditLogEntry({
      actor: "Procurement / Compliance",
      actorRole: "Governance",
      action: "VENDOR_ONBOARDED",
      entityType: "VENDOR",
      entityReference: newVendor.name,
      details: `New supplier registered with verified ${newVendor.verifiedBankName} account (${newVendor.verifiedAccountNumber}) and TIN ${newVendor.taxId}.`,
      status: "SUCCESS",
    });
    return { ok: true, vendorId };
  },
}));
