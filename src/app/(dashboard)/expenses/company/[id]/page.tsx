"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CompanyExpenseItemModal } from "@/components/expenses/company/CompanyExpenseItemModal";
import { ExpenseTimeline } from "@/components/expenses/personal/ExpenseTimeline";
import {
  ExpenseStatusBadge,
  isPendingExpenseStatus,
  normalizeExpenseReportStatus,
} from "@/components/expenses/ExpenseStatusBadge";
import {
  useCompanyExpenseDetail,
  useUpdateCompanyExpenseStatus,
  type ExpenseItem,
} from "@/lib/react-query/expenses";
import { ExpenseDetailSkeleton } from "@/components/expenses/ExpenseDetailSkeleton";
import { useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { useAuthStore } from "@/stores/auth-stores";
import { logger } from "@/lib/logger";
import { CONote } from "@/components/expenses/personal/CONote";
import { ManagerOverrideBanner } from "@/components/procurement/ManagerOverrideBanner";
import { PolicyComplianceBadge } from "@/components/expenses/PolicyComplianceBadge";
import { asRecord, pickString } from "@/lib/types/api-error";
import { useGetAllUsersApi } from "@/queries/users/get-all-users";

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const month   = String(date.getMonth() + 1).padStart(2, "0");
    const day     = String(date.getDate()).padStart(2, "0");
    const year    = date.getFullYear();
    const hours   = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm    = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${month}-${day}-${year} ${String(displayHours).padStart(2, "0")}:${minutes} ${ampm}`;
  } catch {
    return dateString;
  }
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

// ─── Reject reason modal ───────────────────────────────────────────────────────

function RejectReasonModal({
  open,
  onClose,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState("");
  const handleClose = () => { setReason(""); onClose(); };
  
  const MIN_LENGTH = 10;
  const isTooShort = reason.trim().length > 0 && reason.trim().length < MIN_LENGTH;
  const isValid = reason.trim().length >= MIN_LENGTH;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Reject Report</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1">
          Please provide a reason for rejecting this expense. This will be shared with the employee.
        </p>
        <div className="space-y-2 mt-1">
          <label className="text-sm font-medium text-foreground">
            Enter Rejection Reason <span className="text-destructive">(Required)</span>
          </label>
          <Textarea
            placeholder="Write note here......"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[100px] resize-none rounded-xl"
          />
          <div className="flex justify-between items-center text-xs mt-1">
            <span className={isTooShort ? "text-destructive" : "text-muted-foreground"}>
              {reason.length < MIN_LENGTH && reason.length > 0 ? `Minimum ${MIN_LENGTH} characters required` : "Length requirements met"}
            </span>
            <span className="text-muted-foreground">
              {reason.length} characters
            </span>
          </div>
        </div>
        <div className="flex justify-end pt-3">
          <Button
            onClick={() => { if (isValid) onConfirm(reason); }}
            disabled={!isValid || isLoading}
            className="bg-[#d33d44] hover:bg-[#c33339] text-white rounded-[8px] h-10 px-6 font-semibold"
          >
            {isLoading ? "Processing..." : "Reject Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Feedback modal ────────────────────────────────────────────────────────────

function FeedbackModal({
  open,
  onClose,
  type,
}: {
  open: boolean;
  onClose: () => void;
  type: "approved" | "rejected";
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <div className="flex flex-col items-center text-center gap-5 py-4">
          <div className="relative w-20 h-20">
            <span className="absolute -top-3 left-0 w-2.5 h-2.5 bg-blue-500 rotate-45 rounded-sm" />
            <span className="absolute -top-5 left-7 w-2 h-2 bg-orange-400 rounded-sm rotate-12" />
            <span className="absolute top-0 -right-2 text-green-400 text-xl leading-none">✦</span>
            <span className="absolute top-8 -right-4 w-1.5 h-5 bg-blue-400 rounded-full rotate-12" />
            <span className="absolute top-3 -left-5 text-orange-400 text-sm leading-none">✦</span>
            <span className="absolute -bottom-2 right-1 text-green-400 text-sm leading-none">★</span>
            <div className="w-20 h-20 rounded-full bg-teal-500 flex items-center justify-center shadow-lg">
              <Check className="w-9 h-9 text-white" strokeWidth={3} />
            </div>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold text-foreground">
              {type === "approved" ? "Expense Approved Successfully" : "Expense Rejected"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {type === "approved"
                ? "The expense has been approved and the requester has been notified. You can view this approval in the expense audit trail."
                : "The expense has been rejected. The requester has been informed and can make corrections or resubmit for approval."}
            </p>
          </div>
          <Button onClick={onClose} className="w-full bg-[#087f70] hover:bg-[#076b5e] text-white rounded-[8px] h-10 font-semibold">
            View Audi Trail
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

interface User {
  userId?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

export default function CompanyExpenseDetailPage() {
  const params  = useParams();
  const searchParams = useSearchParams();
  const scope   = (searchParams.get("scope") || "company") as "own" | "team" | "company";
  const router  = useRouter();
  const reportId = params.id as string;
  const currencySymbol = useAuthStore((state) => state.getCurrencySymbol());
  const { can } = useAuthStore();

  const [overrideUnlocked, setOverrideUnlocked] = useState(false);

  // Read the logged-in user synchronously from the auth store to avoid a flash
  // caused by an async /me fetch completing after the first render.
  const authUser = useAuthStore((state) => state.user);
  const user: User | null = authUser ? {
    userId: authUser.userId,
    firstName: authUser.firstName,
    lastName: String(authUser.lastName),
    avatar: undefined,
  } : null;
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectOpen, setRejectOpen]   = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ open: boolean; type: "approved" | "rejected" } | null>(null);

  const { data: expenseDetail, isLoading, isFetching, error } = useCompanyExpenseDetail(reportId);
  // Show skeleton during both first fetch AND background refetch to avoid showing stale status
  const isPageLoading = isLoading || isFetching;
  const updateStatusMutation = useUpdateCompanyExpenseStatus();

  // Pre-fetch users so the cache is warm before the modal opens.
  // This prevents the "Unknown User" flash when viewing split allocations.
  useGetAllUsersApi({ enabled: true });


  if (isPageLoading) return <ExpenseDetailSkeleton />;

  if (error || !expenseDetail) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Expense not found</h1>
          <p className="text-muted-foreground mb-4">
            The expense you&apos;re looking for doesn&apos;t exist or failed to load.
          </p>
        </div>
      </div>
    );
  }

  const expenses = expenseDetail.expenses || [];

  if (expenses.length === 0) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-foreground mb-2">No expenses found</h1>
          <p className="text-muted-foreground mb-4">This report doesn&apos;t contain any expense items.</p>
        </div>
      </div>
    );
  }

  const reportName   = expenseDetail.reportTitle;
  // Date derived from most recent timeline action below
  const totalAmount  = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const rawReportStatus = expenseDetail.status || expenses[0]?.status || "draft";
  const reportStatus = normalizeExpenseReportStatus(rawReportStatus);
  const reporterName = expenseDetail.reporter || "Unknown Reporter";
  
  const approverObj = asRecord(asRecord(expenseDetail).approvedBy);
  const approverName = pickString(approverObj, "firstName")
    ? `${pickString(approverObj, "firstName")} ${pickString(approverObj, "lastName")}`.trim()
    : undefined;

  // ── Header date: show the timestamp of the MOST RECENT timeline action
  const mostRecentTimestamp = (() => {
    const timeline = expenseDetail.timeline;
    if (timeline && timeline.length > 0) {
      return timeline[timeline.length - 1].timestamp;
    }
    // Fallbacks
    if (reportStatus === "rejected" && expenseDetail.rejectedAt) return expenseDetail.rejectedAt;
    if ((reportStatus === "approved" || reportStatus === "paid") && expenseDetail.approvedAt) return expenseDetail.approvedAt;
    if (expenseDetail.submittedAt) return expenseDetail.submittedAt;
    return expenseDetail.createdAt;
  })();
  const reportDate = formatDate(mostRecentTimestamp);

  // ── Build the "actioned by" label for CONote from the last timeline event
  const actionedBy = (() => {
    const timeline = expenseDetail.timeline;
    if (!timeline || timeline.length === 0) return null;
    const last = timeline[timeline.length - 1];
    if (!last.performedBy) return null;
    const { firstName, lastName, roleName } = last.performedBy;
    const name = [firstName, lastName].filter(Boolean).join(" ");
    if (!name) return null;
    return roleName ? `${name} (${roleName})` : name;
  })();

  const isOwnScope = scope === "own";
  const isTeamScope = scope === "team";
  const isCompanyScope = scope === "company";

  const hasApprovePermission =
    can("expense.report", "approve_department") ||
    can("expense.report", "approve_company") ||
    can("expense.report", "approve") ||
    can("expense.report", "manage");

  const isPendingOrSubmitted = isPendingExpenseStatus(rawReportStatus);
  const isCurrentUserReport = expenseDetail.reporterId === user?.userId;

  // Show approve/reject if:
  // not own scope, AND NOT the user's own report, AND pending/submitted, AND hasApprovePermission, AND (team scope OR (company scope AND overrideUnlocked))
  const canTakeAction = !isOwnScope && !isCurrentUserReport && isPendingOrSubmitted && hasApprovePermission && (isTeamScope || (isCompanyScope && overrideUnlocked));

  const showOwnReportBanner = !isOwnScope && isCurrentUserReport && isPendingOrSubmitted;

  // Show lock/unlock banner if: company scope AND pending/submitted AND hasApprovePermission AND NOT the user's own report
  const showOverrideBanner = isCompanyScope && isPendingOrSubmitted && hasApprovePermission && !isCurrentUserReport;

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await updateStatusMutation.mutateAsync({ reportId, status: "approved" });
      setFeedbackModal({ open: true, type: "approved" });
    } catch (err) {
      logger.error("Failed to approve:", err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (reason: string) => {
    setIsRejecting(true);
    try {
      await updateStatusMutation.mutateAsync({ reportId, status: "rejected", reason });
      setRejectOpen(false);
      setFeedbackModal({ open: true, type: "rejected" });
    } catch (err) {
      logger.error("Failed to reject:", err);
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-64px)] -m-3 sm:-m-5 min-h-0">
        
        {/* Header - Transparent with exact original padding (dashboard 20px + page 24px = 44px -> p-11) */}
        <div className="shrink-0 pt-9 sm:pt-11 px-9 sm:px-11 pb-6">
          <div className="max-w-7xl mx-auto w-full">
            {/* Submitter header */}
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user?.avatar} alt={reporterName} />
                <AvatarFallback className="bg-[#f0faf8] text-[#087f70] font-semibold">{getInitials(reporterName)}</AvatarFallback>
              </Avatar>
              <p className="text-sm font-semibold text-foreground">{reporterName}</p>
            </div>

            {/* Title, Status and Action Buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-foreground">{reportName}</h1>
                  <ExpenseStatusBadge status={rawReportStatus} context="manager" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{reportDate}</p>
              </div>

              {/* Approve / Reject Actions */}
              {canTakeAction && (
                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    onClick={handleApprove}
                    disabled={isApproving || isRejecting}
                    className="bg-[#087f70] text-white hover:bg-[#076b5e] rounded-[8px] h-10 px-6 font-semibold shadow-sm"
                  >
                    {isApproving ? "Processing..." : "Approve"}
                  </Button>
                  <Button
                    onClick={() => setRejectOpen(true)}
                    disabled={isApproving || isRejecting}
                    className="bg-[#d33d44] text-white hover:bg-[#c33339] rounded-[8px] h-10 px-6 font-semibold shadow-sm"
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 px-9 sm:px-11 pb-9 sm:pb-11">
          <div className="max-w-7xl mx-auto h-full min-h-0">
            {/* Two-column: items left, timeline right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — items table */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-border rounded-lg">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-base font-semibold text-foreground">
                  Items <span className="text-muted-foreground font-normal">{expenses.length}</span>
                </h3>
                <span className="text-base font-semibold text-foreground">
                  Total: {currencySymbol}
                  {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30">
                    <tr>
                      {["Expenses Details", "Category", "Merchant", "Amount", "Receipt", "Policy Compliance"].map((h) => (
                        <th key={h} className="text-left p-3 text-sm font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr
                        key={expense.expenseId}
                        className="border-t border-border hover:bg-muted/20 cursor-pointer"
                        onClick={() => { setSelectedExpense(expense); setIsExpenseModalOpen(true); }}
                      >
                        <td className="p-3">
                          <p className="text-sm font-medium text-foreground flex items-center gap-2">
                            {expense.title}
                            {(expense.isSplit || expense.expenseType?.toLowerCase() === "split" || (Array.isArray(expense.splitAllocations) && expense.splitAllocations.length > 0)) && (
                              <Badge className="bg-purple-100 text-purple-600 border-transparent px-1.5 py-0.5 text-[10px] leading-none font-medium">
                                Split
                              </Badge>
                            )}
                          </p>
                          {expense.description && (
                            <p className="text-xs text-muted-foreground">{expense.description}</p>
                          )}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{expense.categoryName}</td>
                        <td className="p-3 text-sm text-muted-foreground">{expense.merchantName || "N/A"}</td>
                        <td className="p-3 text-sm font-medium text-foreground">
                          {currencySymbol}
                          {parseFloat(expense.amount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedExpense(expense); setIsExpenseModalOpen(true); }}
                            className="text-[13px] text-[#087f70] hover:underline font-semibold"
                          >
                            View
                          </button>
                        </td>
                        <td className="p-3">
                          <PolicyComplianceBadge policyJustification={expense.policyJustification} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Approve / Reject was here, moved to right column */}
          </div>

          {/* Right — Expense Timeline (visible to all roles) */}
          <div className="lg:col-span-1 space-y-4">
            {showOwnReportBanner && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm font-medium shadow-sm">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">You can't approve or reject your own expense report. This report is awaiting review from another approver.</p>
              </div>
            )}
            
            {showOverrideBanner && (
              <ManagerOverrideBanner
                isUnlocked={overrideUnlocked}
                onUnlock={() => setOverrideUnlocked(true)}
                onLock={() => setOverrideUnlocked(false)}
              />
            )}
            
            {/* Actions were moved to the header to align timeline with table */}
            <ExpenseTimeline
              status={reportStatus}
              submissionDate={reportDate}
              submitterName={reporterName}
              approverName={approverName}
              timeline={expenseDetail.timeline}
            />
          </div>
        </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CompanyExpenseItemModal
        isOpen={isExpenseModalOpen}
        onClose={() => { setIsExpenseModalOpen(false); setSelectedExpense(null); }}
        expense={selectedExpense ? {
          title:        selectedExpense.title || "Untitled Expense",
          amount:       selectedExpense.amount,
          merchantName: selectedExpense.merchantName,
          categoryName: selectedExpense.categoryName || "Uncategorized",
          description:  selectedExpense.description,
          receiptUrl:   selectedExpense.receiptUrl,
          transactionDate: selectedExpense.transactionDate,
          policyJustification: selectedExpense.policyJustification,
          isSplit: selectedExpense.isSplit,
          splitParticipants: selectedExpense.splitParticipants,
          splitAllocations: selectedExpense.splitAllocations,
        } : null}
      />

      <RejectReasonModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
        isLoading={isRejecting}
      />

      {feedbackModal && (
        <FeedbackModal
          open={feedbackModal.open}
          onClose={() => {
            setFeedbackModal(null);
            router.push(
              scope === "team"
                ? "/expenses?tab=team-expenses"
                : "/expenses?tab=company-expenses",
            );
          }}
          type={feedbackModal.type}
        />
      )}
    </>
  );
}
