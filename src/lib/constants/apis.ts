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
    ROLES: "roles/",
    ROLES_COMPANY: "roles?type=company",
    ROLES_VILLETO: "roles?type=villeto",
    ROLE_DETAIL: (roleId: string) => `roles/${roleId}` as const,
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
    CATEGORIES: "companies/expense/categories",
    CATEGORIES_WITH_POLICIES: "companies/expense/categories?withPolicies=true",
    POLICIES: "policy",
    POLICY_BY_ID: (id: string) => `policy/${id}` as const,
    POLICY_ACTION: (id: string, action: "activate" | "deactivate") => `policy/${id}/${action}` as const,
    REPORTS: "reports/manual",
    PERSONAL_EXPENSES: "reports",
    COMPANY_REPORTS: "companies/expense/reports",
    PERSONAL_EXPENSES_DETAIL: (id: number) => `reports/${id}`,
    DELETE_REPORT: (id: string) => `reports/${id}` as const,
    DELETE_EXPENSE: (reportId: string, expenseId: string) =>
      `reports/${reportId}/expenses/${expenseId}` as const,
  },
} as const;
