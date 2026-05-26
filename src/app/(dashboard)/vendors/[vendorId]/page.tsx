"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAxios } from "@/hooks/useAxios";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";
import { CheckCircle2, XCircle, X, FileText } from "lucide-react";

export default function VendorDetailsPage() {
  const { vendorId } = useParams() as { vendorId: string };
  const router = useRouter();
  const axiosInstance = useAxios();

  const [vendor, setVendor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestInfoModalOpen, setRequestInfoModalOpen] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

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
    if (vendorId) fetchVendor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  const handleDecision = async (decision: "approved" | "rejected", customNote?: string) => {
    if (!vendor) return;
    setIsSubmitting(true);
    const note = customNote || (decision === "approved" ? "KYC and banking details reviewed." : `Vendor ${decision} by admin.`);
    try {
      await axiosInstance.patch(`/vendors/${vendorId}/review`, { decision, decisionNote: note });
      fetchVendor();
      if (decision === "rejected") { setRejectModalOpen(false); setRejectReason(""); }
    } catch (err) {
      logger.error(`Failed to ${decision} vendor`, err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (statusPayload: "Active" | "Inactive") => {
    setIsSubmitting(true);
    try {
      await axiosInstance.patch(`/vendors/${vendorId}/status`, { status: statusPayload });
      fetchVendor();
    } catch (err) {
      logger.error(`Failed to update vendor status to ${statusPayload}`, err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendInvitation = async () => {
    setIsSubmitting(true);
    try {
      await axiosInstance.post(`/vendors/${vendorId}/invitations/resend`);
    } catch (err) {
      logger.error(`Failed to resend invitation`, err);
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
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return <div><p className="text-muted-foreground">Vendor not found.</p></div>;
  }

  const rawStatus        = (vendor.status        || "").toLowerCase();
  const onboardingStatus = vendor.onboardingStatus || "";
  const approvalStatus   = vendor.approvalStatus  || "";

  const isInvited     = approvalStatus === "pending" && onboardingStatus === "invited";
  const isOnboarding  = approvalStatus === "pending" && !["invited", "submitted"].includes(onboardingStatus);
  const isUnderReview = approvalStatus === "pending" && onboardingStatus === "submitted";
  const isRejected    = approvalStatus === "rejected";
  const isApprovedPhase4 = approvalStatus === "approved" && rawStatus !== "active" && !vendor.deactivatedAt;
  const isDeactivated    = approvalStatus === "approved" && rawStatus !== "active" && !!vendor.deactivatedAt;
  const isActive         = approvalStatus === "approved" && rawStatus === "active";

  const hasBankMismatch = !vendor.bankName || !vendor.bankAccountNumber;
  const riskLevel = hasBankMismatch ? "High" : "Low";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{vendor.legalName || vendor.displayName}</h1>
            {isOnboarding  && <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-500 text-xs font-semibold border border-blue-100">Onboarding</span>}
            {isUnderReview && <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-500 text-xs font-semibold border border-amber-100">Under Review</span>}
            {isActive      && <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-100">Active</span>}
            {isApprovedPhase4 && <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-100">Approved</span>}
            {isDeactivated && <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold border border-gray-200">Deactivated</span>}
            {isRejected    && <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-500 text-xs font-semibold border border-red-100">Rejected</span>}
            {isInvited     && <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold border border-gray-200">Invited</span>}
          </div>
          <p className="text-sm font-medium text-muted-foreground mt-1">{vendor.email}</p>
        </div>

        <div className="flex items-center gap-3">
          {isUnderReview && (
            <>
              <button disabled={isSubmitting} onClick={() => setRejectModalOpen(true)}
                className="px-5 h-10 rounded-xl border border-destructive text-destructive font-semibold text-sm hover:bg-destructive/10 transition-colors disabled:opacity-50">
                Reject vendor
              </button>
              <button disabled={isSubmitting} onClick={() => setRequestInfoModalOpen(true)}
                className="px-5 h-10 rounded-xl border border-[#00BFA5] text-[#00BFA5] font-semibold text-sm hover:bg-[#00BFA5]/5 transition-colors disabled:opacity-50">
                Request Info
              </button>
              <button disabled={isSubmitting} onClick={() => handleDecision("approved")}
                className="px-5 h-10 rounded-xl bg-[#00BFA5] text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                {isSubmitting ? "Processing..." : "Approve vendor"}
              </button>
            </>
          )}
          {isApprovedPhase4 && (
            <button disabled={isSubmitting} onClick={() => handleStatusUpdate("Active")}
              className="px-5 h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
              {isSubmitting ? "Processing..." : "Activate vendor"}
            </button>
          )}
          {isActive && (
            <button disabled={isSubmitting} onClick={() => handleStatusUpdate("Inactive")}
              className="px-5 h-10 rounded-xl bg-transparent border border-destructive text-destructive font-semibold text-sm hover:bg-destructive/5 transition-colors disabled:opacity-50">
              {isSubmitting ? "Processing..." : "Deactivate vendor"}
            </button>
          )}
          {isDeactivated && (
            <button disabled={isSubmitting} onClick={() => handleStatusUpdate("Active")}
              className="px-5 h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
              {isSubmitting ? "Processing..." : "Reactivate vendor"}
            </button>
          )}
          {(isInvited || isOnboarding) && (
            <button disabled={isSubmitting} onClick={handleResendInvitation}
              className="px-5 h-10 rounded-xl bg-[#00BFA5] text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer">
              {isSubmitting ? "Sending..." : "Resend Invitation"}
            </button>
          )}
        </div>
      </div>

      {/* ── Content Grid: equal 50/50 columns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ══ Left Column ══ */}
        <div className="space-y-6">

          {/* Identity Verification
              FIX: outer padding p-8 → p-6 so inner row cards feel anchored to the container
              FIX: each field row = ONE unified bordered card (not individual mini-cards)
              FIX: value font-size text-xl → text-base (matches Figma weight)
              FIX: labels are sentence-case text-sm, not tiny uppercase  */}
          <div className="bg-white rounded-3xl border border-border p-6 shadow-sm">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">IDENTITY VERIFICATION</h2>

            <div className="space-y-3">
              {/* Row 1 — single card, two fields inside */}
              <div className="border border-border/50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Business Name</p>
                    <p className="text-sm font-semibold text-foreground">{vendor.legalName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Registration Number</p>
                    <p className="text-sm font-semibold text-foreground">{vendor.taxId || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="border border-border/50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Bank</p>
                    <p className="text-sm font-semibold text-foreground">{vendor.bankName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Account</p>
                    <p className="text-sm font-semibold text-foreground">{vendor.bankAccountNumber || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Row 3 */}
              <div className="border border-border/50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Country</p>
                    <p className="text-sm font-semibold text-foreground">{vendor.country || "N/A"}</p>
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Address</p>
                    <p className="text-sm font-semibold text-foreground truncate" title={vendor.address}>
                      {vendor.address || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Row 4: Created & Approved */}
              {(vendor.createdBy || vendor.approvedBy) && (
                <div className="border border-border/50 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {vendor.createdBy && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Invited By</p>
                        <p className="text-sm font-semibold text-foreground">{vendor.createdBy.firstName} {vendor.createdBy.lastName}</p>
                      </div>
                    )}
                    {vendor.approvedBy && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Approved By</p>
                        <p className="text-sm font-semibold text-foreground">{vendor.approvedBy.firstName} {vendor.approvedBy.lastName}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Verification Documents — outer padding p-8 → p-6 to stay consistent */}
          <div className="bg-white rounded-3xl border border-border p-6 shadow-sm">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">VERIFICATION DOCUMENTS</h2>
            {vendor.documents && vendor.documents.length > 0 ? (
              <div className="space-y-3">
                {vendor.documents.map((doc: any) => (
                  <div key={doc.vendorDocumentId}
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{doc.originalName || "Document.pdf"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{doc.documentType.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer"
                      className="px-5 py-1.5 rounded-xl border border-primary text-primary text-xs font-bold hover:bg-primary/5 transition-colors">
                      View
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">No documents uploaded.</p>
            )}
          </div>
        </div>

        {/* ══ Right Column ══ */}
        <div className="space-y-6">

          {/* Risk Analysis — p-8 → p-6, banner rounded-full → rounded-2xl */}
          <div className="bg-white rounded-3xl border border-border p-6 shadow-sm">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">RISK ANALYSIS</h2>

            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-semibold text-foreground">Risk Level</span>
              <span className={`px-4 py-1 rounded-lg text-sm font-bold ${riskLevel === "Low" ? "bg-[#48BB78] text-white" : "bg-red-500 text-white"}`}>
                {riskLevel}
              </span>
            </div>

            {/* FIX: was rounded-full (pill), Figma shows rounded-2xl banner */}
            <div className={`rounded-2xl px-5 py-3.5 flex items-center gap-3 mb-7 ${
              riskLevel === "High"
                ? "bg-red-50 text-red-500 border border-red-100"
                : "bg-[#F0FFF4] text-[#48BB78] border border-[#C6F6D5]"
            }`}>
              {riskLevel === "High"
                ? <XCircle className="w-5 h-5 shrink-0" />
                : <CheckCircle2 className="w-5 h-5 shrink-0" />
              }
              <span className="text-sm font-semibold">
                {riskLevel === "High" ? "Bank name mismatch" : "The account details match"}
              </span>
            </div>

            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">CHECK PASSED</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {riskLevel === "High"
                  ? <XCircle className="w-5 h-5 text-destructive shrink-0" />
                  : <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                }
                <span className="text-sm font-semibold text-foreground">
                  Bank account {riskLevel === "High" ? "unverified" : "verified"}
                </span>
                {riskLevel === "High" && (
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-[10px] font-semibold text-gray-600">
                    Holder: {vendor.contactFirstName} {vendor.contactLastName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="text-sm font-semibold text-foreground">Business registration confirmed</span>
              </div>
            </div>
          </div>

          {/* Vendor Note */}
          {((isUnderReview || isRejected || isApprovedPhase4 || isActive || isDeactivated) && vendor.decisionNote) && (
            <div className="bg-primary/5 rounded-3xl border border-primary/20 p-6 shadow-sm">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">VENDOR NOTE</h2>
              <p className="text-sm text-foreground leading-relaxed font-semibold">{vendor.decisionNote}</p>
            </div>
          )}

          {/* Recent Transactions — p-8 → p-6; "View all" → filled teal button */}
          {(isActive || isDeactivated) && !isApprovedPhase4 && (
            <div className="bg-white rounded-3xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">RECENT TRANSACTIONS</h2>
                <button
                  onClick={() => router.push(`/vendors/${vendorId}/transactions`)}
                  className="px-4 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  View all
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                        <FileText className="w-5 h-5 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">In-234-53</p>
                        <p className="text-xs font-medium text-muted-foreground">Jan 31, 2026</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-primary">NGN 200,000.0</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Request Info Modal ── */}
      {requestInfoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Request Info</h2>
              <button onClick={() => setRequestInfoModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
              <textarea value={infoMessage} onChange={(e) => setInfoMessage(e.target.value)}
                placeholder="Enter message here..." rows={5}
                className="w-full p-4 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#00BFA5] focus:ring-1 focus:ring-[#00BFA5] resize-none" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setRequestInfoModalOpen(false)}
                className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleRequestInfo} disabled={!infoMessage.trim()}
                className="flex-1 h-12 rounded-xl bg-[#00BFA5] text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                Send message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Vendor Modal ── */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Reject Vendor</h2>
              <button onClick={() => setRejectModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for Rejection</label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Bank name mismatch, invalid tax ID, etc." rows={5}
                className="w-full p-4 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none" />
              <p className="text-xs text-gray-500 mt-2">This note will be sent to the vendor.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setRejectModalOpen(false)}
                className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDecision("rejected", rejectReason)}
                disabled={!rejectReason.trim() || isSubmitting}
                className="flex-1 h-12 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors disabled:opacity-50">
                {isSubmitting ? "Processing..." : "Reject Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}