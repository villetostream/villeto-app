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
import { useSyncExternalStore, useEffect, useCallback, useRef, useState } from "react";
import { useAuthStore, User } from "@/stores/auth-stores";
import { useAxios } from "@/hooks/useAxios";
import DashboardModals from "@/components/dashboard/layout/DashboardModals";
import IdleSessionManager from "./IdleSessionManager";
import VilletoTourGuide from "@/components/tour/VilletoTourGuide";
import VilletoSetupGuide from "@/components/tour/VilletoSetupGuide";
import { useTourStore } from "@/stores/useTourStore";
import { ChatPortal } from "@/components/chat";
import { SplashScreen } from "@/components/ui/splash-screen";
import SilentRefreshGate from "@/components/dashboard/layout/SilentRefreshGate";
import {
  AUTHORIZATION_FOCUS_MAX_AGE_MS,
  AUTHORIZATION_INVALIDATED_EVENT,
  parseAuthorizationSnapshot,
} from "@/features/auth/authorization";
import { logoutAndRedirect } from "@/lib/logout";
import { useGetSpendProgramSettings } from "@/queries/procurement/policies";

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
  const { login, logout, user, isLoading } = useAuthStore();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isTourActive = useTourStore((s) => s.isTourActive);
  const setupGuideReady = useTourStore((s) => s.setupGuideReady);

  const canViewPolicies = useAuthStore(s => s.can)('policy', 'view');

  // Eagerly fetch spend program settings so they are cached by the time the user navigates to Policies
  useGetSpendProgramSettings({ enabled: !!user && canViewPolicies });

  const [profileFetched, setProfileFetched] = useState(false);
  const [silentRefreshDone, setSilentRefreshDone] = useState(false);

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
      const { _company, companyId, ...userData } = responseData || {};

      if (userData) {
        if (
          userData.isActive === false ||
          userData.status === "DELETED" ||
          userData.status === "deleted" ||
          userData.deletedAt
        ) {
          logoutAndRedirect();
          return;
        }

        const currentUser = useAuthStore.getState().user;
        const authorization = parseAuthorizationSnapshot(userData.authorization);
        login({
          ...currentUser,
          ...userData,
          companyId: companyId || userData.companyId || currentUser?.companyId,
          authorization,
        } as User);
      }
    } catch {
      // Silently handle — user session may still be valid
    } finally {
      setProfileFetched(true);
    }
  }, [axios, login]);

  // Always hold the latest version of the function so setInterval/addEventListener
  // call the current closure without needing to be listed as effect deps.
  const refreshRef = useRef(refreshUserAndPermissions);
  useEffect(() => { refreshRef.current = refreshUserAndPermissions; });

  useEffect(() => {
    if (isLoading) return;
    if (!silentRefreshDone) return; // Wait for SilentRefreshGate to finish first

    // Re-read user from the store — it may have been populated by SilentRefreshGate
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) {
      logoutAndRedirect();
      return;
    }

    // Initial fetch on mount
    refreshRef.current();

    // Re-check permissions every 2 min so admin role changes propagate without re-login.
    const interval = setInterval(() => { void refreshRef.current(); }, 2 * 60 * 1000);

    const handleFocus = () => {
      if (useAuthStore.getState().isAuthorizationStale(AUTHORIZATION_FOCUS_MAX_AGE_MS)) {
        void refreshRef.current();
      }
    };

    const handleAuthorizationInvalidated = () => {
      void refreshRef.current();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener(AUTHORIZATION_INVALIDATED_EVENT, handleAuthorizationInvalidated);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(AUTHORIZATION_INVALIDATED_EVENT, handleAuthorizationInvalidated);
    };
  // Runs once after hydration AND after silent refresh completes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, silentRefreshDone]);

  // Ensure the premium splash screen is visible long enough to play its animation
  // when the user first boots the app or logs in.
  const [minSplashTimeMet, setMinSplashTimeMet] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashTimeMet(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  if (!isMounted || isLoading || !minSplashTimeMet) {
    return (
      <>
        <SilentRefreshGate onDone={() => setSilentRefreshDone(true)} />
        <SplashScreen />
      </>
    );
  }

  // While a silent refresh is in-flight (hard refresh scenario with no
  // sessionStorage), keep showing splash rather than bouncing to /login.
  if (!silentRefreshDone && !user) {
    return (
      <>
        <SilentRefreshGate onDone={() => setSilentRefreshDone(true)} />
        <SplashScreen />
      </>
    );
  }

  if (!user) {
    return <SplashScreen />;
  }

  if (!accessToken) {
    return <SplashScreen />; // Wait for initial proactive refresh
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7f5]" suppressHydrationWarning>
      {/* Silent token refresh — mounted always so it re-runs on each hard refresh */}
      <SilentRefreshGate onDone={() => setSilentRefreshDone(true)} />
      <SidebarProvider defaultOpen={defaultOpen}>
        <DashboardSidebar isProfileLoading={!profileFetched} />
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          <header className="relative z-10 flex h-[72px] w-full shrink-0 items-center gap-3 border-b border-black/[0.06] bg-white/95 px-3 shadow-[0_1px_0_rgba(16,35,29,0.02)] backdrop-blur sm:px-5 lg:px-6">
            {/* Hide mobile collapse trigger during tour so sidebar stays open */}
            {!isTourActive && (
              <SidebarTrigger className="md:hidden shrink-0 rounded-[9px] border border-black/[0.06] bg-[#f4f8f6] text-[#53615c] hover:bg-[#eaf3ef] hover:text-[#087f70]" />
            )}
            <UserSection />
          </header>

          <main className="flex-1 overflow-y-auto bg-[#f4f7f5] p-3 sm:p-5 lg:p-6 scrollbar-thin scrollbar-thumb-black/10 scrollbar-track-transparent">
            {children}
          </main>
        </div>
      </SidebarProvider>

      {/* Idle timeout manager */}
      <IdleSessionManager />

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
