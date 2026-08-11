"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAxios } from "@/hooks/useAxios";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";
import { CheckCircle2, XCircle, X, FileText } from "lucide-react";
import { useAuthStore } from "@/stores/auth-stores";
import { toast } from "sonner";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { asArray, asRecord, getString, isRecord, pickString } from "@/lib/types/api-error";
import { useQueryClient } from "@tanstack/react-query";

export default withPermissions(VendorDetailsPage, [
  { resource: "vendor", action: "read_company" },
  { resource: "vendor", action: "manage" },
]);

function VendorDetailsPage() {
  const { vendorId } = useParams() as { vendorId: string };
  const router = useRouter();
  const axiosInstance = useAxios();
  const queryClient = useQueryClient();
  const can = useAuthStore(s => s.can);

  const [vendor, setVendor] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestInfoModalOpen, setRequestInfoModalOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocName, setPreviewDocName] = useState<string | null>(null);

  const fetchVendor = async () => {
    setIsLoading(true);
    try {
      const res = await axiosInstance.get(`/vendors/${vendorId}`);
      setVendor(res.data.data);
    } catch (err) {
      logger.error("Error fetching vendor details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!vendorId) return;
    queueMicrotask(() => {
      void fetchVendor();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  // Lock body scroll when preview modal is open
  useEffect(() => {
    if (previewDocUrl) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [previewDocUrl]);

  const handleDecision = async (decision: "approved" | "rejected", customNote?: string) => {
    if (!vendor) return;
    setIsSubmitting(true);
    const note = customNote || (decision === "approved" ? "KYC and banking details reviewed." : `Vendor ${decision} by admin.`);
    try {
      await axiosInstance.patch(`/vendors/${vendorId}/review`, { decision, decisionNote: note });
      fetchVendor();
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      if (decision === "rejected") { setRejectModalOpen(false); setRejectReason(""); }
      toast.success(decision === "approved" ? "Vendor approved successfully" : "Vendor rejected");
    } catch (err) {
      logger.error(`Failed to ${decision} vendor`, err);
      toast.error(`Failed to ${decision} vendor. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (statusPayload: "Active" | "Inactive") => {
    setIsSubmitting(true);
    try {
      await axiosInstance.patch(`/vendors/${vendorId}/status`, { status: statusPayload });
      fetchVendor();
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success(`Vendor ${statusPayload === "Active" ? "activated" : "deactivated"} successfully`);
    } catch (err) {
      logger.error(`Failed to update vendor status to ${statusPayload}`, err);
      toast.error(`Failed to ${statusPayload === "Active" ? "activate" : "deactivate"} vendor. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendInvitation = async () => {
    setIsSubmitting(true);
    try {
      await axiosInstance.post(`/vendors/${vendorId}/invitations/resend`);
      toast.success("Invitation resent successfully");
    } catch (err) {
      logger.error(`Failed to resend invitation`, err);
      toast.error("Failed to resend invitation. Please try again.");
    } finally {
      setIsSubmitting(false);
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
    return <div><p className="text-[#84908a]">Vendor not found.</p></div>;
  }

  const profile = asRecord(vendor.profile);
  const status = getString(vendor.status);
  const onboardingStatus = getString(vendor.onboardingStatus);
  const approvalStatus = getString(vendor.approvalStatus);
  const deactivatedAt = vendor.deactivatedAt;
  const bankName = getString(vendor.bankName) || getString(profile.bankName);
  const bankAccountNumber = getString(vendor.bankAccountNumber) || getString(profile.bankAccountNumber);
  const legalName = getString(vendor.legalName) || getString(profile.legalName);
  const displayName = getString(vendor.displayName) || getString(profile.displayName);
  const email = getString(vendor.email) || getString(profile.email);
  const taxId = getString(vendor.taxId) || getString(profile.taxId);
  const country = getString(vendor.country) || getString(profile.country);
  const address = getString(vendor.address) || getString(profile.address);
  const contactFirstName = getString(vendor.contactFirstName) || getString(profile.contactFirstName);
  const contactLastName = getString(vendor.contactLastName) || getString(profile.contactLastName);
  const decisionNote = getString(vendor.decisionNote);
  const createdBy = asRecord(vendor.createdBy);
  const approvedBy = asRecord(vendor.approvedBy);
  const vendorDocs = asArray(vendor.documents);
  const profileDocs = asArray(profile.documents);
  const documents = (vendorDocs.length > 0 ? vendorDocs : profileDocs).filter(isRecord);
  const createdByName = `${pickString(createdBy, "firstName")} ${pickString(createdBy, "lastName")}`.trim();
  const approvedByName = `${pickString(approvedBy, "firstName")} ${pickString(approvedBy, "lastName")}`.trim();

  const rawStatus = status.toLowerCase();

  const isInvited     = approvalStatus === "pending" && (!onboardingStatus || onboardingStatus === "invited");
  const isOnboarding  = approvalStatus === "pending" && !["invited", "submitted", ""].includes(onboardingStatus);
  const isUnderReview = approvalStatus === "pending" && onboardingStatus === "submitted";
  const isRejected    = approvalStatus === "rejected";
  const isApprovedPhase4 = approvalStatus === "approved" && rawStatus !== "active" && !deactivatedAt;
  const isDeactivated    = approvalStatus === "approved" && rawStatus !== "active" && !!deactivatedAt;
  const isActive         = approvalStatus === "approved" && rawStatus === "active";

  const isEligibleForRiskCheck = isUnderReview || isApprovedPhase4 || isActive;
  const hasBankMismatch = isEligibleForRiskCheck && (!bankName || !bankAccountNumber);
  const riskLevel = hasBankMismatch ? "High" : "Low";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[18px] font-semibold text-[#0b100e]">{legalName || displayName}</h1>
            {isOnboarding  && <span className="px-2.5 py-0.5 rounded-full bg-[#f0f6ff] text-[#0066cc] text-xs font-semibold border border-[#d6e7ff]">Onboarding</span>}
            {isUnderReview && <span className="px-2.5 py-0.5 rounded-full bg-[#fff9e6] text-[#b27b00] text-xs font-semibold border border-[#ffe099]">Under Review</span>}
            {isActive      && <span className="px-2.5 py-0.5 rounded-full bg-[#f0faf8] text-[#087f70] text-xs font-semibold border border-[#e7f6f2]">Active</span>}
            {isApprovedPhase4 && <span className="px-2.5 py-0.5 rounded-full bg-[#f0faf8] text-[#087f70] text-xs font-semibold border border-[#e7f6f2]">Approved</span>}
            {isDeactivated && <span className="px-2.5 py-0.5 rounded-full bg-[#f9faf9] text-[#68726d] text-xs font-semibold border border-black/[0.08]">Deactivated</span>}
            {isRejected    && <span className="px-2.5 py-0.5 rounded-full bg-[#fdf2f2] text-[#d33d44] text-xs font-semibold border border-[#fbd5d5]">Rejected</span>}
            {isInvited     && <span className="px-2.5 py-0.5 rounded-full bg-[#f9faf9] text-[#68726d] text-xs font-semibold border border-black/[0.08]">Invited</span>}
          </div>
          <p className="text-[13px] font-medium text-[#68726d] mt-1">{email}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Approve / Reject / Request Info */}
          {isUnderReview && can('vendor', 'reject') && (
            <button disabled={isSubmitting} onClick={() => setRejectModalOpen(true)}
              className="px-4 h-9 rounded-[8px] border border-[#d33d44] text-[#d33d44] font-semibold text-[13px] hover:bg-[#fdf2f2] transition-colors disabled:opacity-50">
              Reject vendor
            </button>
          )}

          {isUnderReview && can('vendor', 'approve') && (
            <button disabled={isSubmitting} onClick={() => handleDecision("approved")}
              className="px-4 h-9 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors disabled:opacity-50 shadow-sm">
              {isSubmitting ? "Processing..." : "Approve vendor"}
            </button>
          )}
          {/* Activate */}
          {(isApprovedPhase4 || isDeactivated) && can('vendor', 'activate') && (
            <button disabled={isSubmitting} onClick={() => handleStatusUpdate("Active")}
              className="px-4 h-9 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors disabled:opacity-50 shadow-sm">
              {isSubmitting ? "Processing..." : isDeactivated ? "Reactivate vendor" : "Activate vendor"}
            </button>
          )}
          {/* Deactivate */}
          {isActive && can('vendor', 'deactivate') && (
            <button disabled={isSubmitting} onClick={() => handleStatusUpdate("Inactive")}
              className="px-4 h-9 rounded-[8px] border border-[#d33d44] text-[#d33d44] font-semibold text-[13px] hover:bg-[#fdf2f2] transition-colors disabled:opacity-50">
              {isSubmitting ? "Processing..." : "Deactivate vendor"}
            </button>
          )}
          {/* Resend Invitation */}
          {(isInvited || isOnboarding) && can('vendor', 'invite') && (
            <button disabled={isSubmitting} onClick={handleResendInvitation}
              className="px-4 h-9 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors disabled:opacity-50 shadow-sm cursor-pointer">
              {isSubmitting ? "Sending..." : "Resend Invitation"}
            </button>
          )}
        </div>
      </div>

      {/* ── Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* ══ Left Column ══ */}
        <div className="space-y-5">

          <div className="bg-white rounded-[14px] border border-black/[0.08] p-5 shadow-sm">
            <h2 className="text-[10px] font-bold text-[#84908a] uppercase tracking-[0.1em] mb-4">IDENTITY VERIFICATION</h2>

            <div className="space-y-3">
              {/* Row 1 */}
              <div className="border border-black/[0.06] rounded-[10px] p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[13px] font-medium text-[#68726d] mb-0.5">Business Name</p>
                    <p className="text-[13px] font-semibold text-[#0b100e]">{legalName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#68726d] mb-0.5">Registration Number</p>
                    <p className="text-[13px] font-semibold text-[#0b100e]">{taxId || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="border border-black/[0.06] rounded-[10px] p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[13px] font-medium text-[#68726d] mb-0.5">Bank</p>
                    <p className="text-[13px] font-semibold text-[#0b100e]">{bankName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#68726d] mb-0.5">Account</p>
                    <p className="text-[13px] font-semibold text-[#0b100e]">{bankAccountNumber || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Row 3 */}
              <div className="border border-black/[0.06] rounded-[10px] p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[13px] font-medium text-[#68726d] mb-0.5">Country</p>
                    <p className="text-[13px] font-semibold text-[#0b100e]">{country || "N/A"}</p>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[13px] font-medium text-[#68726d] mb-0.5">Address</p>
                    <p className="text-[13px] font-semibold text-[#0b100e] truncate" title={address}>
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
                        <p className="text-[13px] font-medium text-[#68726d] mb-0.5">Invited By</p>
                        <p className="text-[13px] font-semibold text-[#0b100e]">{createdByName}</p>
                      </div>
                    )}
                    {approvedByName && (
                      <div>
                        <p className="text-[13px] font-medium text-[#68726d] mb-0.5">Approved By</p>
                        <p className="text-[13px] font-semibold text-[#0b100e]">{approvedByName}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[14px] border border-black/[0.08] p-5 shadow-sm">
            <h2 className="text-[10px] font-bold text-[#84908a] uppercase tracking-[0.1em] mb-4">VERIFICATION DOCUMENTS</h2>
            {documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc) => {
                  const docId = getString(doc.vendorDocumentId);
                  const originalName = pickString(doc, "originalName") || "Document.pdf";
                  const documentType = getString(doc.documentType).replace(/_/g, " ");
                  const fileUrl = getString(doc.fileUrl);
                  return (
                  <div key={docId || originalName}
                    className="flex items-center justify-between p-3.5 rounded-[10px] border border-black/[0.06] bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#f0faf8] flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-[#087f70]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#0b100e] leading-tight">{originalName}</p>
                        <p className="text-[12px] text-[#84908a] capitalize mt-0.5">{documentType}</p>
                      </div>
                    </div>
                    <button onClick={() => {
                        setPreviewDocUrl(fileUrl);
                        setPreviewDocName(originalName);
                      }}
                      className="px-4 py-1.5 rounded-[6px] border border-[#087f70] text-[#087f70] text-[12px] font-semibold hover:bg-[#f0faf8] transition-colors">
                      View
                    </button>
                  </div>
                );})}
              </div>
            ) : (
              <p className="text-[13px] font-medium text-[#68726d]">No documents uploaded.</p>
            )}
          </div>
        </div>

        {/* ══ Right Column ══ */}
        <div className="space-y-5">

          <div className="bg-white rounded-[14px] border border-black/[0.08] p-5 shadow-sm">
            <h2 className="text-[10px] font-bold text-[#84908a] uppercase tracking-[0.1em] mb-4">RISK ANALYSIS</h2>

            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-semibold text-[#0b100e]">Risk Level</span>
              <span className={`px-3 py-1 rounded-[6px] text-[11px] font-bold ${riskLevel === "Low" ? "bg-[#087f70] text-white" : "bg-[#d33d44] text-white"}`}>
                {riskLevel}
              </span>
            </div>

            <div className={`rounded-[10px] px-4 py-3 flex items-center gap-3 mb-6 ${
              riskLevel === "High"
                ? "bg-[#fdf2f2] text-[#d33d44] border border-[#fbd5d5]"
                : "bg-[#f0faf8] text-[#087f70] border border-[#e7f6f2]"
            }`}>
              {riskLevel === "High"
                ? <XCircle className="w-5 h-5 shrink-0" />
                : <CheckCircle2 className="w-5 h-5 shrink-0" />
              }
              <span className="text-[13px] font-semibold">
                {riskLevel === "High" ? "Bank name mismatch" : "The account details match"}
              </span>
            </div>

            <h3 className="text-[10px] font-bold text-[#84908a] uppercase tracking-[0.1em] mb-3">CHECK PASSED</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {riskLevel === "High"
                  ? <XCircle className="w-4 h-4 text-[#d33d44] shrink-0" />
                  : <CheckCircle2 className="w-4 h-4 text-[#087f70] shrink-0" />
                }
                <span className="text-[13px] font-semibold text-[#0b100e]">
                  Bank account {riskLevel === "High" ? "unverified" : "verified"}
                </span>
                {riskLevel === "High" && (
                  <span className="px-2 py-0.5 rounded-[4px] bg-[#f9faf9] border border-black/[0.06] text-[10px] font-semibold text-[#68726d]">
                    Holder: {contactFirstName} {contactLastName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#087f70] shrink-0" />
                <span className="text-[13px] font-semibold text-[#0b100e]">Business registration confirmed</span>
              </div>
            </div>
          </div>

          {/* Vendor Note */}
          {((isUnderReview || isRejected || isApprovedPhase4 || isActive || isDeactivated) && decisionNote) && (
            <div className="bg-[#f0faf8] rounded-[14px] border border-[#e7f6f2] p-5 shadow-sm">
              <h2 className="text-[10px] font-bold text-[#84908a] uppercase tracking-[0.1em] mb-3">VENDOR NOTE</h2>
              <p className="text-[13px] text-[#0b100e] leading-relaxed font-medium">{decisionNote}</p>
            </div>
          )}

          {/* Recent Transactions */}
          {(isActive || isDeactivated) && !isApprovedPhase4 && (
            <div className="bg-white rounded-[14px] border border-black/[0.08] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-bold text-[#84908a] uppercase tracking-[0.1em]">RECENT TRANSACTIONS</h2>
                <button
                  onClick={() => router.push(`/vendors/${vendorId}/transactions`)}
                  className="px-3 h-8 rounded-[6px] bg-[#087f70] text-white text-[12px] font-bold hover:bg-[#076b5e] transition-colors"
                >
                  View all
                </button>
              </div>
              <div className="divide-y divide-black/[0.06]">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-[8px] bg-[#f9faf9] flex items-center justify-center shrink-0 border border-black/[0.06]">
                        <FileText className="w-4 h-4 text-[#84908a]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#0b100e]">In-234-53</p>
                        <p className="text-[12px] font-medium text-[#84908a]">Jan 31, 2026</p>
                      </div>
                    </div>
                    <span className="text-[13px] font-bold text-[#0b100e]">NGN 200,000.0</span>
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
              <h2 className="text-[18px] font-bold text-[#0b100e]">Request Info</h2>
              <button onClick={() => setRequestInfoModalOpen(false)}
                className="w-8 h-8 rounded-[8px] bg-[#f9faf9] hover:bg-[#f5f7f6] flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-[#68726d]" />
              </button>
            </div>
            <div className="mb-6">
              <label className="block text-[13px] font-semibold text-[#0b100e] mb-2">Message</label>
              <textarea value={infoMessage} onChange={(e) => setInfoMessage(e.target.value)}
                placeholder="Enter message here..." rows={5}
                className="w-full p-4 rounded-[8px] border border-black/[0.08] text-[13px] placeholder:text-[#84908a] focus:outline-none focus:border-[#087f70] resize-none" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setRequestInfoModalOpen(false)}
                className="flex-1 h-10 rounded-[8px] border border-black/[0.08] text-[#68726d] font-semibold text-[13px] hover:bg-[#f9faf9] transition-colors">
                Cancel
              </button>
              <button onClick={handleRequestInfo} disabled={!infoMessage.trim()}
                className="flex-1 h-10 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors disabled:opacity-50">
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
              <h2 className="text-[18px] font-bold text-[#0b100e]">Reject Vendor</h2>
              <button onClick={() => setRejectModalOpen(false)}
                className="w-8 h-8 rounded-[8px] bg-[#f9faf9] hover:bg-[#f5f7f6] flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-[#68726d]" />
              </button>
            </div>
            <div className="mb-6">
              <label className="block text-[13px] font-semibold text-[#0b100e] mb-2">Reason for Rejection</label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Bank name mismatch, invalid tax ID, etc." rows={5}
                className="w-full p-4 rounded-[8px] border border-black/[0.08] text-[13px] placeholder:text-[#84908a] focus:outline-none focus:border-[#d33d44] resize-none" />
              <p className="text-[11px] text-[#84908a] mt-2">This note will be sent to the vendor.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setRejectModalOpen(false)}
                className="flex-1 h-10 rounded-[8px] border border-black/[0.08] text-[#68726d] font-semibold text-[13px] hover:bg-[#f9faf9] transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDecision("rejected", rejectReason)}
                disabled={!rejectReason.trim() || isSubmitting}
                className="flex-1 h-10 rounded-[8px] bg-[#d33d44] text-white font-semibold text-[13px] hover:bg-[#c33339] transition-colors disabled:opacity-50">
                {isSubmitting ? "Processing..." : "Reject Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Document Preview Modal ── */}
      {previewDocUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 animate-in fade-in">
          <div className="bg-white rounded-[14px] shadow-xl w-full max-w-5xl h-[90vh] flex flex-col relative overflow-hidden border border-black/[0.08]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.08] bg-[#f9faf9]">
              <h2 className="text-[16px] font-bold text-[#0b100e] truncate pr-4">{previewDocName || "Document Preview"}</h2>
              <div className="flex items-center gap-3">
                <a href={previewDocUrl} target="_blank" rel="noreferrer" download
                   className="px-4 py-2 rounded-[8px] bg-[#087f70] text-white text-[13px] font-semibold hover:bg-[#076b5e] transition-colors">
                  Download
                </a>
                <button onClick={() => { setPreviewDocUrl(null); setPreviewDocName(null); }}
                  className="w-9 h-9 rounded-[8px] bg-[#f5f7f6] hover:bg-[#ebeeed] flex items-center justify-center transition-colors">
                  <X className="w-5 h-5 text-[#0b100e]" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-[#f5f7f6] p-4 flex flex-col gap-4 relative overflow-hidden">
              <div className="w-full shrink-0 bg-[#f0f6ff] border border-[#d6e7ff] rounded-[10px] p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                <p className="text-[13px] text-[#0066cc]">
                  <span className="font-semibold">Having trouble viewing the document?</span> Your browser may not support inline viewing for this file type.
                </p>
                <a href={previewDocUrl} target="_blank" rel="noreferrer" download
                   className="shrink-0 px-4 py-1.5 rounded-[6px] bg-[#0066cc] text-white text-[12px] font-semibold hover:bg-[#0052a3] transition-colors">
                  Open / Download File
                </a>
              </div>
              
              <div className="flex-1 bg-white rounded-[10px] border border-black/[0.08] shadow-sm relative overflow-hidden">
                {previewDocUrl.split('?')[0].match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <img 
                      src={previewDocUrl} 
                      alt={previewDocName || "Document"} 
                      className="max-w-full max-h-full object-contain" 
                    />
                  </div>
                ) : (
                  <iframe 
                    src={
                      previewDocUrl.split('?')[0].match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i)
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
        </div>
      )}
    </div>
  );
}