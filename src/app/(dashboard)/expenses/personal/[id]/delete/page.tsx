"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

interface ExpenseItem {
  expenseId: string;
  title: string;
  merchantName: string;
  amount: string;
  transactionDate: string;
  categoryName: string;
  description?: string;
  receiptUrl?: string;
}

interface ReportDetail {
  reportId: string;
  reportTitle: string;
  status: string;
  expenses: ExpenseItem[];
}

type ModalType = "single" | "selected" | "report" | null;

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

export default function DeleteExpenseReportPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  const axios = useAxios();
  const queryClient = useQueryClient();

  const [reportDetail, setReportDetail] = useState<ReportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalType, setModalType] = useState<ModalType>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseItem | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchReportDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get(`reports/${reportId}`);
      const data = response.data.data as ReportDetail;
      setReportDetail(data);
      setSelectedIds(new Set());
      return data;
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to load report details";
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [reportId, axios]);

  useEffect(() => {
    if (!reportId) return;
    queueMicrotask(() => {
      void fetchReportDetail();
    });
  }, [reportId, fetchReportDetail]);

  const getReturnUrl = () => {
    const tab =
      typeof window !== "undefined"
        ? sessionStorage.getItem("expensesReturnTab") || "personal-expenses"
        : "personal-expenses";
    const page =
      typeof window !== "undefined"
        ? sessionStorage.getItem("expensesReturnPage") || "1"
        : "1";
    return `/expenses?tab=${tab}&page=${page}`;
  };

  // Redirect if not draft
  useEffect(() => {
    if (reportDetail && reportDetail.status !== "draft") {
      toast.error("Only draft reports can be deleted.");
      router.replace(getReturnUrl());
    }
  }, [reportDetail, router]);

  // When all expenses are deleted, go back to expense page with personal active (preserve tab & page)
  useEffect(() => {
    if (
      !isLoading &&
      reportDetail &&
      reportDetail.expenses &&
      reportDetail.expenses.length === 0
    ) {
      queryClient.invalidateQueries({
        queryKey: [API_KEYS.EXPENSE.PERSONAL_EXPENSES],
      });
      router.replace(getReturnUrl());
      toast.success(
        "Report had no expenses left. Returned to personal expenses.",
      );
    }
  }, [reportDetail, isLoading, router, queryClient]);

  const expenses = reportDetail?.expenses ?? [];
  const allSelected =
    expenses.length > 0 && selectedIds.size === expenses.length;
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(expenses.map((e) => e.expenseId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (expenseId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(expenseId);
      else next.delete(expenseId);
      return next;
    });
  };

  const openDeleteSingle = (expense: ExpenseItem) => {
    setExpenseToDelete(expense);
    setModalType("single");
  };

  const openDeleteSelected = () => {
    setModalType("selected");
  };

  const openDeleteReport = () => {
    setModalType("report");
  };

  const closeModal = () => {
    setModalType(null);
    setExpenseToDelete(null);
  };

  const deleteSingleExpense = async () => {
    if (!expenseToDelete) return;
    try {
      setIsDeleting(true);
      await axios.delete(
        API_KEYS.EXPENSE.DELETE_EXPENSE(reportId, expenseToDelete.expenseId),
      );
      toast.success(`Expense "${expenseToDelete.title}" deleted.`);
      await fetchReportDetail();
      queryClient.invalidateQueries({
        queryKey: [API_KEYS.EXPENSE.PERSONAL_EXPENSES],
      });
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        e?.response?.data?.message ||
          "Failed to delete expense. Please try again.",
      );
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteSelectedExpenses = async () => {
    if (selectedIds.size === 0) return;
    try {
      setIsDeleting(true);
      for (const expenseId of selectedIds) {
        await axios.delete(
          API_KEYS.EXPENSE.DELETE_EXPENSE(reportId, expenseId),
        );
      }
      toast.success(`${selectedIds.size} expense(s) deleted.`);
      setSelectedIds(new Set());
      await fetchReportDetail();
      queryClient.invalidateQueries({
        queryKey: [API_KEYS.EXPENSE.PERSONAL_EXPENSES],
      });
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        e?.response?.data?.message ||
          "Failed to delete some expenses. Please try again.",
      );
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteEntireReport = async () => {
    try {
      setIsDeleting(true);
      await axios.delete(API_KEYS.EXPENSE.DELETE_REPORT(reportId));
      toast.success("Report deleted successfully.");
      queryClient.invalidateQueries({
        queryKey: [API_KEYS.EXPENSE.PERSONAL_EXPENSES],
      });
      router.replace(getReturnUrl());
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        e?.response?.data?.message ||
          "Failed to delete report. Please try again.",
      );
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  // parent file (where getModalConfig lives)
  const getModalConfig = () => {
    switch (modalType) {
      case "single":
        return {
          title: "Confirm Deletion",
          description: (
            <>
              Are you sure you want to delete the expense: &quot;
              <span className="font-semibold">
                {expenseToDelete?.title}
              </span>&quot; ?
            </>
          ),
          onConfirm: deleteSingleExpense,
        };
      case "selected":
        return {
          title: "Confirm Deletion",
          description: (
            <>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{selectedIds.size}</span> selected
              expense(s)?
            </>
          ),
          onConfirm: deleteSelectedExpenses,
        };
      case "report":
        return {
          title: "Delete entire report",
          description: (
            <>
              Are you sure you want to delete the entire report &quot;
              <span className="font-semibold">{reportDetail?.reportTitle}</span>
              &quot; ?
            </>
          ),
          onConfirm: deleteEntireReport,
        };
      default:
        return null;
    }
  };

  const modalConfig = getModalConfig();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading report...</span>
      </div>
    );
  }

  if (error || !reportDetail) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Error Loading Report
          </h1>
          <p className="text-muted-foreground mb-4">
            {error ||
              "The report you're trying to delete doesn't exist or failed to load."}
          </p>
          <Button asChild variant="outline">
            <Link href={getReturnUrl()}>Back to expenses</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (reportDetail.status !== "draft") {
    return null; // Redirect in progress
  }

  if (expenses.length === 0) {
    return null; // Redirect in progress (no expenses)
  }

  const isSingleExpense = expenses.length === 1;

  return (
    <>
      {modalConfig && (
        <ConfirmationModal
          isOpen={!!modalType}
          onClose={closeModal}
          onConfirm={modalConfig.onConfirm}
          title={modalConfig.title}
          description={modalConfig.description}
          confirmLabel="Delete"
          destructive
        />
      )}

      <div className="max-w-6xl mx-auto space-y-6 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-1">
              Delete expenses from report
            </h1>
            <p className="text-muted-foreground">
              {reportDetail.reportTitle} — Select expenses to delete or delete
              the entire report.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/expenses/personal/${reportId}`}>View report</Link>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={openDeleteReport}
              disabled={isDeleting}
            >
              {isSingleExpense ? "Delete report" : "Delete entire report"}
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <div className="flex items-center gap-4 py-4 px-2 border-b bg-muted/50">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => toggleSelectAll(checked === true)}
              aria-label="Select all"
            />
            <span className="text-sm text-muted-foreground">Select all</span>
            {someSelected && (
              <Button
                variant="destructive"
                size="sm"
                onClick={openDeleteSelected}
                disabled={isDeleting}
              >
                Delete selected ({selectedIds.size})
              </Button>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Title</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-16 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.expenseId}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(expense.expenseId)}
                      onCheckedChange={(checked) =>
                        toggleSelect(expense.expenseId, checked === true)
                      }
                      aria-label={`Select ${expense.title}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {expense.title || "—"}
                  </TableCell>
                  <TableCell>{expense.merchantName || "—"}</TableCell>
                  <TableCell>
                    $
                    {parseFloat(expense.amount).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell>{formatDate(expense.transactionDate)}</TableCell>
                  <TableCell>{expense.categoryName || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => openDeleteSingle(expense)}
                      disabled={isDeleting}
                      aria-label={`Delete ${expense.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
