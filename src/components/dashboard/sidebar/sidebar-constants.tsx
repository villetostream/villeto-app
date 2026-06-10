import {
  Cards,
  Profile2User,
  Shop,
  LampOn,
  Messages,
  Setting2,
  DocumentText,
  ShoppingCart,
} from "iconsax-reactjs";
import {
  Home09Icon,
  InvoiceIcon,
  MoneySendSquareFreeIcons,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

// ─── Permission Gate Shape ────────────────────────────────────────────────────
// Each nav item declares zero or more { resource, action } pairs.
// A user sees the item if they pass can(resource, action) for ANY one of them,
// OR if the array is empty (always visible to all authenticated users).

export interface NavPermission {
  resource: string;
  action: string;
}

export interface NavItem {
  icon: any;
  label: string;
  href: string;
  /** Empty = always visible. One or more = user needs at least one of these. */
  permissions: NavPermission[];
  subItems?: SubItem[];
  badge?: string;
  section: string;
  /** If true, renders as disabled span with a "Coming Soon" pill — no navigation */
  comingSoon?: boolean;
}

interface SubItem {
  label: string;
  href: string;
  /** Empty = always visible. One or more = user needs at least one of these. */
  permissions: NavPermission[];
  badge?: string;
  imageUrl?: string;
  comingSoon?: boolean;
}

// ─── Navigation Items ─────────────────────────────────────────────────────────

export const navigationItems: NavItem[] = [
  {
    icon: <HugeiconsIcon icon={Home09Icon} />,
    label: "Overview",
    href: "/dashboard",
    permissions: [], // Always visible
    section: "MAIN MENU",
  },
  {
    icon: <HugeiconsIcon icon={MoneySendSquareFreeIcons} />,
    label: "Expenses",
    href: "/expenses",
    permissions: [], // Always visible — personal tab is the minimum
    section: "MAIN MENU",
    subItems: [
      {
        label: "All Expenses",
        href: "/expenses",
        permissions: [],
      },
      {
        label: "Card Transactions",
        href: "/expenses/card-transactions",
        permissions: [{ resource: "expense.report", action: "read_company" }],
        comingSoon: true,
      },
      {
        label: "Reimbursements",
        href: "/expenses/reimbursements",
        permissions: [],
      },
      {
        label: "Travel",
        href: "/expenses/travel",
        permissions: [],
        comingSoon: true,
      },
    ],
  },
  {
    icon: <Cards />,
    label: "Cards",
    href: "/cards",
    permissions: [],
    section: "MAIN MENU",
    comingSoon: true,
  },
  {
    icon: <Profile2User />,
    label: "People",
    href: "/people",
    permissions: [
      { resource: "user", action: "manage" },
      { resource: "user", action: "read" },
    ],
    section: "MANAGEMENT",
  },
  {
    icon: <DocumentText />,
    label: "Policies",
    href: "/policies",
    permissions: [{ resource: "policy", action: "read_company" }],
    section: "MANAGEMENT",
  },
  {
    icon: <HugeiconsIcon icon={InvoiceIcon} />,
    label: "Bill Pay",
    href: "/bill-pay",
    permissions: [],
    section: "MANAGEMENT",
    comingSoon: true,
  },
  {
    icon: <Shop />,
    label: "Vendors",
    href: "/vendors",
    permissions: [{ resource: "vendor", action: "read_company" }],
    section: "MANAGEMENT",
  },
  {
    icon: <ShoppingCart />,
    label: "Procurement",
    href: "/procurement/purchase-request",
    permissions: [], // Always visible — everyone can have own PRs
    section: "MANAGEMENT",
    subItems: [
      {
        label: "Purchase Requests",
        href: "/procurement/purchase-request",
        permissions: [], // read_own is implied for all users
      },
      {
        label: "Purchase Orders",
        href: "/procurement/purchase-order",
        permissions: [{ resource: "procurement.purchase_order", action: "read_company" }],
      },
      {
        label: "Confirmation",
        href: "/procurement/confirmation",
        permissions: [{ resource: "procurement.vendor_invoice", action: "read_company" }],
      },
      {
        label: "Categories",
        href: "/procurement/categories",
        permissions: [{ resource: "expense.category", action: "manage" }],
      },
    ],
  },
  {
    icon: <LampOn />,
    label: "Insights",
    href: "/insights",
    permissions: [],
    section: "ANALYTICS",
    comingSoon: true,
  },
  {
    icon: <Messages />,
    label: "Inbox",
    href: "/inbox",
    permissions: [],
    section: "OTHERS",
    comingSoon: true,
  },
  {
    icon: <Setting2 />,
    label: "Settings",
    href: "/settings/data-integration",
    permissions: [],
    section: "OTHERS",
    subItems: [
      {
        label: "Data Integration",
        href: "/settings/data-integration",
        permissions: [],
        comingSoon: true,
      },
      {
        label: "Expense Policy",
        href: "/settings/expense-policy",
        permissions: [{ resource: "policy", action: "read_company" }],
        comingSoon: true,
      },
      {
        label: "Company Settings",
        href: "/settings/company-settings",
        permissions: [{ resource: "user", action: "manage" }],
      },
      {
        label: "Entities",
        href: "/settings/entities",
        permissions: [],
        comingSoon: true,
      },
      {
        label: "Apps",
        href: "/settings/apps",
        permissions: [],
        comingSoon: true,
      },
      {
        label: "Personal Settings",
        href: "/settings/personal-settings",
        permissions: [], // Always visible
      },
    ],
  },
];
