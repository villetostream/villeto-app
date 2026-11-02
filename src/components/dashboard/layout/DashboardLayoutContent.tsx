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
import {
  useSyncExternalStore,
  useEffect,
  useState,
} from "react";
import { useAuthStore } from "@/stores/auth-stores";
import DashboardModals from "@/components/dashboard/layout/DashboardModals";
import IdleSessionManager from "./IdleSessionManager";
import VilletoTourGuide from "@/components/tour/VilletoTourGuide";
import VilletoSetupGuide from "@/components/tour/VilletoSetupGuide";
import { useTourStore } from "@/stores/useTourStore";
import { ChatPortal } from "@/components/chat";
import { SplashScreen } from "@/components/ui/splash-screen";
import SilentRefreshGate from "@/components/dashboard/layout/SilentRefreshGate";
import { useAuthorizationRefresh } from "@/features/auth/use-authorization-refresh";
import { EntityWorkspaceContent } from "@/features/entity-workspace/EntityWorkspaceContent";
import { EntityWorkspaceProvider } from "@/features/entity-workspace/EntityWorkspaceProvider";
import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";

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
  const isMounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const workspaceGeneration = useEntityWorkspaceStore(
    (state) => state.generation,
  );
  const { user, isLoading } = useAuthStore();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isTourActive = useTourStore((s) => s.isTourActive);
  const setupGuideReady = useTourStore((s) => s.setupGuideReady);


  // Spend-program settings are fetched lazily by the Policies page when
  // the user navigates there — no need to prefetch here on login.
  const [silentRefreshDone, setSilentRefreshDone] = useState(false);
  useAuthorizationRefresh(!isLoading && silentRefreshDone);

  useEffect(() => {
    // Lock body scroll to prevent double scrollbars in dashboard
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

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
    <div
      className="flex h-screen overflow-hidden bg-[#f4f7f5]"
      suppressHydrationWarning
    >
      {/* Silent token refresh — mounted always so it re-runs on each hard refresh */}
      <SilentRefreshGate onDone={() => setSilentRefreshDone(true)} />
      <EntityWorkspaceProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <DashboardSidebar isProfileLoading={!user.authorization} />
          <div className="flex flex-col flex-1 h-full overflow-hidden">
            <header className="relative z-10 flex h-[72px] w-full shrink-0 items-center gap-3 border-b border-black/[0.06] bg-white/95 px-3 shadow-[0_1px_0_rgba(16,35,29,0.02)] backdrop-blur sm:px-5 lg:px-6">
              {/* Hide mobile collapse trigger during tour so sidebar stays open */}
              {!isTourActive && (
                <SidebarTrigger className="md:hidden shrink-0 rounded-[9px] border border-black/[0.06] bg-[#f4f8f6] text-[#53615c] hover:bg-[#eaf3ef] hover:text-[#087f70]" />
              )}
              <UserSection key={workspaceGeneration} />
            </header>

            <main
              key={workspaceGeneration}
              className="flex-1 overflow-y-auto bg-[#f4f7f5] p-3 sm:p-5 lg:p-6 scrollbar-thin scrollbar-thumb-black/10 scrollbar-track-transparent"
            >
              <EntityWorkspaceContent>{children}</EntityWorkspaceContent>
            </main>
          </div>
        </SidebarProvider>
      </EntityWorkspaceProvider>

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
