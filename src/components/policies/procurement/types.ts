/* ─────────────────────────────────────────────────────────────────────────────
   Spend Program — UI types aligned to the Villeto Spend Programs V1 API.
   Replaces the old Procurement Policy types.
───────────────────────────────────────────────────────────────────────────── */

// ─── Spend Program Group (procurement stage) ─────────────────────────────────

export type SpendProgramGroup = "pr_submission" | "pr_to_po" | "po_submission";

// ─── Rule Definition (from /rule-definitions endpoint) ───────────────────────

export interface RuleDefinition {
  procurementSpendProgramRuleDefinitionId: string;
  ruleType: string;
  name: string;
  description: string;
  groups: SpendProgramGroup[];
  allowedActions: string[];
  conditionSchema: Record<string, string>;
  actionSchema: Record<string, string>;
  isSystem: boolean;
  isActive: boolean;
}

// ─── Spend Program Rule (wizard draft state) ─────────────────────────────────

export interface SpendProgramRule {
  /** UI-only ID for React keys */
  id: string;
  /** DB UUID (present when editing existing rules) */
  procurementSpendProgramRuleId?: string;
  /** Stable key from rule-definitions endpoint */
  ruleType: string;
  /** Rule definition UUID (optional, for reference) */
  ruleDefinitionId?: string;
  /** Human-readable name from the rule definition */
  displayName: string;
  /** Description from the rule definition */
  description?: string;
  /** Which of the selected categories this rule applies to (empty = all) */
  appliesToCategoryIds: string[];
  /** Whether this rule applies to all selected categories */
  appliesToAll: boolean;
  /** Which legal entities this rule applies to (empty = all) */
  legalEntityIds: string[];
  /** Condition configuration based on conditionSchema */
  conditionConfig: Record<string, any>;
  /** Selected action from allowedActions */
  action: string;
  /** Action configuration based on actionSchema */
  actionConfig: Record<string, any>;
  /** Per-rule exception configuration */
  exceptionConfig: RuleExceptionConfig;
  /** Whether the rule is active or disabled */
  isActive: boolean;
}

export interface RuleExceptionConfig {
  departmentIds: string[];
  roleIds: string[];
  jobGradeIds: string[];
  managementLevelIds: string[];
  userIds: string[];
  /** Logic for combining exception rules (default: "OR") */
  logic?: string;
  /** Condition configuration for the exception */
  conditionConfig: Record<string, any>;
  /** Selected action for the exception */
  action: string;
  /** Action configuration for the exception */
  actionConfig: Record<string, any>;
}

// ─── Spend Program Group Draft (per-stage rules) ─────────────────────────────

export interface SpendProgramGroupDraft {
  group: string;
  rules: SpendProgramRule[];
  /** Present in API responses; used when submitting updates */
  isActive?: boolean;
}

// ─── Spend Program Draft (full wizard state) ─────────────────────────────────

export interface SpendProgramDraft {
  name: string;
  description: string;
  categoryIds: string[];
  groups: SpendProgramGroupDraft[];
  draftId?: string;
  programId?: string;
}

// ─── Factories ───────────────────────────────────────────────────────────────

export const emptyRuleExceptionConfig = (): RuleExceptionConfig => ({
  departmentIds: [],
  roleIds: [],
  jobGradeIds: [],
  managementLevelIds: [],
  userIds: [],
  logic: "OR",
  conditionConfig: {},
  action: "",
  actionConfig: {},
});

export const emptySpendProgramRule = (index: number): SpendProgramRule => ({
  id: `rule-${Date.now()}-${index}`,
  ruleType: "",
  ruleDefinitionId: undefined,
  displayName: "",
  description: undefined,
  appliesToCategoryIds: [],
  appliesToAll: true,
  legalEntityIds: [],
  conditionConfig: {},
  action: "",
  actionConfig: {},
  exceptionConfig: emptyRuleExceptionConfig(),
  isActive: true,
});

export const emptySpendProgramDraft = (): SpendProgramDraft => ({
  name: "",
  description: "",
  categoryIds: [],
  groups: [
    { group: "pr_submission", rules: [] },
    { group: "pr_to_po", rules: [] },
    { group: "po_submission", rules: [] },
  ],
  draftId: undefined,
  programId: undefined,
});

// ─── Display / list record (from Spend Programs API) ─────────────────────────

export type SpendProgramStatus = "draft" | "pending" | "pending_approval" | "active" | "inactive" | "archived";

/** Lightweight record used in the policy list table */
export interface SpendProgramListItem {
  procurementSpendProgramId: string;
  name: string;
  description?: string;
  status: SpendProgramStatus;
  versionNumber: number;
  isCurrent: boolean;
  effectiveAt?: string | null;
  expiresAt?: string | null;
  groupCount: number;
  categoryCount: number;
  ruleCount: number;
  /** Group names as returned by the list endpoint, e.g. ["pr_submission"] */
  groups: string[];
  categories: { name: string; categoryId: string }[];
  createdBy?: any;
  approvedBy?: any;
  createdAt: string;
  updatedAt: string;
}

// ─── Category (from /companies/categories endpoint) ──────────────────────────

export interface ProcurementCategory {
  categoryId: string;
  name: string;
  description?: string | null;
  module: string;
  isActive: boolean;
  sortOrder: number;
  parentCategoryId?: string | null;
  isPolicyAttached: boolean;
  children: ProcurementCategory[];
}
