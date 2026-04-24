"use client";

import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getStatusIcon } from "@/lib/helper";
import { CompanyExpenseItemModal } from "@/components/expenses/company/CompanyExpenseItemModal";
import { CompanyReceiptViewModal } from "@/components/expenses/company/CompanyReceiptViewModal";
import type { PersonalExpenseStatus } from "@/components/expenses/table/personalColumns";
import {
  useCompanyExpenseDetail,
  useUpdateCompanyExpenseStatus,
  type ExpenseItem,
} from "@/lib/react-query/expenses";
import { ExpenseDetailSkeleton } from "@/components/expenses/ExpenseDetailSkeleton";
import { useState, useEffect } from "react";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { CheckCircle } from "lucide-react";
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

// Helper for initials
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

interface User {
  firstName: string;
  lastName: string;
  avatar?: string;
}

export default function CompanyExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  const axios = useAxios();
  const currencySymbol = useAuthStore((state) => state.getCurrencySymbol());

  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Fetch expense detail from API using React Query
  const {
    data: expenseDetail,
    isLoading,
    error,
  } = useCompanyExpenseDetail(reportId);



  // Mutation for updating status
  const updateStatusMutation = useUpdateCompanyExpenseStatus();

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


  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await updateStatusMutation.mutateAsync({
        reportId,
        status: "approved",
      });
      // Navigate back to company expenses tab after successful approval
      router.push("/expenses?tab=company-expenses");
    } catch (error) {
      logger.error("Failed to approve:", error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await updateStatusMutation.mutateAsync({
        reportId,
        status: "rejected",
      });
      // Navigate back to company expenses tab after successful rejection
      router.push("/expenses?tab=company-expenses");
    } catch (error) {
      logger.error("Failed to reject:", error);
    } finally {
      setIsRejecting(false);
    }
  };

  // Extract reporter name from expenseDetail
  const reporterName = expenseDetail.reporter || "Unknown Reporter";

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header with Reporter Avatar */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback>{getInitials(reporterName)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-foreground">{reporterName}</p>
          </div>
        </div>
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

      {/* Preview Items Section */}
      <div className="bg-white border border-border rounded-lg mb-6">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">
            Items{" "}
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
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600 font-medium">
                        Within limit
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve/Reject Buttons - Only show if status is pending */}
      {reportStatus === "pending" && (
        <div className="flex justify-end gap-4">
          <Button
            onClick={handleApprove}
            disabled={isApproving || isRejecting}
            className="bg-[#38B2AC] text-white hover:bg-[#38B2AC]/90 px-8 h-11 rounded-lg font-medium"
          >
            {isApproving ? "Approving..." : "Approve"}
          </Button>
          <Button
            onClick={handleReject}
            disabled={isRejecting || isApproving}
            className="bg-red-500 text-white hover:bg-red-600 px-8 h-11 rounded-lg font-medium"
          >
            {isRejecting ? "Rejecting..." : "Reject"}
          </Button>
        </div>
      )}

      {/* Modals */}
      <CompanyExpenseItemModal
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
