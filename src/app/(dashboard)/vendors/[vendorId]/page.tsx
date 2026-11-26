"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  XCircle,
  X,
  FileText,
  Loader2,
  MapPin,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import { useAuthStore } from "@/stores/auth-stores";
import { useEntityWorkspaceStore } from "@/features/entity-workspace/store";
import { toast } from "sonner";
import withPermissions from "@/components/permissions/permission-protected-routes";
import {
  asArray,
  asRecord,
  getApiErrorMessage,
  getString,
  isRecord,
  pickString,
} from "@/lib/types/api-error";
import {
  useVendorNetworkDetail,
  useMasterVendorDetail,
  useVendorSitesV2,
  useVendorEntityRelationships,
  useVendorReview,
  useApproveEntityRelationshipV2,
  useVendorStatusUpdate,
  useCompanyPaymentTermsList,
  useVendorPaymentTerms,
  resolveVendorLifecycleStatus,
  normalizeConnectedLegalEntities,
  type VendorPaymentTerm,
  type RawEntityRelationship,
} from "@/queries/vendors/vendor-network";
import { VendorSummary } from "@/components/vendors/VendorSummary";
import { ConnectToEntityDialog } from "@/components/vendors/ConnectToEntityDialog";
import { DeactivateVendorOrgDialog } from "@/components/vendors/DeactivateVendorOrgDialog";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";

import Link from "next/link";
import { Rnd } from "react-rnd";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("@/components/ui/pdf-viewer"), {
  ssr: false,
});

function formatDocDate(value: unknown): string {
  const str = getString(value);
  if (!str) return "N/A";
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const PURPOSE_LABEL: Record<string, string> = {
  purchasing: "Purchasing",
  invoicing: "Invoicing",
  remit_to: "Remit-to",
  payment: "Remit-to",
};

const PURPOSE_STYLES: Record<string, string> = {
  purchasing: "bg-[#e7f6f2] text-[#087f70] border-[#c8eee6]",
  invoicing: "bg-[#eaf3ff] text-[#1b64da] border-[#cce0ff]",
  remit_to: "bg-[#f5eefc] text-[#7828c8] border-[#ebd6fc]",
  payment: "bg-[#f5eefc] text-[#7828c8] border-[#ebd6fc]",
};

function VendorDetailsPage() {
  const { vendorId } = useParams() as { vendorId: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const policies = useAuthorizationPolicies();
  const workspaceSelection = useEntityWorkspaceStore((s) => s.selection);

  const canManageEntityConfiguration = useAuthStore((state) =>
    state.can("vendor.entity_configuration", "manage"),
  );
  const canManageMasterList = useAuthStore(
    (state) =>
      state.can("vendor.master_list", "manage") ||
      state.can("vendor.entity_configuration", "manage"),
  );

  const relationshipParam = searchParams.get("relationship");
  const fromMaster = searchParams.get("from") === "master";

  const { setBackHandler, clearBackHandler } = useHeaderBackStore();

  useEffect(() => {
    setBackHandler(() => {
      if (fromMaster) {
        router.push("/vendors/master");
      } else {
        router.push("/vendors");
      }
    });
    return () => {
      clearBackHandler();
    };
  }, [fromMaster, router, setBackHandler, clearBackHandler]);

  const [relationshipOverride, setRelationshipOverride] = useState<
    string | null
  >(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [deactivateOrgModalOpen, setDeactivateOrgModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approveWithTerms, setApproveWithTerms] = useState(true);

  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocName, setPreviewDocName] = useState<string | null>(null);

  const { data: vendorResponse, isLoading: isVendorLoading } =
    useVendorNetworkDetail(vendorId);
  const { data: masterResponse, isLoading: isMasterLoading } =
    useMasterVendorDetail(vendorId, canManageMasterList);
  const { data: vendorSites = [], isLoading: isSitesLoading } =
    useVendorSitesV2(vendorId);
  const {
    data: entityRelationships = [],
    isLoading: isRelationshipsLoading,
  } = useVendorEntityRelationships(vendorId, !fromMaster);

  const rawVendor = asRecord(vendorResponse?.data ?? vendorResponse);
  const rawMaster = asRecord(masterResponse?.data ?? masterResponse);
  const hasVendorData =
    Object.keys(rawVendor).length > 0 || Object.keys(rawMaster).length > 0;
  const isLoading = isVendorLoading && (canManageMasterList ? isMasterLoading : true);

  const reviewMutation = useVendorReview(vendorId);
  const relationshipApprovalMutation = useApproveEntityRelationshipV2(vendorId);
  const statusMutation = useVendorStatusUpdate(vendorId);

  useEffect(() => {
    if (previewDocUrl) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [previewDocUrl]);

  // Payment Terms Query
  const { data: companyPaymentTerms = [] } = useCompanyPaymentTermsList();
  const matchingPaymentTerms = useMemo(
    () => companyPaymentTerms.filter((term) => term.vendorId === vendorId),
    [companyPaymentTerms, vendorId],
  );

  const paymentTermFromList = useMemo(() => {
    if (matchingPaymentTerms.length === 0) return null;
    return (
      matchingPaymentTerms.find((t) => t.status === "pending_review") ||
      matchingPaymentTerms.find((t) => t.isCurrent) ||
      matchingPaymentTerms.find((t) => t.status === "approved") ||
      matchingPaymentTerms[0] ||
      null
    );
  }, [matchingPaymentTerms]);

  const paymentTermFromVendor = useMemo<Partial<VendorPaymentTerm> | null>(() => {
    const raw =
      rawVendor.paymentTerm ||
      rawVendor.paymentTerms ||
      rawVendor.currentPaymentTerm ||
      rawVendor.pendingPaymentTerm;
    const candidate = Array.isArray(raw) ? raw[0] : raw;
    return isRecord(candidate) ? (candidate as Partial<VendorPaymentTerm>) : null;
  }, [rawVendor]);

  const pendingPaymentTermId =
    paymentTermFromList?.paymentTermId ||
    paymentTermFromVendor?.paymentTermId ||
    getString(rawVendor.currentPaymentTermId) ||
    getString(rawVendor.pendingPaymentTermId) ||
    getString(rawVendor.paymentTermId) ||
    getString(rawVendor.vendorPaymentTermId) ||
    null;

  const { data: paymentTermData } = useVendorPaymentTerms(
    paymentTermFromList ? null : pendingPaymentTermId,
  );
  const paymentTerm =
    paymentTermFromList || paymentTermData || paymentTermFromVendor;

  const { legalEntityCount, legalEntities: connectedLegalEntities } = useMemo(
    () =>
      normalizeConnectedLegalEntities(
        Object.keys(rawMaster).length > 0 ? rawMaster : rawVendor,
      ),
    [rawMaster, rawVendor],
  );

  const activeEntityId =
    workspaceSelection && workspaceSelection !== "all"
      ? workspaceSelection
      : null;

  const activeRelationship = useMemo(() => {
    if (!activeEntityId) return null;
    const found = entityRelationships.find((r) => {
      const le = r.legalEntity;
      return (
        le?.legalEntityId === activeEntityId ||
        r.legalEntityId === activeEntityId
      );
    });
    if (found) return found;

    const rels = asArray(rawVendor.entityRelationships).filter(isRecord);
    const matched = rels.find((rel) => {
      const le = asRecord(rel.legalEntity);
      return (
        getString(le.legalEntityId) === activeEntityId ||
        getString(rel.legalEntityId) === activeEntityId
      );
    });
    return (matched as unknown as RawEntityRelationship) || null;
  }, [entityRelationships, rawVendor, activeEntityId]);

  const siteAssignmentMap = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!activeRelationship?.siteAssignments) return map;
    for (const assignment of activeRelationship.siteAssignments) {
      const siteId =
        assignment.vendorSiteId ||
        assignment.site?.vendorSiteId ||
        getString(asRecord(assignment).siteId);
      if (!siteId) continue;
      if (assignment.status === "inactive") continue;
      if (assignment.effectiveTo) {
        const to = new Date(assignment.effectiveTo).getTime();
        if (!Number.isNaN(to) && to <= Date.now()) continue;
      }
      const current = map.get(siteId) || [];
      const p = String(assignment.purpose).toLowerCase();
      if (!current.includes(p)) {
        current.push(p);
      }
      map.set(siteId, current);
    }
    return map;
  }, [activeRelationship]);

  const activeEntityRelationshipId = useMemo(() => {
    if (activeRelationship?.vendorEntityRelationshipId) {
      return activeRelationship.vendorEntityRelationshipId;
    }
    const directId =
      getString(rawVendor.vendorEntityRelationshipId) ||
      getString(rawVendor.relationshipId);
    if (directId) return directId;
    return null;
  }, [activeRelationship, rawVendor]);

  const lifecycleStatus = useMemo(
    () =>
      resolveVendorLifecycleStatus(
        Object.keys(rawVendor).length > 0 ? rawVendor : rawMaster,
      ),
    [rawVendor, rawMaster],
  );

  // Derive effective relationship state
  const derivedRelationship = useMemo(() => {
    if (relationshipOverride) return relationshipOverride;
    if (relationshipParam === "not_connected") {
      if (
        activeEntityId &&
        connectedLegalEntities.some((e) => e.legalEntityId === activeEntityId)
      ) {
        return "connected";
      }
      return "not_connected";
    }
    if (
      activeEntityId &&
      connectedLegalEntities.length > 0 &&
      !connectedLegalEntities.some((e) => e.legalEntityId === activeEntityId)
    ) {
      return "not_connected";
    }
    if (lifecycleStatus === "pending_vendor_action") return "pending_connection";
    if (lifecycleStatus === "pending_company_approval") return "under_review";
    if (lifecycleStatus === "suspended") return "suspended";
    if (lifecycleStatus === "inactive") return "inactive";
    if (lifecycleStatus === "rejected") return "rejected";
    if (lifecycleStatus === "invited") return "invited";
    return "connected";
  }, [
    relationshipOverride,
    relationshipParam,
    activeEntityId,
    connectedLegalEntities,
    lifecycleStatus,
  ]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-1/3 rounded-[10px]" />
        <Skeleton className="h-10 w-56 rounded-[10px]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Skeleton className="lg:col-span-7 h-[420px] w-full rounded-[14px]" />
          <Skeleton className="lg:col-span-5 h-[420px] w-full rounded-[14px]" />
        </div>
      </div>
    );
  }

  if (!hasVendorData) {
    return (
      <div className="rounded-[14px] border border-black/[0.08] bg-white p-6">
        <p className="text-[14px] font-medium text-[#68726d]">
          Vendor not found.
        </p>
      </div>
    );
  }

  const merged = { ...rawMaster, ...rawVendor };
  const profile = asRecord(merged.profile);
  const banking = asRecord(merged.bankingDetails);
  const business = asRecord(merged.businessDetails);

  const legalName =
    getString(business.legalName) ||
    getString(merged.legalName) ||
    getString(profile.legalName);
  const displayName =
    getString(business.displayName) ||
    getString(merged.displayName) ||
    getString(profile.displayName);
  const email =
    getString(business.email) ||
    getString(merged.email) ||
    getString(profile.email);
  const taxId =
    getString(business.registrationNumber) ||
    getString(business.tin) ||
    getString(merged.registrationNumber) ||
    getString(merged.cacNumber) ||
    getString(merged.tin) ||
    getString(merged.taxId) ||
    getString(profile.taxId);
  const country =
    getString(business.country) ||
    getString(merged.country) ||
    getString(profile.country);
  const address =
    getString(business.businessAddress) ||
    getString(merged.address) ||
    getString(profile.address);
  const bankName =
    getString(banking.bankName) ||
    getString(merged.bankName) ||
    getString(profile.bankName);
  const bankAccountNumber =
    getString(banking.maskedAccountNumber) ||
    getString(banking.accountNumber) ||
    getString(merged.bankAccountNumber) ||
    getString(profile.bankAccountNumber);

  const vendorDisplayName = legalName || displayName || "Unnamed Vendor";
  const vendorDisplayEmail = email || "—";

  const vendorInitials =
    vendorDisplayName
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "VN";

  const vendorDocs = asArray(merged.documents);
  const profileDocs = asArray(profile.documents);
  const documents = (
    vendorDocs.length > 0 ? vendorDocs : profileDocs
  ).filter(isRecord);

  const hasBankVerified = Boolean(bankName && bankAccountNumber);
  const hasRegVerified = Boolean(taxId);
  const riskLevel =
    derivedRelationship === "connected" && !hasBankVerified ? "High" : "Low";

  const handleApproveVendor = async () => {
    try {
      if (activeEntityRelationshipId) {
        await relationshipApprovalMutation.mutateAsync({
          relationshipId: activeEntityRelationshipId,
          decision: "approved",
          reason: "Compliance checks completed",
          ...(paymentTerm?.status === "pending_review" && approveWithTerms
            ? {
                paymentTermsDecision: "approved",
                paymentTermsReason: "Payment terms approved",
              }
            : {}),
        });
      } else {
        const activeSiteIds = vendorSites
          .filter((s) => s.status === "active")
          .map((s) => s.vendorSiteId);
        await reviewMutation.mutateAsync({
          decision: "approve",
          ...(activeSiteIds.length > 0 ? { siteIds: activeSiteIds } : {}),
        });
      }
      toast.success(`${vendorDisplayName} has been approved.`);
      setRelationshipOverride("connected");
    } catch (err) {
      logger.error("Failed to approve vendor:", err);
      toast.error(getApiErrorMessage(err, "Failed to approve vendor."));
    }
  };

  const handleRejectVendor = async () => {
    if (!rejectReason.trim()) {
      toast.error("Provide a reason so the vendor knows what to correct.");
      return;
    }
    try {
      if (activeEntityRelationshipId) {
        await relationshipApprovalMutation.mutateAsync({
          relationshipId: activeEntityRelationshipId,
          decision: "rejected",
          reason: rejectReason.trim(),
        });
      } else {
        await reviewMutation.mutateAsync({
          decision: "rejected",
          note: rejectReason.trim(),
          reason: rejectReason.trim(),
        });
      }
      toast.success("Vendor submission returned for correction.");
      setRejectModalOpen(false);
      setRejectReason("");
      setRelationshipOverride("pending_connection");
    } catch (err) {
      logger.error("Failed to reject vendor:", err);
      toast.error(getApiErrorMessage(err, "Failed to reject vendor."));
    }
  };

  const handleSuspendEntityRelationship = async () => {
    try {
      await statusMutation.mutateAsync({
        status: "Suspended",
        legalEntityId: activeEntityId,
      });
      toast.success("Vendor relationship suspended for the selected entity.");
      setRelationshipOverride("suspended");
    } catch (err) {
      logger.error("Failed to suspend vendor:", err);
      toast.error(getApiErrorMessage(err, "Failed to suspend vendor."));
    }
  };

  const handleReactivateVendor = async () => {
    try {
      await statusMutation.mutateAsync({
        status: "Active",
        legalEntityId: activeEntityId,
        organizationWide: fromMaster,
      });
      toast.success(
        fromMaster
          ? "Vendor reactivated across the company."
          : "Vendor relationship reactivated.",
      );
      setRelationshipOverride("connected");
    } catch (err) {
      logger.error("Failed to reactivate vendor:", err);
      toast.error(getApiErrorMessage(err, "Failed to reactivate vendor."));
    }
  };

  const isActionPending =
    reviewMutation.isPending ||
    relationshipApprovalMutation.isPending ||
    statusMutation.isPending;

  const configurationHref = fromMaster
    ? `/vendors/${vendorId}/configuration?from=master`
    : `/vendors/${vendorId}/configuration`;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* ── Sticky Profile Header & Sub Navigation Tabs ── */}
      <div className="sticky -top-3 sm:-top-5 lg:-top-6 z-20 -mx-3 px-3 -mt-3 pt-3 sm:-mx-5 sm:px-5 sm:-mt-5 sm:pt-5 lg:-mx-6 lg:px-6 lg:-mt-6 lg:pt-6 pb-4 bg-[#f4f7f5]/95 backdrop-blur-xs space-y-5">
        {/* ── Profile Header ── */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Avatar Circle */}
          <div className="w-14 h-14 rounded-full bg-[#dff5ef] text-[#087f70] flex items-center justify-center font-bold text-[18px] shrink-0">
            {vendorInitials}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[20px] font-bold text-[#0b100e]">
                {vendorDisplayName}
              </h1>

              {/* Canonical Lifecycle / Relationship Badge */}
              {derivedRelationship === "not_connected" ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#f5f7f6] text-[#68726d] border border-black/[0.08]">
                  Not connected
                </span>
              ) : derivedRelationship === "pending_connection" ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#fff9e6] text-[#b27b00] border border-[#ffe099]">
                  Pending connection
                </span>
              ) : derivedRelationship === "under_review" ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#fff9e6] text-[#b27b00] border border-[#ffe099]">
                  Under Review
                </span>
              ) : derivedRelationship === "invited" ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#f5f7f6] text-[#68726d] border border-black/[0.08]">
                  Invited
                </span>
              ) : derivedRelationship === "rejected" ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#fdf2f2] text-[#d33d44] border border-[#fbd5d5]">
                  Rejected
                </span>
              ) : derivedRelationship === "suspended" ||
                derivedRelationship === "inactive" ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#fdf2f2] text-[#d33d44] border border-[#fbd5d5]">
                  {derivedRelationship === "inactive" ? "Inactive" : "Suspended"}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#e7f6f2] text-[#087f70] border border-[#c8ece4]">
                  {fromMaster ? "Connected" : "Active"}
                </span>
              )}
            </div>

            <p className="text-[13px] text-[#68726d] mt-0.5">
              {vendorDisplayEmail}
            </p>

            {/* View transaction history button */}
            {derivedRelationship === "connected" && (
              <button
                type="button"
                onClick={() => router.push(`/vendors/${vendorId}/transactions`)}
                className="h-8 px-3.5 rounded-[6px] bg-[#00a389] hover:bg-[#008f78] text-white text-[12px] font-semibold flex items-center gap-1.5 transition-colors mt-2.5 cursor-pointer shadow-2xs"
              >
                <span>View transaction history</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons Top Right */}
        <div className="flex flex-wrap items-center gap-3">
          {derivedRelationship === "not_connected" ? (
            <button
              type="button"
              onClick={() => setConnectModalOpen(true)}
              className="h-10 px-6 rounded-[8px] bg-[#00a389] hover:bg-[#008f78] text-white text-[13px] font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              Connect to Entity
            </button>
          ) : derivedRelationship === "pending_connection" ? (
            <span className="h-10 px-4 inline-flex items-center rounded-[8px] bg-[#fff9e6] text-[#b27b00] border border-[#ffe099] text-[12px] font-semibold">
              Awaiting vendor acceptance
            </span>
          ) : derivedRelationship === "under_review" ? (
            <>
              {policies.vendors.canReject && (
                <button
                  type="button"
                  disabled={isActionPending}
                  onClick={() => setRejectModalOpen(true)}
                  className="h-10 px-5 rounded-[8px] border border-[#d33d44] text-[#d33d44] hover:bg-[#fdf2f2] text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Return for correction
                </button>
              )}
              {policies.vendors.canApprove && (
                <button
                  type="button"
                  disabled={isActionPending}
                  onClick={() => void handleApproveVendor()}
                  className="h-10 px-5 rounded-[8px] bg-[#00a389] hover:bg-[#008f78] text-white text-[13px] font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isActionPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Approve vendor
                </button>
              )}
            </>
          ) : derivedRelationship === "suspended" ||
            derivedRelationship === "inactive" ? (
            policies.vendors.canActivate && (
              <button
                type="button"
                disabled={isActionPending}
                onClick={() => void handleReactivateVendor()}
                className="h-10 px-5 rounded-[8px] bg-[#00a389] hover:bg-[#008f78] text-white text-[13px] font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                Reactivate vendor
              </button>
            )
          ) : (
            <>
              {canManageMasterList && workspaceSelection === "all" && (
                <button
                  type="button"
                  onClick={() => setConnectModalOpen(true)}
                  className="h-10 px-4 rounded-[8px] border border-[#00a389] text-[#00a389] hover:bg-[#f0faf8] text-[13px] font-semibold transition-colors cursor-pointer"
                >
                  Connect Another Entity
                </button>
              )}
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
            </>
          )}
        </div>
      </div>

        {/* ── Sub Navigation Tabs ── */}
        {!fromMaster && (
          <div className="flex items-center gap-1 p-1 rounded-[10px] bg-[#f5f7f6] w-fit">
            <button
              type="button"
              className="px-5 py-1.5 rounded-[8px] bg-white text-[13px] font-semibold text-[#0b100e] shadow-xs cursor-pointer"
            >
              Profile
            </button>
            {canManageEntityConfiguration &&
              derivedRelationship !== "not_connected" && (
                <Link
                  href={configurationHref}
                  className="px-5 py-1.5 rounded-[8px] text-[13px] font-medium text-[#68726d] hover:text-[#0b100e] transition-colors"
                >
                  Entity configuration
                </Link>
              )}
          </div>
        )}
      </div>

      {/* ── Content Grid (2 Columns) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-5">
          {/* VENDOR IDENTITY */}
          <div className="bg-white rounded-[14px] border border-black/[0.06] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <h2 className="text-[12px] font-bold text-[#0b100e] uppercase tracking-wide mb-4">
              VENDOR IDENTITY
            </h2>
            <div className="space-y-3.5">
              <div className="border border-black/[0.06] rounded-[10px] p-4 bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[12px] text-[#68726d] mb-1">
                      Business Name
                    </p>
                    <p className="text-[14px] font-semibold text-[#0b100e]">
                      {vendorDisplayName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#68726d] mb-1">
                      Registration Number
                    </p>
                    <p className="text-[14px] font-semibold text-[#0b100e]">
                      {taxId || "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-black/[0.06] rounded-[10px] p-4 bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[12px] text-[#68726d] mb-1">Country</p>
                    <p className="text-[14px] font-semibold text-[#0b100e]">
                      {country || "—"}
                    </p>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[12px] text-[#68726d] mb-1">Address</p>
                    <p
                      className="text-[14px] font-semibold text-[#0b100e] truncate"
                      title={address || undefined}
                    >
                      {address || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Connected Legal Entities (per V2 Master Directory Spec) */}
              {(connectedLegalEntities.length > 0 || legalEntityCount > 0) && (
                <div className="border border-black/[0.06] rounded-[10px] p-4 bg-[#f9faf9]/60">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[12px] font-semibold text-[#0b100e] flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#087f70]" />
                      Connected Legal Entities
                    </p>
                    <span className="text-[11px] font-semibold text-[#087f70]">
                      {legalEntityCount}{" "}
                      {legalEntityCount === 1 ? "entity" : "entities"}
                    </span>
                  </div>
                  {connectedLegalEntities.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {connectedLegalEntities.map((entity) => (
                        <div
                          key={entity.legalEntityId}
                          className="inline-flex items-center gap-2 rounded-[8px] border border-black/[0.08] bg-white px-3 py-1.5 text-[12px]"
                        >
                          <span className="font-semibold text-[#0b100e]">
                            {entity.legalName}
                          </span>
                          <span
                            className="font-mono text-[10px] text-[#84908a]"
                            title={entity.legalEntityId}
                          >
                            {entity.legalEntityId.slice(0, 8)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-[#68726d]">
                      Connected across {legalEntityCount} legal{" "}
                      {legalEntityCount === 1 ? "entity" : "entities"}.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* OPERATING SITES & PERMITTED PURPOSES */}
          <div className="bg-white rounded-[14px] border border-black/[0.06] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-[12px] font-bold text-[#0b100e] uppercase tracking-wide">
                  {!fromMaster ? "OPERATING SITES & PURPOSES" : "VENDOR SITES"}
                </h2>
                {!fromMaster && activeRelationship?.legalEntity?.legalName && (
                  <p className="text-[11px] text-[#68726d] mt-0.5">
                    Configured for {activeRelationship.legalEntity.legalName}
                  </p>
                )}
              </div>
              {!fromMaster &&
                canManageEntityConfiguration &&
                derivedRelationship !== "not_connected" && (
                  <Link
                    href={configurationHref}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#00a389] hover:text-[#008f78] transition-colors"
                  >
                    <span>Edit in Entity configuration</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
            </div>

            {isSitesLoading || (!fromMaster && isRelationshipsLoading) ? (
              <div className="space-y-2.5">
                <Skeleton className="h-16 w-full rounded-[10px]" />
                <Skeleton className="h-16 w-full rounded-[10px]" />
              </div>
            ) : vendorSites.length === 0 ? (
              <p className="rounded-[10px] border border-dashed border-black/[0.1] p-4 text-[13px] text-[#68726d]">
                No operating sites have been submitted by this vendor yet.
              </p>
            ) : (
              <div className="space-y-3">
                {vendorSites.map((site) => {
                  const assignedPurposes =
                    siteAssignmentMap.get(site.vendorSiteId) || [];
                  const isAssigned = assignedPurposes.length > 0;

                  return (
                    <div
                      key={site.vendorSiteId}
                      className="rounded-[10px] border border-black/[0.06] p-3.5 space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <MapPin className="w-4 h-4 shrink-0 text-[#087f70]" />
                          <span className="text-[13px] font-semibold text-[#0b100e]">
                            {site.name}
                          </span>
                          {site.code && (
                            <span className="text-[11px] font-mono text-[#68726d]">
                              ({site.code})
                            </span>
                          )}
                          {site.isPrimary && (
                            <span className="px-2 py-0.5 rounded-full bg-[#e7f6f2] text-[#087f70] text-[10px] font-semibold border border-[#c8eee6]">
                              Primary
                            </span>
                          )}
                          {site.status === "inactive" && (
                            <span className="px-2 py-0.5 rounded-full bg-[#f5f7f6] text-[#68726d] text-[10px] font-semibold">
                              Inactive
                            </span>
                          )}
                        </div>

                        {!fromMaster ? (
                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            {isAssigned ? (
                              assignedPurposes.map((p) => (
                                <span
                                  key={p}
                                  className={`px-2 py-0.5 rounded-[6px] border text-[11px] font-semibold ${
                                    PURPOSE_STYLES[p] ||
                                    "bg-[#f5f7f6] text-[#68726d] border-black/[0.08]"
                                  }`}
                                >
                                  {PURPOSE_LABEL[p] || p}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-[#84908a] italic">
                                Not assigned to this entity
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-right shrink-0">
                            <span className="text-[11px] font-medium text-[#68726d]">
                              {site.legalEntityCount}{" "}
                              {site.legalEntityCount === 1
                                ? "entity"
                                : "entities"}
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="text-[12px] text-[#68726d] pl-6">
                        {[
                          site.addressLine1,
                          site.city,
                          site.stateOrProvince,
                          site.countryCode,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                    </div>
                  );
                })}

                {/* Footer Purchasing State for the Active Entity */}
                {!fromMaster && activeRelationship && (
                  <div className="pt-2.5 border-t border-black/[0.06] flex items-center justify-between text-[12px]">
                    {activeRelationship.purchasingEnabled ? (
                      <div className="flex items-center gap-1.5 font-medium text-[#087f70]">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Purchasing is active for this entity</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 font-medium text-[#d97706]">
                        <AlertCircle className="w-4 h-4" />
                        <span>Purchasing access is on hold</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* VERIFICATION DOCUMENTS */}
          <div className="bg-white rounded-[14px] border border-black/[0.06] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <h2 className="text-[12px] font-bold text-[#0b100e] uppercase tracking-wide mb-4">
              VERIFICATION DOCUMENTS
            </h2>
            {documents.length === 0 ? (
              <p className="rounded-[10px] border border-dashed border-black/[0.1] p-4 text-[13px] text-[#68726d]">
                No verification documents uploaded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-black/[0.06] text-[11px] font-semibold text-[#84908a]">
                      <th className="py-2.5 px-2">Name</th>
                      <th className="py-2.5 px-4">Issue date</th>
                      <th className="py-2.5 px-4">Expiry date</th>
                      <th className="py-2.5 px-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {documents.map((doc, idx) => {
                      const originalName =
                        pickString(doc, "originalName", "fileName", "name") ||
                        "Document";
                      const docType =
                        getString(doc.documentType).replace(/_/g, " ") ||
                        "Verification Document";
                      const fileUrl = getString(doc.fileUrl);
                      return (
                        <tr
                          key={getString(doc.vendorDocumentId) || idx}
                          className="text-[13px]"
                        >
                          <td className="py-3 px-2 flex items-center gap-3">
                            <FileText className="w-5 h-5 text-[#68726d] shrink-0" />
                            <div>
                              <p className="font-semibold text-[#0b100e] text-[13px]">
                                {originalName}
                              </p>
                              <p className="text-[11px] text-[#84908a] capitalize">
                                {docType}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[#68726d] text-[12px]">
                            {formatDocDate(doc.issuedAt)}
                          </td>
                          <td className="py-3 px-4 text-[#68726d] text-[12px]">
                            {formatDocDate(doc.expiresAt)}
                          </td>
                          <td className="py-3 px-2 text-right">
                            {fileUrl ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewDocUrl(fileUrl);
                                  setPreviewDocName(originalName);
                                }}
                                className="px-3.5 py-1 rounded-[6px] border border-[#00a389] text-[#00a389] hover:bg-[#e7f6f2] text-[12px] font-medium transition-colors cursor-pointer"
                              >
                                View
                              </button>
                            ) : (
                              <span className="text-[11px] text-[#84908a]">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-5">
          {/* RISK ANALYSIS */}
          <div className="bg-white rounded-[14px] border border-black/[0.06] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[12px] font-bold text-[#0b100e] uppercase tracking-wide">
                RISK ANALYSIS
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white ${
                  riskLevel === "Low" ? "bg-[#22c55e]" : "bg-[#d33d44]"
                }`}
              >
                {riskLevel}
              </span>
            </div>

            <div
              className={`p-3 rounded-[8px] text-[13px] font-medium flex items-center gap-2 mb-4 border ${
                riskLevel === "Low"
                  ? "bg-[#edfbf6] border-[#b2ebd8] text-[#087f70]"
                  : "bg-[#fdf2f2] border-[#fbd5d5] text-[#d33d44]"
              }`}
            >
              {riskLevel === "Low" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#087f70]" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0 text-[#d33d44]" />
              )}
              <span>
                {hasBankVerified
                  ? "The account details match"
                  : "Bank verification pending"}
              </span>
            </div>

            <p className="text-[11px] font-bold text-[#84908a] uppercase tracking-wider mb-2.5">
              CHECK PASSED
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-[13px] text-[#0b100e]">
                {hasBankVerified ? (
                  <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#84908a] shrink-0" />
                )}
                <span>
                  {hasBankVerified
                    ? "Bank account verified"
                    : "Bank account pending verification"}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-[13px] text-[#0b100e]">
                {hasRegVerified ? (
                  <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#84908a] shrink-0" />
                )}
                <span>
                  {hasRegVerified
                    ? "Business registration confirmed"
                    : "Business registration pending"}
                </span>
              </div>
            </div>
          </div>

          {/* PAYMENT INFO */}
          <div className="bg-white rounded-[14px] border border-black/[0.06] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <h2 className="text-[12px] font-bold text-[#0b100e] uppercase tracking-wide mb-4">
              PAYMENT INFO
            </h2>
            <div className="border border-black/[0.06] rounded-[10px] p-4 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[12px] text-[#68726d] mb-1">Bank</p>
                  <p className="text-[14px] font-semibold text-[#0b100e]">
                    {bankName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-[#68726d] mb-1">Account</p>
                  <p className="text-[14px] font-semibold text-[#0b100e]">
                    {bankAccountNumber || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PAYMENT TERM */}
          <div className="bg-white rounded-[14px] border border-black/[0.06] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <h2 className="text-[12px] font-bold text-[#0b100e] uppercase tracking-wide mb-4">
              PAYMENT TERM
            </h2>
            <div className="border border-black/[0.06] rounded-[10px] p-4 space-y-4 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[12px] text-[#68726d] mb-1">Preferred</p>
                  <p className="text-[14px] font-semibold text-[#0b100e]">
                    {paymentTerm?.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-[#68726d] mb-1">
                    Payment window
                  </p>
                  <p className="text-[14px] font-semibold text-[#0b100e]">
                    {paymentTerm?.days != null
                      ? `${paymentTerm.days} days`
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3.5 border-t border-black/[0.05]">
                <div>
                  <p className="text-[12px] text-[#68726d] mb-1">Version</p>
                  <p className="text-[14px] font-semibold text-[#0b100e]">
                    {paymentTerm?.revision ? `V${paymentTerm.revision}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-[#68726d] mb-1">Review date</p>
                  <p className="text-[14px] font-semibold text-[#0b100e]">
                    {formatDocDate(
                      paymentTerm?.reviewedAt ?? paymentTerm?.submittedAt,
                    )}
                  </p>
                </div>
              </div>

              {derivedRelationship === "under_review" &&
                paymentTerm?.status === "pending_review" && (
                  <div className="pt-3 border-t border-black/[0.05]">
                    <label className="flex items-center gap-2 text-[12px] text-[#0b100e] cursor-pointer">
                      <Checkbox
                        checked={approveWithTerms}
                        onCheckedChange={(val) =>
                          setApproveWithTerms(val === true)
                        }
                      />
                      <span>
                        Approve submitted payment terms alongside relationship
                      </span>
                    </label>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Connect to Entity Dialog ── */}
      <ConnectToEntityDialog
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        vendorName={vendorDisplayName}
        vendorId={vendorId}
        connectedLegalEntities={connectedLegalEntities}
        onConnected={() => setRelationshipOverride("pending_connection")}
      />

      {/* ── Deactivate Vendor Dialog ── */}
      <DeactivateVendorOrgDialog
        open={deactivateOrgModalOpen}
        onClose={() => setDeactivateOrgModalOpen(false)}
        vendorName={vendorDisplayName}
        vendorId={vendorId}
        organizationWide={fromMaster}
        legalEntityId={activeEntityId}
        onDeactivated={() => setRelationshipOverride("inactive")}
      />

      {/* ── Return for Correction / Reject Dialog ── */}
      <Dialog
        open={rejectModalOpen}
        onOpenChange={(val) => !val && setRejectModalOpen(false)}
      >
        <DialogContent className="max-w-[460px] p-6 rounded-[18px] bg-white border border-black/[0.08]">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-[18px] font-bold text-[#0b100e]">
              Return vendor submission for correction?
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[#68726d]">
              The relationship will return to{" "}
              <span className="font-semibold text-[#0b100e]">
                pending vendor action
              </span>{" "}
              so {vendorDisplayName} can update its documents, banking, or
              payment terms and resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="vendor-reject-reason"
                className="text-[13px] font-medium text-[#0b100e] block"
              >
                Reason <span className="text-[#84908a]">(Required)</span>
              </label>
              <textarea
                id="vendor-reject-reason"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. The requested tax clearance certificate has expired"
                className="w-full p-3.5 rounded-[8px] border border-black/[0.12] bg-white text-[13px] text-[#0b100e] placeholder:text-[#84908a] focus:outline-none focus:border-[#d33d44] resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="h-10 px-5 rounded-[8px] border border-black/[0.15] bg-white text-[13px] font-semibold text-[#0b100e] hover:bg-[#f5f7f6] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim() || isActionPending}
                onClick={() => void handleRejectVendor()}
                className="h-10 px-5 rounded-[8px] bg-[#d33d44] hover:bg-[#be2f36] text-white text-[13px] font-semibold disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isActionPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Return for Correction
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Document Preview Modal ── */}
      {previewDocUrl && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-[2px] animate-in fade-in">
          <Rnd
            default={{
              x:
                typeof window !== "undefined"
                  ? (window.innerWidth - 800) / 2
                  : 100,
              y:
                typeof window !== "undefined"
                  ? (window.innerHeight - 700) / 2
                  : 100,
              width: 800,
              height: 700,
            }}
            minWidth={400}
            minHeight={400}
            bounds="window"
            dragHandleClassName="modal-drag-handle"
            className="z-[101]"
          >
            <div className="bg-white rounded-[14px] shadow-2xl w-full h-full flex flex-col relative overflow-hidden border border-black/[0.08]">
              <div className="modal-drag-handle flex items-center justify-between px-6 py-4 border-b border-black/[0.08] bg-[#f9faf9] cursor-move select-none">
                <h2 className="text-[16px] font-bold text-[#0b100e] truncate pr-4">
                  {previewDocName || "Document Preview"}
                </h2>
                <div
                  className="flex items-center gap-3"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <a
                    href={previewDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="px-4 py-2 rounded-[8px] bg-[#087f70] text-white text-[13px] font-semibold hover:bg-[#076b5e] transition-colors"
                  >
                    Download
                  </a>
                  <button
                    onClick={() => {
                      setPreviewDocUrl(null);
                      setPreviewDocName(null);
                    }}
                    className="w-9 h-9 rounded-[8px] bg-[#f5f7f6] hover:bg-[#ebeeed] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5 text-[#0b100e]" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-[#f5f7f6] p-4 flex flex-col gap-4 relative overflow-hidden">
                <div className="flex-1 bg-white rounded-[10px] border border-black/[0.08] shadow-sm relative overflow-hidden">
                  {previewDocUrl
                    .split("?")[0]
                    .match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <img
                        src={previewDocUrl}
                        alt={previewDocName || "Document"}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : previewDocUrl.split("?")[0].match(/\.pdf$/i) ? (
                    <PdfViewer file={previewDocUrl} />
                  ) : (
                    <iframe
                      src={
                        previewDocUrl
                          .split("?")[0]
                          .match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i)
                          ? `https://docs.google.com/viewer?url=${encodeURIComponent(
                              previewDocUrl,
                            )}&embedded=true`
                          : previewDocUrl
                      }
                      className="w-full h-full border-0"
                      title={previewDocName || "Document"}
                    />
                  )}
                </div>
              </div>
            </div>
          </Rnd>
        </div>
      )}
    </div>
  );
}

function OrganizationVendorDetails() {
  const canReadProfile = useAuthStore(
    (state) =>
      state.can("vendor", "read_company") ||
      state.can("vendor.master_list", "manage") ||
      (state.can("vendor.directory", "read") &&
        state.can("vendor", "sensitive.read")),
  );
  return canReadProfile ? <VendorDetailsPage /> : <VendorSummary />;
}

export default withPermissions(OrganizationVendorDetails, [
  { resource: "vendor.directory", action: "read" },
  { resource: "vendor", action: "read_company" },
  { resource: "vendor.master_list", action: "manage" },
]);
