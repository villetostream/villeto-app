"use client"

import { useOnboardingStore } from '@/stores/useVilletoStore';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { ProductLoadingIcon, CreditCardIcon, Invoice04Icon, Store01Icon, ShoppingCart01Icon, Invoice03Icon } from '@hugeicons/core-free-icons';
import OnboardingTitle from '@/components/onboarding/_shared/OnboardingTitle';
import { useRouter } from 'next/navigation';
import { useUpdateOnboardingProductsApi } from '@/queries/onboarding/update-onboarding-product';
import { Loader2 } from 'lucide-react';
import { useHydrateOnboardingData } from '@/hooks/useHydrateOnboardingData';

const products = [
    {
        id: '1',
        name: 'Corporate Cards',
        description: 'Smart cards with spend controls',
        icon: CreditCardIcon,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
    },
    {
        id: '2',
        name: 'Expense Management',
        description: 'Automated tracking + approvals',
        icon: Invoice04Icon,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
    },
    {
        id: '3',
        name: 'Vendor Payments',
        description: 'Pay suppliers locally & globally',
        icon: Store01Icon,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
    },
    {
        id: '4',
        name: 'Procurement',
        description: 'Control all your purchases in one place',
        icon: ShoppingCart01Icon,
        color: 'text-pink-600',
        bgColor: 'bg-pink-50',
    },
    {
        id: '5',
        name: 'Accounts Payable/Receivable',
        description: 'Simplify invoices & collections',
        icon: Invoice03Icon,
        color: 'text-pink-600',
        bgColor: 'bg-pink-50',
    },
];

export default function ChooseProducts() {
    const { villetoProducts, toggleProduct } = useOnboardingStore();
    useHydrateOnboardingData();
    const updateOnboarding = useUpdateOnboardingProductsApi()
    const router = useRouter()
    const loading = updateOnboarding.isPending;

    const handleContinue = async () => {
        try {
            const payload = villetoProducts.filter((product) => product.selected).map((product) => product.value);
            await updateOnboarding.mutateAsync(payload);
            router.push("/onboarding/review");
        } catch (_error) {

        }
    };

    const isProductSelected = (productId: string) => {
        return villetoProducts.find(p => p.id === productId)?.selected || false;
    };

    // Check if at least one product is selected
    const isAnyProductSelected = villetoProducts.some(product => product.selected);

    return (
        <div className="flex h-full flex-col py-8">

            {/* Header */}
            <div className="mb-7 text-left">
                <div className="mb-5 flex size-11 items-center justify-center rounded-[10px] bg-[#e7f6f2]">
                    <HugeiconsIcon icon={ProductLoadingIcon} className="size-6 text-[#087f70]" />
                </div>
                <OnboardingTitle title="Choose your Villeto products" subtitle="Select the tools your team plans to use. You can change these later." />

            </div>

            {/* Products Grid */}
            <div className="mb-8 space-y-2.5">
                {products.map((product) => {
                    const Icon = product.icon;
                    const isSelected = isProductSelected(product.id);

                    return (
                        <button
                            type="button"
                            key={product.id}
                            className={`flex w-full cursor-pointer items-center justify-between rounded-[10px] border p-4 text-left transition-all duration-200 ${
                                isSelected
                                    ? 'border-[#0ea894]/40 bg-[#f0faf8] shadow-[0_4px_16px_rgba(14,168,148,0.08)]'
                                    : 'border-black/[0.08] bg-white shadow-[0_4px_16px_rgba(14,28,23,0.04)] hover:border-[#0ea894]/30'
                            }`}
                            onClick={() => toggleProduct(product.id)}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`flex size-10 shrink-0 items-center justify-center rounded-[8px] ${
                                    isSelected ? 'bg-[#e7f6f2]' : 'bg-[#f5f7f6]'
                                }`}>
                                    <HugeiconsIcon icon={Icon} className={`size-5 ${isSelected ? 'text-[#087f70]' : 'text-[#84908a]'}`} />
                                </div>
                                <div>
                                    <p className={`text-[13px] font-semibold ${
                                        isSelected ? 'text-[#0b100e]' : 'text-[#303834]'
                                    }`}>{product.name}</p>
                                    <p className="mt-0.5 text-[12px] text-[#84908a]">{product.description}</p>
                                </div>
                            </div>
                            <div className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                isSelected ? 'border-[#0ea894] bg-[#0ea894]' : 'border-black/[0.15] bg-white'
                            }`}>
                                {isSelected && <svg className="size-2.5 text-white" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Continue Button */}
            <div className="flex justify-end border-t border-black/[0.07] pt-5">
                <Button
                    onClick={handleContinue}
                    disabled={loading || !isAnyProductSelected}
                    className="h-[54px] w-full rounded-[10px] bg-[#0ea894] px-8 text-[14px] font-semibold text-white shadow-[0_12px_26px_-14px_rgba(14,168,148,0.8)] hover:translate-y-[-1px] hover:bg-[#0c9785] transition-all sm:w-auto disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                >
                    <span>{loading ? "Saving..." : "Continue"}</span>
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                </Button>
            </div>
        </div>
    );
}
