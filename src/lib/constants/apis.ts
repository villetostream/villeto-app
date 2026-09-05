export const API_KEYS = {
  ONBOARDING: {
    ACCOUNT_CONFIRMATION: "onboardings/pre-fetch",
    EXISTING_ONBOARDING: "onboardings/fetch",
    START_ONBOARDING: "onboardings/start",
    ONBOARDING: "onboardings",
    ONBOARDING_COMPLETE: (id: string) => `onboardings/${id}/complete` as const,
    ONBOARDING_COMPANY_DETAILS: (id: string) =>
      `onboardings/${id}/company-details` as const,
    ONBOARDING_LEADERS: (id: string) => `onboardings/${id}/leaders` as const,
    ONBOARDING_FINANCIAL: (id: string) =>
      `onboardings/${id}/financial-pulse` as const,
    ONBOARDING_PRODUCTS: (id: string) => `onboardings/${id}/products` as const,
  },
  AUTH: {
    LOGIN: "auth/login",
    CHECK: "users/",
    PERMISSIONS: "auth/permissions/",
    PASSWORD_UPDATE: "auth/password/update",
    PASSWORD_RESET_INITIATE: "auth/password/reset/initiate",
    PASSWORD_RESET_COMPLETE: "auth/password/reset/complete",
  },
  DEPARTMENT: {
    DEPARTMENTS: "departments/",
  },
  ROLE: {
    /** Base path — always use helpers below rather than concatenating manually. */
    ROLES: "roles",
    /** GET  /roles?page=1&limit=20  (paginated list) */
    ROLES_LIST: (page: number, limit: number) => `roles?page=${page}&limit=${limit}` as const,
    /** GET  /roles?page=1&limit=100 (formerly type=company, now flat) */
    ROLES_COMPANY: (page = 1, limit = 100) => `roles?page=${page}&limit=${limit}` as const,
    /** GET  /roles/{roleId} */
    ROLE_DETAIL: (roleId: string) => `roles/${roleId}` as const,
    /** GET  /roles/capabilities?module={module} */
    ROLES_CAPABILITIES: (module: string) => `roles/capabilities?module=${module}` as const,
    /** PATCH /roles/{roleId}/capabilities */
    ROLE_CAPABILITIES: (roleId: string) => `roles/${roleId}/capabilities` as const,
  },
  USER: {
    USERS: "users/",
    INVITED_USERS: "users?invited=true",
    DIRECTORY_USERS: "users",
    SPLIT_EXPENSE_USERS: "users/directory?status=all",
    UNINVITED_USERS: "users?status=Inactive",
    INVITEUSER: "users/invite",
    ME: "users/me",
    DELETE_USER: (userId: string) => `users/${userId}` as const,
    RESEND_INVITATION: "users/invitation/resend",
    VERIFICATION: "users/invitation/verification",
    PASSWORD_SET: "users/invitation/password-set",
  },
  COMPANY: {
    BULK_IMPORT: (duplicateStrategy?: "skip_existing" | "update_existing") =>
      duplicateStrategy
        ? `companies/bulk/import?duplicateStrategy=${duplicateStrategy}` as const
        : "companies/bulk/import" as const,
    BULK_IMPORT_VALIDATE: (duplicateStrategy?: "skip_existing" | "update_existing") =>
      duplicateStrategy
        ? `companies/bulk/import/validate?duplicateStrategy=${duplicateStrategy}` as const
        : "companies/bulk/import/validate" as const,
    BULK_MANUAL: (duplicateStrategy?: "skip_existing" | "update_existing") =>
      duplicateStrategy
        ? `companies/bulk/manual?duplicateStrategy=${duplicateStrategy}` as const
        : "companies/bulk/manual" as const,
    BULK_MANUAL_VALIDATE: "companies/bulk/manual/validate",
    IMPORT_REFERENCES: (type: "job_grades" | "management_levels") => 
      `companies/bulk/import/references?type=${type}` as const,
    BULK_IMPORT_TEMPLATE: (type: "csv" | "xlsx", mode: "blank" | "current_directory") => `companies/bulk/import/template?type=${type}&mode=${mode}` as const,
    COMPANY_DETAILS: (id: string) => `companies/${id}` as const,
    EMPLOYEE_INVITES: "companies/employees/invites",
    ADMIN_INVITES: "companies/admins/invites",
    LOGO: "companies/logo",
  },
  LEGAL_ENTITY: {
    LIST: "legal-entities",
    DETAIL: (id: string) => `legal-entities/${id}` as const,
    DEFAULT: (id: string) => `legal-entities/${id}/default` as const,
    STATUS: (id: string) => `legal-entities/${id}/status` as const,
    CURRENCIES: "reference/currencies",
  },
  EXPENSE: {
    CATEGORIES: "companies/categories?module=expense",
    CATEGORY_DETAIL: (id: string) => `companies/expense/categories/${id}` as const,
    CATEGORIES_WITH_POLICIES: "companies/categories/policy-coverage?module=expense&status=active&scope=me&policyStatus=active",
    CATEGORIES_POLICY_COVERAGE_ADMIN: "companies/categories/policy-coverage?module=expense&status=all&scope=all&includeCategoriesWithoutPolicies=true",
    POLICIES: "policy",
    POLICY_BY_ID: (id: string) => `policy/${id}` as const,
    POLICY_ACTION: (id: string, action: "approve" | "reject") => `policy/${id}/${action}` as const,
    POLICY_DRAFTS: "policy/drafts",
    POLICY_DRAFT_BY_ID: (draftId: string) => `policy/drafts/${draftId}` as const,
    REPORTS: "reports/manual",
    PERSONAL_EXPENSES: "reports",
    REPORTS_SCOPED: (scope: "own" | "team" | "company") => `reports?scope=${scope}` as const,
    COMPANY_REPORTS: "companies/expense/reports",
    PERSONAL_EXPENSES_DETAIL: (id: number) => `reports/${id}`,
    DELETE_REPORT: (id: string) => `reports/${id}` as const,
    DELETE_EXPENSE: (reportId: string, expenseId: string) =>
      `reports/${reportId}/expenses/${expenseId}` as const,
  },
} as const;

export const PROCUREMENT_KEYS = {
  PURCHASE_REQUESTS: "procurement/purchase-requests",
  PURCHASE_REQUEST: (id: string) => `procurement/purchase-requests/${id}` as const,
  LINE_ITEMS: (purchaseRequestId: string) => `procurement/purchase-requests/${purchaseRequestId}/line-items` as const,
  LINE_ITEM: (purchaseRequestId: string, lineItemId: string) => `procurement/purchase-requests/${purchaseRequestId}/line-items/${lineItemId}` as const,
  SUBMIT: (id: string) => `procurement/purchase-requests/${id}/submit` as const,
  CANCEL: (id: string) => `procurement/purchase-requests/${id}/cancel` as const,
  WITHDRAW: (id: string) => `procurement/purchase-requests/${id}/cancel` as const,
  APPROVE: (id: string) => `procurement/purchase-requests/${id}/approve` as const,
  REJECT: (id: string) => `procurement/purchase-requests/${id}/reject` as const,
  CONVERT_TO_PO: (id: string) => `procurement/purchase-requests/${id}/convert-to-po` as const,
  CREATE_MULTIPLE_PO: (id: string) => `procurement/purchase-requests/${id}/purchase-orders` as const,
  CATEGORIES: "companies/categories?module=procurement",
  CATEGORY: (categoryId: string) => `companies/categories/${categoryId}` as const,
  VENDORS: "vendors",
  ACTIVE_VENDORS: "vendors?status=Active",
  // ── Purchase Order endpoints ─────────────────────────────────────────────
  PURCHASE_ORDERS: "procurement/purchase-orders",
  PURCHASE_ORDER: (id: string) => `procurement/purchase-orders/${id}` as const,
  CANCEL_PURCHASE_ORDER: (id: string) => `procurement/purchase-orders/${id}/cancel` as const,
  ISSUE_PURCHASE_ORDER: (id: string) => `procurement/purchase-orders/${id}/issue` as const,
  CLOSE_PURCHASE_ORDER: (id: string) => `procurement/purchase-orders/${id}/close` as const,
  SHORT_CLOSE_PO_LINE: (purchaseOrderId: string, purchaseOrderLineItemId: string) =>
    `procurement/purchase-orders/${purchaseOrderId}/line-items/${purchaseOrderLineItemId}/short-close` as const,
  CONFIRM_FINAL_BILLING: (id: string) =>
    `procurement/purchase-orders/${id}/finalize-billing` as const,
  /** PATCH — submit a standalone (non-PR) PO into the approval chain */
  SUBMIT_PURCHASE_ORDER: (id: string) => `procurement/purchase-orders/${id}/submit-for-approval` as const,
  /** PATCH — approve or reject a submitted PO */
  APPROVE_PURCHASE_ORDER: (id: string) => `procurement/purchase-orders/${id}/approval-decision` as const,
  /** POST — confirm physical receipt against one dispatched fulfillment */
  CONFIRM_FULFILLMENT_RECEIPT: (purchaseOrderId: string, fulfillmentId: string) =>
    `procurement/purchase-orders/${purchaseOrderId}/fulfillments/${fulfillmentId}/receipts` as const,
  /** POST — add line items to a draft (non-PR) PO */
  PO_LINE_ITEMS: (id: string) => `procurement/purchase-orders/${id}/line-items` as const,
  // ── Procurement Policy endpoints ─────────────────────────────────────────
  PROCUREMENT_POLICIES: "policy/procurement",
  PROCUREMENT_POLICY: (id: string) => `policy/procurement/${id}` as const,
  PROCUREMENT_POLICY_ACTION: (id: string, action: "approve" | "reject") => `policy/procurement/${id}/${action}` as const,
  PROCUREMENT_POLICY_DRAFTS: "policy/procurement/drafts",
  PROCUREMENT_POLICY_DRAFT_BY_ID: (draftId: string) => `policy/procurement/drafts/${draftId}` as const,
  // ── Approved Vendors (no pagination — returns all approved) ─────────────
  APPROVED_VENDORS: "vendors?approvalStatus=approved",
} as const;

export const POLICY_GOVERNANCE_KEYS = {
  /** GET  /policy/approval-settings — list all targets */
  APPROVAL_SETTINGS:         "policy/approval-settings",
  /** GET  /policy/approval-settings/:target */
  APPROVAL_SETTINGS_TARGET:  (target: string) => `policy/approval-settings/${target}` as const,
  /** PUT  /policy/approval-settings/:target */
  UPDATE_APPROVAL_SETTINGS:  (target: string) => `policy/approval-settings/${target}` as const,
  /** GET  /policy/approval-settings/eligible-roles?target=:target */
  ELIGIBLE_ROLES:            (target: string) => `policy/approval-settings/eligible-roles?target=${target}` as const,
} as const;
