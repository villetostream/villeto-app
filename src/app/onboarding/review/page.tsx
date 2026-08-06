"use client";

import { useOnboardingStore } from "@/stores/useVilletoStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, ArrowRight, Building2, Loader2 } from "lucide-react";
import { CongratulationsModal } from "@/components/onboarding/CongratulationModal";
import { HugeiconsIcon } from "@hugeicons/react";
import OnboardingTitle from "@/components/onboarding/_shared/OnboardingTitle";
import {
  CheckmarkBadge03Icon,
  PencilEdit02Icon,
  CreditCardIcon, 
  Invoice04Icon, 
  Store01Icon, 
  ShoppingCart01Icon, 
  Invoice03Icon
} from "@hugeicons/core-free-icons";
import { OwnerCard } from "../leadership/page";
import { useRouter } from "next/navigation";
import { useHydrateOnboardingData } from "@/hooks/useHydrateOnboardingData";
import { useState } from "react";
import { toast } from "sonner";
import { useInviteBeneficialOwners } from "@/hooks/useInviteBeneficialOwners";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { getApiErrorMessage, isRecord } from "@/lib/types/api-error";
import type { IconSvgElement } from "@hugeicons/react";

export default function ReviewConfirmation() {
  const {
    businessSnapshot,
    userProfiles,
    villetoProducts,
    spendRange,
    bankConnected,
    connectedAccounts,
    onboardingId,
    selfOwner,
  } = useOnboardingStore();
  useHydrateOnboardingData();

  const ICON_MAP: Record<string, IconSvgElement> = {
    '1': CreditCardIcon,
    '2': Invoice04Icon,
    '3': Store01Icon,
    '4': ShoppingCart01Icon,
    '5': Invoice03Icon,
  };

  const selectedProducts = villetoProducts.filter((p) => p.selected);
  const router = useRouter();
  const axios = useAxios();

  const { setShowCongratulations } = useOnboardingStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllProfiles, setShowAllProfiles] = useState(false);
  const { inviteBeneficialOwners } = useInviteBeneficialOwners();

  const allProfiles = [
    ...(selfOwner ? [{ ...selfOwner, id: "self", role: "Owner" }] : []),
    ...userProfiles
  ];

  // Beneficial owners are those with an ownershipPercentage set
  const beneficialOwners = allProfiles.filter(
    (p) => p.ownershipPercentage !== undefined
  );

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Fire beneficial owner invitations BEFORE finalization, so the token is still valid.
      // Non-blocking internally: toast.error is shown inside the hook if it fails.
      await inviteBeneficialOwners(beneficialOwners);

      try {
        // Patch to complete
        await axios.patch(API_KEYS.ONBOARDING.ONBOARDING_COMPLETE(onboardingId));
      } catch (err: unknown) {
        // If the backend intentionally revokes the token and returns 401 upon completion,
        // we treat it as a success and continue to show the modal.
        const status = isRecord(err) && isRecord((err as { response?: unknown }).response)
          ? (err as { response: { status?: number } }).response.status
          : undefined;
        if (status !== 401) {
          throw err;
        }
      }

      setShowCongratulations(true);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Submission failed. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col py-8">
      <CongratulationsModal />
      {/* Header */}
      <div className="text-left shrink-0">
        <div className="mb-5 flex size-11 items-center justify-center rounded-[10px] bg-[#e7f6f2]">
          <HugeiconsIcon icon={CheckmarkBadge03Icon} className="size-6 text-[#087f70]" />
        </div>
        <OnboardingTitle
          title="Review your application"
          subtitle="Confirm the information below before submitting your Villeto workspace application."
        />
      </div>

      {/* Scrollable Content Section */}
      <div className="mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto pr-2 pb-2 scrollbar-thin scrollbar-thumb-black/10 scrollbar-track-transparent">
        {/* Business Snapshot */}
      <div className="rounded-[12px] border border-black/[0.08] bg-white shadow-[0_4px_16px_rgba(14,28,23,0.04)]">
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
          <p className="text-[13px] font-semibold text-[#0b100e]">Business Snapshot</p>
          <button type="button" onClick={() => router.push("/onboarding/business")} className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[12px] font-semibold text-[#087f70] transition-colors hover:bg-[#f0faf8]">
            Edit <HugeiconsIcon icon={PencilEdit02Icon} className="size-3.5" />
          </button>
        </div>
        <div className="grid gap-0 divide-y divide-black/[0.05] px-5">
          <div className="flex items-center justify-between py-3">
            <p className="text-[12px] text-[#84908a]">Business Name</p>
            <p className="text-[13px] font-medium text-[#0b100e]">{businessSnapshot.businessName}</p>
          </div>
          <div className="flex items-center justify-between py-3">
            <p className="text-[12px] text-[#84908a]">Country</p>
            <p className="text-[13px] font-medium text-[#0b100e]">{businessSnapshot.countryOfRegistration}</p>
          </div>
          <div className="flex items-center justify-between py-3">
            <p className="text-[12px] text-[#84908a]">Contact</p>
            <p className="text-[13px] font-medium text-[#0b100e]">{businessSnapshot.contactNumber}</p>
          </div>
          <div className="flex items-center justify-between py-3">
            <p className="text-[12px] text-[#84908a]">Website</p>
            <p className="text-[13px] font-medium text-[#0ea894]">{businessSnapshot.website}</p>
          </div>
        </div>
      </div>

      {/* User Profiles */}
      <div className="rounded-[12px] border border-black/[0.08] bg-white shadow-[0_4px_16px_rgba(14,28,23,0.04)]">
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
          <p className="text-[13px] font-semibold text-[#0b100e]">User Profiles</p>
          <button type="button" onClick={() => router.push("/onboarding/leadership")} className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[12px] font-semibold text-[#087f70] transition-colors hover:bg-[#f0faf8]">
            Edit <HugeiconsIcon icon={PencilEdit02Icon} className="size-3.5" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="mb-3 text-[12px] text-[#84908a]">
            {allProfiles.filter((p) => p.ownershipPercentage !== undefined).length} Beneficial Owners · {allProfiles.filter((p) => p.ownershipPercentage === undefined).length} Controlling Officers
          </p>
          <div className="space-y-2">
            {(showAllProfiles ? allProfiles : allProfiles.slice(0, 2)).map((profile) => (
              <OwnerCard
                key={profile.id || profile.email}
                owner={profile}
                onDelete={() => {}}
                onEdit={() => {}}
                type={profile.ownershipPercentage !== undefined ? "beneficial" : "officer"}
                showIcons={false}
                isSelfCard={profile.id === "self"}
              />
            ))}
          </div>
          {allProfiles.length > 2 && (
            <button type="button" onClick={() => setShowAllProfiles(!showAllProfiles)} className="mt-3 text-[12px] font-semibold text-[#087f70] hover:underline">
              {showAllProfiles ? "Show Less" : `Show All (${allProfiles.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Financial Pulse */}
      <div className="rounded-[12px] border border-black/[0.08] bg-white shadow-[0_4px_16px_rgba(14,28,23,0.04)]">
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
          <p className="text-[13px] font-semibold text-[#0b100e]">Financial Pulse</p>
          <button type="button" onClick={() => router.push("/onboarding/financial")} className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[12px] font-semibold text-[#087f70] transition-colors hover:bg-[#f0faf8]">
            Edit <HugeiconsIcon icon={PencilEdit02Icon} className="size-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-px divide-x divide-black/[0.05] px-0">
          <div className="px-5 py-3">
            <p className="text-[11px] text-[#84908a]">Monthly Spend</p>
            <p className="mt-1 text-[13px] font-semibold text-[#0b100e]">{spendRange ?? "—"}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[11px] text-[#84908a]">Bank Connection</p>
            <p className={`mt-1 text-[13px] font-semibold ${bankConnected ? 'text-[#0ea894]' : 'text-[#84908a]'}`}>{bankConnected ? "Connected" : "Not Connected"}</p>
          </div>
        </div>
      </div>

      {/* Your Villeto Products */}
      <div className="rounded-[12px] border border-black/[0.08] bg-white shadow-[0_4px_16px_rgba(14,28,23,0.04)]">
        <div className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
          <p className="text-[13px] font-semibold text-[#0b100e]">Villeto Products</p>
          <button type="button" onClick={() => router.push("/onboarding/products")} className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[12px] font-semibold text-[#087f70] transition-colors hover:bg-[#f0faf8]">
            Edit <HugeiconsIcon icon={PencilEdit02Icon} className="size-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 px-5 py-4">
          {selectedProducts.map((product) => {
            const Icon = ICON_MAP[product.id];
            return (
              <span key={product.id} className="inline-flex items-center gap-2 rounded-full border border-[#c3ece7] bg-[#f0faf8] px-3 py-1.5 text-[12px] font-semibold text-[#087f70]">
                {Icon && <HugeiconsIcon icon={Icon} className="size-4" />}
                {product.name}
              </span>
            );
          })}
        </div>
      </div>

      </div>

      {/* Submit Button */}
      <div className="mt-4 shrink-0 flex justify-end border-t border-black/[0.07] pt-5">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="h-[54px] w-full rounded-[10px] bg-[#0ea894] px-8 text-[14px] font-semibold text-white shadow-[0_12px_26px_-14px_rgba(14,168,148,0.8)] hover:translate-y-[-1px] hover:bg-[#0c9785] transition-all sm:w-auto"
        >
          {isSubmitting ? (
            <>Submitting... <Loader2 className="size-4 animate-spin" /></>
          ) : (
            <>Submit <ArrowRight className="size-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
