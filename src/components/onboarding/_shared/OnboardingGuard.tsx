"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOnboardingStore } from "@/stores/useVilletoStore";

/**
 * Protects onboarding routes by checking for a valid onboardingId.
 * Redirects to /pre-onboarding if no onboardingId is found in the store.
 */
export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
    const { onboardingId } = useOnboardingStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!onboardingId) {
            router.replace("/pre-onboarding");
        }
    }, [onboardingId, router]);

    // Clear any stale Radix Dialog/Select body lock left behind across client-side navigation.
    useEffect(() => {
        const hasOpenModal = document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
        if (!hasOpenModal) {
            if (document.body.style.pointerEvents === "none") {
                document.body.style.pointerEvents = "";
            }
            if (document.body.style.overflow === "hidden") {
                document.body.style.overflow = "";
            }
        }
    }, [pathname]);

    if (!onboardingId) {
        return null;
    }

    return <>{children}</>;
}
