"use client"
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpendingSlider } from "@/components/onboarding/financial/SpendingSlider";
import { getCurrencyConfig } from "@/lib/utils/currency";
import { BankConnection } from "@/components/onboarding/financial/BankConnection";
import { ConnectBankModal } from "@/components/onboarding/financial/ConnectBankModal";
import { useOnboardingStore } from "@/stores/useVilletoStore";
import { HugeiconsIcon } from '@hugeicons/react';
import { Invoice02Icon } from '@hugeicons/core-free-icons';
import OnboardingTitle from "@/components/onboarding/_shared/OnboardingTitle";
import { useRouter } from "next/navigation";
import { useUpdateOnboardingFinancialPulseApi } from "@/queries/onboarding/update-financial-pulse";
import { useHydrateOnboardingData } from "@/hooks/useHydrateOnboardingData";

export default function FinancialPulse() {
    const { bankConnected, connectedAccounts, spendRange, businessSnapshot } = useOnboardingStore();
    useHydrateOnboardingData();

    const router = useRouter()
    const updateFinancial = useUpdateOnboardingFinancialPulseApi()
    const loading = updateFinancial.isPending;
    const canContinue = bankConnected || connectedAccounts.length > 0;

    const handleSubmit = async () => {
        try {
            const config = getCurrencyConfig(businessSnapshot?.countryOfRegistration ?? "");
            const selectedRange = config.spendingRanges.find(r => r.label === spendRange);
            const _payload = {
                spendLimit: {
                    lower: selectedRange?.lower ?? 0,
                    upper: selectedRange?.upper ?? 0,
                },

            };

            // await updateFinancial.mutateAsync({ ...payload });
            router.push("/onboarding/products")
        } catch (_error) {

        }
    }

    return (
        <div className="mx-auto flex min-h-full max-w-[760px] bg-background py-4">
            <div className="flex flex-1 flex-col justify-center">

                {/* Header */}
                <div className="mb-9 text-left">
                    <div className="mb-5 flex size-11 items-center justify-center rounded-[10px] bg-[#e7f6f2]">
                        <HugeiconsIcon icon={Invoice02Icon} className="size-6 text-[#087f70]" />
                    </div>
                    <OnboardingTitle title="Your company spend profile" subtitle="Estimate your monthly spend and connect the account you will use with Villeto." />

                </div>

                {/* Form Content */}
                <div className="space-y-9">
                    <SpendingSlider />
                    <BankConnection />
                </div>

                {/* Continue Button */}
                <div className="mt-10 flex justify-end border-t border-black/[0.07] pt-5">
                    <Button
                        size="lg"
                        disabled={loading ?? !canContinue}
                        onClick={handleSubmit}
                        className="h-[50px] w-full rounded-[10px] bg-[#0ea894] px-8 text-[13px] font-semibold text-white hover:bg-[#0c9785] sm:w-auto"
                    >
                        {loading ? "Creating" : "   Continue"}
                        {loading ? <Loader2 className="size-6 animate-spin" /> : <svg className="w-4 h-4 ml-2" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12h14m-7-7 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>}
                    </Button>
                </div>

            </div>

            <ConnectBankModal />
        </div>
    );
};
