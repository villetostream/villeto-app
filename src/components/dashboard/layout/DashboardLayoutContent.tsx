"use client";

import { DashboardSidebar } from "@/components/dashboard/sidebar/DashboardSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { UserSection } from "@/components/user/user-section";
import { useEffect, useState } from "react";
import { useAuthStore, User } from "@/stores/auth-stores";
import { useAxios } from "@/hooks/useAxios";
import { usePathname, useRouter } from "next/navigation";
import DashboardModals from "@/components/dashboard/layout/DashboardModals";
import VilletoTourGuide from "@/components/tour/VilletoTourGuide";

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
  const { setUserPermissions, login, user, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

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
  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    (async () => {
      try {
        const me = await axios.get("/users/me");
        const responseData = me?.data?.data || me?.data;
        const { role, company, companyId, ...userData } = responseData || {};

        if (userData) {
          // Ensure companyId is included in user data
          const userWithCompany = {
            ...user,
            ...userData,
            companyId: companyId || userData.companyId || user?.companyId,
          };

          login(userWithCompany as User);
        }

        if (role) {
          setUserPermissions(role.permissions);
        }
      } catch (err) {
        // Silently handle — user session may still be valid
      }
    })();
  }, [isLoading]);

  if (!isMounted) {
    return (
      <div className="flex h-screen bg-dashboard-background">
        <div className="flex-1 flex flex-col overflow-hidden" />
      </div>
    );
  }

  return (
    <div className="flex bg-dashboard-background h-screen overflow-hidden ">
      <SidebarProvider defaultOpen={defaultOpen}>
        <DashboardSidebar />
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          <header className="flex items-center gap-4 px-6 h-16 border-b border-dashboard-border-shade w-full flex-shrink-0">
            <SidebarTrigger className="md:hidden" />
            <UserSection />
          </header>

          <main className="flex-1 overflow-y-auto p-5" key={pathname}>
            {children}
          </main>
        </div>
      </SidebarProvider>

      {/* Renders dynamic onboarding/password modals if the user meets the conditions */}
      <DashboardModals />
      <VilletoTourGuide />
    </div>
  );
}
