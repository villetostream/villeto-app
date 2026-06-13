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
  const { inviteBeneficialOwners } = useInviteBeneficialOwners();

  // Beneficial owners are those with an ownershipPercentage set
  const beneficialOwners = userProfiles.filter(
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
    <div className="space-y-8">
      <CongratulationsModal />
      {/* Header */}
      <div className="text-left mb-10 ">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
          <HugeiconsIcon
            icon={CheckmarkBadge03Icon}
            className="size-14 text-primary"
          />
        </div>
        <OnboardingTitle
          title={"Review & Confirmation"}
          subtitle={
            "Please go through the information you have provided before submission"
          }
        />
      </div>
      {/* Business Snapshot */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Business Snapshot
          </CardTitle>
          <Button
            onClick={() => {
              router.push("/onboarding/business");
            }}
            variant="ghost"
            size="sm"
            className="text-villeto-primary hover:text-villeto-primary hover:bg-villeto-primary/10 gap-2.5"
          >
            Edit
            <HugeiconsIcon icon={PencilEdit02Icon} className="size-4" />
          </Button>
        </CardHeader>
        <CardContent className="grid gap-6">
          {/* Business Logo Display */}
          <div className="flex items-center justify-between border-b pb-4">
            <p className="text-sm text-gray-500">Business Logo</p>
            <Avatar className="h-16 w-16 rounded-lg border">
              {businessSnapshot.logo ? (
                <AvatarImage
                  src={businessSnapshot.logo}
                  alt={businessSnapshot.businessName}
                  className="object-contain"
                />
              ) : (
                <AvatarFallback className="rounded-lg bg-primary/5">
                  <Building2 className="h-8 w-8 text-primary/40" />
                </AvatarFallback>
              )}
            </Avatar>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 mb-1">Business Name</p>
            <p className="font-medium">{businessSnapshot.businessName}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 mb-1">
              Country of Registration
            </p>
            <p className="font-medium">
              {businessSnapshot.countryOfRegistration}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 mb-1">Contact Number</p>
            <p className="font-medium">{businessSnapshot.contactNumber}</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 mb-1">Website</p>
            <p className="font-medium text-villeto-primary">
              {businessSnapshot.website}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* User Profiles */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">User Profiles</CardTitle>
          <Button
            onClick={() => {
              router.push("/onboarding/leadership");
            }}
            variant="ghost"
            size="sm"
            className="text-villeto-primary hover:text-villeto-primary hover:bg-villeto-primary/10 gap-2.5"
          >
            Edit
            <HugeiconsIcon icon={PencilEdit02Icon} className="size-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            {userProfiles.filter((p) => p.ownershipPercentage).length}{" "}
            Beneficial Owners and{" "}
            {userProfiles.filter((p) => !p.ownershipPercentage).length}{" "}
            Controlling Officers added
          </p>
          <div className="space-y-3">
            {userProfiles.map((profile) => (
              <OwnerCard
                key={profile.id || profile.email}
                owner={profile}
                onDelete={() => {}}
                onEdit={() => {}}
                type={profile.ownershipPercentage ? "beneficial" : "officer"}
                showIcons={false}
              />
            ))}
          </div>
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-villeto-primary hover:text-villeto-primary hover:bg-villeto-primary/10"
            >
              Show All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Financial Pulse */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Financial Pulse
          </CardTitle>
          <Button
            onClick={() => {
              router.push("/onboarding/financial");
            }}
            variant="ghost"
            size="sm"
            className="text-villeto-primary hover:text-villeto-primary hover:bg-villeto-primary/10 gap-2.5"
          >
            Edit
            <HugeiconsIcon icon={PencilEdit02Icon} className="size-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">
                Teams Expected Monthly Spend
              </p>
              <p className="font-medium">{spendRange ?? 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Bank Connection</p>
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <p className="font-medium">
                  {bankConnected ? "Connected" : "Not Connected"}
                </p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">Integrations</p>
            <p className="font-medium">
              {connectedAccounts.length > 0
                ? connectedAccounts.map((acc) => acc.name).join(", ")
                : "None"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Your Villeto Products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Your Villeto Products
          </CardTitle>
          <Button
            onClick={() => {
              router.push("/onboarding/products");
            }}
            variant="ghost"
            size="sm"
            className="text-villeto-primary hover:text-villeto-primary hover:bg-villeto-primary/10 gap-2.5"
          >
            Edit
            <HugeiconsIcon icon={PencilEdit02Icon} className="size-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-fit">
            {selectedProducts.map((product) => {
              const Icon = ICON_MAP[product.id];
              return (
                <Badge
                  key={product.id}
                  variant="secondary"
                  className={`${product.color} px-6 py-3.5 text-base font-medium rounded-[50px] flex w-fit items-center gap-3`}
                >
                  {Icon && <HugeiconsIcon icon={Icon} className="w-8 h-8 shrink-0" />}
                  <span>{product.name}</span>
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end pt-6">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          size={"md"}
          className="!px-12"
        >
          {isSubmitting ? (
            <>
              Submitting... <Loader2 className="w-5 h-5 ml-2 animate-spin" />
            </>
          ) : (
            <>
              Submit <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
