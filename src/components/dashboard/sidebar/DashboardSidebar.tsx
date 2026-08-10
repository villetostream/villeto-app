"use client";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactElement, useEffect, useState } from "react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function CollapsedNavTooltip({
  label,
  show,
  children,
}: {
  label: string;
  show: boolean;
  children: ReactElement;
}) {
  if (!show) return children;

  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={8}
        className="rounded-[6px] border border-white/[0.08] bg-[#0b1f1a] px-2.5 py-1 text-[11px] font-medium text-white shadow-[0_5px_15px_rgba(0,0,0,0.3)] [&>svg]:hidden"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

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
  const { state, setOpen, isMobile } = useSidebar();
  const isTourActive = useTourStore((s) => s.isTourActive);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const isExpanded = isMobile || state === "expanded";

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
    if (basePath === "/procurement") return location === basePath;

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
    { scope: prScope, status: "submitted", requiresMyApproval: true },
    { enabled: canApprovePR, select: (d) => d.meta?.totalCount ?? 0 }
  );
  const prAwaitingCount = (prApprovalData as unknown as number) ?? 0;

  const { data: prConversionData } = useGetPurchaseRequests(
    { scope: prScope, status: "approved", requiresMyConversion: true },
    { enabled: canConvertPR, select: (d) => d.meta?.totalCount ?? 0 }
  );
  const prReadyForPOCount = (prConversionData as unknown as number) ?? 0;

  const { data: prPartialConversionData } = useGetPurchaseRequests(
    { scope: prScope, status: "partially_converted", requiresMyConversion: true },
    { enabled: canConvertPR, select: (d) => d.meta?.totalCount ?? 0 }
  );
  const prPartialPOCount = (prPartialConversionData as unknown as number) ?? 0;
  const totalPRActionCount = prAwaitingCount + prReadyForPOCount + prPartialPOCount;

  const canApprovePO = canPOApprove(can);
  const hasPOCompanyScope = canPOReadCompany(can);
  const hasPOTeamScope    = canPOReadDepartment(can);
  const poScope = hasPOCompanyScope ? "company" : hasPOTeamScope ? "team" : "own";

  const { data: poApprovalData } = usePurchaseOrders(
    1, 1, "pending_approval", undefined, undefined, poScope,
    { enabled: canApprovePO && (hasPOCompanyScope || hasPOTeamScope), select: (d) => d.meta?.totalCount ?? 0 }
  );
  const totalPOActionCount = (poApprovalData as unknown as number) ?? 0;

  const canApproveExpense = can("expense.report", "approve");
  const expScope = can("expense.report", "read_company") ? "company" : can("expense.report", "read_department") ? "team" : null;
  const { data: expensesData } = useCompanyExpenses(1, 100, expScope || "company", undefined, undefined, !!expScope && canApproveExpense);
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
        if (currentItem.href === "/procurement") {
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
          "flex items-center justify-center rounded-full bg-[#ff7b6b] text-white font-bold leading-none shadow-[0_2px_8px_rgba(255,123,107,0.25)]",
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
            <CollapsedNavTooltip label={item.label} show={!isExpanded}>
              <CollapsibleTrigger asChild>
                <button
                className={cn(
                  "group/nav relative flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] transition-all duration-150",
                  isGroupActive
                    ? "bg-white/[0.11] text-white font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                    : "text-white/65 hover:bg-white/[0.07] hover:text-white",
                  !isExpanded && "justify-center px-2.5"
                )}
              >
                {isGroupActive && isExpanded && <span className="absolute left-0 h-5 w-[3px] rounded-r-full bg-[#38d5bc]" />}
                <span className={cn("relative shrink-0 flex size-8 items-center justify-center rounded-[8px] transition-colors [&>svg]:size-[18px] [&>svg]:shrink-0", isGroupActive ? "bg-[#24bda7]/20 [&>svg]:text-[#55e2cc]" : "bg-white/[0.04] [&>svg]:text-white/55 group-hover/nav:[&>svg]:text-white/85")}>
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
            </CollapsedNavTooltip>

            <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
              <div className="ml-[31px] mt-1 space-y-0.5 border-l border-white/10 pl-3">
                {item.subItems?.map((sub) => {
                  if (sub.comingSoon) {
                    return (
                      <span
                        key={sub.label}
                        className="flex items-center justify-between w-full px-2.5 py-2 rounded-[7px] text-[12px] text-white/35 cursor-not-allowed"
                      >
                        <span>{sub.label}</span>
                        <span className="ml-auto border border-amber-300/20 bg-amber-300/10 px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-amber-200/70 whitespace-nowrap">
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
                        "flex items-center justify-between w-full px-2.5 py-2 rounded-[7px] text-[12px] transition-colors",
                        subActive
                          ? "bg-[#38d5bc]/10 text-[#70ead7] font-semibold"
                          : "text-white/50 hover:bg-white/[0.06] hover:text-white/85"
                      )}
                    >
                      <span>{sub.label}</span>
                      {renderBadge(sub.badge)}
                      {sub.imageUrl === "user-avatar" && (
                        (user as unknown as { profilePicture?: string })?.profilePicture ? (
                          <Image src={(user as unknown as { profilePicture: string }).profilePicture} alt="Avatar" width={18} height={18} className="ml-auto w-[18px] h-[18px] rounded-full object-cover" />
                        ) : (
                          <div className="ml-auto w-[18px] h-[18px] rounded-full bg-[#38d5bc]/15 flex items-center justify-center text-[9px] font-semibold text-[#70ead7] capitalize">
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
          <CollapsedNavTooltip label={`${item.label} · Coming soon`} show={!isExpanded}>
            <span
              className={cn(
                "flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] text-white/30 cursor-not-allowed",
                !isExpanded && "justify-center px-2.5"
              )}
            >
              <span className="shrink-0 flex size-8 items-center justify-center rounded-[8px] bg-white/[0.03] [&>svg]:size-[18px] [&>svg]:text-white/30">{item.icon}</span>
              <span className="flex-1 group-data-[collapsible=icon]:hidden">{item.label}</span>
              <span className="ml-auto border border-amber-300/20 bg-amber-300/10 px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-amber-200/70 group-data-[collapsible=icon]:hidden whitespace-nowrap">
                Soon
              </span>
            </span>
          </CollapsedNavTooltip>
        </SidebarMenuItem>
      );
    }

    const active = isActive(item.href);
    return (
      <SidebarMenuItem key={item.label}>
        <CollapsedNavTooltip label={item.label} show={!isExpanded}>
          <Link
            href={item.href}
            className={cn(
              "group/nav relative flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] transition-all duration-150",
              active
                ? "bg-white/[0.11] text-white font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                : "text-white/65 hover:bg-white/[0.07] hover:text-white",
              !isExpanded && "justify-center px-2.5"
            )}
          >
            {active && isExpanded && <span className="absolute left-0 h-5 w-[3px] rounded-r-full bg-[#38d5bc]" />}
            <span className={cn("relative shrink-0 flex size-8 items-center justify-center rounded-[8px] transition-colors [&>svg]:size-[18px] [&>svg]:shrink-0", active ? "bg-[#24bda7]/20 [&>svg]:text-[#55e2cc]" : "bg-white/[0.04] [&>svg]:text-white/55 group-hover/nav:[&>svg]:text-white/85")}>
              {item.icon}
              {!isExpanded && renderBadge(item.badge, true)}
            </span>
            <span className="flex-1 group-data-[collapsible=icon]:hidden">{item.label}</span>
            {isExpanded && renderBadge(item.badge)}
          </Link>
        </CollapsedNavTooltip>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-white/[0.06] !bg-[#0b1f1a] text-white [&_[data-slot=sidebar-inner]]:!bg-[#0b1f1a]">
      {/* ── Header: Logo + Toggle ── */}
      <SidebarHeader className="border-b border-white/[0.07] px-0! py-0! space-y-0 bg-[#0b1f1a]">
        <div className="flex flex-col">
          <div
            className={cn(
              "flex items-center h-[72px] transition-all duration-300",
              isExpanded ? "justify-between px-4" : "justify-center"
            )}
          >
            {isExpanded ? (
              <>
                <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
                  <Image
                    src="/images/villeto-logo-v.png"
                    alt="Villeto"
                    width={27}
                    height={24}
                    className="object-contain"
                    priority
                  />
                  <span className="text-[20px] font-semibold tracking-[-0.04em] text-white">Villeto</span>
                </Link>
                {!isTourActive && <SidebarTrigger className="shrink-0 cursor-pointer rounded-[8px] text-white/45 hover:bg-white/[0.08] hover:text-white" />}
              </>
            ) : (
              !isTourActive && (
                <CollapsedNavTooltip label="Expand navigation" show>
                  <SidebarTrigger className="shrink-0 cursor-pointer rounded-[8px] text-white/45 hover:bg-white/[0.08] hover:text-white" />
                </CollapsedNavTooltip>
              )
            )}
          </div>

          {/* ── Company Selector ── */}
          <div className={cn("px-3 pb-3", !isExpanded && "flex justify-center px-2")}>
            {isExpanded ? (
              <div className="flex items-center gap-2.5 rounded-[11px] border border-white/[0.08] bg-white/[0.05] px-3 py-2.5 w-full">
                <div className="flex-shrink-0 w-8 h-8 overflow-hidden rounded-[8px] ring-1 ring-white/10">
                  {renderLogo()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/35">Workspace</p>
                  <p className="truncate text-[13px] font-semibold text-white/90">
                    {loading ? <Skeleton className="h-4 w-28 bg-white/10" /> : (businessName || "Business Name")}
                  </p>
                </div>
              </div>
            ) : (
              <CollapsedNavTooltip label={businessName || "Workspace"} show>
                <div className="w-8 h-8">{renderCollapsedLogo()}</div>
              </CollapsedNavTooltip>
            )}
          </div>
        </div>
      </SidebarHeader>

      {/* ── Nav Content ── */}
      <SidebarContent className={cn(
        "px-2.5 py-3 overflow-y-auto bg-[#0b1f1a]",
        "scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent",
        "group-data-[state=collapsed]:[scrollbar-width:none] group-data-[state=collapsed]:[&::-webkit-scrollbar]:hidden"
      )}>
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
      <SidebarFooter className="border-t border-white/[0.07] bg-[#0b1f1a] px-2.5 py-3">
        <CollapsedNavTooltip label="Log out" show={!isExpanded}>
          <button
            onClick={() => setShowLogoutModal(true)}
            className={cn(
              "flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-[12px] text-white/45 transition-colors hover:bg-red-400/10 hover:text-red-200",
              !isExpanded && "justify-center px-2"
            )}
          >
            <Logout className="size-[18px] shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">Log Out</span>
          </button>
        </CollapsedNavTooltip>
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
