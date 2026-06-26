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
    DIRECTORY_USERS: "users/",
    UNINVITED_USERS: "users?invited=false",
    INVITEUSER: "users/invite",
    ME: "users/me",
    DELETE_USER: (userId: string) => `users/${userId}` as const,
    VERIFICATION: "users/invitation/verification",
    PASSWORD_SET: "users/invitation/password-set",
  },
  COMPANY: {
    BULK_IMPORT: "companies/bulk/import",
    COMPANY_DETAILS: (id: string) => `companies/${id}` as const,
    EMPLOYEE_INVITES: "companies/employees/invites",
    ADMIN_INVITES: "companies/admins/invites",
    LOGO: "companies/logo",
  },
  EXPENSE: {
    CATEGORIES: "companies/categories?module=expense",
    CATEGORY_DETAIL: (id: string) => `companies/expense/categories/${id}` as const,
    CATEGORIES_WITH_POLICIES: "companies/categories?withPolicies=true&module=expense",
    POLICIES: "policy",
    POLICY_BY_ID: (id: string) => `policy/${id}` as const,
    POLICY_ACTION: (id: string, action: "activate" | "deactivate") => `policy/${id}/${action}` as const,
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
  VENDORS: "procurement/vendors",
  // ── Purchase Order endpoints ─────────────────────────────────────────────
  PURCHASE_ORDERS: "procurement/purchase-orders",
  PURCHASE_ORDER: (id: string) => `procurement/purchase-orders/${id}` as const,
  CANCEL_PURCHASE_ORDER: (id: string) => `procurement/purchase-orders/${id}/cancel` as const,
  ISSUE_PURCHASE_ORDER: (id: string) => `procurement/purchase-orders/${id}/issue` as const,
  CLOSE_PURCHASE_ORDER: (id: string) => `procurement/purchase-orders/${id}/close` as const,
  /** PATCH — submit a standalone (non-PR) PO into the approval chain */
  SUBMIT_PURCHASE_ORDER: (id: string) => `procurement/purchase-orders/${id}/submit-for-approval` as const,
  /** PATCH — approve or reject a submitted PO */
  APPROVE_PURCHASE_ORDER: (id: string) => `procurement/purchase-orders/${id}/approval-decision` as const,
  /** POST — confirm delivery receipt for an issued/delivered PO */
  CONFIRM_RECEIPT: (id: string) => `procurement/purchase-orders/${id}/confirm-receipt` as const,
  /** POST — add line items to a draft (non-PR) PO */
  PO_LINE_ITEMS: (id: string) => `procurement/purchase-orders/${id}/line-items` as const,
} as const;