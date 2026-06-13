import { useEffect, useRef } from "react";
import { useOnboardingStore } from "@/stores/useVilletoStore";
import {
    useGetOnboardingDetailsApi,
    type Onboarding,
} from "@/queries/pre-onboarding/get-onboarding-details";

type Company = Onboarding["company"];
type Owner = NonNullable<Company["owners"]>[number];
type ControllingOfficer = NonNullable<Company["controllingOfficers"]>[number];

/**
 * Fetches onboarding details from the API and hydrates the Zustand store.
 * Call this hook at the top of each onboarding page so that data persists
 * across navigation and page refresh.
 */
export const useHydrateOnboardingData = () => {
    const {
        onboardingId,
        businessSnapshot,
        updateBusinessSnapshot,
        updateUserProfiles,
    } = useOnboardingStore();

    const hasHydrated = useRef(false);

    const { data, isLoading, isError } = useGetOnboardingDetailsApi(
        onboardingId,
        { enabled: !!onboardingId }
    );

    useEffect(() => {
        if (!data?.data || hasHydrated.current) return;

        const onboarding = data.data;
        const company = onboarding.company;

        // Hydrate business snapshot
        updateBusinessSnapshot({
            businessName: company.companyName || "",
            contactNumber: company.contactPhone || "",
            countryOfRegistration: company.countryOfRegistration || "",
            website: company.websiteUrl || "",
            logo: company.logo || company.logoUrl || (businessSnapshot.logo as string) || undefined,
        });

        // Hydrate leadership (owners + controlling officers → userProfiles)
        const ownerProfiles = (company.owners || []).map((owner: Owner) => ({
            id: owner.ownerId || owner.user?.userId || Date.now().toString(),
            firstName: owner.user?.firstName || "",
            lastName: owner.user?.lastName || "",
            email: owner.user?.email || "",
            role: owner.user?.role || "",
            phone: owner.user?.phone || undefined,
        }));

        const officerProfiles = (company.controllingOfficers || []).map((officer: ControllingOfficer) => ({
            id: officer.controllingOfficerId || officer.user?.userId || Date.now().toString(),
            firstName: officer.user?.firstName || "",
            lastName: officer.user?.lastName || "",
            email: officer.user?.email || "",
            role: officer.user?.role || "",
        }));

        const allProfiles = [...ownerProfiles, ...officerProfiles];
        if (allProfiles.length > 0) {
            updateUserProfiles(allProfiles);
        }

        // Hydrate financial pulse (spend limit)
        const spendLimit = company.spendLimit;
        if (spendLimit) {
            const ranges = [
                { value: 0, label: "<$10k", lower: 0 },
                { value: 1, label: "$10k-$50k", lower: 10000 },
                { value: 2, label: "$50k-$200k", lower: 50000 },
                { value: 3, label: "$200k+", lower: 200000 },
            ];

            const foundRange = ranges.find(r => r.lower === spendLimit.lower);
            if (foundRange) {
                // Update top-level financial state
                useOnboardingStore.setState({
                    monthlySpend: foundRange.value,
                    spendRange: foundRange.label
                });
                
                // Update financialPulse.monthlySpend for Review page display
                const store = useOnboardingStore.getState();
                store.updateFinancialPulse({
                    monthlySpend: foundRange.label
                });
            }
        }

        // Hydrate products — only if user hasn't already made local selections
        // (e.g. via toggleProduct on the products page, which saves to cookies).
        // This prevents stale API cache data from overwriting fresh local selections.
        const store = useOnboardingStore.getState();
        const hasLocalSelections = store.villetoProducts.some((p) => p.selected);
        const apiModules: string[] = [...(company.productModules ?? [])];
        if (apiModules.length > 0 && !hasLocalSelections) {
            const updatedProducts = store.villetoProducts.map((product) => ({
                ...product,
                selected: apiModules.includes(product.value),
            }));
            useOnboardingStore.setState({ villetoProducts: updatedProducts });
        }

        hasHydrated.current = true;
    }, [data, businessSnapshot.logo, updateBusinessSnapshot, updateUserProfiles]);

    return { isLoading, isError, data };
};
