"use client";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTourStore } from "@/stores/useTourStore";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/stores/auth-stores";
import { Logout } from "iconsax-reactjs";
import { NavItem, navigationItems } from "./sidebar-constants";
import { useAxios } from "@/hooks/useAxios";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";
import { STALE_TIMES } from "@/lib/constants/stale-times";
import { useGetPurchaseRequests } from "@/queries/procurement/purchase-requests";
import { usePurchaseOrders } from "@/queries/procurement/purchase-orders";
import {
  canPOApprove,
  canPOReadCompany,
  canPOReadDepartment,
} from "@/lib/permissions/purchase-order-permissions";
import { useCompanyExpenses } from "@/lib/react-query/expenses";

export function DashboardSidebar({ isProfileLoading = false }: { isProfileLoading?: boolean }) {
  const location = usePathname();
  const searchParams = useSearchParams();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const p = window.location.pathname;
      if (p.startsWith("/expenses"))    return ["Expenses"];
      if (p.startsWith("/procurement")) return ["Procurement"];
      if (p.startsWith("/settings"))    return ["Settings"];
    }
    return [];
  });

  const logout = useAuthStore((state) => state.logout);
  const can = useAuthStore((state) => state.can);
  const user = useAuthStore((state) => state.user);
  const isAuthLoading = useAuthStore((state) => state.isLoading) || isProfileLoading;
  const router = useRouter();
  const axios = useAxios();
  const { state, setOpen } = useSidebar();
  const isTourActive = useTourStore((s) => s.isTourActive);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const isExpanded = state === "expanded";

  // ── Force sidebar open for the entire duration of the tour ──
  useEffect(() => {
    if (isTourActive) setOpen(true);
  }, [isTourActive, state, setOpen]);

  const [syncedLocation, setSyncedLocation] = useState(location);
  if (location !== syncedLocation) {
    setSyncedLocation(location);
    if (location.startsWith("/expenses"))
      setExpandedMenus(prev => prev.includes("Expenses") ? prev : [...prev, "Expenses"]);
    if (location.startsWith("/procurement"))
      setExpandedMenus(prev => prev.includes("Procurement") ? prev : [...prev, "Procurement"]);
    if (location.startsWith("/settings"))
      setExpandedMenus(prev => prev.includes("Settings") ? prev : [...prev, "Settings"]);
  }

  const { data: companyData, isLoading: isQueryLoading } = useQuery({
    queryKey: ["company", user?.companyId, user?.userId],
    queryFn: async () => {
      if (!user?.userId) return null;
      if (user.companyId) {
        try {
          const res = await axios.get(`/companies/${user.companyId}`);
          const data = res?.data?.data || res?.data;
          if (data) return data;
        } catch (error) {
          logger.error("Primary company fetch failed:", error);
        }
      }
      try {
        const fall = await axios.get("/users/me");
        return fall?.data?.data?.company || fall?.data?.company || null;
      } catch (err) {
        logger.error("Fallback /users/me fetch failed:", err);
        return null;
      }
    },
    enabled: !!user?.userId,
    staleTime: STALE_TIMES.SESSION,
  });

  const businessLogo = companyData?.logoUrl ?? user?.company?.logoUrl ?? null;
  const businessName = companyData?.companyName ?? companyData?.businessName ?? user?.company?.companyName ?? user?.company?.businessName ?? null;
  const loading = isQueryLoading && !businessLogo && !businessName;

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    const basePath = href.split("?")[0];
    if (basePath === "/dashboard") return location === basePath;

    if (location === "/settings/personal-settings") {
      const activeTab = searchParams.get("tab");
      if (basePath === "/settings/company-settings") return activeTab === "company-profile";
      if (basePath === "/settings/personal-settings") return activeTab === "my-profile" || !activeTab;
    }

    if (basePath === "/expenses") {
      if (
        location.startsWith("/expenses/reimbursements") ||
        location.startsWith("/expenses/card-transactions") ||
        location.startsWith("/expenses/travel")
      ) return false;
      return location.startsWith(basePath);
    }

    return location.startsWith(basePath);
  };

  const hasNavPermission = (permissions: NavItem["permissions"]): boolean => {
    if (!permissions || permissions.length === 0) return true;
    return permissions.some(p => can(p.resource, p.action));
  };

  const canViewCompanyExpenses =
    can("expense.report", "read_company") || can("expense.report", "read_department");

  // ── Badge Counts ──
  const canApprovePR = can("procurement.purchase_request", "approve");
  const canConvertPR = can("procurement.purchase_request", "convert_to_po");
  const prScope = can("procurement.purchase_request", "read_company") ? "company" : can("procurement.purchase_request", "read_department") ? "team" : "own";

  const { data: prApprovalData } = useGetPurchaseRequests(
    { scope: prScope as any, status: "submitted", requiresMyApproval: true },
    { enabled: canApprovePR, select: (d) => d.meta?.totalCount ?? 0 }
  );
  const prAwaitingCount = (prApprovalData as unknown as number) ?? 0;

  const { data: prConversionData } = useGetPurchaseRequests(
    { scope: prScope as any, status: "approved", requiresMyConversion: true },
    { enabled: canConvertPR, select: (d) => d.meta?.totalCount ?? 0 }
  );
  const prReadyForPOCount = (prConversionData as unknown as number) ?? 0;

  const { data: prPartialConversionData } = useGetPurchaseRequests(
    { scope: prScope as any, status: "partially_converted", requiresMyConversion: true },
    { enabled: canConvertPR, select: (d) => d.meta?.totalCount ?? 0 }
  );
  const prPartialPOCount = (prPartialConversionData as unknown as number) ?? 0;
  const totalPRActionCount = prAwaitingCount + prReadyForPOCount + prPartialPOCount;

  const canApprovePO = canPOApprove(can);
  const hasPOCompanyScope = canPOReadCompany(can);
  const hasPOTeamScope    = canPOReadDepartment(can);
  const poScope = hasPOCompanyScope ? "company" : hasPOTeamScope ? "team" : "own";

  const { data: poApprovalData } = usePurchaseOrders(
    1, 1, "pending_approval", undefined, undefined, poScope as any,
    { enabled: canApprovePO && (hasPOCompanyScope || hasPOTeamScope), select: (d) => d.meta?.totalCount ?? 0 }
  );
  const totalPOActionCount = (poApprovalData as unknown as number) ?? 0;

  const canApproveExpense = can("expense.report", "approve");
  const expScope = can("expense.report", "read_company") ? "company" : can("expense.report", "read_department") ? "team" : null;
  const { data: expensesData } = useCompanyExpenses(1, 100, (expScope || "company") as any, undefined, undefined, !!expScope && canApproveExpense);
  const totalExpenseActionCount = canApproveExpense && expensesData?.reports
    ? expensesData.reports.filter(e => e.status === "pending").length
    : 0;

  const filterItems = (items: NavItem[]): NavItem[] => {
    return items
      .map((item) => {
        const currentItem = { ...item };
        if (currentItem.href === "/expenses") {
          currentItem.href = canViewCompanyExpenses
            ? "/expenses?tab=company-expenses"
            : "/expenses?tab=personal-expenses";
          if (totalExpenseActionCount > 0) currentItem.badge = totalExpenseActionCount.toString();
        }
        if (currentItem.href === "/procurement/purchase-request") {
          const totalProcurement = totalPRActionCount + totalPOActionCount;
          if (totalProcurement > 0) currentItem.badge = totalProcurement.toString();
        }
        if (currentItem.subItems) {
          const filteredSubs = currentItem.subItems
            .map((sub) => {
              const currentSub = { ...sub };
              if (currentSub.label === "All Expenses") {
                if (!canViewCompanyExpenses) currentSub.label = "My Expenses";
                currentSub.href = canViewCompanyExpenses
                  ? "/expenses?tab=company-expenses"
                  : "/expenses?tab=personal-expenses";
                if (totalExpenseActionCount > 0) currentSub.badge = totalExpenseActionCount.toString();
              }
              if (currentSub.label === "Purchase Requests" && totalPRActionCount > 0)
                currentSub.badge = totalPRActionCount.toString();
              if (currentSub.label === "Purchase Orders" && totalPOActionCount > 0)
                currentSub.badge = totalPOActionCount.toString();
              return currentSub;
            })
            .filter((sub) => hasNavPermission(sub.permissions));
          if (!hasNavPermission(currentItem.permissions) && filteredSubs.length === 0) return null;
          currentItem.subItems = filteredSubs;
          return currentItem;
        } else {
          if (!hasNavPermission(currentItem.permissions)) return null;
          return currentItem;
        }
      })
      .filter(Boolean) as NavItem[];
  };

  const filteredNavigationItems = filterItems(navigationItems);

  // Render the logo in expanded mode
  const renderLogo = () => {
    if (loading) return <Skeleton className="w-full h-full rounded-[6px]" />;
    if (businessLogo)
      return (
        <Image
          src={businessLogo}
          alt="Business Logo"
          width={32}
          height={32}
          className="w-full h-full object-contain rounded-[6px]"
          unoptimized={businessLogo.startsWith("data:") || businessLogo.startsWith("http")}
        />
      );
    return (
      <div className="w-full h-full rounded-[6px] bg-[#e7f6f2] flex items-center justify-center shrink-0">
        <span className="text-[13px] font-bold text-[#087f70]">
          {businessName?.charAt(0).toUpperCase() || "B"}
        </span>
      </div>
    );
  };

  const renderCollapsedLogo = () => {
    if (loading) return <Skeleton className="w-8 h-8 rounded-[6px]" />;
    if (businessLogo)
      return (
        <Image
          src={businessLogo}
          alt={businessName || "Business Logo"}
          width={32}
          height={32}
          className="w-8 h-8 object-contain rounded-[6px]"
          unoptimized={businessLogo.startsWith("data:") || businessLogo.startsWith("http")}
        />
      );
    return (
      <div className="w-8 h-8 rounded-[6px] bg-[#e7f6f2] flex items-center justify-center shrink-0">
        <span className="text-[13px] font-bold text-[#087f70]">
          {businessName?.charAt(0).toUpperCase() || "B"}
        </span>
      </div>
    );
  };

  const renderBadge = (badge: string | undefined, collapsed = false) => {
    if (!badge) return null;
    return (
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-red-500 text-white font-bold leading-none",
          collapsed
            ? "absolute -top-1 -right-1 min-w-[14px] h-[14px] px-[3px] text-[8px]"
            : "ml-auto min-w-[18px] h-[18px] px-1.5 text-[10px] group-data-[collapsible=icon]:hidden"
        )}
      >
        {Number(badge) > 99 ? "99+" : badge}
      </span>
    );
  };

  const renderMenuItem = (item: NavItem) => {
    const hasExpandable = item.subItems && item.subItems.length > 0;

    if (hasExpandable) {
      const isOpen = expandedMenus.includes(item.label);
      const isGroupActive = item.subItems?.some(sub => sub.href && isActive(sub.href)) || isActive(item.href);

      return (
        <SidebarMenuItem key={item.label}>
          <Collapsible open={isOpen} onOpenChange={() => toggleMenu(item.label)}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] transition-colors duration-150",
                  isGroupActive
                    ? "bg-[#f0faf8] text-[#087f70] font-semibold"
                    : "text-[#68726d] hover:bg-[#f5f7f6] hover:text-[#0b100e]",
                  !isExpanded && "justify-center px-2"
                )}
              >
                <span className={cn("relative shrink-0 flex items-center justify-center [&>svg]:size-[18px] [&>svg]:shrink-0", isGroupActive ? "[&>svg]:text-[#087f70]" : "[&>svg]:text-[#84908a]")}>
                  {item.icon}
                  {isExpanded && renderBadge(item.badge)}
                  {!isExpanded && renderBadge(item.badge, true)}
                </span>
                <span className="flex-1 text-left group-data-[collapsible=icon]:hidden">{item.label}</span>
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:hidden",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
              <div className="ml-5 mt-1 space-y-0.5 border-l border-black/[0.07] pl-3">
                {item.subItems?.map((sub) => {
                  if (sub.comingSoon) {
                    return (
                      <span
                        key={sub.label}
                        className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-[7px] text-[12px] text-[#84908a] opacity-60 cursor-not-allowed"
                      >
                        <span>{sub.label}</span>
                        <span className="ml-auto bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap">
                          Soon
                        </span>
                      </span>
                    );
                  }
                  const subActive = isActive(sub.href!);
                  return (
                    <Link
                      key={sub.label}
                      href={sub.href!}
                      className={cn(
                        "flex items-center justify-between w-full px-2.5 py-1.5 rounded-[7px] text-[12px] transition-colors",
                        subActive
                          ? "bg-[#f0faf8] text-[#087f70] font-semibold"
                          : "text-[#68726d] hover:bg-[#f5f7f6] hover:text-[#0b100e]"
                      )}
                    >
                      <span>{sub.label}</span>
                      {renderBadge(sub.badge)}
                      {sub.imageUrl === "user-avatar" && (
                        (user as unknown as { profilePicture?: string })?.profilePicture ? (
                          <Image src={(user as unknown as { profilePicture: string }).profilePicture} alt="Avatar" width={18} height={18} className="ml-auto w-[18px] h-[18px] rounded-full object-cover" />
                        ) : (
                          <div className="ml-auto w-[18px] h-[18px] rounded-full bg-[#e7f6f2] flex items-center justify-center text-[9px] font-semibold text-[#087f70] capitalize">
                            {user?.firstName?.[0] || user?.email?.[0] || "U"}
                          </div>
                        )
                      )}
                    </Link>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>
      );
    }

    if (!item.href) return null;

    if (item.comingSoon) {
      return (
        <SidebarMenuItem key={item.label}>
          <span
            className={cn(
              "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] text-[#84908a] opacity-50 cursor-not-allowed",
              !isExpanded && "justify-center px-2"
            )}
          >
            <span className="shrink-0 flex items-center justify-center [&>svg]:size-[18px] [&>svg]:text-[#84908a]">{item.icon}</span>
            <span className="flex-1 group-data-[collapsible=icon]:hidden">{item.label}</span>
            <span className="ml-auto bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full text-[9px] font-semibold group-data-[collapsible=icon]:hidden whitespace-nowrap">
              Soon
            </span>
          </span>
        </SidebarMenuItem>
      );
    }

    const active = isActive(item.href);
    return (
      <SidebarMenuItem key={item.label}>
        <Link
          href={item.href}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] transition-colors duration-150",
            active
              ? "bg-[#f0faf8] text-[#087f70] font-semibold"
              : "text-[#68726d] hover:bg-[#f5f7f6] hover:text-[#0b100e]",
            !isExpanded && "justify-center px-2"
          )}
        >
          <span className={cn("relative shrink-0 flex items-center justify-center [&>svg]:size-[18px] [&>svg]:shrink-0", active ? "[&>svg]:text-[#087f70]" : "[&>svg]:text-[#84908a]")}>
            {item.icon}
            {!isExpanded && renderBadge(item.badge, true)}
          </span>
          <span className="flex-1 group-data-[collapsible=icon]:hidden">{item.label}</span>
          {isExpanded && renderBadge(item.badge)}
        </Link>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-black/[0.07] bg-white">
      {/* ── Header: Logo + Toggle ── */}
      <SidebarHeader className="border-b border-black/[0.07] px-0! py-0! space-y-0">
        <div className="flex flex-col">
          <div
            className={cn(
              "flex items-center h-16 border-b border-black/[0.07] transition-all duration-300",
              isExpanded ? "justify-between px-4" : "justify-center"
            )}
          >
            {isExpanded ? (
              <>
                <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
                  <Image
                    src="/images/villeto-logo.png"
                    alt="Villeto Logo"
                    width={90}
                    height={28}
                    className="h-auto max-h-7 object-contain"
                    priority
                  />
                </Link>
                {!isTourActive && <SidebarTrigger className="shrink-0 cursor-pointer text-[#84908a] hover:text-[#0b100e]" />}
              </>
            ) : (
              !isTourActive && <SidebarTrigger className="shrink-0 cursor-pointer text-[#84908a] hover:text-[#0b100e]" />
            )}
          </div>

          {/* ── Company Selector ── */}
          <div className={cn("px-3 py-2", !isExpanded && "flex justify-center")}>
            {isExpanded ? (
              <div className="flex items-center gap-2.5 rounded-[9px] border border-black/[0.08] bg-[#f9faf9] px-3 py-2 w-full">
                <div className="flex-shrink-0 w-7 h-7 overflow-hidden rounded-[6px]">
                  {renderLogo()}
                </div>
                <span className="flex-1 text-[13px] font-semibold text-[#0b100e] truncate">
                  {loading ? <Skeleton className="h-4 w-28" /> : (businessName || "Business Name")}
                </span>
                <ChevronRight className="size-3.5 text-[#84908a] shrink-0" />
              </div>
            ) : (
              <div className="w-8 h-8">
                {renderCollapsedLogo()}
              </div>
            )}
          </div>
        </div>
      </SidebarHeader>

      {/* ── Nav Content ── */}
      <SidebarContent className="py-3 px-2 overflow-y-auto scrollbar-thin scrollbar-thumb-black/10 scrollbar-track-transparent">
        {isAuthLoading ? (
          <div className="space-y-1 px-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px]">
                <Skeleton className="w-[18px] h-[18px] rounded-[5px] shrink-0" />
                <Skeleton className="h-3.5 w-24 rounded-md group-data-[collapsible=icon]:hidden" />
              </div>
            ))}
          </div>
        ) : (
          <SidebarMenu className="space-y-0.5">
            {filteredNavigationItems.map((item) => renderMenuItem(item))}
          </SidebarMenu>
        )}
      </SidebarContent>

      {/* ── Footer: Logout ── */}
      <SidebarFooter className="border-t border-black/[0.07] px-2 py-3">
        <button
          onClick={() => setShowLogoutModal(true)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] text-[#68726d] transition-colors hover:bg-red-50 hover:text-red-600",
            !isExpanded && "justify-center px-2"
          )}
        >
          <Logout className="size-[18px] shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">Log Out</span>
        </button>
      </SidebarFooter>

      {/* ── Logout Confirmation ── */}
      <AlertDialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <AlertDialogContent className="z-[9999] rounded-[14px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[16px] font-semibold text-[#0b100e]">
              Are you sure you want to log out?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-[#68726d]">
              Any unsaved changes may be lost. You will need to log in again to access the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[8px] border border-black/[0.08] text-[13px] text-[#0b100e]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[8px] bg-red-500 hover:bg-red-600 text-white text-[13px]"
              onClick={() => {
                logout();
                router.push("/login");
              }}
            >
              Log Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
