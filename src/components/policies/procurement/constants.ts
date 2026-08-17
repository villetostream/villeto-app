import { FileText, TrendingUp, ShoppingCart } from "lucide-react";
import type {
  BackendCondition,
  EnforcementAction,
  ProcurementPolicyGroup,
  TimeUnit,
} from "./types";

// ─── Dummy Options for Exceptions UI (Coming Soon) ─────────────────────────────

export const DEPARTMENT_OPTIONS = ["Engineering", "Finance", "HR", "Marketing", "Sales"];
export const ROLE_OPTIONS = ["Manager", "Employee", "Admin", "Director"];
export const LOCATION_OPTIONS = ["New York", "London", "Remote", "Lagos", "Berlin"];
export const USER_OPTIONS = ["john.doe@example.com", "jane.smith@example.com", "user-id-to-exempt"];
export const JOB_GRADE_OPTIONS = ["JG1", "JG2", "job-grade-id-to-exempt"];
export const MANAGEMENT_LEVEL_OPTIONS = ["C-Level", "VP", "management-level-id-to-exempt"];
export const POSITION_OPTIONS = ["ADMIN", "CONTROLLING_OFFICER"];

// ─── Policy Groups ─────────────────────────────────────────────────────────────

export const POLICY_GROUPS: {
  value: ProcurementPolicyGroup;
  title: string;
  description: string;
  icon: typeof FileText;
}[] = [
  {
    value: "pr_submission",
    title: "Purchase Request Submission",
    description:
      "Governs what happens when a user submits a purchase request. Includes amount thresholds, role restrictions, budget validation, attachments, and justification requirements.",
    icon: FileText,
  },
  {
    value: "pr_to_po",
    title: "PR → PO Conversion",
    description:
      "Governs the conversion of an approved purchase request into a purchase order. Includes vendor selection, contract validation, and quotation requirements.",
    icon: TrendingUp,
  },
  {
    value: "po_submission",
    title: "Purchase Order Submission",
    description:
      "Governs direct purchase orders submitted for approval. Includes vendor restrictions, contract checks, amount thresholds, and attachment requirements.",
    icon: ShoppingCart,
  },
];

// ─── Condition Definitions ────────────────────────────────────────────────────

export type ConditionFieldType =
  | "amount_currency"       // amount (number) + currency (select)
  | "role_picker"           // role multi-select
  | "vendor_picker"         // vendor multi-select
  | "min_quotes"            // minimumQuotes (number)
  | "attachment_types"      // requiredAttachmentTypes (tag input)
  | "pr_count"              // maxCount (number) + timeUnit (select)
  | "none";                 // no extra fields — condition is self-describing

export interface ConditionDef {
  condition: BackendCondition;
  label: string;
  description: string;
  fieldType: ConditionFieldType;
  groups: ProcurementPolicyGroup[];
}

export const ALL_CONDITIONS: ConditionDef[] = [
  // ── Amount ──────────────────────────────────────────────────────────────
  {
    condition: "amount_greater_than",
    label: "Total amount is above",
    description: "Triggers when the total purchase amount exceeds the specified threshold.",
    fieldType: "amount_currency",
    groups: ["pr_submission", "pr_to_po", "po_submission"],
  },
  {
    condition: "amount_less_than",
    label: "Total amount is below",
    description: "Triggers when the total purchase amount is under the specified threshold.",
    fieldType: "amount_currency",
    groups: ["pr_submission", "pr_to_po", "po_submission"],
  },
  // ── Line item ────────────────────────────────────────────────────────────
  {
    condition: "unit_price_greater_than",
    label: "Any line item unit price is above",
    description: "Triggers when any individual item's unit price exceeds the threshold.",
    fieldType: "amount_currency",
    groups: ["pr_submission", "po_submission"],
  },
  {
    condition: "line_total_greater_than",
    label: "Any line item total is above",
    description: "Triggers when any single line item's total (qty × unit price) exceeds the threshold.",
    fieldType: "amount_currency",
    groups: ["pr_submission", "po_submission"],
  },
  // ── Requester role ───────────────────────────────────────────────────────
  {
    condition: "requester_role_not_allowed",
    label: "Requester role is not allowed",
    description: "Triggers when the submitter's role is not in the list of permitted roles.",
    fieldType: "role_picker",
    groups: ["pr_submission"],
  },
  {
    condition: "requester_role_requires_manager_approval",
    label: "Requester role requires manager approval",
    description: "Triggers manager approval workflow for requests from the selected roles.",
    fieldType: "role_picker",
    groups: ["pr_submission"],
  },
  // ── Budget & accounting ──────────────────────────────────────────────────
  {
    condition: "accounting_unresolved",
    label: "Budget or accounting is unresolved",
    description: "Triggers when the purchase request has unresolved accounting or budget information. No additional configuration needed.",
    fieldType: "none",
    groups: ["pr_submission"],
  },
  // ── Vendor ───────────────────────────────────────────────────────────────
  {
    condition: "vendor_not_in_allowed_list",
    label: "Vendor must be from approved list",
    description: "Triggers when the selected vendor is not in the configured list of allowed vendors.",
    fieldType: "vendor_picker",
    groups: ["pr_to_po", "po_submission"],
  },
  // ── Contract ─────────────────────────────────────────────────────────────
  {
    condition: "active_contract_missing",
    label: "Active contract is required",
    description: "Triggers when no active contract exists with the selected vendor. No additional configuration needed.",
    fieldType: "none",
    groups: ["pr_to_po", "po_submission"],
  },
  {
    condition: "contract_not_active",
    label: "Contract is expired or inactive",
    description: "Triggers when the vendor contract exists but is expired or in an inactive state. No additional configuration needed.",
    fieldType: "none",
    groups: ["pr_to_po", "po_submission"],
  },
  // ── Quotation ────────────────────────────────────────────────────────────
  {
    condition: "quotations_required",
    label: "Quotations are required",
    description: "Triggers when the required number of vendor quotations has not been provided.",
    fieldType: "min_quotes",
    groups: ["pr_to_po"],
  },
  // ── Attachments ──────────────────────────────────────────────────────────
  {
    condition: "required_attachments_missing",
    label: "Supporting documents are required",
    description: "Triggers when required supporting documents have not been attached.",
    fieldType: "attachment_types",
    groups: ["pr_submission", "po_submission"],
  },
  // ── Business justification ───────────────────────────────────────────────
  {
    condition: "business_justification_required",
    label: "Business justification is required",
    description: "Triggers when the request does not include a business justification. No additional configuration needed.",
    fieldType: "none",
    groups: ["pr_submission", "pr_to_po", "po_submission"],
  },
  // ── PR volume ────────────────────────────────────────────────────────────
  {
    condition: "pr_count_exceeds_limit",
    label: "PR count exceeds limit",
    description: "Triggers when the number of purchase requests in a period exceeds the configured maximum.",
    fieldType: "pr_count",
    groups: ["pr_submission"],
  },
  {
    condition: "pr_creation_paused",
    label: "PR creation is paused",
    description: "Triggers to block all PR creation during a configured period. No additional configuration needed.",
    fieldType: "none",
    groups: ["pr_submission"],
  },
];

/** Returns only the conditions valid for a given policy group */
export const conditionsForGroup = (group: ProcurementPolicyGroup | null): ConditionDef[] =>
  group ? ALL_CONDITIONS.filter((c) => c.groups.includes(group)) : [];

/** Lookup a single condition definition */
export const getConditionDef = (condition: BackendCondition | ""): ConditionDef | undefined =>
  ALL_CONDITIONS.find((c) => c.condition === condition);

// ─── Enforcement Actions ──────────────────────────────────────────────────────

export interface ActionDef {
  value: EnforcementAction;
  label: string;
  description: string;
  severity: "soft" | "hard";
  groups: ProcurementPolicyGroup[];
}

export const ALL_ACTIONS: ActionDef[] = [
  {
    value: "allow",
    label: "Allow",
    description: "Transaction proceeds without any interruption.",
    severity: "soft",
    groups: ["pr_submission", "pr_to_po", "po_submission"],
  },
  {
    value: "warn",
    label: "Show warning",
    description: "A warning is recorded and shown to the user, but the transaction can continue.",
    severity: "soft",
    groups: ["pr_submission", "pr_to_po", "po_submission"],
  },
  {
    value: "require_justification",
    label: "Require justification",
    description: "User must provide a written business justification before continuing.",
    severity: "soft",
    groups: ["pr_submission", "po_submission"],
  },
  {
    value: "require_attachments",
    label: "Require attachments",
    description: "User must upload the required supporting documents before continuing.",
    severity: "soft",
    groups: ["pr_submission", "po_submission"],
  },
  {
    value: "require_manager_approval",
    label: "Require manager approval",
    description: "The purchase request is routed to the requester's manager for approval.",
    severity: "soft",
    groups: ["pr_submission"],
  },
  {
    value: "prevent_submission",
    label: "Prevent PR submission",
    description: "The purchase request cannot be submitted until the policy requirement is satisfied.",
    severity: "hard",
    groups: ["pr_submission"],
  },
  {
    value: "auto_approve_purchase_request",
    label: "Auto approve PR",
    description: "The purchase request is automatically approved without manual review.",
    severity: "soft",
    groups: ["pr_submission"],
  },
  {
    value: "require_procurement_review",
    label: "Require procurement review",
    description: "The procurement team must review and approve before the process continues.",
    severity: "soft",
    groups: ["pr_to_po", "po_submission"],
  },
  {
    value: "require_quotations",
    label: "Require quotations",
    description: "The required number of vendor quotations must be provided before continuing.",
    severity: "soft",
    groups: ["pr_to_po"],
  },
  {
    value: "prevent_po_creation",
    label: "Prevent PO creation",
    description: "The purchase request cannot be converted to a purchase order.",
    severity: "hard",
    groups: ["pr_to_po"],
  },
  {
    value: "require_contract",
    label: "Require contract",
    description: "A valid vendor contract must exist before the process can continue.",
    severity: "hard",
    groups: ["pr_to_po", "po_submission"],
  },
  {
    value: "require_active_contract",
    label: "Require active contract",
    description: "An active (non-expired) vendor contract is required before continuing.",
    severity: "hard",
    groups: ["pr_to_po", "po_submission"],
  },
  {
    value: "restrict_vendor_selection",
    label: "Restrict vendor selection",
    description: "Only vendors in the configured allowed list may be selected.",
    severity: "hard",
    groups: ["pr_to_po", "po_submission"],
  },
  {
    value: "prevent_direct_po",
    label: "Prevent direct PO",
    description: "Direct purchase order creation is not permitted under this policy.",
    severity: "hard",
    groups: ["po_submission"],
  },
  {
    value: "require_approval",
    label: "Require PO approval",
    description: "The purchase order must enter the approval workflow before it can proceed.",
    severity: "soft",
    groups: ["po_submission"],
  },
];

/** Returns only the enforcement actions valid for a given policy group */
export const actionsForGroup = (group: ProcurementPolicyGroup | null): ActionDef[] =>
  group ? ALL_ACTIONS.filter((a) => a.groups.includes(group)) : [];

/** Lookup a single action definition */
export const getActionDef = (value: EnforcementAction | ""): ActionDef | undefined =>
  ALL_ACTIONS.find((a) => a.value === value);

// ─── Time unit options ─────────────────────────────────────────────────────────

export const TIME_UNIT_OPTIONS: { value: TimeUnit; label: string }[] = [
  { value: "daily", label: "Per day" },
  { value: "weekly", label: "Per week" },
  { value: "monthly", label: "Per month" },
  { value: "quarterly", label: "Per quarter" },
  { value: "yearly", label: "Per year" },
];

// ─── Currency options ──────────────────────────────────────────────────────────

export const CURRENCY_OPTIONS = [
  { value: "NGN", label: "NGN — Nigerian Naira" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "KES", label: "KES — Kenyan Shilling" },
  { value: "GHS", label: "GHS — Ghanaian Cedi" },
];

// ─── Human-readable criteria label builder ────────────────────────────────────

/** Builds the plain-English criteria string that is sent as `criteria` in the API payload */
export const buildCriteriaLabel = (
  condition: BackendCondition | "",
  opts: {
    amount?: number;
    currency?: string;
    minimumQuotes?: number;
    maxCount?: number;
    timeUnit?: string;
    allowedVendorCount?: number;
    allowedRoleCount?: number;
  } = {}
): string => {
  const { amount, currency, minimumQuotes, maxCount, timeUnit, allowedVendorCount, allowedRoleCount } = opts;
  const amtStr = amount !== undefined ? `${currency ?? ""} ${amount.toLocaleString()}`.trim() : "threshold";

  switch (condition) {
    case "amount_greater_than":
      return `Apply when total amount is above ${amtStr}`;
    case "amount_less_than":
      return `Apply when total amount is below ${amtStr}`;
    case "unit_price_greater_than":
      return `Apply when any line item unit price is above ${amtStr}`;
    case "line_total_greater_than":
      return `Apply when any line item total is above ${amtStr}`;
    case "requester_role_not_allowed":
      return `Apply when requester role is not in the ${allowedRoleCount ?? 0} allowed role(s)`;
    case "requester_role_requires_manager_approval":
      return `Apply when requester role is one of ${allowedRoleCount ?? 0} selected role(s)`;
    case "accounting_unresolved":
      return "Apply when accounting or budget information is unresolved";
    case "vendor_not_in_allowed_list":
      return `Apply when vendor is not in the ${allowedVendorCount ?? 0} allowed vendor(s)`;
    case "active_contract_missing":
      return "Apply when no active contract exists with the vendor";
    case "contract_not_active":
      return "Apply when the vendor contract is expired or inactive";
    case "quotations_required":
      return `Apply when fewer than ${minimumQuotes ?? 1} vendor quotation(s) have been provided`;
    case "required_attachments_missing":
      return "Apply when required supporting documents are missing";
    case "business_justification_required":
      return "Apply when no business justification has been provided";
    case "pr_count_exceeds_limit":
      return `Apply when more than ${maxCount ?? 0} purchase requests have been submitted ${timeUnit ?? "monthly"}`;
    case "pr_creation_paused":
      return "Apply when purchase request creation is paused for the configured period";
    default:
      return "";
  }
};
