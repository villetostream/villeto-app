import type { Metadata } from "next";
import { OnboardingSidebar } from "@/components/onboarding/_shared/OnboardingSidebar";
import OnboardingGuard from "@/components/onboarding/_shared/OnboardingGuard";
import QueryProvider from "@/providers/queryClientProvider";

export const metadata: Metadata = {
  title: "Set up your Villeto workspace",
  description: "Complete your company onboarding.",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f2f5f4] lg:h-dvh lg:flex-row lg:overflow-hidden">
      <OnboardingSidebar />
      <QueryProvider>
        <OnboardingGuard>
          <main className="min-w-0 flex-1 overflow-y-auto bg-white">
            <div className="mx-auto min-h-full w-full max-w-[920px] px-6 py-10 sm:px-10 lg:px-12 lg:py-14 xl:px-16">
              {children}
            </div>
          </main>
        </OnboardingGuard>
      </QueryProvider>
    </div>
  );
}
