"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/stores/useVilletoStore";

/**
 * Protects onboarding routes by checking for a valid onboardingId.
 * Redirects to /pre-onboarding if no onboardingId is found in the store.
 */
export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
    const { onboardingId } = useOnboardingStore();
    const router = useRouter();

    useEffect(() => {
        if (!onboardingId) {
            router.replace("/pre-onboarding");
        }
    }, [onboardingId, router]);

    if (!onboardingId) {
        return null;
    }

    return <>{children}</>;
}
