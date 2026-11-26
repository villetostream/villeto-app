"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorLegalEntityPanel } from "@/components/vendors/VendorLegalEntityPanel";
import { useAxios } from "@/hooks/useAxios";
import { useAuthStore } from "@/stores/auth-stores";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";
import {
  useVendorNetworkDetail,
  useMasterVendorDetail,
  useVendorSitesV2,
  useVendorStatusUpdate,
} from "@/queries/vendors/vendor-network";
import { DeactivateVendorOrgDialog } from "@/components/vendors/DeactivateVendorOrgDialog";
import { asArray, asRecord, getString, isRecord } from "@/lib/types/api-error";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

function VendorConfigurationPage() {
  const { vendorId } = useParams() as { vendorId: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromMaster = searchParams.get("from") === "master";
  const axiosInstance = useAxios();
  const policies = useAuthorizationPolicies();
  const workspaceSelection = useEntityWorkspaceStore((s) => s.selection);

  const { setBackHandler, clearBackHandler } = useHeaderBackStore();

  const canManageMasterList = useAuthStore(
    (state) =>
      state.can("vendor.master_list", "manage") ||
      state.can("vendor.entity_configuration", "manage"),
  );

  const [deactivateOrgModalOpen, setDeactivateOrgModalOpen] = useState(false);

  // Use the exact same cached queries as the Profile page to avoid duplicate/blocking requests
  const { data: vendorResponse, isLoading: isVendorLoading } =
    useVendorNetworkDetail(vendorId);
  const { data: masterResponse, isLoading: isMasterLoading } =
    useMasterVendorDetail(vendorId, canManageMasterList);
  const { data: vendorSites = [] } = useVendorSitesV2(vendorId);

  const statusMutation = useVendorStatusUpdate(vendorId);

  const rawVendor = asRecord(vendorResponse?.data ?? vendorResponse);
  const rawMaster = asRecord(masterResponse?.data ?? masterResponse);
  const merged = { ...rawMaster, ...rawVendor };
  const profile = asRecord(merged.profile);
  const business = asRecord(merged.businessDetails);

  const vendorDisplayName =
    getString(business.legalName) ||
    getString(merged.legalName) ||
    getString(profile.legalName) ||
    getString(business.displayName) ||
    getString(merged.displayName) ||
    getString(profile.displayName) ||
    "Vendor";

  const vendorDisplayEmail =
    getString(business.email) ||
    getString(merged.email) ||
    getString(profile.email) ||
    "";

  const vendorInitials = useMemo(() => {
    if (!vendorDisplayName || vendorDisplayName === "Vendor") return "VD";
    const parts = vendorDisplayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return vendorDisplayName.slice(0, 2).toUpperCase();
  }, [vendorDisplayName]);

  const activeEntityId =
    workspaceSelection && workspaceSelection !== "all"
      ? workspaceSelection
      : null;

  const rawRelationships = asArray(
    rawVendor.entityRelationships || rawMaster.entityRelationships,
  ).filter(isRecord);

  const handleSuspendEntityRelationship = async () => {
    try {
      await statusMutation.mutateAsync({
        status: "Suspended",
        legalEntityId: activeEntityId,
      });
      toast.success("Vendor relationship suspended for the selected entity.");
    } catch (err) {
      logger.error("Failed to suspend vendor:", err);
      toast.error("Failed to suspend vendor.");
    }
  };

  const isActionPending = statusMutation.isPending;

  const profileHref = fromMaster
    ? `/vendors/${vendorId}?from=master`
    : `/vendors/${vendorId}`;

  useEffect(() => {
    setBackHandler(() => {
      router.push(profileHref);
    });
    return () => {
      clearBackHandler();
    };
  }, [profileHref, router, setBackHandler, clearBackHandler]);

  useEffect(() => {
    if (
      fromMaster ||
      searchParams.get("relationship") === "not_connected"
    ) {
      router.replace(profileHref);
    }
  }, [fromMaster, searchParams, profileHref, router]);

  const isInitialLoading =
    isVendorLoading &&
    (canManageMasterList ? isMasterLoading : true) &&
    Object.keys(merged).length === 0;

  if (isInitialLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-10 w-56 rounded-[10px]" />
        <Skeleton className="h-[420px] w-full rounded-[14px]" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* ── Sticky Unified Vendor Header & Sub Navigation Tabs ── */}
      <div className="sticky -top-3 sm:-top-5 lg:-top-6 z-20 -mx-3 px-3 -mt-3 pt-3 sm:-mx-5 sm:px-5 sm:-mt-5 sm:pt-5 lg:-mx-6 lg:px-6 lg:-mt-6 lg:pt-6 pb-4 bg-[#f4f7f5]/95 backdrop-blur-xs space-y-5">
        {/* ── Unified Vendor Header matching Profile page ── */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-[#dff5ef] text-[#087f70] flex items-center justify-center font-bold text-[18px] shrink-0">
              {vendorInitials}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[20px] font-bold text-[#0b100e]">
                  {vendorDisplayName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#e7f6f2] text-[#087f70] border border-[#c8ece4]">
                  {fromMaster ? "Connected" : "Active"}
                </span>
              </div>

              <p className="text-[13px] text-[#68726d] mt-0.5">
                {vendorDisplayEmail}
              </p>

              <button
                type="button"
                onClick={() => router.push(`/vendors/${vendorId}/transactions`)}
                className="h-8 px-3.5 rounded-[6px] bg-[#00a389] hover:bg-[#008f78] text-white text-[12px] font-semibold flex items-center gap-1.5 transition-colors mt-2.5 cursor-pointer shadow-2xs"
              >
                <span>View transaction history</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action Buttons Top Right */}
          <div className="flex flex-wrap items-center gap-3">
            {policies.vendors.canDeactivate && (
              <>
                {/* <button
                  type="button"
                  disabled={isActionPending}
                  onClick={() => void handleSuspendEntityRelationship()}
                  className="h-10 px-5 rounded-[8px] border border-[#f59e0b] text-[#d97706] hover:bg-[#fffbeb] text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Suspend vendor
                </button> */}
                <button
                  type="button"
                  disabled={isActionPending}
                  onClick={() => setDeactivateOrgModalOpen(true)}
                  className="h-10 px-5 rounded-[8px] bg-[#d33d44] hover:bg-[#be2f36] text-white text-[13px] font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  Deactivate vendor
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-[10px] bg-[#f5f7f6] w-fit">
          <Link
            href={profileHref}
            className="px-5 py-1.5 rounded-[8px] text-[13px] font-medium text-[#68726d] hover:text-[#0b100e] transition-colors"
          >
            Profile
          </Link>
          <span className="px-5 py-1.5 rounded-[8px] bg-white text-[13px] font-semibold text-[#0b100e] shadow-xs">
            Entity configuration
          </span>
        </div>
      </div>

      <VendorLegalEntityPanel
        vendorId={vendorId}
        axiosInstance={axiosInstance}
        initialSites={vendorSites as any}
        initialRelationships={rawRelationships as any}
      />

      <DeactivateVendorOrgDialog
        open={deactivateOrgModalOpen}
        onClose={() => setDeactivateOrgModalOpen(false)}
        vendorId={vendorId}
        vendorName={vendorDisplayName}
        organizationWide={fromMaster}
        legalEntityId={activeEntityId}
      />
    </div>
  );
}

export default withPermissions(VendorConfigurationPage, [
  { resource: "vendor.entity_configuration", action: "manage" },
  { resource: "vendor.master_list", action: "manage" },
]);
