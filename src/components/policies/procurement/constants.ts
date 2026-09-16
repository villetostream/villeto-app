import { FileText, TrendingUp, ShoppingCart } from "lucide-react";
import type { SpendProgramGroup } from "./types";

// ─── Spend Program Groups (tab definitions) ─────────────────────────────────

export const SPEND_PROGRAM_GROUPS: {
  value: SpendProgramGroup;
  label: string;
  shortLabel: string;
  subtitle: string;
  icon: typeof FileText;
}[] = [
  {
    value: "pr_submission",
    label: "Purchase Request",
    shortLabel: "PR Submission",
    subtitle: "Rules that apply when someone submits a purchase request",
    icon: FileText,
  },
  {
    value: "pr_to_po",
    label: "PR to PO",
    shortLabel: "PR → PO",
    subtitle: "Rules that apply when a purchase request is converted to a purchase order",
    icon: TrendingUp,
  },
  {
    value: "po_submission",
    label: "Purchase Order",
    shortLabel: "Direct PO",
    subtitle: "Rules that apply when a purchase order is submitted directly",
    icon: ShoppingCart,
  },
];

/** Get group config by value */
export const getGroupConfig = (group: SpendProgramGroup) =>
  SPEND_PROGRAM_GROUPS.find((g) => g.value === group);

// ─── Action Display Labels ──────────────────────────────────────────────────

export const ACTION_LABELS: Record<string, { label: string; description: string; color: string; bgColor: string }> = {
  block: {
    label: "Block request",
    description: "Stop the request from proceeding",
    color: "#dc2626",
    bgColor: "#fef2f2",
  },
  warning: {
    label: "Show a warning",
    description: "Alert the user but allow them to continue",
    color: "#d97706",
    bgColor: "#fffbeb",
  },
  justification: {
    label: "Require a reason",
    description: "Ask the user to explain before continuing",
    color: "#7c3aed",
    bgColor: "#f5f3ff",
  },
  review: {
    label: "Send for review",
    description: "Route to a team member for review",
    color: "#2563eb",
    bgColor: "#eff6ff",
  },
  approval: {
    label: "Require approval",
    description: "Send for formal approval before proceeding",
    color: "#087f70",
    bgColor: "#f0faf8",
  },
  auto_approve: {
    label: "Auto-approve",
    description: "Approve automatically for low-risk requests",
    color: "#059669",
    bgColor: "#ecfdf5",
  },
  allow: {
    label: "Allow",
    description: "Let the request proceed without interruption",
    color: "#6b7280",
    bgColor: "#f9fafb",
  },
};

/** Get a user-friendly label for an action */
export const getActionLabel = (action: string): string =>
  ACTION_LABELS[action]?.label ?? action.replace(/_/g, " ");

/** Get the action badge style */
export const getActionStyle = (action: string): { color: string; bgColor: string } =>
  ACTION_LABELS[action] ?? { color: "#6b7280", bgColor: "#f9fafb" };

// ─── Condition Schema Field Labels ──────────────────────────────────────────

/** Human-friendly labels for dynamic condition fields from conditionSchema */
export const CONDITION_FIELD_LABELS: Record<string, string> = {
  amount: "Amount above",
  currency: "Currency",
  percentage: "Percentage above (%)",
  quantity: "Quantity above",
  roleIds: "Roles",
  departmentIds: "Departments",
  allowedVendorIds: "Allowed vendors",
  attachmentTypes: "Required attachment types",
  minimumQuotes: "Minimum quotes required",
  approverRoleIds: "Approver roles",
  reviewerRoleIds: "Reviewer roles",
};

// ─── Currency Options ───────────────────────────────────────────────────────

export const CURRENCY_OPTIONS = [
  { value: "NGN", label: "NGN — Nigerian Naira" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "KES", label: "KES — Kenyan Shilling" },
  { value: "GHS", label: "GHS — Ghanaian Cedi" },
];

// ─── Condition Summary Builder ──────────────────────────────────────────────

/** Build a human-readable condition summary for display in rule cards */
export const buildConditionSummary = (
  conditionConfig: Record<string, any>
): string => {
  const parts: string[] = [];
  const currency = conditionConfig.currency || "";

  Object.entries(conditionConfig).forEach(([key, val]) => {
    if (val === undefined || val === null || val === "" || key === "currency") return;
    
    let formattedVal = String(val);
    if (typeof val === "number" || !isNaN(Number(String(val).replace(/,/g, "")))) {
       const numStr = String(val).replace(/,/g, "");
       if (!isNaN(Number(numStr))) {
          const split = numStr.split(".");
          split[0] = split[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          formattedVal = split.join(".");
       }
    }

    if (key === "amount") {
      parts.push(`Amount above ${currency} ${formattedVal}`.trim());
    } else if (key === "percentage") {
      parts.push(`Above ${formattedVal}%`);
    } else if (key === "quantity") {
      parts.push(`Quantity above ${formattedVal}`);
    } else {
      const label = CONDITION_FIELD_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
      if (Array.isArray(val)) {
        parts.push(`${label} is in [${val.join(", ")}]`);
      } else {
        parts.push(`${label}: ${formattedVal}`);
      }
    }
  });

  return parts.length > 0 ? parts.join(" AND ") : "Always applies";
};

export const buildExceptionSummary = (config: any) => {
  if (!config) return "";
  
  const parts: string[] = [];
  if (config.departmentIds?.length > 0) parts.push(`${config.departmentIds.length} Department(s)`);
  if (config.roleIds?.length > 0) parts.push(`${config.roleIds.length} Role(s)`);
  if (config.jobGradeIds?.length > 0) parts.push(`${config.jobGradeIds.length} Job Grade(s)`);
  if (config.managementLevelIds?.length > 0) parts.push(`${config.managementLevelIds.length} Management Level(s)`);
  if (config.userIds?.length > 0) parts.push(`${config.userIds.length} User(s)`);

  if (parts.length === 0) return "";
  
  return `${parts.join(", ")} (Logic: ${config.logic || "OR"})`;
};
