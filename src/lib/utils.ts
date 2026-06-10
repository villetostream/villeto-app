import { Permission } from "@/actions/auth/auth-permissions";
import { clsx, type ClassValue } from "clsx"
import { format } from "date-fns";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}




export function dateFormatter(date: Date | string | undefined): string {
  if (!date) {
    return "-";
  }

  // For anything else
  return `${format(date, "do MMM, yyyy")}`;
}
// Alternative: Return as array of groups
export type PermissionsGroup = {
  resource: string;
  permissions: Permission[];
};

export function groupPermissionsByResource(permissions: Permission[]): PermissionsGroup[] {
  const groupsMap: Record<string, Permission[]> = {};

  permissions.forEach(permission => {
    const resource = permission.resource;

    if (!groupsMap[resource]) {
      groupsMap[resource] = [];
    }

    groupsMap[resource].push({
      ...permission,
      enabled: permission.enabled || false
    });
  });

  return Object.entries(groupsMap).map(([resource, permissions]) => ({
    resource,
    permissions
  }));
}

/**
 * Converts a technical permission name like "read:users" or "create:roles"
 * into a plain English label like "View Users" or "Create Roles".
 */
const ACTION_LABELS: Record<string, string> = {
  read: "View",
  create: "Create",
  update: "Edit",
  edit: "Edit",
  delete: "Delete",
  manage: "Manage",
  invite: "Invite",
  export: "Export",
  import: "Import",
  approve: "Approve",
  reject: "Reject",
  archive: "Archive",
  restore: "Restore",
  view: "View",
  send: "Send",
  submit: "Submit",
  read_own: "View Own",
  update_own_draft: "Edit Own Draft",
  read_department: "View Department",
  approve_department: "Approve Department",
  reject_department: "Reject Department",
  read_company: "View Company",
  convert_to_po: "Convert to PO",
  review: "Review",
  update_payment_status: "Update Payment Status",
  activate: "Activate",
  deactivate: "Deactivate",
  assign_approvers: "Assign Approvers",
  assign_vendor: "Assign Vendor",
  issue: "Issue",
  cancel: "Cancel",
  close: "Close"
};

export function formatPermissionName(name: string): string {
  if (!name) return name;

  const isColonFormat = name.includes(":");
  const isDotFormat = name.includes(".");

  if (isColonFormat || isDotFormat) {
    const separator = isColonFormat ? ":" : ".";
    const parts = name.split(separator);
    
    let action = "";
    let resourceStr = "";

    if (isColonFormat) {
      action = parts[0];
      resourceStr = parts.slice(1).join(":");
    } else {
      action = parts[parts.length - 1];
      resourceStr = parts.slice(0, -1).join(" ");
      
      // If it's a dot format, it could simply be a resource grouping header like "expense.report" without an action.
      // We check if the supposed 'action' is a known standard UI action.
      const isKnownAction = ACTION_LABELS[action.toLowerCase()] || ["create", "submit", "manage", "review"].includes(action.toLowerCase());
      if (!isKnownAction) {
        return capitalize(name.replace(/[._-]/g, " "));
      }
    }

    const actionLabel = ACTION_LABELS[action.toLowerCase()] ?? capitalize(action.replace(/_/g, " "));

    let fixedResource = resourceStr.toLowerCase().replace(/[._-]/g, " ");
    if (fixedResource === "categorie") fixedResource = "category";

    const resourceLabel = capitalize(fixedResource);
    
    // If the action is "View" and resource is singular (doesn't end with 's' or 'ies')
    if (actionLabel === "View" && !fixedResource.endsWith("s")) {
      return `${actionLabel} ${resourceLabel} Details`;
    }

    return `${actionLabel} ${resourceLabel}`;
  }

  // Handle singular resource variables (snake_case, kebab-case, etc)
  let fixedName = name.toLowerCase();
  if (fixedName === "categorie") fixedName = "category";

  return fixedName.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function capitalize(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}