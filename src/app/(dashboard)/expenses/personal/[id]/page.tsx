"use client";

import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStatusIcon } from "@/lib/helper";
import { ExpenseTimeline } from "@/components/expenses/personal/ExpenseTimeline";
import { CONote } from "@/components/expenses/personal/CONote";
import { ExpenseItemModal } from "@/components/expenses/personal/ExpenseItemModal";
import { ReceiptViewModal } from "@/components/expenses/personal/ReceiptViewModal";
import type { PersonalExpenseStatus } from "@/components/expenses/table/personalColumns";
import {
  usePersonalExpenseDetail,
  type ExpenseItem,
} from "@/lib/react-query/expenses";
import { ExpenseDetailSkeleton } from "@/components/expenses/ExpenseDetailSkeleton";
import { useState, useEffect } from "react";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { useAuthStore } from "@/stores/auth-stores";
import { logger } from "@/lib/logger";

const getStatusBadgeVariant = (status: PersonalExpenseStatus) => {
  switch (status) {
    case "paid":
      return "paid";
    case "approved":
      return "approved";
    case "pending":
      return "pending";
    case "draft":
      return "draft";
    case "rejected":
    case "declined":
      return "rejected";
    case "flagged":
      return "pending";
    default:
      return "pending";
  }
};

const getStatusColor = (status: PersonalExpenseStatus) => {
  switch (status) {
    case "paid":
      return "bg-[#38B2AC] text-white border-0";
    case "approved":
      return "bg-purple-100 text-purple-700 border-0";
    case "pending":
      return "bg-orange-100 text-orange-700 border-0";
    case "draft":
      return "bg-gray-200 text-gray-700 border-0";
    case "rejected":
    case "declined":
      return "bg-red-100 text-red-700 border-0";
    case "flagged":
      return "bg-orange-100 text-orange-700 border-0";
    default:
      return "bg-gray-200 text-gray-700 border-0";
  }
};

const getStatusLabel = (status: PersonalExpenseStatus): string => {
  switch (status) {
    case "declined":
      return "Rejected";
    case "paid":
      return "Paid Out";
    case "flagged":
      return "Flagged";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

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

interface User {
  firstName: string;
  lastName: string;
}

export default function PersonalExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  const axios = useAxios();
  const currencySymbol = useAuthStore((state) => state.getCurrencySymbol());

  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Fetch expense detail from API using React Query
  const {
    data: expenseDetail,
    isLoading,
    error,
  } = usePersonalExpenseDetail(reportId);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoadingUser(true);
        const response = await axios.get<{
          data: User;
        }>(API_KEYS.USER.ME);
        setUser(response.data.data);
      } catch (error) {
        logger.error("Failed to fetch user:", error);
        setUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUser();
  }, [axios]);

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

  // Get the overall report status from the detail response, with fallbacks
  const reportStatus = (expenseDetail.status ||
    expenses[0]?.status ||
    "draft") as PersonalExpenseStatus;

  const userName = user ? `${user.firstName} ${user.lastName}` : "...";

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
          <Badge
            variant={getStatusBadgeVariant(reportStatus)}
            className={getStatusColor(reportStatus)}
          >
            {getStatusIcon(reportStatus)}
            <span className="ml-1">{getStatusLabel(reportStatus)}</span>
          </Badge>
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
