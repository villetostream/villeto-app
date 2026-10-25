"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAxios } from "@/hooks/useAxios";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";
import { CheckCircle2, XCircle, X, FileText, Clock, CreditCard } from "lucide-react";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import { useAuthStore } from "@/stores/auth-stores";
import { toast } from "sonner";
import withPermissions from "@/components/permissions/permission-protected-routes";
import {
  asArray,
  asRecord,
  getString,
  isRecord,
  pickString,
} from "@/lib/types/api-error";
import {
  useVendorNetworkDetail,
  useVendorReview,
  useVendorStatusUpdate,
  useCompanyPaymentTermsList,
  useVendorPaymentTerms,
  useApprovePaymentTerms,
  useRejectPaymentTerms,
  VendorPaymentTerm,
} from "@/queries/vendors/vendor-network";
import { VendorSummary } from "@/components/vendors/VendorSummary";


import Link from "next/link";
import { Rnd } from "react-rnd";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("@/components/ui/pdf-viewer"), {
  ssr: false,
});

function VendorDetailsPage() {
  const { vendorId } = useParams() as { vendorId: string };
  const router = useRouter();
  const axiosInstance = useAxios();
  const policies = useAuthorizationPolicies();
  const canManageEntityConfiguration = useAuthStore((state) =>
    state.can("vendor.entity_configuration", "manage"),
  );

  const [requestInfoModalOpen, setRequestInfoModalOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [paymentTermsModalOpen, setPaymentTermsModalOpen] = useState(false);
  const [paymentTermsRejectReason, setPaymentTermsRejectReason] = useState("");
  const [isPaymentTermsRejecting, setIsPaymentTermsRejecting] = useState(false);
  const [showPaymentTermsHistoryModal, setShowPaymentTermsHistoryModal] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocName, setPreviewDocName] = useState<string | null>(null);

  const {
    data: vendorResponse,
    isLoading: isVendorLoading,
  } = useVendorNetworkDetail(vendorId);
  const vendor = vendorResponse?.data || null;
  const isLoading = isVendorLoading;

  // Lock body scroll when preview modal is open
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

  const reviewMutation = useVendorReview(vendorId);
  const statusMutation = useVendorStatusUpdate(vendorId);

  // ── Payment Terms ─────────────────────────────────────────────────────────
  // Query all payment terms awaiting or carrying company decisions
  const {
    data: companyPaymentTerms = [],
    isLoading: isPaymentTermsListLoading,
  } = useCompanyPaymentTermsList();

  // Match the shared supplier identity; names are not unique identifiers.
  const matchingPaymentTerms = useMemo(
    () => companyPaymentTerms.filter((term) => term.vendorId === vendorId),
    [companyPaymentTerms, vendorId],
  );

  const paymentTermFromList = useMemo(() => {
    if (!matchingPaymentTerms || matchingPaymentTerms.length === 0) return null;
    return (
      matchingPaymentTerms.find((t) => t.status === "pending_review") ||
      matchingPaymentTerms.find((t) => t.isCurrent) ||
      matchingPaymentTerms.find((t) => t.status === "approved") ||
      matchingPaymentTerms[0] ||
      null
    );
  }, [matchingPaymentTerms]);

  // 2. Fall back to any embedded payment term in the vendor object
  const paymentTermFromVendor = useMemo<Partial<VendorPaymentTerm> | null>(() => {
    const raw =
      vendor?.paymentTerm ||
      vendor?.paymentTerms ||
      vendor?.currentPaymentTerm ||
      vendor?.pendingPaymentTerm;
    const candidate = Array.isArray(raw) ? raw[0] : raw;
    return isRecord(candidate) ? candidate as Partial<VendorPaymentTerm> : null;
  }, [vendor]);

  // 3. Fall back to any explicit paymentTermId on vendor object
  const pendingPaymentTermId =
    paymentTermFromList?.paymentTermId ||
    paymentTermFromVendor?.paymentTermId ||
    getString(vendor?.currentPaymentTermId) ||
    getString(vendor?.pendingPaymentTermId) ||
    getString(vendor?.paymentTermId) ||
    getString(vendor?.vendorPaymentTermId) ||
    null;

  const { data: paymentTermData } = useVendorPaymentTerms(
    paymentTermFromList ? null : pendingPaymentTermId,
  );

  const paymentTerm: Partial<VendorPaymentTerm> | null =
    paymentTermFromList ||
    paymentTermData ||
    paymentTermFromVendor ||
    null;

  const approvePaymentTermsMutation = useApprovePaymentTerms(
    paymentTerm?.paymentTermId ?? "",
    vendorId,
  );
  const rejectPaymentTermsMutation = useRejectPaymentTerms(
    paymentTerm?.paymentTermId ?? "",
    vendorId,
  );

  const isSubmitting =
    reviewMutation.isPending ||
    statusMutation.isPending ||
    approvePaymentTermsMutation.isPending ||
    rejectPaymentTermsMutation.isPending;

  const handleDecision = async (
    decision: "approved" | "rejected",
    customNote?: string,
  ) => {
    if (!vendor) return;
    const note =
      customNote ||
      (decision === "approved"
        ? "KYC and banking details reviewed."
        : `Vendor ${decision} by admin.`);
    try {
      await reviewMutation.mutateAsync({ decision, note });
      if (decision === "rejected") {
        setRejectModalOpen(false);
        setRejectReason("");
      }
      toast.success(
        decision === "approved"
          ? "Supplier onboarding approved"
          : "Supplier onboarding rejected",
      );
    } catch (err) {
      logger.error(`Failed to ${decision} vendor`, err);
      toast.error(`Failed to ${decision} vendor. Please try again.`);
    }
  };

  const handleStatusUpdate = async (statusPayload: "Active" | "Inactive") => {
    try {
      await statusMutation.mutateAsync({ status: statusPayload });
      toast.success(
        `Vendor ${statusPayload === "Active" ? "activated" : "deactivated"} successfully`,
      );
    } catch (err) {
      logger.error(`Failed to update vendor status to ${statusPayload}`, err);
      toast.error(
        `Failed to ${statusPayload === "Active" ? "activate" : "deactivate"} vendor. Please try again.`,
      );
    }
  };

  const handleResendInvitation = async () => {
    try {
      await axiosInstance.post(`/vendors/${vendorId}/invitations/resend`);
      toast.success("Invitation resent successfully");
    } catch (err) {
      logger.error(`Failed to resend invitation`, err);
      toast.error("Failed to resend invitation. Please try again.");
    }
  };

  const handleRequestInfo = async () => {
    logger.log("Request info sent:", infoMessage);
    setRequestInfoModalOpen(false);
    setInfoMessage("");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-16 rounded-[8px]" />
        <Skeleton className="h-12 w-1/3 rounded-[8px]" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full rounded-[14px]" />
          <Skeleton className="h-[400px] w-full rounded-[14px]" />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div>
        <p className="text-[#84908a]">Vendor not found.</p>
      </div>
    );
  }

  const profile = asRecord(vendor.profile);
  const banking = asRecord(vendor.bankingDetails);
  const business = asRecord(vendor.businessDetails);

  const status = getString(vendor.status);
  const onboardingStatus = getString(vendor.onboardingStatus);
  const approvalStatus = getString(vendor.approvalStatus);
  const deactivatedAt = vendor.deactivatedAt;

  const bankName =
    getString(banking.bankName) ||
    getString(vendor.bankName) ||
    getString(profile.bankName);
  const bankAccountNumber =
    getString(banking.maskedAccountNumber) ||
    getString(banking.accountNumber) ||
    getString(vendor.bankAccountNumber) ||
    getString(profile.bankAccountNumber);
  const accountName =
    getString(banking.accountName) ||
    getString(vendor.accountName) ||
    getString(profile.accountName);
  const legalName =
    getString(business.legalName) ||
    getString(vendor.legalName) ||
    getString(profile.legalName);
  const displayName =
    getString(business.displayName) ||
    getString(vendor.displayName) ||
    getString(profile.displayName);
  const email =
    getString(business.email) ||
    getString(vendor.email) ||
    getString(profile.email);
  const taxId =
    getString(business.registrationNumber) ||
    getString(business.tin) ||
    getString(vendor.taxId) ||
    getString(profile.taxId);
  const country =
    getString(business.country) ||
    getString(vendor.country) ||
    getString(profile.country);
  const address =
    getString(business.businessAddress) ||
    getString(vendor.address) ||
    getString(profile.address);
  const contactFirstName =
    getString(vendor.contactFirstName) || getString(profile.contactFirstName);
  const contactLastName =
    getString(vendor.contactLastName) || getString(profile.contactLastName);
  const decisionNote =
    getString(vendor.decisionNote) ||
    getString(vendor.rejectionReason) ||
    getString(vendor.note);
  const createdBy = asRecord(vendor.createdBy);
  const approvedBy = asRecord(vendor.approvedBy);
  const vendorDocs = asArray(vendor.documents);
  const profileDocs = asArray(profile.documents);
  const documents = (vendorDocs.length > 0 ? vendorDocs : profileDocs).filter(
    isRecord,
  );
  const createdByName =
    `${pickString(createdBy, "firstName")} ${pickString(createdBy, "lastName")}`.trim();
  const approvedByName =
    `${pickString(approvedBy, "firstName")} ${pickString(approvedBy, "lastName")}`.trim();

  const rawStatus = status.toLowerCase();
  const nextAction = getString(vendor.nextAction);

  // A vendor is awaiting review if:
  // 1. nextAction is "awaiting_company_review", OR
  // 2. onboardingStatus is "submitted" and they are not yet approved
  const isAwaitingReview =
    nextAction === "awaiting_company_review" ||
    (onboardingStatus === "submitted" && approvalStatus !== "approved");

  // Specifically resubmitted after being previously rejected:
  const isResubmitted = isAwaitingReview && approvalStatus === "rejected";
  const isUnderReview = isAwaitingReview;

  const isRejected = approvalStatus === "rejected" && !isAwaitingReview;

  const isInvited =
    !isAwaitingReview &&
    approvalStatus === "pending" &&
    (!onboardingStatus || onboardingStatus === "invited");
  const isOnboarding =
    !isAwaitingReview &&
    approvalStatus === "pending" &&
    !["invited", "submitted", ""].includes(onboardingStatus);
  // Vendor approved (Stage 1 done) but never yet activated — awaiting payment
  // terms review (Stage 2). A deactivatedAt timestamp means they were active
  // before and were explicitly deactivated, so this is a reactivation scenario.
  const isApprovedPhase4 =
    approvalStatus === "approved" && rawStatus !== "active" && !deactivatedAt;
  // If payment term is explicitly rejected, vendor is awaiting resubmission.
  const isPaymentTermRejected = paymentTerm?.status === "rejected";
  // Stage 2: Approved in Stage 1, awaiting payment terms approval to activate.
  const isPendingPaymentTerms = isApprovedPhase4 && !isPaymentTermRejected;
  const isDeactivated =
    approvalStatus === "approved" && rawStatus !== "active" && !!deactivatedAt;
  const isActive = approvalStatus === "approved" && rawStatus === "active";

  const isEligibleForRiskCheck = isUnderReview || isApprovedPhase4 || isActive;
  const hasBankMismatch =
    isEligibleForRiskCheck && (!bankName || !bankAccountNumber);
  const riskLevel = hasBankMismatch ? "High" : "Low";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[18px] font-semibold text-[#0b100e]">
              {legalName || displayName}
            </h1>
            {isOnboarding && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#f0f6ff] text-[#0066cc] text-xs font-semibold border border-[#d6e7ff]">
                Onboarding
              </span>
            )}
            {isResubmitted ? (
              <span className="px-2.5 py-0.5 rounded-full bg-[#fff9e6] text-[#b27b00] text-xs font-semibold border border-[#ffe099] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Resubmitted for Review
              </span>
            ) : isUnderReview ? (
              <span className="px-2.5 py-0.5 rounded-full bg-[#fff9e6] text-[#b27b00] text-xs font-semibold border border-[#ffe099]">
                Under Review
              </span>
            ) : null}
            {isActive && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#f0faf8] text-[#087f70] text-xs font-semibold border border-[#e7f6f2]">
                Active
              </span>
            )}
            {isApprovedPhase4 && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#f0faf8] text-[#087f70] text-xs font-semibold border border-[#e7f6f2]">
                Approved
              </span>
            )}
            {isDeactivated && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#f9faf9] text-[#68726d] text-xs font-semibold border border-black/[0.08]">
                Deactivated
              </span>
            )}
            {isRejected && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#fdf2f2] text-[#d33d44] text-xs font-semibold border border-[#fbd5d5]">
                Rejected
              </span>
            )}
            {isInvited && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#f9faf9] text-[#68726d] text-xs font-semibold border border-black/[0.08]">
                Invited
              </span>
            )}
          </div>
          <p className="text-[13px] font-medium text-[#68726d] mt-1">{email}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Approve / Reject / Request Info */}
          {isUnderReview && policies.vendors.canReject && (
            <button
              disabled={isSubmitting}
              onClick={() => setRejectModalOpen(true)}
              className="px-4 h-9 rounded-[8px] border border-[#d33d44] text-[#d33d44] font-semibold text-[13px] hover:bg-[#fdf2f2] transition-colors disabled:opacity-50"
            >
              Reject vendor
            </button>
          )}

          {isUnderReview && policies.vendors.canApprove && (
            <button
              disabled={isSubmitting}
              onClick={() => handleDecision("approved")}
              className="px-4 h-9 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors disabled:opacity-50 shadow-sm"
            >
              {reviewMutation.isPending ? "Processing..." : "Approve vendor"}
            </button>
          )}
          {/* Stage 2: Approve Payment Terms (newly onboarded, never yet active) */}
          {isPendingPaymentTerms && (policies.vendors.canApprove || policies.vendors.canActivate) && (
            <button
              disabled={isSubmitting}
              onClick={() => {
                setIsPaymentTermsRejecting(false);
                setPaymentTermsRejectReason("");
                setPaymentTermsModalOpen(true);
              }}
              className="px-4 h-9 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve payment terms
            </button>
          )}
          {isApprovedPhase4 && isPaymentTermRejected && (
            <span className="px-3 py-1.5 rounded-[8px] bg-[#fff9e6] text-[#b27b00] text-[12px] font-semibold border border-[#ffe099]">
              Payment terms rejected — awaiting vendor resubmission
            </span>
          )}
          {/* Reactivate — deactivated vendors use the old status endpoint */}
          {isDeactivated && policies.vendors.canActivate && (
            <button
              disabled={isSubmitting}
              onClick={() => handleStatusUpdate("Active")}
              className="px-4 h-9 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors disabled:opacity-50 shadow-sm"
            >
              {statusMutation.isPending ? "Processing..." : "Reactivate organization vendor"}
            </button>
          )}
          {/* Deactivate */}
          {isActive && policies.vendors.canDeactivate && (
            <button
              disabled={isSubmitting}
              onClick={() => handleStatusUpdate("Inactive")}
              className="px-4 h-9 rounded-[8px] border border-[#d33d44] text-[#d33d44] font-semibold text-[13px] hover:bg-[#fdf2f2] transition-colors disabled:opacity-50"
            >
              {statusMutation.isPending
                ? "Processing..."
                : "Deactivate organization vendor"}
            </button>
          )}
          {/* Resend Invitation */}
          {(isInvited || isOnboarding) && policies.vendors.canInvite && (
            <button
              disabled={isSubmitting}
              onClick={handleResendInvitation}
              className="px-4 h-9 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {isSubmitting ? "Sending..." : "Resend Invitation"}
            </button>
          )}
        </div>
      </div>

      {/* ── Resubmission Notice Banner ── */}
      {isResubmitted && (
        <div className="rounded-[14px] border border-[#ffe099] bg-[#fffdf5] p-4 flex items-start gap-3 shadow-sm">
          <Clock className="h-5 w-5 text-[#b27b00] mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="text-[13px] font-semibold text-[#8a5f00]">
              Application Resubmitted for Review
            </h3>
            <p className="text-[12px] text-[#8a5f00]/90 mt-0.5 leading-relaxed">
              This vendor was previously rejected, but has updated their details/documents and resubmitted for review. You can inspect their latest information below and click &ldquo;Approve vendor&rdquo; or &ldquo;Reject vendor&rdquo; above.
            </p>
          </div>
        </div>
      )}

      <nav
        aria-label="Vendor sections"
        className="flex w-fit items-center gap-1 rounded-[10px] border border-black/[0.08] bg-white p-1 shadow-sm"
      >
        <span className="rounded-[7px] bg-[#e8f7f2] px-3 py-2 text-[12px] font-semibold text-[#087f70]">
          Profile
        </span>
        {canManageEntityConfiguration && (
          <Link
            href={`/vendors/${vendorId}/configuration`}
            className="rounded-[7px] px-3 py-2 text-[12px] font-semibold text-[#5e6863] transition-colors hover:bg-[#f5f7f6] hover:text-[#0b100e]"
          >
            Entity configuration
          </Link>
        )}
      </nav>

      {/* ── Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* ══ Left Column ══ */}
        <div className="space-y-5">
          <div className="bg-white rounded-[14px] border border-black/[0.08] p-5 shadow-sm">
            <h2 className="text-[10px] font-bold text-[#84908a] uppercase tracking-[0.1em] mb-4">
              IDENTITY VERIFICATION
            </h2>

            <div className="space-y-3">
              {/* Row 1 */}
              <div className="border border-black/[0.06] rounded-[10px] p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[13px] font-medium text-[#68726d] mb-0.5">
                      Business Name
                    </p>
                    <p className="text-[13px] font-semibold text-[#0b100e]">
                      {legalName || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#68726d] mb-0.5">
                      Registration Number
                    </p>
                    <p className="text-[13px] font-semibold text-[#0b100e]">
                      {taxId || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Row 3 */}
              <div className="border border-black/[0.06] rounded-[10px] p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[13px] font-medium text-[#68726d] mb-0.5">
                      Country
                    </p>
                    <p className="text-[13px] font-semibold text-[#0b100e]">
                      {country || "N/A"}
                    </p>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[13px] font-medium text-[#68726d] mb-0.5">
                      Address
                    </p>
                    <p
                      className="text-[13px] font-semibold text-[#0b100e] truncate"
                      title={address}
                    >
                      {address || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Row 4 */}
              {(createdByName || approvedByName) && (
                <div className="border border-black/[0.06] rounded-[10px] p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {createdByName && (
                      <div>
                        <p className="text-[13px] font-medium text-[#68726d] mb-0.5">
                          Invited By
                        </p>
                        <p className="text-[13px] font-semibold text-[#0b100e]">
                          {createdByName}
                        </p>
                      </div>
                    )}
                    {approvedByName && (
                      <div>
                        <p className="text-[13px] font-medium text-[#68726d] mb-0.5">
                          Approved By
                        </p>
                        <p className="text-[13px] font-semibold text-[#0b100e]">
                          {approvedByName}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[14px] border border-black/[0.08] p-5 shadow-sm">
            <h2 className="text-[10px] font-bold text-[#84908a] uppercase tracking-[0.1em] mb-4">
              COMPANY BANK ACCOUNT
            </h2>
            <div className="border border-black/[0.06] rounded-[10px] p-4 bg-[#f9faf9]/50">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-[13px] font-medium text-[#68726d] mb-0.5">
                    Bank Name
                  </p>
                  <p className="text-[13px] font-semibold text-[#0b100e]">
                    {bankName || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#68726d] mb-0.5">
                    Account Name
                  </p>
                  <p className="text-[13px] font-semibold text-[#0b100e]">
                    {accountName || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#68726d] mb-0.5">
                    Account Number
                  </p>
                  <p className="text-[13px] font-semibold text-[#0b100e]">
                    {bankAccountNumber || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[14px] border border-black/[0.08] p-5 shadow-sm">
            <h2 className="text-[10px] font-bold text-[#84908a] uppercase tracking-[0.1em] mb-4">
              VERIFICATION DOCUMENTS
            </h2>
            {documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc) => {
                  const docId = getString(doc.vendorDocumentId);
                  const originalName =
                    pickString(doc, "originalName") || "Document.pdf";
                  const documentType = getString(doc.documentType).replace(
                    /_/g,
                    " ",
                  );
                  const fileUrl = getString(doc.fileUrl);
                  const rawIssuedAt = doc.issuedAt;
                  const rawExpiresAt = doc.expiresAt;
                  const formatDate = (value: unknown) => {
                    if (!value || typeof value !== "string") return "N/A";
                    const d = new Date(value);
                    return isNaN(d.getTime())
                      ? "N/A"
                      : d.toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        });
                  };
                  return (
                    <div
                      key={docId || originalName}
                      className="p-3.5 rounded-[10px] border border-black/[0.06] bg-white space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#f0faf8] flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-[#087f70]" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-[#0b100e] leading-tight">
                              {originalName}
                            </p>
                            <p className="text-[12px] text-[#84908a] capitalize mt-0.5">
                              {documentType}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setPreviewDocUrl(fileUrl);
                            setPreviewDocName(originalName);
                          }}
                          className="px-4 py-1.5 rounded-[6px] border border-[#087f70] text-[#087f70] text-[12px] font-semibold hover:bg-[#f0faf8] transition-colors"
                        >
                          View
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-black/[0.05]">
                        <div>
                          <p className="text-[11px] font-medium text-[#a0aaa5] mb-0.5">
                            Issue Date
                          </p>
                          <p className="text-[12px] font-semibold text-[#39423e]">
                            {formatDate(rawIssuedAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-[#a0aaa5] mb-0.5">
                            Expiry Date
                          </p>
                          <p className="text-[12px] font-semibold text-[#39423e]">
                            {formatDate(rawExpiresAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[13px] font-medium text-[#68726d]">
                No documents uploaded.
              </p>
            )}
          </div>

          <div className="rounded-xl border bg-white p-5 text-sm">
            Payment eligibility and beneficiary setup are specific to each legal
            entity.{" "}
            {canManageEntityConfiguration && (
              <Link
                className="underline"
                href={`/vendors/${vendorId}/configuration`}
              >
                Open entity configuration
              </Link>
            )}
          </div>
        </div>

        {/* ══ Right Column ══ */}
        <div className="space-y-5">
          <div className="bg-white rounded-[14px] border border-black/[0.08] p-5 shadow-sm">
            <h2 className="text-[10px] font-bold text-[#84908a] uppercase tracking-[0.1em] mb-4">
              RISK ANALYSIS
            </h2>

            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-semibold text-[#0b100e]">
                Risk Level
              </span>
              <span
                className={`px-3 py-1 rounded-[6px] text-[11px] font-bold ${riskLevel === "Low" ? "bg-[#087f70] text-white" : "bg-[#d33d44] text-white"}`}
              >
                {riskLevel}
              </span>
            </div>

            <div
              className={`rounded-[10px] px-4 py-3 flex items-center gap-3 mb-6 ${
                riskLevel === "High"
                  ? "bg-[#fdf2f2] text-[#d33d44] border border-[#fbd5d5]"
                  : "bg-[#f0faf8] text-[#087f70] border border-[#e7f6f2]"
              }`}
            >
              {riskLevel === "High" ? (
                <XCircle className="w-5 h-5 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              )}
              <span className="text-[13px] font-semibold">
                {riskLevel === "High"
                  ? "Bank name mismatch"
                  : "The account details match"}
              </span>
            </div>

            <h3 className="text-[10px] font-bold text-[#84908a] uppercase tracking-[0.1em] mb-3">
              CHECK PASSED
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {riskLevel === "High" ? (
                  <XCircle className="w-4 h-4 text-[#d33d44] shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#087f70] shrink-0" />
                )}
                <span className="text-[13px] font-semibold text-[#0b100e]">
                  Bank account{" "}
                  {riskLevel === "High" ? "unverified" : "verified"}
                </span>
                {riskLevel === "High" && (
                  <span className="px-2 py-0.5 rounded-[4px] bg-[#f9faf9] border border-black/[0.06] text-[10px] font-semibold text-[#68726d]">
                    Holder: {contactFirstName} {contactLastName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#087f70] shrink-0" />
                <span className="text-[13px] font-semibold text-[#0b100e]">
                  Business registration confirmed
                </span>
              </div>
            </div>
          </div>

          {/* ── Payment Terms Card ── */}
          <div className="bg-white rounded-[14px] border border-black/[0.08] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#68726d]" />
                <h2 className="text-[10px] font-bold text-[#84908a] uppercase tracking-[0.1em]">
                  ORGANIZATION PAYMENT TERMS
                </h2>
              </div>
              {paymentTerm && (
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      paymentTerm.status === "approved"
                        ? "text-[#087f70] bg-[#f0faf8] border-[#c8ece4]"
                        : paymentTerm.status === "rejected"
                        ? "text-[#d33d44] bg-[#fdf2f2] border-[#fbd5d5]"
                        : "text-[#b27b00] bg-[#fff9e6] border-[#ffe099]"
                    }`}
                  >
                    {paymentTerm.status === "approved"
                      ? "Approved"
                      : paymentTerm.status === "rejected"
                      ? "Rejected"
                      : "Pending Review"}
                  </span>
                  {matchingPaymentTerms.length > 1 && (
                    <button
                      onClick={() => setShowPaymentTermsHistoryModal(true)}
                      className="text-[11px] font-semibold text-[#087f70] hover:underline cursor-pointer"
                    >
                      History ({matchingPaymentTerms.length})
                    </button>
                  )}
                </div>
              )}
            </div>

            {isPaymentTermsListLoading ? (
              <div className="space-y-3 py-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-3/4 rounded" />
              </div>
            ) : paymentTerm ? (
              <div className="space-y-3">
                <div className="border border-black/[0.06] rounded-[10px] p-4 bg-[#f9faf9]/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[12px] font-medium text-[#68726d] mb-0.5">
                        Term Name
                      </p>
                      <p className="text-[13px] font-semibold text-[#0b100e]">
                        {paymentTerm.name || "Net 30"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-[#68726d] mb-0.5">
                        Payment Window
                      </p>
                      <p className="text-[13px] font-semibold text-[#0b100e]">
                        {paymentTerm.days === 0
                          ? "Due on receipt (0 days)"
                          : paymentTerm.days != null
                          ? `Net ${paymentTerm.days} (${paymentTerm.days} days)`
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-black/[0.05]">
                    <div>
                      <p className="text-[12px] font-medium text-[#68726d] mb-0.5">
                        Revision
                      </p>
                      <p className="text-[13px] font-semibold text-[#0b100e]">
                        v{paymentTerm.revision ?? 1} {paymentTerm.isCurrent && "(Current)"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] font-medium text-[#68726d] mb-0.5">
                        {paymentTerm.reviewedAt ? "Reviewed On" : "Submitted On"}
                      </p>
                      <p className="text-[13px] font-semibold text-[#0b100e]">
                        {paymentTerm.reviewedAt || paymentTerm.submittedAt
                          ? new Date(
                              (paymentTerm.reviewedAt || paymentTerm.submittedAt)!,
                            ).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {paymentTerm.status === "rejected" && paymentTerm.rejectionReason && (
                    <div className="mt-3 p-3 rounded-[8px] bg-[#fdf2f2] border border-[#fbd5d5] text-[12px] text-[#d33d44]">
                      <span className="font-semibold">Rejection reason: </span>
                      {paymentTerm.rejectionReason}
                    </div>
                  )}

                  {isPendingPaymentTerms && (
                    <div className="mt-3 pt-3 border-t border-black/[0.05] flex items-center justify-between">
                      <span className="text-[12px] font-medium text-[#b27b00]">
                        Action required: Payment terms await review
                      </span>
                      <button
                        onClick={() => {
                          setIsPaymentTermsRejecting(false);
                          setPaymentTermsRejectReason("");
                          setPaymentTermsModalOpen(true);
                        }}
                        className="px-3 h-7 rounded-[6px] bg-[#087f70] text-white text-[11px] font-semibold hover:bg-[#076b5e] transition-colors cursor-pointer"
                      >
                        Review Terms
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border border-black/[0.06] rounded-[10px] p-4 bg-[#f9faf9]/50 text-center">
                <p className="text-[13px] font-medium text-[#68726d]">
                  No payment terms recorded for this vendor yet.
                </p>
              </div>
            )}
          </div>

          {/* Vendor Note */}
          {(isUnderReview ||
            isRejected ||
            isApprovedPhase4 ||
            isActive ||
            isDeactivated) &&
            decisionNote && (
              <div className="bg-[#f0faf8] rounded-[14px] border border-[#e7f6f2] p-5 shadow-sm">
                <h2 className="text-[10px] font-bold text-[#84908a] uppercase tracking-[0.1em] mb-3">
                  {isResubmitted || isRejected ? "REJECTION REASON / FEEDBACK NOTE" : "VENDOR NOTE"}
                </h2>
                <p className="text-[13px] text-[#0b100e] leading-relaxed font-medium">
                  {decisionNote}
                </p>
              </div>
            )}

          {/* Recent Transactions */}
          {(isActive || isDeactivated) && !isApprovedPhase4 && (
            <div className="bg-white rounded-[14px] border border-black/[0.08] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-bold text-[#84908a] uppercase tracking-[0.1em]">
                  RECENT TRANSACTIONS
                </h2>
                <button
                  onClick={() =>
                    router.push(`/vendors/${vendorId}/transactions`)
                  }
                  className="px-3 h-8 rounded-[6px] bg-[#087f70] text-white text-[12px] font-bold hover:bg-[#076b5e] transition-colors"
                >
                  View all
                </button>
              </div>
              <div className="divide-y divide-black/[0.06]">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-[8px] bg-[#f9faf9] flex items-center justify-center shrink-0 border border-black/[0.06]">
                        <FileText className="w-4 h-4 text-[#84908a]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#0b100e]">
                          In-234-53
                        </p>
                        <p className="text-[12px] font-medium text-[#84908a]">
                          Jan 31, 2026
                        </p>
                      </div>
                    </div>
                    <span className="text-[13px] font-bold text-[#0b100e]">
                      NGN 200,000.0
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Request Info Modal ── */}
      {requestInfoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in">
          <div className="bg-white rounded-[14px] shadow-xl w-full max-w-md p-6 relative border border-black/[0.08]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-bold text-[#0b100e]">
                Request Info
              </h2>
              <button
                onClick={() => setRequestInfoModalOpen(false)}
                className="w-8 h-8 rounded-[8px] bg-[#f9faf9] hover:bg-[#f5f7f6] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-[#68726d]" />
              </button>
            </div>
            <div className="mb-6">
              <label className="block text-[13px] font-semibold text-[#0b100e] mb-2">
                Message
              </label>
              <textarea
                value={infoMessage}
                onChange={(e) => setInfoMessage(e.target.value)}
                placeholder="Enter message here..."
                rows={5}
                className="w-full p-4 rounded-[8px] border border-black/[0.08] text-[13px] placeholder:text-[#84908a] focus:outline-none focus:border-[#087f70] resize-none"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setRequestInfoModalOpen(false)}
                className="flex-1 h-10 rounded-[8px] border border-black/[0.08] text-[#68726d] font-semibold text-[13px] hover:bg-[#f9faf9] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestInfo}
                disabled={!infoMessage.trim()}
                className="flex-1 h-10 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors disabled:opacity-50"
              >
                Send message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Vendor Modal ── */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in">
          <div className="bg-white rounded-[14px] shadow-xl w-full max-w-md p-6 relative border border-black/[0.08]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-bold text-[#0b100e]">
                Reject Vendor
              </h2>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="w-8 h-8 rounded-[8px] bg-[#f9faf9] hover:bg-[#f5f7f6] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-[#68726d]" />
              </button>
            </div>
            <div className="mb-6">
              <label className="block text-[13px] font-semibold text-[#0b100e] mb-2">
                Reason for Rejection
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Bank name mismatch, invalid tax ID, etc."
                rows={5}
                className="w-full p-4 rounded-[8px] border border-black/[0.08] text-[13px] placeholder:text-[#84908a] focus:outline-none focus:border-[#d33d44] resize-none"
              />
              <p className="text-[11px] text-[#84908a] mt-2">
                This note will be sent to the vendor.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 h-10 rounded-[8px] border border-black/[0.08] text-[#68726d] font-semibold text-[13px] hover:bg-[#f9faf9] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDecision("rejected", rejectReason)}
                disabled={!rejectReason.trim() || isSubmitting}
                className="flex-1 h-10 rounded-[8px] bg-[#d33d44] text-white font-semibold text-[13px] hover:bg-[#c33339] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : "Reject Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Terms History Modal ── */}
      {showPaymentTermsHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-lg border border-black/[0.08] overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] bg-[#f9faf9] flex-shrink-0">
              <div>
                <h2 className="text-[15px] font-bold text-[#0b100e]">
                  Payment Terms History
                </h2>
                <p className="text-[12px] text-[#68726d]">
                  All payment terms recorded for {legalName || displayName}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentTermsHistoryModal(false)}
                className="w-8 h-8 rounded-[8px] bg-white hover:bg-[#f5f7f6] border border-black/[0.08] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-[#68726d]" />
              </button>
            </div>
            <div className="p-6 space-y-3 overflow-y-auto">
              {matchingPaymentTerms.map((term, idx) => (
                <div
                  key={term.paymentTermId || idx}
                  className="p-4 rounded-[10px] border border-black/[0.08] bg-[#f9faf9]/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#0b100e]">
                      {term.name || "Payment Term"} (v{term.revision ?? 1})
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        term.status === "approved"
                          ? "text-[#087f70] bg-[#f0faf8] border-[#c8ece4]"
                          : term.status === "rejected"
                          ? "text-[#d33d44] bg-[#fdf2f2] border-[#fbd5d5]"
                          : "text-[#b27b00] bg-[#fff9e6] border-[#ffe099]"
                      }`}
                    >
                      {term.status === "approved"
                        ? "Approved"
                        : term.status === "rejected"
                        ? "Rejected"
                        : "Pending Review"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[12px] text-[#68726d]">
                    <div>
                      Window:{" "}
                      <span className="font-medium text-[#0b100e]">
                        {term.days === 0 ? "Due on receipt" : `${term.days} days`}
                      </span>
                    </div>
                    {term.submittedAt && (
                      <div className="text-right">
                        Submitted:{" "}
                        <span className="font-medium text-[#0b100e]">
                          {new Date(term.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  {term.rejectionReason && (
                    <p className="text-[11px] text-[#d33d44] bg-[#fdf2f2] p-2 rounded">
                      Reason: {term.rejectionReason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Terms Review Modal (Stage 2) ── */}
      {paymentTermsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-lg border border-black/[0.08] overflow-hidden max-h-[85vh] flex flex-col">
            {/* Header (fixed) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] bg-[#f9faf9] flex-shrink-0">
              <div>
                <h2 className="text-[16px] font-bold text-[#0b100e]">
                  {isPaymentTermsRejecting
                    ? "Reject Payment Terms"
                    : "Approve Payment Terms"}
                </h2>
                <p className="text-[12px] text-[#68726d] mt-0.5">
                  {isPaymentTermsRejecting
                    ? "Specify the reason so the vendor can update and resubmit"
                    : "Stage 2 of 2 — Approving also activates this vendor"}
                </p>
              </div>
              <button
                onClick={() => {
                  setPaymentTermsModalOpen(false);
                  setPaymentTermsRejectReason("");
                  setIsPaymentTermsRejecting(false);
                }}
                className="w-8 h-8 rounded-[8px] bg-white hover:bg-[#f5f7f6] border border-black/[0.08] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-[#68726d]" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Step indicator */}
              <div className="flex items-center gap-0 pb-1">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#087f70] flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span className="text-[12px] font-semibold text-[#087f70]">
                    Vendor Info (Approved)
                  </span>
                </div>
                <div className="flex-1 h-px bg-[#087f70] mx-3" />
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#087f70] text-white text-[11px] font-bold flex items-center justify-center">
                    2
                  </span>
                  <span className="text-[12px] font-semibold text-[#087f70]">
                    Payment Terms
                  </span>
                </div>
              </div>

              {/* Payment term details summary card */}
              {isPaymentTermsListLoading ? (
                <div className="space-y-3 py-4">
                  <Skeleton className="h-5 w-full rounded" />
                  <Skeleton className="h-5 w-3/4 rounded" />
                  <Skeleton className="h-5 w-1/2 rounded" />
                </div>
              ) : paymentTerm ? (
                <div className="bg-[#f9faf9] rounded-[12px] border border-black/[0.06] p-4 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-medium text-[#68726d]">
                      Term Name
                    </span>
                    <span className="text-[13px] font-semibold text-[#0b100e]">
                      {paymentTerm.name || "—"}
                    </span>
                  </div>
                  <div className="h-px bg-black/[0.05]" />
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-medium text-[#68726d]">
                      Payment Window
                    </span>
                    <span className="text-[13px] font-semibold text-[#0b100e]">
                      {paymentTerm.days === 0
                        ? "Due immediately (0 days)"
                        : paymentTerm.days != null
                        ? `Net ${paymentTerm.days} (${paymentTerm.days} days)`
                        : "—"}
                    </span>
                  </div>
                  {paymentTerm.submittedAt && (
                    <>
                      <div className="h-px bg-black/[0.05]" />
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] font-medium text-[#68726d]">
                          Submitted
                        </span>
                        <span className="text-[13px] text-[#0b100e]">
                          {new Intl.DateTimeFormat(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(paymentTerm.submittedAt))}
                        </span>
                      </div>
                    </>
                  )}
                  {paymentTerm.revision != null && (
                    <>
                      <div className="h-px bg-black/[0.05]" />
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] font-medium text-[#68726d]">
                          Revision
                        </span>
                        <span className="text-[13px] text-[#0b100e]">
                          #{paymentTerm.revision ?? 1}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-[#f9faf9] rounded-[12px] border border-black/[0.06] p-4 text-center">
                  <p className="text-[13px] font-semibold text-[#0b100e]">
                    Standard Payment Terms
                  </p>
                  <p className="text-[12px] text-[#68726d] mt-1">
                    No custom payment terms were submitted by this vendor. Approving will activate the vendor with standard terms.
                  </p>
                </div>
              )}

              {/* Vendor context note (only when not in rejection mode) */}
              {!isPaymentTermsRejecting && (
                <div className="flex items-start gap-3 bg-[#f0faf8] border border-[#e7f6f2] rounded-[10px] px-4 py-3">
                  <CheckCircle2 className="w-4 h-4 text-[#087f70] mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] text-[#087f70] leading-relaxed">
                    <strong>{legalName || displayName}</strong> has been approved (Stage 1). Approving payment terms will activate the vendor and enable payments.
                  </p>
                </div>
              )}

              {/* Rejection reason form — ONLY displayed when Reject Terms is clicked */}
              {isPaymentTermsRejecting && (
                <div className="space-y-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-[12px] font-semibold text-[#0b100e]">
                      Rejection Reason <span className="text-[#d33d44]">*</span>
                    </label>
                    <span className="text-[11px] text-[#68726d]">
                      Visible to vendor
                    </span>
                  </div>
                  <textarea
                    autoFocus
                    value={paymentTermsRejectReason}
                    onChange={(e) =>
                      setPaymentTermsRejectReason(e.target.value)
                    }
                    placeholder="e.g. Please use our standard Net 30 arrangement."
                    rows={3}
                    className="w-full p-3 rounded-[8px] border border-black/[0.12] text-[13px] placeholder:text-[#84908a] focus:outline-none focus:border-[#d33d44] focus:ring-1 focus:ring-[#d33d44] resize-none"
                  />
                  <p className="text-[11px] text-[#68726d]">
                    The vendor will remain on the onboarding screen and can resubmit revised terms.
                  </p>
                </div>
              )}
            </div>

            {/* Actions (fixed footer) */}
            <div className="flex flex-col sm:flex-row gap-3 px-6 py-4 border-t border-black/[0.06] bg-[#f9faf9] flex-shrink-0">
              {isPaymentTermsRejecting ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPaymentTermsRejecting(false);
                      setPaymentTermsRejectReason("");
                    }}
                    disabled={isSubmitting}
                    className="flex-1 h-10 rounded-[8px] border border-black/[0.15] bg-white text-[#303834] font-semibold text-[13px] hover:bg-[#f5f7f6] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!paymentTermsRejectReason.trim() || !paymentTerm?.paymentTermId) return;
                      try {
                        await rejectPaymentTermsMutation.mutateAsync({
                          reason: paymentTermsRejectReason,
                          paymentTermId: paymentTerm.paymentTermId,
                        });
                        toast.success(
                          "Payment terms rejected — vendor will resubmit",
                        );
                        setPaymentTermsModalOpen(false);
                        setPaymentTermsRejectReason("");
                        setIsPaymentTermsRejecting(false);
                      } catch {
                        toast.error(
                          "Failed to reject payment terms. Please try again.",
                        );
                      }
                    }}
                    disabled={!paymentTermsRejectReason.trim() || isSubmitting}
                    className="flex-1 h-10 rounded-[8px] bg-[#d33d44] text-white font-semibold text-[13px] hover:bg-[#c33339] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    {rejectPaymentTermsMutation.isPending
                      ? "Rejecting..."
                      : "Confirm Rejection"}
                  </button>
                </>
              ) : (
                <>
                  {paymentTerm && (
                    <button
                      type="button"
                      onClick={() => setIsPaymentTermsRejecting(true)}
                      disabled={isSubmitting}
                      className="flex-1 h-10 rounded-[8px] border border-[#d33d44] text-[#d33d44] font-semibold text-[13px] hover:bg-[#fdf2f2] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Reject Terms
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (paymentTerm?.paymentTermId) {
                          await approvePaymentTermsMutation.mutateAsync(
                            paymentTerm.paymentTermId,
                          );
                          toast.success(
                            "Payment terms approved — vendor is now active",
                          );
                        } else {
                          await handleStatusUpdate("Active");
                        }
                        setPaymentTermsModalOpen(false);
                      } catch {
                        toast.error(
                          "Failed to approve payment terms. Please try again.",
                        );
                      }
                    }}
                    disabled={isSubmitting}
                    className="flex-1 h-10 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {approvePaymentTermsMutation.isPending || statusMutation.isPending
                      ? "Approving..."
                      : "Approve & Activate"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
                    className="w-9 h-9 rounded-[8px] bg-[#f5f7f6] hover:bg-[#ebeeed] flex items-center justify-center transition-colors"
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
                          ? `https://docs.google.com/viewer?url=${encodeURIComponent(previewDocUrl)}&embedded=true`
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
      state.can("vendor", "read_company") &&
      state.can("vendor", "sensitive.read"),
  );
  return canReadProfile ? <VendorDetailsPage /> : <VendorSummary />;
}
export default withPermissions(OrganizationVendorDetails, [
  { resource: "vendor.directory", action: "read" },
]);
