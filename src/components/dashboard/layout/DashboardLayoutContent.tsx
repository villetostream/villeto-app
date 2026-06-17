"use client";

/**
 * DashboardLayoutContent
 * ─────────────────────────────────────────────────────────────
 * Changed (Setup Guide update):
 *  • Imports and mounts <VilletoSetupGuide /> alongside the
 *    existing <VilletoTourGuide />.
 *  • VilletoTourGuide excludes Setup Guide users internally,
 *    so both can coexist without conflict.
 * ─────────────────────────────────────────────────────────────
 */

import { DashboardSidebar } from "@/components/dashboard/sidebar/DashboardSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { UserSection } from "@/components/user/user-section";
import { useSyncExternalStore, useEffect, useCallback, useRef } from "react";
import { useAuthStore, User } from "@/stores/auth-stores";
import { useAxios } from "@/hooks/useAxios";
import { useRouter } from "next/navigation";
import DashboardModals from "@/components/dashboard/layout/DashboardModals";
import VilletoTourGuide from "@/components/tour/VilletoTourGuide";
import VilletoSetupGuide from "@/components/tour/VilletoSetupGuide";
import { useTourStore } from "@/stores/useTourStore";
import { ChatPortal } from "@/components/chat";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function DashboardLayoutContent({
  children,
  defaultOpen = false,
}: DashboardLayoutProps) {
  const isMounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const axios = useAxios();
  const { setCompanyPermissions, login, logout, user, isLoading } = useAuthStore();
  const router = useRouter();
  const isTourActive = useTourStore((s) => s.isTourActive);
  const setupGuideReady = useTourStore((s) => s.setupGuideReady);

  useEffect(() => {
    // Lock body scroll to prevent double scrollbars in dashboard
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  // Refreshes the user profile and permissions so admin role changes propagate
  // without requiring re-login. Recreated only when the axios instance changes.
  const refreshUserAndPermissions = useCallback(async () => {
    try {
      const me = await axios.get("/users/me");
      const responseData = me?.data?.data || me?.data;
      const { role, _company, companyId, ...userData } = responseData || {};

      if (userData) {
        const currentUser = useAuthStore.getState().user;
        login({
          ...currentUser,
          ...userData,
          companyId: companyId || userData.companyId || currentUser?.companyId,
        } as User);
      }

      if (role || responseData?.companyRole) {
        const permissions = responseData?.companyRole?.permissions ?? role?.permissions ?? [];
        setCompanyPermissions(permissions);
      }
    } catch {
      // Silently handle — user session may still be valid
    }
  }, [axios, login, setCompanyPermissions]);

  // Always hold the latest version of the function so setInterval/addEventListener
  // call the current closure without needing to be listed as effect deps.
  const refreshRef = useRef(refreshUserAndPermissions);
  useEffect(() => { refreshRef.current = refreshUserAndPermissions; });

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      logout();
      router.replace("/login");
      return;
    }

    // Initial fetch on mount
    refreshRef.current();

    // Re-check permissions every 5 min so admin role changes propagate without re-login.
    // Using refreshRef so this never causes the effect to re-run when the function identity changes.
    const interval = setInterval(() => refreshRef.current(), 5 * 60 * 1000);
    const handleFocus = () => refreshRef.current();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  // Intentionally only isLoading: runs once after hydration.
  // Adding user/router here would create an infinite loop because refreshUserAndPermissions
  // updates user, which would re-trigger this effect endlessly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  if (!isMounted) {
    return (
      <div className="flex h-screen bg-dashboard-background" suppressHydrationWarning>
        <div className="flex-1 flex flex-col overflow-hidden" suppressHydrationWarning />
      </div>
    );
  }

  if (!isLoading && !user) {
    return (
      <div className="flex h-screen bg-dashboard-background" suppressHydrationWarning />
    );
  }

  return (
    <div className="flex bg-dashboard-background h-screen overflow-hidden" suppressHydrationWarning>
      <SidebarProvider defaultOpen={defaultOpen}>
        <DashboardSidebar />
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          <header className="flex items-center gap-4 px-4 sm:px-6 h-16 border-b border-dashboard-border-shade w-full shrink-0">
            {/* Hide mobile collapse trigger during tour so sidebar stays open */}
            {!isTourActive && <SidebarTrigger className="md:hidden" />}
            <UserSection />
          </header>

          <main className="flex-1 overflow-y-auto p-3 sm:p-5">
            {children}
          </main>
        </div>
      </SidebarProvider>

      {/* System-level modals (force-password reset, etc.) */}
      <DashboardModals />

      {/*
       * VilletoTourGuide — informational tour for all users EXCEPT
       * those who qualify for the interactive Setup Guide.
       * (Exclusion is handled inside VilletoTourGuide itself.)
       */}
      {setupGuideReady && <VilletoTourGuide />}

      {/*
       * VilletoSetupGuide — interactive workspace-setup flow for
       * CONTROLLING_OFFICER / ORGANIZATION_OWNER users on first login.
       * Activates AFTER SetPasswordModal closes (via setupGuideReady flag).
       */}
      {setupGuideReady && <VilletoSetupGuide />}
      <ChatPortal />
    </div>
  );
}
