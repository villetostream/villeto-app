"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAxios } from "@/hooks/useAxios";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";
import { CheckCircle2, XCircle, AlertCircle, X, FileText } from "lucide-react";

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
    if (vendorId) {
      fetchVendor();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  const handleDecision = async (decision: "approved" | "rejected", customNote?: string) => {
    if (!vendor) return;
    setIsSubmitting(true);
    
    // Default approve note if not provided
    const note = customNote || (decision === "approved" ? "KYC and banking details reviewed." : `Vendor ${decision} by admin.`);
    
    try {
      await axiosInstance.patch(`/vendors/${vendorId}/review`, {
        decision,
        decisionNote: note,
      });
      fetchVendor();
      if (decision === "rejected") {
        setRejectModalOpen(false);
        setRejectReason("");
      }

    } catch (err) {
      logger.error(`Failed to ${decision} vendor`, err);
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
    return (
      <div>
        <p className="text-muted-foreground">Vendor not found.</p>
      </div>
    );
  }

  const isUnderReview = vendor.approvalStatus === "pending" && vendor.onboardingStatus === "submitted";
  const isApproved = vendor.approvalStatus === "approved";
  const isRejected = vendor.approvalStatus === "rejected";

  const hasBankMismatch = !vendor.bankName || !vendor.bankAccountNumber;
  const riskLevel = hasBankMismatch ? "High" : "Low";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#1a202c]">{vendor.legalName || vendor.displayName}</h1>
            {isApproved && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-100">
                Approved
              </span>
            )}
            {isRejected && (
              <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-500 text-xs font-semibold border border-red-100">
                Rejected
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{vendor.email}</p>
        </div>

        {isUnderReview && (
          <div className="flex items-center gap-3">
            <button
              disabled={isSubmitting}
              onClick={() => setRejectModalOpen(true)}
              className="px-5 h-10 rounded-xl border border-red-300 text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Reject vendor
            </button>
            <button
              disabled={isSubmitting}
              onClick={() => setRequestInfoModalOpen(true)}
              className="px-5 h-10 rounded-xl border border-[#00BFA5] text-[#00BFA5] font-semibold text-sm hover:bg-[#00BFA5]/5 transition-colors disabled:opacity-50"
            >
              Request Info
            </button>
            <button
              disabled={isSubmitting}
              onClick={() => handleDecision("approved")}
              className="px-5 h-10 rounded-xl bg-[#00BFA5] text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : "Approve vendor"}
            </button>
          </div>
        )}
      </div>

      {/* ── Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column */}
        <div className="col-span-1 lg:col-span-6 space-y-6">

          {/* Identity Verification */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5">Identity Verification</h2>
            <div className="space-y-0 divide-y divide-gray-100">
              <div className="grid grid-cols-2 gap-0 divide-x divide-gray-100">
                <div className="py-4 pr-4">
                  <p className="text-xs text-gray-400 mb-1">Business Name</p>
                  <p className="text-sm font-semibold text-gray-900">{vendor.legalName || "N/A"}</p>
                </div>
                <div className="py-4 pl-4">
                  <p className="text-xs text-gray-400 mb-1">Registration Number</p>
                  <p className="text-sm font-semibold text-gray-900">{vendor.taxId || "N/A"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-0 divide-x divide-gray-100">
                <div className="py-4 pr-4">
                  <p className="text-xs text-gray-400 mb-1">Bank</p>
                  <p className="text-sm font-semibold text-gray-900">{vendor.bankName || "N/A"}</p>
                </div>
                <div className="py-4 pl-4">
                  <p className="text-xs text-gray-400 mb-1">Account</p>
                  <p className="text-sm font-semibold text-gray-900">{vendor.bankAccountNumber || "N/A"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-0 divide-x divide-gray-100">
                <div className="py-4 pr-4">
                  <p className="text-xs text-gray-400 mb-1">Country</p>
                  <p className="text-sm font-semibold text-gray-900">{vendor.country || "N/A"}</p>
                </div>
                <div className="py-4 pl-4">
                  <p className="text-xs text-gray-400 mb-1">Address</p>
                  <p className="text-sm font-semibold text-gray-900">{vendor.address || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Documents */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5">Verification Documents</h2>
            {vendor.documents && vendor.documents.length > 0 ? (
              <div className="space-y-3">
                {vendor.documents.map((doc: any) => (
                  <div key={doc.vendorDocumentId} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#00BFA5] flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{doc.originalName || "Document.pdf"}</p>
                        <p className="text-xs text-gray-400 capitalize">{doc.documentType.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No documents uploaded.</p>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-1 lg:col-span-6 space-y-6">

          {/* Risk Analysis */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5">Risk Analysis</h2>

            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm font-semibold text-gray-700">Risk Level</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${riskLevel === "Low" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
                {riskLevel}
              </span>
            </div>

            {riskLevel === "High" ? (
              <div className="bg-red-50 text-red-500 rounded-xl p-3.5 flex items-center gap-2 mb-5 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">Bank name mismatch</span>
              </div>
            ) : (
              <div className="bg-emerald-50 text-emerald-600 rounded-xl p-3.5 flex items-center gap-2 mb-5 border border-emerald-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">The account details match</span>
              </div>
            )}

            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Check Passed</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {riskLevel === "High" ? (
                  <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                )}
                <span className="text-sm font-medium text-gray-700">
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
                <span className="text-sm font-medium text-gray-700">Business registration confirmed</span>
              </div>
            </div>
          </div>

          {/* Vendor Note */}
          {(isUnderReview || isRejected) && (
            <div className="bg-[#E6F8F5] rounded-2xl border border-[#00BFA5]/20 p-6">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Vendor Note</h2>
              <p className="text-sm text-gray-700 leading-relaxed">
                {vendor.decisionNote || "Please review the provided information and documents."}
              </p>
            </div>
          )}

          {/* Recent Transactions (Approved state) */}
          {isApproved && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recent Transactions</h2>
                <button
                  onClick={() => router.push(`/vendors/${vendorId}/transactions`)}
                  className="px-4 py-1.5 rounded-full bg-[#00BFA5] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  View all
                </button>
              </div>
              <div className="space-y-0 divide-y divide-gray-50">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">In-234-53</p>
                        <p className="text-xs text-gray-400">Jan 31, 2026</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[#00BFA5]">NGN 200,000.0</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Request Info Modal */}
      {requestInfoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Request Info</h2>
              <button
                onClick={() => setRequestInfoModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
              <textarea
                value={infoMessage}
                onChange={(e) => setInfoMessage(e.target.value)}
                placeholder="Enter message here..."
                rows={5}
                className="w-full p-4 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#00BFA5] focus:ring-1 focus:ring-[#00BFA5] resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setRequestInfoModalOpen(false)}
                className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestInfo}
                disabled={!infoMessage.trim()}
                className="flex-1 h-12 rounded-xl bg-[#66D1C1] text-white font-semibold text-sm hover:bg-[#5bbdb0] transition-colors disabled:opacity-50"
              >
                Send message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Vendor Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Reject Vendor</h2>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for Rejection</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Bank name mismatch, invalid tax ID, etc."
                rows={5}
                className="w-full p-4 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">This note will be sent to the vendor.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDecision("rejected", rejectReason)}
                disabled={!rejectReason.trim() || isSubmitting}
                className="flex-1 h-12 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Processing..." : "Reject Vendor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}