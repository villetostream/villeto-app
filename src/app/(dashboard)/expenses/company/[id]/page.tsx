"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
import { useState, useEffect } from "react";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { Check } from "lucide-react";
import { useAuthStore } from "@/stores/auth-stores";
import { logger } from "@/lib/logger";
import { ManagerOverrideBanner } from "@/components/procurement/ManagerOverrideBanner";
import { asRecord, pickString } from "@/lib/types/api-error";

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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Report</DialogTitle>
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
            className="min-h-[100px] resize-none"
          />
        </div>
        <div className="flex justify-end pt-1">
          <Button
            onClick={() => { if (reason.trim()) onConfirm(reason); }}
            disabled={!reason.trim() || isLoading}
            className="bg-destructive hover:bg-destructive/90 text-white"
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
          <Button onClick={onClose} className="w-full bg-teal-500 hover:bg-teal-600 text-white">
            View Audi Trail
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

interface User {
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
  const axios   = useAxios();
  const currencySymbol = useAuthStore((state) => state.getCurrencySymbol());
  const { can } = useAuthStore();

  const [overrideUnlocked, setOverrideUnlocked] = useState(false);

  const [user, setUser]               = useState<User | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectOpen, setRejectOpen]   = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ open: boolean; type: "approved" | "rejected" } | null>(null);

  const { data: expenseDetail, isLoading, error } = useCompanyExpenseDetail(reportId);
  const updateStatusMutation = useUpdateCompanyExpenseStatus();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get<{ data: User }>(API_KEYS.USER.ME);
        setUser(response.data.data);
      } catch (err) {
        logger.error("Failed to fetch user:", err);
      }
    };
    fetchUser();
  }, [axios]);

  if (isLoading) return <ExpenseDetailSkeleton />;

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
  const reportDate   = formatDate(expenseDetail.createdAt);
  const totalAmount  = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const rawReportStatus = expenseDetail.status || expenses[0]?.status || "draft";
  const reportStatus = normalizeExpenseReportStatus(rawReportStatus);
  const reporterName = expenseDetail.reporter || "Unknown Reporter";
  
  // Extract approver name if available
  const approverObj = asRecord(asRecord(expenseDetail).approvedBy);
  const approverName = pickString(approverObj, "firstName")
    ? `${pickString(approverObj, "firstName")} ${pickString(approverObj, "lastName")}`.trim()
    : undefined;

  const isOwnScope = scope === "own";
  const isTeamScope = scope === "team";
  const isCompanyScope = scope === "company";

  const hasApprovePermission =
    can("expense.report", "approve_department") ||
    can("expense.report", "approve_company") ||
    can("expense.report", "approve") ||
    can("expense.report", "manage");

  const isPendingOrSubmitted = isPendingExpenseStatus(rawReportStatus);

  // Show approve/reject if:
  // not own scope, AND pending/submitted, AND hasApprovePermission, AND (team scope OR (company scope AND overrideUnlocked))
  const canTakeAction = !isOwnScope && isPendingOrSubmitted && hasApprovePermission && (isTeamScope || (isCompanyScope && overrideUnlocked));

  // Show lock/unlock banner if: company scope AND pending/submitted AND hasApprovePermission
  const showOverrideBanner = isCompanyScope && isPendingOrSubmitted && hasApprovePermission;

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

  const handleReject = async (_reason: string) => {
    setIsRejecting(true);
    try {
      await updateStatusMutation.mutateAsync({ reportId, status: "rejected" });
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
      <div className="max-w-7xl mx-auto p-6">
        {/* Submitter header */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user?.avatar} alt={reporterName} />
            <AvatarFallback>{getInitials(reporterName)}</AvatarFallback>
          </Avatar>
          <p className="text-sm font-semibold text-foreground">{reporterName}</p>
        </div>

        {/* Report title + status */}
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{reportName}</h1>
          <ExpenseStatusBadge status={rawReportStatus} context="manager" />
        </div>
        <p className="text-sm text-muted-foreground mb-6">{reportDate}</p>

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
                          <p className="text-sm font-medium text-foreground">{expense.title}</p>
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
                            className="text-sm text-primary hover:underline font-medium"
                          >
                            View
                          </button>
                        </td>
                        <td className="p-3">
                          <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                            <Check className="h-4 w-4" />
                            Within limit
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Approve / Reject — only for users with approve_department on pending reports */}
            {canTakeAction && (
              <div className="flex justify-end gap-3">
                <Button
                  onClick={() => setRejectOpen(true)}
                  disabled={isApproving || isRejecting}
                  className="bg-red-500 text-white hover:bg-red-600 px-8 h-11 rounded-lg font-medium min-w-[100px]"
                >
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isApproving || isRejecting}
                  className="bg-teal-500 text-white hover:bg-teal-600 px-8 h-11 rounded-lg font-medium min-w-[100px]"
                >
                  {isApproving ? "Processing..." : "Approve"}
                </Button>
              </div>
            )}
          </div>

          {/* Right — Expense Timeline (visible to all roles) */}
          <div className="lg:col-span-1 space-y-4">
            {showOverrideBanner && (
              <ManagerOverrideBanner
                isUnlocked={overrideUnlocked}
                onUnlock={() => setOverrideUnlocked(true)}
                onLock={() => setOverrideUnlocked(false)}
              />
            )}
            
            <ExpenseTimeline
              status={reportStatus}
              submissionDate={reportDate}
              submitterName={reporterName}
              approverName={approverName}
            />
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
