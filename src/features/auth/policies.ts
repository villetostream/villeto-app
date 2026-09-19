import type {
  AuthorizationCapabilityGrant,
  AuthorizationSnapshot,
  CapabilityScopeType,
} from "./types";

export type ApiListScope = "own" | "team" | "company";

export const CAPABILITIES = {
  purchaseRequest: {
    requester: "purchase_request_requester",
    viewer: "purchase_request_viewer",
    approver: "purchase_request_approver",
    buyer: "procurement_buyer",
  },
  purchaseOrder: {
    viewer: "purchase_order_viewer",
    buyer: "procurement_buyer",
    editor: "purchase_order_editor",
    approver: "purchase_order_approver",
    lifecycle: "purchase_order_lifecycle_manager",
    receiver: "purchase_order_receiver",
  },
  expense: {
    submitter: "expense_submitter",
    viewer: "expense_viewer",
    approver: "expense_approver",
    manager: "expense_company_manager",
  },
} as const;

export const PERMISSIONS = {
  people: {
    directoryRead: "user.directory.read",
    userManage: "user.manage",
    departmentRead: "department.read_company",
    departmentManage: "department.manage",
    roleManage: "role.manage",
  },
  legalEntity: {
    view: "legal_entity.view",
    manage: "legal_entity.manage",
    assignmentView: "legal_entity.assignment.view",
    assignmentManage: "legal_entity.assignment.manage",
  },
  vendor: {
    directoryRead: "vendor.directory.read",
    sensitiveRead: "vendor.sensitive.read",
    companyRead: "vendor.read_company",
    create: "vendor.create",
    invite: "vendor.invite",
    review: "vendor.review",
    approve: "vendor.approve",
    reject: "vendor.reject",
    activate: "vendor.activate",
    deactivate: "vendor.deactivate",
    delete: "vendor.delete",
  },
  purchaseRequest: {
    create: "procurement.purchase_request.create",
    submit: "procurement.purchase_request.submit",
    readOwn: "procurement.purchase_request.read_own",
    readDepartment: "procurement.purchase_request.read_department",
    readCompany: "procurement.purchase_request.read_company",
    updateOwnDraft: "procurement.purchase_request.update_own_draft",
    deleteOwnDraft: "procurement.purchase_request.delete_own_draft",
    cancelOwn: "procurement.purchase_request.cancel_own",
    approve: "procurement.purchase_request.approve_department",
    reject: "procurement.purchase_request.reject_department",
    convertToPurchaseOrder: "procurement.purchase_request.convert_to_po",
  },
  purchaseOrder: {
    create: "procurement.purchase_order.create",
    readOwn: "procurement.purchase_order.read_own",
    readDepartment: "procurement.purchase_order.read_department",
    readCompany: "procurement.purchase_order.read_company",
    updateDraft: "procurement.purchase_order.update_draft",
    assignVendor: "procurement.purchase_order.assign_vendor",
    submit: "procurement.purchase_order.submit_for_approval",
    approve: "procurement.purchase_order.approval_decision",
    issue: "procurement.purchase_order.issue",
    cancel: "procurement.purchase_order.cancel",
    close: "procurement.purchase_order.close",
    receive: "procurement.purchase_order.receive",
  },
  vendorInvoice: {
    readCompany: "procurement.vendor_invoice.read_company",
    review: "procurement.vendor_invoice.review",
    approve: "procurement.vendor_invoice.approve",
    reject: "procurement.vendor_invoice.reject",
    updatePaymentStatus: "procurement.vendor_invoice.update_payment_status",
  },
  expense: {
    create: "expense.report.create",
    submit: "expense.report.submit",
    readOwn: "expense.report.read_own",
    readDepartment: "expense.report.read_department",
    readCompany: "expense.report.read_company",
    updateOwnDraft: "expense.report.update_own_draft",
    deleteOwnDraft: "expense.report.delete_own_draft",
    cancelOwn: "expense.report.cancel_own",
    approve: "expense.report.approve_department",
    reject: "expense.report.reject_department",
    manage: "expense.report.manage",
  },
  billPay: {
    intakeCreate: "bill_pay.intake.create",
    intakeView: "bill_pay.intake.view",
    invoiceCreate: "bill_pay.invoice.create",
    invoiceView: "bill_pay.invoice.view",
    invoiceEdit: "bill_pay.invoice.edit",
    invoiceReview: "bill_pay.invoice.review",
    invoiceApprove: "bill_pay.invoice.approve",
    invoiceOverride: "bill_pay.invoice.override",
    exceptionResolve: "bill_pay.exception.resolve",
    paymentRequestView: "bill_pay.payment_request.view",
    paymentRequestCreate: "bill_pay.payment_request.create",
    paymentRequestAuthorize: "bill_pay.payment_request.authorize",
    paymentView: "bill_pay.payment.view",
    paymentSchedule: "bill_pay.payment.schedule",
    paymentInitiate: "bill_pay.payment.initiate",
    paymentCancel: "bill_pay.payment.cancel",
    paymentSensitiveView: "bill_pay.payment.view_sensitive",
    paymentRecordExternal: "bill_pay.payment.record_external",
    reconciliationView: "bill_pay.reconciliation.view",
    reconciliationManage: "bill_pay.reconciliation.manage",
    configurationView: "bill_pay.configuration.view",
    configurationManage: "bill_pay.configuration.manage",
  },
  accounting: {
    accountView: "accounting.account.view",
    journalView: "accounting.journal.view",
    journalPost: "accounting.journal.post",
    journalReverse: "accounting.journal.reverse",
    trialBalanceView: "accounting.trial_balance.view",
    configurationManage: "accounting.configuration.manage",
    periodManage: "accounting.period.manage",
  },
} as const;

const scopeRank: Record<CapabilityScopeType, number> = {
  own: 1,
  reporting_chain: 2,
  department: 2,
  company: 3,
};

export function strongestScope(grants: AuthorizationCapabilityGrant[]): CapabilityScopeType | null {
  return grants.reduce<CapabilityScopeType | null>((strongest, grant) => {
    if (!strongest || scopeRank[grant.scopeType] > scopeRank[strongest]) return grant.scopeType;
    return strongest;
  }, null);
}

export function toApiListScope(scope: CapabilityScopeType | null): ApiListScope | null {
  if (scope === "company") return "company";
  if (scope === "department" || scope === "reporting_chain") return "team";
  if (scope === "own") return "own";
  return null;
}

function has(permissionSet: Set<string>, permission: string): boolean {
  return permissionSet.has(permission);
}

function hasAny(permissionSet: Set<string>, permissions: string[]): boolean {
  return permissions.some((permission) => has(permissionSet, permission));
}

function grantsFor(snapshot: AuthorizationSnapshot | null, keys: string[]) {
  const accepted = new Set(keys);
  return (snapshot?.capabilityGrants ?? []).filter((grant) => accepted.has(grant.key));
}

export function buildAuthorizationPolicies(snapshot: AuthorizationSnapshot | null) {
  const permissionSet = new Set(snapshot?.permissions ?? []);
  const prScope = toApiListScope(strongestScope(grantsFor(snapshot, Object.values(CAPABILITIES.purchaseRequest))));
  const poScope = toApiListScope(strongestScope(grantsFor(snapshot, Object.values(CAPABILITIES.purchaseOrder))));
  const expenseScope = toApiListScope(strongestScope(grantsFor(snapshot, Object.values(CAPABILITIES.expense))));

  return {
    ready: Boolean(snapshot),
    people: {
      canViewUsers: hasAny(permissionSet, [PERMISSIONS.people.directoryRead, PERMISSIONS.people.userManage]),
      canManageUsers: has(permissionSet, PERMISSIONS.people.userManage),
      canViewDepartments: hasAny(permissionSet, [PERMISSIONS.people.departmentRead, PERMISSIONS.people.departmentManage]),
      canManageDepartments: has(permissionSet, PERMISSIONS.people.departmentManage),
      canViewRoles: has(permissionSet, PERMISSIONS.people.roleManage),
      canManageRoles: has(permissionSet, PERMISSIONS.people.roleManage),
    },
    legalEntities: {
      canView: hasAny(permissionSet, [PERMISSIONS.legalEntity.view, PERMISSIONS.legalEntity.manage]),
      canManage: has(permissionSet, PERMISSIONS.legalEntity.manage),
      canViewAssignments: hasAny(permissionSet, [
        PERMISSIONS.legalEntity.assignmentView,
        PERMISSIONS.legalEntity.assignmentManage,
      ]),
      canManageAssignments: has(permissionSet, PERMISSIONS.legalEntity.assignmentManage),
    },
    vendors: {
      canUseDirectory: hasAny(permissionSet, [PERMISSIONS.vendor.directoryRead, PERMISSIONS.vendor.companyRead]),
      canViewSensitive: hasAny(permissionSet, [PERMISSIONS.vendor.sensitiveRead, PERMISSIONS.vendor.companyRead]),
      canCreate: has(permissionSet, PERMISSIONS.vendor.create),
      canInvite: has(permissionSet, PERMISSIONS.vendor.invite),
      canReview: has(permissionSet, PERMISSIONS.vendor.review),
      canApprove: has(permissionSet, PERMISSIONS.vendor.approve),
      canReject: has(permissionSet, PERMISSIONS.vendor.reject),
      canActivate: has(permissionSet, PERMISSIONS.vendor.activate),
      canDeactivate: has(permissionSet, PERMISSIONS.vendor.deactivate),
      canDelete: has(permissionSet, PERMISSIONS.vendor.delete),
    },
    purchaseRequests: {
      listScope: prScope,
      canView: prScope !== null,
      canReadDepartment: has(permissionSet, PERMISSIONS.purchaseRequest.readDepartment),
      canReadCompany: has(permissionSet, PERMISSIONS.purchaseRequest.readCompany),
      canCreate: has(permissionSet, PERMISSIONS.purchaseRequest.create),
      canSubmit: has(permissionSet, PERMISSIONS.purchaseRequest.submit),
      canUpdateOwnDraft: has(permissionSet, PERMISSIONS.purchaseRequest.updateOwnDraft),
      canDeleteOwnDraft: has(permissionSet, PERMISSIONS.purchaseRequest.deleteOwnDraft),
      canCancelOwn: has(permissionSet, PERMISSIONS.purchaseRequest.cancelOwn),
      canApprove: has(permissionSet, PERMISSIONS.purchaseRequest.approve),
      canReject: has(permissionSet, PERMISSIONS.purchaseRequest.reject),
      canConvertToPurchaseOrder: has(permissionSet, PERMISSIONS.purchaseRequest.convertToPurchaseOrder),
    },
    purchaseOrders: {
      listScope: poScope,
      canView: poScope !== null,
      canReadDepartment: has(permissionSet, PERMISSIONS.purchaseOrder.readDepartment),
      canReadCompany: has(permissionSet, PERMISSIONS.purchaseOrder.readCompany),
      canCreate: has(permissionSet, PERMISSIONS.purchaseOrder.create),
      canUpdateDraft: has(permissionSet, PERMISSIONS.purchaseOrder.updateDraft),
      canAssignVendor: has(permissionSet, PERMISSIONS.purchaseOrder.assignVendor),
      canSubmit: has(permissionSet, PERMISSIONS.purchaseOrder.submit),
      canApprove: has(permissionSet, PERMISSIONS.purchaseOrder.approve),
      canIssue: has(permissionSet, PERMISSIONS.purchaseOrder.issue),
      canCancel: has(permissionSet, PERMISSIONS.purchaseOrder.cancel),
      canClose: has(permissionSet, PERMISSIONS.purchaseOrder.close),
      canReceive: has(permissionSet, PERMISSIONS.purchaseOrder.receive),
    },
    vendorInvoices: {
      canView: has(permissionSet, PERMISSIONS.vendorInvoice.readCompany),
      canReview: has(permissionSet, PERMISSIONS.vendorInvoice.review),
      canApprove: has(permissionSet, PERMISSIONS.vendorInvoice.approve),
      canReject: has(permissionSet, PERMISSIONS.vendorInvoice.reject),
      canUpdatePaymentStatus: has(permissionSet, PERMISSIONS.vendorInvoice.updatePaymentStatus),
    },
    expenses: {
      listScope: expenseScope,
      canView: expenseScope !== null,
      canReadDepartment: has(permissionSet, PERMISSIONS.expense.readDepartment),
      canReadCompany: has(permissionSet, PERMISSIONS.expense.readCompany),
      canCreate: has(permissionSet, PERMISSIONS.expense.create),
      canSubmit: has(permissionSet, PERMISSIONS.expense.submit),
      canUpdateOwnDraft: has(permissionSet, PERMISSIONS.expense.updateOwnDraft),
      canDeleteOwnDraft: has(permissionSet, PERMISSIONS.expense.deleteOwnDraft),
      canCancelOwn: has(permissionSet, PERMISSIONS.expense.cancelOwn),
      canApprove: hasAny(permissionSet, [PERMISSIONS.expense.approve, PERMISSIONS.expense.manage]),
      canReject: hasAny(permissionSet, [PERMISSIONS.expense.reject, PERMISSIONS.expense.manage]),
      canManageCompany: has(permissionSet, PERMISSIONS.expense.manage),
    },
    billPay: {
      canViewInvoices: hasAny(permissionSet, [PERMISSIONS.billPay.invoiceView, PERMISSIONS.billPay.intakeView]),
      canCreateIntake: has(permissionSet, PERMISSIONS.billPay.intakeCreate),
      canCreateInvoice: has(permissionSet, PERMISSIONS.billPay.invoiceCreate),
      canEditInvoice: has(permissionSet, PERMISSIONS.billPay.invoiceEdit),
      canReviewInvoice: has(permissionSet, PERMISSIONS.billPay.invoiceReview),
      canApproveInvoice: has(permissionSet, PERMISSIONS.billPay.invoiceApprove),
      canOverrideInvoice: has(permissionSet, PERMISSIONS.billPay.invoiceOverride),
      canResolveException: has(permissionSet, PERMISSIONS.billPay.exceptionResolve),
      canViewPayments: hasAny(permissionSet, [PERMISSIONS.billPay.paymentRequestView, PERMISSIONS.billPay.paymentView]),
      canPreparePayment: has(permissionSet, PERMISSIONS.billPay.paymentRequestCreate),
      canAuthorizePayment: has(permissionSet, PERMISSIONS.billPay.paymentRequestAuthorize),
      canSchedulePayment: has(permissionSet, PERMISSIONS.billPay.paymentSchedule),
      canInitiatePayment: has(permissionSet, PERMISSIONS.billPay.paymentInitiate),
      canCancelPayment: has(permissionSet, PERMISSIONS.billPay.paymentCancel),
      canViewSensitivePayment: has(permissionSet, PERMISSIONS.billPay.paymentSensitiveView),
      canRecordExternalPayment: has(permissionSet, PERMISSIONS.billPay.paymentRecordExternal),
      canViewReconciliation: has(permissionSet, PERMISSIONS.billPay.reconciliationView),
      canManageReconciliation: has(permissionSet, PERMISSIONS.billPay.reconciliationManage),
      canViewConfiguration: hasAny(permissionSet, [PERMISSIONS.billPay.configurationView, PERMISSIONS.billPay.configurationManage]),
      canManageConfiguration: has(permissionSet, PERMISSIONS.billPay.configurationManage),
    },
    accounting: {
      canView: hasAny(permissionSet, [PERMISSIONS.accounting.accountView, PERMISSIONS.accounting.journalView, PERMISSIONS.accounting.trialBalanceView]),
      canViewAccounts: has(permissionSet, PERMISSIONS.accounting.accountView),
      canViewJournals: has(permissionSet, PERMISSIONS.accounting.journalView),
      canPostJournals: has(permissionSet, PERMISSIONS.accounting.journalPost),
      canReverseJournals: has(permissionSet, PERMISSIONS.accounting.journalReverse),
      canViewTrialBalance: has(permissionSet, PERMISSIONS.accounting.trialBalanceView),
      canManageConfiguration: has(permissionSet, PERMISSIONS.accounting.configurationManage),
      canManagePeriods: has(permissionSet, PERMISSIONS.accounting.periodManage),
    },
  };
}

export type AuthorizationPolicies = ReturnType<typeof buildAuthorizationPolicies>;
