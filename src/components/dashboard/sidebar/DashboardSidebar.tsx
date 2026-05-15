"use client";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTourStore } from "@/stores/useTourStore";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSubButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible";
import { useAuthStore } from "@/stores/auth-stores";
import { Logout } from "iconsax-reactjs";
import { NavItem, navigationItems } from "./sidebar-constants";
import { useAxios } from "@/hooks/useAxios";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

export function DashboardSidebar() {
  const location = usePathname();
  const searchParams = useSearchParams();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    // Auto-expand Expenses when on any /expenses route
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/expenses")) {
      return ["Expenses"];
    }
    return [];
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const logout = useAuthStore((state) => state.logout);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const axios = useAxios();
  const { state, setOpen } = useSidebar();
  const isTourActive = useTourStore((s) => s.isTourActive);

  // ── Force sidebar open for the entire duration of the tour ──
  useEffect(() => {
    if (isTourActive) {
      setOpen(true);
    }
  }, [isTourActive, state, setOpen]);

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
    staleTime: 1000 * 60 * 60, // 1 hour caching to persist efficiently
  });

  const businessLogo = companyData?.logoUrl ?? user?.company?.logoUrl ?? null;
  const businessName = companyData?.companyName ?? companyData?.businessName ?? user?.company?.companyName ?? user?.company?.businessName ?? null;
  const loading = isQueryLoading && !businessLogo && !businessName;

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label],
    );
  };

  const isActive = (href: string) => {
    // Strip query parameters for active state matching
    const basePath = href.split("?")[0];
    if (basePath === "/dashboard") {
      return location === basePath;
    }

    if (location === "/settings/personal-settings") {
      const activeTab = searchParams.get("tab");
      if (basePath === "/settings/company-settings") {
        return activeTab === "company-profile";
      }
      if (basePath === "/settings/personal-settings") {
        return activeTab === "my-profile" || !activeTab;
      }
    }

    return location.startsWith(basePath);
  };

  const canViewCompanyExpenses = hasPermission(["company_expenses:read"]);

  const filterItems = (items: NavItem[]): NavItem[] => {
    return items
      .map((item) => {
        let currentItem = { ...item };

        // Append default tab query param for Expenses based on user role
        if (currentItem.href === "/expenses") {
          currentItem.href = canViewCompanyExpenses
            ? "/expenses?tab=company-expenses"
            : "/expenses?tab=personal-expenses";
        }

        if (currentItem.subItems) {
          const filteredSubs = currentItem.subItems.filter((sub) =>
            hasPermission(sub.permission),
          );
          if (!hasPermission(currentItem.permission) && filteredSubs.length === 0)
            return null;
          currentItem.subItems = filteredSubs;
          return currentItem;
        } else {
          if (!hasPermission(currentItem.permission)) return null;
          return currentItem;
        }
      })
      .filter(Boolean) as NavItem[];
  };
  const filteredNavigationItems = filterItems(navigationItems);
  const renderLogo = () => {
    if (loading) return <Skeleton className="w-full h-full rounded-full" />;
    if (businessLogo)
      return (
        <Image
          src={businessLogo}
          alt="Business Logo"
          width={36}
          height={36}
          className="w-full h-full object-contain"
          unoptimized={
            businessLogo.startsWith("data:") || businessLogo.startsWith("http")
          }
        />
      );
    return (
      <div className="w-full h-full rounded-full bg-dashboard-accent/10 flex items-center justify-center shrink-0">
        <span className="text-sm font-semibold text-dashboard-accent">
          {businessName?.charAt(0).toUpperCase() || "B"}
        </span>
      </div>
    );
  };
  const renderCollapsedLogo = () => {
    if (loading) return <Skeleton className="w-10 h-10 rounded-full" />;
    if (businessLogo)
      return (
        <Image
          src={businessLogo}
          alt={businessName || "Business Logo"}
          width={40}
          height={40}
          className="w-10 h-10 object-contain rounded-full"
          unoptimized={
            businessLogo.startsWith("data:") || businessLogo.startsWith("http")
          }
        />
      );
    return (
      <div className="w-10 h-10 rounded-full bg-dashboard-accent/10 flex items-center justify-center shrink-0">
        <span className="text-lg font-semibold text-dashboard-accent">
          {businessName?.charAt(0).toUpperCase() || "B"}
        </span>
      </div>
    );
  };
  const renderMenuItem = (item: NavItem) => {
    const hasExpandable = item.subItems && item.subItems.length > 0;
    if (hasExpandable) {
      const isOpen = expandedMenus.includes(item.label);
      const isGroupActive = item.subItems?.some(sub => sub.href && isActive(sub.href)) || isActive(item.href);
      return (
        <SidebarMenuItem key={item.label}>
          <Collapsible
            open={isOpen}
            onOpenChange={() => toggleMenu(item.label)}
          >
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                tooltip={item.label}
                isActive={isGroupActive}
                className="font-normal text-sm text-[#7F7F7F] data-[active=true]:text-primary data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium"
              >
                <span className="shrink-0 [&>svg]:size-5 [&>svg]:shrink-0">
                  {item.icon}
                </span>
                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                <ChevronRight
                  className={cn(
                    "ml-auto h-4 w-4 transition-transform duration-200 group-data-[collapsible=icon]:hidden",
                    isOpen && "rotate-90",
                  )}
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-1 pl-8 group-data-[collapsible=icon]:hidden">
              {item.subItems?.map((sub) => {
                if (sub.comingSoon) {
                  return (
                    <span
                      key={sub.label}
                      className="flex items-center justify-between w-full px-2 py-1.5 text-xs opacity-50 cursor-not-allowed"
                    >
                      <span>{sub.label}</span>
                      <span className="ml-auto bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap">
                        Coming Soon
                      </span>
                    </span>
                  );
                }
                return (
                  <SidebarMenuSubButton
                    key={sub.label}
                    asChild
                    isActive={isActive(sub.href!)}
                    className={cn(
                      "text-xs",
                      isActive(sub.href!) &&
                        "bg-sidebar-accent/20 font-medium text-primary",
                    )}
                  >
                    <Link href={sub.href!} className="flex items-center justify-between w-full">
                      <span>{sub.label}</span>
                      {sub.badge && (
                          <span className="ml-auto bg-[#F4F0FF] text-[#6941C6] px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap">
                              {sub.badge}
                          </span>
                      )}
                      {sub.imageUrl === "user-avatar" && (
                          (user as any)?.profilePicture ? (
                              <img src={(user as any).profilePicture} alt="Avatar" className="ml-auto w-5 h-5 rounded-full object-cover" />
                          ) : (
                              <div className="ml-auto w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600 capitalize">
                                  {user?.firstName?.[0] || user?.email?.[0] || "U"}
                              </div>
                          )
                      )}
                    </Link>
                  </SidebarMenuSubButton>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>
      );
    }
    if (!item.href) return null;
    // Coming Soon items: render as span, not link
    if (item.comingSoon) {
      return (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton
            tooltip={item.label}
            className="opacity-50 cursor-not-allowed hover:bg-transparent hover:text-[#7F7F7F]"
          >
            <span className="shrink-0 [&>svg]:size-5 [&>svg]:shrink-0">{item.icon}</span>
            <span className="group-data-[collapsible=icon]:hidden flex-1">{item.label}</span>
            <span className="ml-auto bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-semibold group-data-[collapsible=icon]:hidden whitespace-nowrap">
              Coming Soon
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }
    return (
      <SidebarMenuItem key={item.label}>
        <SidebarMenuButton
          asChild
          isActive={isActive(item.href)}
          tooltip={item.label}
          className="font-normal text-sm text-[#7F7F7F] data-[active=true]:text-primary data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium"
        >
          <Link href={item.href}>
            <span className="shrink-0 [&>svg]:size-5 [&>svg]:shrink-0">{item.icon}</span>
            <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="w-full border-b border-sidebar-border px-0! py-0! space-y-0">
        <div className="flex flex-col">
          {/* Villeto Logo + Toggle - Fixed height h-16 (64px) to match main header border line */}
          <div
            className={cn(
              "flex items-center h-16 border-b border-sidebar-border transition-all duration-300",
              state === "expanded" ? "justify-between px-4" : "justify-center",
            )}
          >
            {state === "expanded" ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <Image
                    src="/images/villeto-logo.png"
                    alt="Villeto Logo"
                    width={90}
                    height={28}
                    className="h-auto max-h-7 object-contain"
                    priority
                  />
                </Link>
                {/* Hide collapse trigger while tour is active */}
                {!isTourActive && <SidebarTrigger className="shrink-0 cursor-pointer" />}
              </>
            ) : (
              /* Hide collapse trigger while tour is active */
              !isTourActive && <SidebarTrigger className="shrink-0 cursor-pointer" />
            )}
          </div>
          {/* Company Selector - placed below the primary header alignment line */}
          <div
            className={cn(
              "flex items-center transition-all duration-300 px-3 py-1",
              state === "expanded" ? "" : "justify-center",
            )}
          >
            {state === "expanded" ? (
              <div className="w-full flex items-center bg-muted rounded-lg px-3 my-1 gap-3 h-10">
                <div className=" flex items-center justify-center shrink-0 w-6 h-6 overflow-hidden">
                  {renderLogo()}
                </div>
                <span className="flex-1 text-sm font-medium text-dashboard-text-primary truncate">
                  {loading ? (
                    <Skeleton className="h-5 w-40" />
                  ) : (
                    businessName || "Business Name"
                  )}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-6 h-6 my-2">
                {renderCollapsedLogo()}
              </div>
            )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="py-4">
        <SidebarMenu className="space-y-1 px-3">
          {filteredNavigationItems.map((item) => renderMenuItem(item))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-3 py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setShowLogoutModal(true)}
              tooltip="Log Out"
              className="font-normal text-sm text-[#7F7F7F] hover:text-destructive hover:bg-sidebar-accent"
            >
              <Logout className="size-5 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Log Out</h2>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to log out?</p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                No, cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  logout();
                  router.push("/login");
                }}
                className="flex-1 h-11 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors shadow-sm"
              >
                Yes, log out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Sidebar>
  );
}
