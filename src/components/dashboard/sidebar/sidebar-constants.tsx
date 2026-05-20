import {
  Menu,
  Cards,
  MoneySend,
  Profile2User,
  WalletMoney,
  Shop,
  LampOn,
  StatusUp,
  Messages,
  Setting2,
  Logout,
  DocumentText,
  ShoppingCart,
} from "iconsax-reactjs";
import { Permission } from "@/actions/auth/auth-permissions";
import {
  Home09Icon,
  InvoiceIcon,
  MoneySendSquareFreeIcons,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export interface NavItem {
  icon: any;
  label: string;
  href: string;
  permission: string[];
  subItems?: SubItem[];
  badge?: string;
  section: string;
  /** If true, renders as disabled span with a "Coming Soon" pill — no navigation */
  comingSoon?: boolean;
}

interface SubItem {
  label: string;
  href: string;
  permission: string[];
  badge?: string;
  imageUrl?: string;
  /** If true, renders as disabled span with a "Coming Soon" pill — no navigation */
  comingSoon?: boolean;
}

export const navigationItems: NavItem[] = [
  {
    icon: <HugeiconsIcon icon={Home09Icon} />,
    label: "Overview",
    href: "/dashboard",
    permission: [],             // All roles see the dashboard
    section: "MAIN MENU",
  },
  {
    icon: <HugeiconsIcon icon={MoneySendSquareFreeIcons} />,
    label: "Expenses",
    permission: [],             // All roles have expenses (personal at minimum)
    href: "/expenses",
    section: "MAIN MENU",
    subItems: [
      {
        label: "All Expenses",
        href: "/expenses",
        permission: [],
      },
      {
        label: "Card Transactions",
        href: "/expenses/card-transactions",
        permission: ["company_expenses:read"],  // Manager and above
        comingSoon: true,
      },
      {
        label: "Reimbursements",
        href: "/expenses/reimbursements",
        permission: [],         // All roles
        comingSoon: true,
      },
      {
        label: "Travel",
        href: "/expenses/travel",
        permission: [],
        comingSoon: true,
      },
    ],
  },
  {
    icon: <Cards />,
    label: "Cards",
    href: "/cards",
    permission: [],
    section: "MAIN MENU",
    comingSoon: true,
  },
  {
    icon: <Profile2User />,
    label: "People",
    href: "/people",
    permission: ["read:users"],  // Finance Admin and above
    section: "MANAGEMENT",
  },
  {
    icon: <DocumentText />,
    label: "Policies",
    href: "/policies",
    permission: ["expense_policies:read"],   // Finance Admin and above
    section: "MANAGEMENT",
  },
  {
    icon: <HugeiconsIcon icon={InvoiceIcon} />,
    label: "Bill Pay",
    href: "/bill-pay",
    permission: [],
    section: "MANAGEMENT",
    comingSoon: true,
  },
  {
    icon: <Shop />,
    label: "Vendors",
    href: "/vendors",
    permission: ["vendors:read"],            // Finance Admin and above
    section: "MANAGEMENT",
  },
  {
    icon: <ShoppingCart />,
    label: "Procurement",
    href: "/procurement/purchase-request",
    permission: [],
    section: "MANAGEMENT",
    subItems: [
      {
        label: "Purchase Requests",
        href: "/procurement/purchase-request",
        permission: [],
      },
      {
        label: "Purchase Orders",
        href: "/procurement/purchase-order",
        permission: [],
      },
      {
        label: "Confirmation",
        href: "/procurement/confirmation",
        permission: [],
      },
    ],
  },
  {
    icon: <LampOn />,
    label: "Insights",
    href: "/insights",
    permission: [],
    section: "ANALYTICS",
    comingSoon: true,
  },
  {
    icon: <Messages />,
    label: "Inbox",
    href: "/inbox",
    permission: [],
    section: "OTHERS",
    comingSoon: true,
  },
  {
    icon: <Setting2 />,
    label: "Settings",
    href: "/settings/data-integration",
    permission: [],
    section: "OTHERS",
    subItems: [
      {
        label: "Data Integration",
        href: "/settings/data-integration",
        permission: [],
        comingSoon: true,
      },
      {
        label: "Expense Policy",
        href: "/settings/expense-policy",
        permission: ["expense_policies:read"],
        comingSoon: true,
      },
      {
        label: "Company Settings",
        href: "/settings/company-settings",
        permission: ["company:read"],
      },
      {
        label: "Entities",
        href: "/settings/entities",
        permission: [],
        comingSoon: true,
      },
      {
        label: "Apps",
        href: "/settings/apps",
        permission: [],
        comingSoon: true,
      },
      {
        label: "Personal Settings",
        href: "/settings/personal-settings",
        permission: [],  // All roles
      },
    ],
  },
];
