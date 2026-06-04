import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import z from 'zod';
import { registrationSchema } from '@/lib/schemas/schemas';
import { clearOnboardingCookies } from '@/lib/cookies'; // Kept in case we need to clear legacy

export interface UserProfile {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    email: string;
    ownershipPercentage?: number;
    avatar?: string;
}
export interface ConnectedAccount {
    id: string;
    name: string;
    url: string;
    type: 'quickbook' | 'sage';
}
export interface BusinessSnapshot {
    businessName: string;
    countryOfRegistration: string;
    contactNumber: string;
    website: string;
    logo?: string;
}

export interface FinancialPulse {
    monthlySpend: string;
    bankConnection: string;
    integrations: string[];
}

export interface VilletoProduct {
    id: string;
    name: string;
    color: string;
    selected: boolean;
    value: string
}

export interface OnboardingState {
    monthlySpend: number;
    spendRange: string;
    onboardingId: string;
    bankConnected: boolean;
    bankProcessing: boolean;
    connectedAccounts: ConnectedAccount[];
    showConnectModal: boolean;
    businessSnapshot: BusinessSnapshot;
    userProfiles: UserProfile[];
    financialPulse: FinancialPulse;
    villetoProducts: VilletoProduct[];
    contactEmail: string
    preOnboarding?: z.infer<typeof registrationSchema> | null;
    isExistingUser: boolean;
    stoppedAtStep: number | null;
}

interface VilletoState {
    currentStep: number;
    showCongratulations: boolean;
    onboardingId: string;
    contactEmail: string;

    // Actions
    setPreOnboarding: (data: z.infer<typeof registrationSchema>) => void;
    setCurrentStep: (step: number) => void;
    setOnboardingId: (step: string) => void;
    setContactEmail: (email: string) => void;
    setIsExistingUser: (value: boolean) => void;
    setStoppedAtStep: (step: number | null) => void;
    updateBusinessSnapshot: (data: Partial<BusinessSnapshot>) => void;
    updateUserProfiles: (profiles: UserProfile[]) => void;
    updateFinancialPulse: (data: Partial<FinancialPulse>) => void;
    toggleProduct: (productId: string) => void;
    submitApplication: () => void;
    setShowCongratulations: (show: boolean) => void;
    closeCongratulations: () => void;
    setMonthlySpend: (spend: number, rangeLabel?: string) => void;
    setSpendRange: (range: string) => void;
    setBankConnected: (connected: boolean) => void;
    setBankProcessing: (processing: boolean) => void;
    addConnectedAccount: (account: ConnectedAccount) => void;
    removeConnectedAccount: (id: string) => void;
    setShowConnectModal: (show: boolean) => void;
    reset: () => void;
}

const initialState: OnboardingState = {
    monthlySpend: 0, // 0-3 representing the spend ranges
    onboardingId: "",
    spendRange: '<$10k',
    contactEmail: "",
    preOnboarding: null,
    bankConnected: false,
    bankProcessing: false,
    connectedAccounts: [],
    showConnectModal: false,
    isExistingUser: false,
    stoppedAtStep: null,
    businessSnapshot: {
        businessName: '',
        countryOfRegistration: '',
        contactNumber: '',
        website: '',
    },
    userProfiles: [],
    financialPulse: {
        monthlySpend: '',
        bankConnection: '',
        integrations: [],
    },
    villetoProducts: [
        { id: '1', name: 'Corporate Cards', color: 'bg-purple-100 !border-purple-600 text-purple-700', selected: false, value: "CORPORATE_CARDS" },
        { id: '2', name: 'Expense Management', color: 'bg-green-100 !border-green-600 text-green-700', selected: false, value: "EXPENSE_MANAGEMENT" },
        { id: '3', name: 'Vendor Payments', color: 'bg-blue-100 !border-blue-600 text-blue-700', selected: false, value: "VENDOR_PAYMENTS" },
        { id: '4', name: 'Procurement', color: 'bg-pink-100 border-pink-600 text-pink-700', selected: false, value: "PROCUREMENT" },
        { id: '5', name: 'Accounts Payable/Receivable', color: 'bg-pink-100 border-pink-600 text-pink-700', selected: false, value: "ACCOUNTS_PAYABLE_RECEIVABLE" },
    ],
};

export const useOnboardingStore = create<VilletoState & OnboardingState>()(
    persist(
        (set, get) => ({
            currentStep: 5, // Starting at Choose Products for demo
            ...initialState,
            showCongratulations: false,

            setCurrentStep: (step) => set({ currentStep: step }),
            setIsExistingUser: (value) => set({ isExistingUser: value }),
            setStoppedAtStep: (step) => set({ stoppedAtStep: step }),
            setOnboardingId: (id) => set({ onboardingId: id }),
            setContactEmail: (email) => set({ contactEmail: email }),
            setPreOnboarding: (data) => set({ preOnboarding: data }),

            setMonthlySpend: (spend: number, rangeLabel?: string) => 
                set((state) => ({ 
                    monthlySpend: spend, 
                    spendRange: rangeLabel ?? state.spendRange 
                })),

            setSpendRange: (range: string) => set({ spendRange: range }),

            setBankConnected: (connected: boolean) => set({ bankConnected: connected }),

            setBankProcessing: (processing: boolean) => set({ bankProcessing: processing }),

            addConnectedAccount: (account: ConnectedAccount) =>
                set((state) => ({
                    connectedAccounts: [...state.connectedAccounts, account]
                })),

            removeConnectedAccount: (id: string) =>
                set((state) => ({
                    connectedAccounts: state.connectedAccounts.filter(acc => acc.id !== id)
                })),

            setShowConnectModal: (show: boolean) => set({ showConnectModal: show }),

            updateBusinessSnapshot: (data) =>
                set((state) => ({
                    businessSnapshot: { ...state.businessSnapshot, ...data },
                })),

            updateUserProfiles: (profiles) =>
                set({ userProfiles: profiles }),

            updateFinancialPulse: (data) =>
                set((state) => ({
                    financialPulse: { ...state.financialPulse, ...data },
                })),

            toggleProduct: (productId) =>
                set((state) => ({
                    villetoProducts: state.villetoProducts.map((product) =>
                        product.id === productId
                            ? { ...product, selected: !product.selected }
                            : product
                    ),
                })),

            submitApplication: () => {
                set({ showCongratulations: true });
                // Optional: clear legacy cookies just in case
                clearOnboardingCookies();
            },

            setShowCongratulations: (show: boolean) => set({ showCongratulations: show }),
            closeCongratulations: () => set({ showCongratulations: false }),
            
            reset: () => { 
                clearOnboardingCookies(); 
                set(initialState);
            }
        }),
        {
            name: 'onboarding-storage',
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);