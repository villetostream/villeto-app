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
import { useEffect, useState } from "react";
import { useAuthStore, User } from "@/stores/auth-stores";
import { useAxios } from "@/hooks/useAxios";
import { usePathname, useRouter } from "next/navigation";
import DashboardModals from "@/components/dashboard/layout/DashboardModals";
import VilletoTourGuide from "@/components/tour/VilletoTourGuide";
import VilletoSetupGuide from "@/components/tour/VilletoSetupGuide";
import { useTourStore } from "@/stores/useTourStore";
import { ChatPortal } from "@/components/chat";

interface DashboardLayoutProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function DashboardLayoutContent({
  children,
  defaultOpen = false,
}: DashboardLayoutProps) {
  const [isMounted, setIsMounted] = useState(false);
  const axios = useAxios();
  const { setCompanyPermissions, login, user, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isTourActive = useTourStore((s) => s.isTourActive);

  useEffect(() => {
    setIsMounted(true);

    // Lock body scroll to prevent double scrollbars in dashboard
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  // Refreshes the current user's profile and permissions from the server.
  // Called on initial mount, periodically, and on window focus, so that
  // permission changes made by an admin mid-session (e.g. a role downgrade)
  // take effect without requiring the user to log out and back in.
  const refreshUserAndPermissions = async () => {
    try {
      const me = await axios.get("/users/me");
      const responseData = me?.data?.data || me?.data;
      const { role, company, companyId, ...userData } = responseData || {};

      if (userData) {
        const currentUser = useAuthStore.getState().user;
        const userWithCompany = {
          ...currentUser,
          ...userData,
          companyId: companyId || userData.companyId || currentUser?.companyId,
        };
        login(userWithCompany as User);
      }

      if (role || responseData?.companyRole) {
        const permissions = responseData?.companyRole?.permissions ?? role?.permissions ?? [];
        setCompanyPermissions(permissions);
      }
    } catch {
      // Silently handle — user session may still be valid
    }
  };

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    refreshUserAndPermissions();

    // Periodically re-check permissions every 5 minutes so role/permission
    // changes made by an admin propagate without requiring re-login.
    const interval = setInterval(refreshUserAndPermissions, 5 * 60 * 1000);

    // Also refresh when the tab regains focus — covers the common case of
    // an admin changing a user's role in another tab/session while this
    // tab was inactive.
    const onFocus = () => refreshUserAndPermissions();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isMounted) {
    return (
      <div className="flex h-screen bg-dashboard-background" suppressHydrationWarning>
        <div className="flex-1 flex flex-col overflow-hidden" suppressHydrationWarning />
      </div>
    );
  }

  return (
    <div className="flex bg-dashboard-background h-screen overflow-hidden" suppressHydrationWarning>
      <SidebarProvider defaultOpen={defaultOpen}>
        <DashboardSidebar />
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          <header className="flex items-center gap-4 px-6 h-16 border-b border-dashboard-border-shade w-full flex-shrink-0">
            {/* Hide mobile collapse trigger during tour so sidebar stays open */}
            {!isTourActive && <SidebarTrigger className="md:hidden" />}
            <UserSection />
          </header>

          <main className="flex-1 overflow-y-auto p-5" key={pathname}>
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
      <VilletoTourGuide />

      {/*
       * VilletoSetupGuide — interactive workspace-setup flow for
       * CONTROLLING_OFFICER / ORGANIZATION_OWNER users on first login.
       * Activates AFTER SetPasswordModal closes (via setupGuideReady flag).
       */}
      <VilletoSetupGuide />
      <ChatPortal />
    </div>
  );
}
