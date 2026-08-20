"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExpenseTimeline } from "@/components/expenses/personal/ExpenseTimeline";
import { CONote } from "@/components/expenses/personal/CONote";
import { ExpenseItemModal } from "@/components/expenses/personal/ExpenseItemModal";
import {
  ExpenseStatusBadge,
  normalizeExpenseReportStatus,
} from "@/components/expenses/ExpenseStatusBadge";
import {
  usePersonalExpenseDetail,
  type ExpenseItem,
} from "@/lib/react-query/expenses";
import { ExpenseDetailSkeleton } from "@/components/expenses/ExpenseDetailSkeleton";
import { useAuthStore } from "@/stores/auth-stores";
import { PolicyComplianceBadge } from "@/components/expenses/PolicyComplianceBadge";
import { useGetAllUsersApi } from "@/queries/users/get-all-users";

// Helper function to format date
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    
    return `${month}-${day}-${year} ${String(displayHours).padStart(2, "0")}:${minutes} ${ampm}`;
  } catch {
    return dateString;
  }
};



export default function PersonalExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  const currencySymbol = useAuthStore((state) => state.getCurrencySymbol());
  const currentUser = useAuthStore((state) => state.user);

  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Fetch expense detail from API using React Query
  const {
    data: expenseDetail,
    isLoading,
    error,
  } = usePersonalExpenseDetail(reportId);

  // Pre-fetch users so the cache is warm before the modal opens.
  // This prevents the "Unknown User" flash when viewing split allocations.
  useGetAllUsersApi({ enabled: true });

  if (isLoading) {
    return <ExpenseDetailSkeleton />;
  }

  if (error || !expenseDetail) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Expense not found
          </h1>
          <p className="text-muted-foreground mb-4">
            The expense you&apos;re looking for doesn&apos;t exist or failed to
            load.
          </p>
        </div>
      </div>
    );
  }

  const reportName = expenseDetail.reportTitle;
  // reportDate is now derived above from the most recent action
  const expenses = expenseDetail.expenses || [];

  // Check if we have any expenses
  if (expenses.length === 0) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            No expenses found
          </h1>
          <p className="text-muted-foreground mb-4">
            This report doesn&apos;t contain any expense items.
          </p>
        </div>
      </div>
    );
  }

  const totalAmount = expenses.reduce(
    (sum, exp) => sum + parseFloat(exp.amount),
    0,
  );

  const rawReportStatus =
    expenseDetail.status || expenses[0]?.status || "draft";
  const reportStatus = normalizeExpenseReportStatus(rawReportStatus);

  const fallbackName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Unknown User";
  const userName = expenseDetail.reporter || fallbackName;

  // ── Header date: show the timestamp of the MOST RECENT timeline action
  // so the date next to the status badge always matches the current state.
  // e.g. a rejected report shows the rejection time, not the submission time.
  const mostRecentTimestamp = (() => {
    const timeline = expenseDetail.timeline;
    if (timeline && timeline.length > 0) {
      // Timeline is chronological — last entry is the most recent action
      return timeline[timeline.length - 1].timestamp;
    }
    // Fallbacks by status-specific timestamps, then createdAt
    if (reportStatus === "rejected" && expenseDetail.rejectedAt) return expenseDetail.rejectedAt;
    if ((reportStatus === "approved" || reportStatus === "paid") && expenseDetail.approvedAt) return expenseDetail.approvedAt;
    if (expenseDetail.submittedAt) return expenseDetail.submittedAt;
    return expenseDetail.createdAt;
  })();
  const reportDate = formatDate(mostRecentTimestamp);

  const actionedBy = (() => {
    const timeline = expenseDetail.timeline;
    if (!timeline || timeline.length === 0) return null;
    
    let targetEvent = timeline[timeline.length - 1];
    if (reportStatus === "rejected" || reportStatus === "flagged") {
      const rejectEvent = [...timeline].reverse().find(
        e => e.action === "rejected" || e.action === "declined" || e.action === "flagged"
      );
      if (rejectEvent) targetEvent = rejectEvent;
    }

    if (!targetEvent.performedBy) return null;
    const { firstName, lastName, roleName } = targetEvent.performedBy;
    
    const isCurrentUser = currentUser && currentUser.firstName === firstName && currentUser.lastName === lastName;
    if (isCurrentUser) {
      return roleName ? `You (${roleName})` : "You";
    }

    const name = [firstName, lastName].filter(Boolean).join(" ");
    if (!name) return null;
    return roleName ? `${name} (${roleName})` : name;
  })();

  const handleExpenseClick = (expense: ExpenseItem) => {
    setSelectedExpense(expense);
    setIsExpenseModalOpen(true);
  };


  const handleEditExpenses = () => {
    router.push(`/expenses/personal/${reportId}/edit`);
  };

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-64px)] -m-3 sm:-m-5 min-h-0">
      {/* Header - Transparent with exact original padding */}
      <div className="shrink-0 pt-9 sm:pt-11 px-9 sm:px-11 pb-6">
        <div className="max-w-7xl mx-auto w-full flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {reportName}
            </h1>
            <ExpenseStatusBadge status={rawReportStatus} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{reportDate}</p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-9 sm:px-11 pb-9 sm:pb-11">
        <div className="max-w-7xl mx-auto h-full min-h-0">
          {/* Main Content - Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Expense Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preview Items Section */}
          <div className="bg-white border border-border rounded-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">
                Preview Items{" "}
                <span className="text-muted-foreground">{expenses.length}</span>
              </h3>
              <div className="text-base font-semibold text-foreground">
                Total: {currencySymbol}{totalAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Expenses Details
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Category
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Merchant
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Receipt
                    </th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                      Policy Compliance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr
                      key={expense.expenseId}
                      className="border-t border-border hover:bg-muted/20 cursor-pointer"
                      onClick={() => handleExpenseClick(expense)}
                    >
                      <td className="p-3">
                        <div>
                          <p className="text-sm font-medium text-foreground flex items-center gap-2">
                            {expense.title}
                            {(expense.isSplit || expense.expenseType?.toLowerCase() === "split" || (Array.isArray(expense.splitAllocations) && expense.splitAllocations.length > 0)) && (
                              <Badge className="bg-purple-100 text-purple-600 border-transparent px-1.5 py-0.5 text-[10px] leading-none font-medium">
                                Split
                              </Badge>
                            )}
                          </p>
                          {expense.description && (
                            <p className="text-xs text-muted-foreground">
                              {expense.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-muted-foreground">
                          {expense.categoryName}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm text-muted-foreground">
                          {expense.merchantName || "N/A"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm font-medium text-foreground">
                          {currencySymbol}{parseFloat(expense.amount).toLocaleString("en-US", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExpenseClick(expense);
                          }}
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

          {/* Manager's Feedback — only show if not draft */}
          {reportStatus !== "draft" && (
            <CONote
              status={reportStatus}
              rejectionReason={expenseDetail.rejectionReason}
              actionedBy={actionedBy}
            />
          )}

          {/* Edit Expenses Button for Flagged Status */}
          {reportStatus === "flagged" && (
            <div className="flex justify-end">
              <Button
                onClick={handleEditExpenses}
                className="bg-[#087f70] text-white hover:bg-[#076b5e] px-8 h-10 rounded-[8px] font-semibold"
              >
                Edit Expenses
              </Button>
            </div>
          )}
        </div>

        {/* Right Column - Timeline */}
        <div className="lg:col-span-1">
          <ExpenseTimeline
            status={reportStatus}
            submissionDate={formatDate(expenseDetail.createdAt)}
            submitterName={userName}
            timeline={expenseDetail.timeline}
          />
        </div>
        </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ExpenseItemModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setSelectedExpense(null);
        }}
        expense={selectedExpense ? {
          title: selectedExpense.title || "Untitled Expense",
          amount: selectedExpense.amount,
          merchantName: selectedExpense.merchantName,
          categoryName: selectedExpense.categoryName || "Uncategorized",
          description: selectedExpense.description,
          receiptUrl: selectedExpense.receiptUrl,
          transactionDate: selectedExpense.transactionDate,
          createdAt: selectedExpense.createdAt,
          policyJustification: selectedExpense.policyJustification,
          isSplit: selectedExpense.isSplit,
          expenseType: selectedExpense.expenseType,
          splitParticipants: selectedExpense.splitParticipants,
          splitAllocations: selectedExpense.splitAllocations,
        } : null}
      />

    </>
  );
}
