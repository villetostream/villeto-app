/* ─────────────────────────────────────────────────────────────────────────────
   Procurement Policy — UI types aligned to the real backend API.
   All backend condition and enforcement action strings come from the Villeto
   Procurement Policy Rules documentation.
───────────────────────────────────────────────────────────────────────────── */

// ─── Policy Group ─────────────────────────────────────────────────────────────

export type ProcurementPolicyGroup =
  | "pr_submission"
  | "pr_to_po"
  | "po_submission";

// ─── Scope ────────────────────────────────────────────────────────────────────

export type ScopeType = "company" | "specific";

// ─── Backend Conditions ───────────────────────────────────────────────────────

export type BackendCondition =
  // Amount
  | "amount_greater_than"
  | "amount_less_than"
  // Line item
  | "unit_price_greater_than"
  | "line_total_greater_than"
  // Requester role
  | "requester_role_not_allowed"
  | "requester_role_requires_manager_approval"
  // Budget / accounting
  | "accounting_unresolved"
  // Vendor
  | "vendor_not_in_allowed_list"
  // Contract
  | "active_contract_missing"
  | "contract_not_active"
  // Quotation
  | "quotations_required"
  // Attachments
  | "required_attachments_missing"
  // Business justification
  | "business_justification_required"
  // PR volume
  | "pr_count_exceeds_limit"
  | "pr_creation_paused";

// ─── Enforcement Actions ──────────────────────────────────────────────────────

export type EnforcementAction =
  | "allow"
  | "warn"
  | "require_justification"
  | "require_attachments"
  | "require_manager_approval"
  | "prevent_submission"
  | "require_procurement_review"
  | "require_quotations"
  | "prevent_po_creation"
  | "require_contract"
  | "restrict_vendor_selection"
  | "prevent_direct_po"
  | "require_approval"
  | "require_active_contract"
  | "auto_approve_purchase_request";

// ─── Time unit for PR volume rules ────────────────────────────────────────────

export type TimeUnit = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

// ─── Policy Rule ──────────────────────────────────────────────────────────────

export interface PolicyRule {
  /** Internal UI id */
  id: string;
  /** Human-readable label auto-generated, sent as `criteria` string to the API */
  criteriaLabel: string;
  condition: BackendCondition | "";
  enforcementAction: EnforcementAction | "";
  // Optional per-condition fields
  amount?: number;
  currency?: string;
  minimumQuotes?: number;
  maxCount?: number;
  timeUnit?: TimeUnit;
  allowedVendorIds?: string[];
  allowedRoleIds?: string[];
  requiredAttachmentTypes?: string[];
}

// ─── Exceptions (UI only) ─────────────────────────────────────────────────────

export type ExceptionCategory = "user" | "department" | "role" | "jobGrade" | "managementLevel" | "location";
export type ExceptionSelection = Record<ExceptionCategory, string[]>;

// ─── Priorities ───────────────────────────────────────────────────────────────

export const PRIORITY_OPTIONS = [
  { label: "Critical", value: 1 },
  { label: "High", value: 10 },
  { label: "Medium", value: 50 },
  { label: "Low", value: 100 },
];

// ─── Policy Draft (wizard state) ─────────────────────────────────────────────

export interface PolicyDraft {
  policyGroup: ProcurementPolicyGroup | null;
  name: string;
  description: string;
  scopeType: ScopeType;
  categoryIds: string[];
  departmentIds: string[];
  roleIds: string[];
  jobGradeIds: string[];
  managementLevelIds: string[];
  vendorIds: string[];
  exceptions: ExceptionSelection;
  rules: PolicyRule[];
  requiresApproval: boolean;
  approvalMode: "none" | "sequential" | "parallel";
  approverIds: string[];
  effectiveAt: string;
  expiresAt: string;
  priority: number;
  draftId?: string;
  procurementPolicyId?: string;
}

export const emptyRule = (index: number): PolicyRule => ({
  id: `rule-${Date.now()}-${index}`,
  criteriaLabel: "",
  condition: "",
  enforcementAction: "",
});

export const emptyDraft = (): PolicyDraft => ({
  policyGroup: null,
  name: "",
  description: "",
  scopeType: "company",
  categoryIds: [],
  departmentIds: [],
  roleIds: [],
  jobGradeIds: [],
  managementLevelIds: [],
  vendorIds: [],
  exceptions: { department: [], role: [], location: [], user: [], jobGrade: [], managementLevel: [] },
  rules: [],
  requiresApproval: false,
  approvalMode: "none",
  approverIds: [],
  effectiveAt: "",
  expiresAt: "",
  priority: 100,
  draftId: undefined,
});

// ─── Display / list record (from API) ────────────────────────────────────────

export type ProcurementPolicyStatus = "draft" | "pending" | "approved" | "active" | "inactive";

/** Lightweight record used in the policy list table */
export interface ProcurementPolicyListItem {
  procurementPolicyId: string;
  name: string;
  description?: string;
  policyGroup: ProcurementPolicyGroup;
  scopeType: ScopeType;
  status: ProcurementPolicyStatus;
  priority: number;
  requiresApproval: boolean;
  approvalMode: string;
  effectiveAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}
