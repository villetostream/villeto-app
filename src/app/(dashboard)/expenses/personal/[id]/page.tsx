"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  const reportDate = formatDate(expenseDetail.createdAt);
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

  const handleExpenseClick = (expense: ExpenseItem) => {
    setSelectedExpense(expense);
    setIsExpenseModalOpen(true);
  };


  const handleEditExpenses = () => {
    router.push(`/expenses/personal/${reportId}/edit`);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-semibold text-foreground">
            {reportName}
          </h1>
          <ExpenseStatusBadge status={rawReportStatus} />
        </div>
        <p className="text-sm text-muted-foreground">{reportDate}</p>
      </div>

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
                          <p className="text-sm font-medium text-foreground">
                            {expense.title}
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
                          className="text-sm text-primary hover:underline font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CO's Note - Only show if not draft */}
          {reportStatus !== "draft" && <CONote status={reportStatus} />}

          {/* Edit Expenses Button for Flagged Status */}
          {reportStatus === "flagged" && (
            <div className="flex justify-end">
              <Button
                onClick={handleEditExpenses}
                className="bg-primary text-white hover:bg-primary/90 px-8"
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
        } : null}
      />

    </div>
  );
}
