"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ReceiptUploadSection } from "@/components/expenses/new-report/ReceiptUploadSection";
import { ExpensePreviewList, type ExpenseItem } from "@/components/expenses/new-report/ExpensePreviewList";
import { ExpenseDetailModal } from "@/components/expenses/new-report/ExpenseDetailModal";
import { ReceiptPreviewModal } from "@/components/expenses/new-report/ReceiptPreviewModal";
import { type ExpenseDetailFormData } from "@/components/expenses/new-report/ExpenseForm";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { logger } from "@/lib/logger";

interface ExpenseCategory {
  categoryId: string;
  name: string;
}

interface ReportDetail {
  reportId: string;
  reportTitle: string;
  status: string;
  expenses: Array<{
    expenseId: string;
    title: string;
    merchantName: string;
    amount: string;
    transactionDate: string;
    categoryName: string;
    description?: string;
    receiptUrl?: string;
    expenseCategoryId: string;
  }>;
}

// Simulated OCR function
const simulateOCR = async (receiptBase64: string): Promise<{
  merchantName: string;
  amount: number;
  category: string;
  transactionDate: string;
}> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return {
    merchantName: "",
    amount: 0,
    category: "",
    transactionDate: new Date().toISOString(),
  };
};

export default function EditReportPage() {
  const params = useParams();
  const reportId = params.id as string;
  const router = useRouter();
  const axios = useAxios();
  const queryClient = useQueryClient();

  const [reportTitle, setReportTitle] = useState("Edit Report");
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal states
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  
  // Delete confirm states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [expenseToDeleteId, setExpenseToDeleteId] = useState<string | null>(null);
  const [isDeletingReport, setIsDeletingReport] = useState(false);
  
  // Track deleted expense IDs (for existing expenses only)
  const [deletedExpenseIds, setDeletedExpenseIds] = useState<string[]>([]);

  // Dirty state tracking
  const [isDirty, setIsDirty] = useState(false);
  const [initialData, setInitialData] = useState<string>("");

  // Confirmation state for Report Deletion
  const [isDeleteReportModalOpen, setIsDeleteReportModalOpen] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // 1. Fetch Categories
        const categoriesResponse = await axios.get<{ data: ExpenseCategory[] }>(
          API_KEYS.EXPENSE.CATEGORIES_WITH_POLICIES
        );
        if (categoriesResponse.data?.data) {
          setCategories(categoriesResponse.data.data);
        }

        // 2. Fetch Report Details
        const reportResponse = await axios.get<{ data: ReportDetail }>(
          `reports/${reportId}`
        );
        const reportData = reportResponse.data.data;
        
        setReportTitle(reportData.reportTitle);

        // Map existing expenses to local state
        const mappedExpenses: ExpenseItem[] = reportData.expenses.map((e) => ({
          id: e.expenseId,
          name: e.title,
          category: e.categoryName,
          amount: parseFloat(e.amount),
          merchantName: e.merchantName,
          description: e.description,
          transactionDate: new Date(e.transactionDate),
          receiptImage: e.receiptUrl || "",
        }));

        setExpenses(mappedExpenses);
        
        // Save initial state for dirty checking
        setInitialData(JSON.stringify(mappedExpenses));

      } catch (error) {
        logger.error("Error loading report:", error);
        toast.error("Failed to load report details");
        router.push("/expenses");
      } finally {
        setIsLoading(false);
      }
    };

    if (reportId) {
      fetchData();
    }
  }, [reportId, axios, router]);

  // Check for changes
  useEffect(() => {
    if (!isLoading) {
      const currentData = JSON.stringify(expenses);
      setIsDirty(currentData !== initialData);
    }
  }, [expenses, initialData, isLoading]);

  // Handle receipt upload (New expenses)
  const handleReceiptsUpload = async (receipts: { base64: string; name: string }[]) => {
    setIsProcessing(true);
    try {
      const ocrResults = await Promise.all(
        receipts.map((receipt) => simulateOCR(receipt.base64))
      );

      const newExpenses: ExpenseItem[] = ocrResults.map((result, index) => ({
        id: `new-${Date.now()}-${index}`, // Temporary ID for new items
        name: result.merchantName || `Expense ${expenses.length + index + 1}`,
        category: result.category || "",
        amount: 0,
        receiptImage: receipts[index].base64,
        merchantName: result.merchantName,
        transactionDate: new Date(result.transactionDate),
        fileName: receipts[index].name,
      }));

      setExpenses((prev) => [...prev, ...newExpenses]);
      setIsDirty(true); // Explicitly mark dirty on addition
      toast.success(`${receipts.length} receipt(s) scanned successfully`);
    } catch (error) {
      logger.error("Error processing receipts:", error);
      toast.error("Failed to process receipts");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle manual expense addition
  const handleAddExpense = (data: ExpenseDetailFormData, receiptImage?: string) => {
    const newExpense: ExpenseItem = {
      id: `new-${Date.now()}`,
      name: data.name,
      amount: data.amount,
      category: data.category,
      merchantName: data.merchantName,
      description: data.description,
      receiptImage: receiptImage || "",
      transactionDate: new Date(),
    };
    setExpenses((prev) => [...prev, newExpense]);
    setIsDirty(true);
    toast.success("Expense added");
  };

  // Handle updates
  const handleEditName = (id: string, newName: string) => {
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, name: newName } : exp))
    );
  };

  const handleSaveExpense = (
    expenseId: string,
    data: ExpenseDetailFormData,
    newReceipt?: string
  ) => {
    setExpenses((prev) =>
      prev.map((exp) =>
        exp.id === expenseId
          ? {
              ...exp,
              name: data.name,
              amount: data.amount,
              merchantName: data.merchantName,
              category: data.category,
              description: data.description,
              policyViolations: null,
              ...(newReceipt !== undefined && { receiptImage: newReceipt }),
            }
          : exp
      )
    );
    toast.success("Expense updated in view");
  };

  // Handle Delete
  const handleDeleteClick = (id: string) => {
    setExpenseToDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteExpense = () => {
    if (!expenseToDeleteId) return;

    // Check if it's an existing expense (ID doesn't start with "new-")
    const isExisting = !expenseToDeleteId.startsWith("new-");

    // Track deletion for existing expenses (will be handled on save)
    if (isExisting) {
      setDeletedExpenseIds((prev) => [...prev, expenseToDeleteId]);
    }

    // Remove from UI immediately
    setExpenses((prev) => prev.filter((e) => e.id !== expenseToDeleteId));
    setIsDirty(true); // Mark as dirty
    toast.success("Expense removed (will be deleted on save)");
    setIsDeleteModalOpen(false);
    setExpenseToDeleteId(null);
  };

  // Handle Delete Entire Report
  const handleDeleteReport = async () => {
      try {
          setIsDeletingReport(true);
          await axios.delete(`reports/${reportId}`);
          toast.success("Report deleted successfully");
          queryClient.invalidateQueries({ queryKey: [API_KEYS.EXPENSE.PERSONAL_EXPENSES] });
          router.push("/expenses?tab=personal-expenses");
      } catch (error) {
          logger.error("Error deleting report:", error);
          toast.error("Failed to delete report");
      } finally {
          setIsDeletingReport(false);
          setIsDeleteReportModalOpen(false);
      }
  };

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Submit Changes (PATCH)
  const handleSubmit = async (status: "draft" | "pending") => {
    if (expenses.length === 0) {
      toast.error("Report must have at least one expense");
      return;
    }

    // Validation
    if (status === "pending") {
      const missingReceipts = expenses.filter((exp) => !exp.receiptImage);
      if (missingReceipts.length > 0) {
        toast.error("All expenses must have receipts before submitting");
        return;
      }
    }

    const invalidExpenses = expenses.filter(
      (exp) => !exp.name || exp.amount < 0 || !exp.category
    );
    if (invalidExpenses.length > 0) {
      toast.error("Please complete all required fields for each expense");
      return;
    }

    // Set loading state based on action
    if (status === "draft") {
        setIsSavingDraft(true);
    } else {
        setIsSubmittingReport(true);
    }

    try {
      // First, delete any expenses that were marked for deletion
      if (deletedExpenseIds.length > 0) {
        await Promise.all(
          deletedExpenseIds.map((expenseId) =>
            axios.delete(`reports/${reportId}/expenses/${expenseId}`)
          )
        );
        // Clear the deleted IDs after successful deletion
        setDeletedExpenseIds([]);
      }

      // Helper to extract base64
      const extractBase64 = (dataUrl: string) => {
          if (!dataUrl || !dataUrl.startsWith("data:")) return undefined;
          return dataUrl.split(",")[1];
      };

      const expensesPayload = expenses.map((expense) => {
        const category = categories.find((cat) => cat.name === expense.category);
        if (!category) throw new Error(`Category not found: ${expense.category}`);

        const payload: any = {
          title: expense.name,
          merchantName: expense.merchantName || "",
          description: expense.description || "",
          expenseCategoryId: category.categoryId,
          amount: expense.amount,
          transactionDate: expense.transactionDate
            ? new Date(expense.transactionDate).toISOString()
            : new Date().toISOString(),
        };
        
        // Add ID if it's an existing expense
        if (!expense.id.startsWith("new-")) {
            payload.expenseId = expense.id;
        }

        // Add receipt if it's new (base64)
        const base64 = extractBase64(expense.receiptImage);
        if (base64) {
            payload.receiptImage = base64;
        }

        return payload;
      });

      const requestPayload = {
        reportTitle: reportTitle,
        status,
        expenses: expensesPayload,
      };

      // Use PATCH to update the report
      await axios.patch(`reports/${reportId}`, requestPayload);

      toast.success(
        status === "draft"
          ? "Report updated"
          : "Report submitted successfully"
      );

      queryClient.invalidateQueries({
        queryKey: [API_KEYS.EXPENSE.PERSONAL_EXPENSES],
      });

      setTimeout(() => {
        router.push("/expenses?tab=personal-expenses");
      }, 500);

    } catch (error) {
      logger.error("Error updating report:", error);
      
      const err = error as any;
      const backendData = err?.response?.data;

      if (backendData?.message === "Policy Violation Exception" || backendData?.data?.error === "Policy Violation") {
        const causes = backendData?.data?.cause || [];
        if (causes.length > 0) {
          setExpenses((prev) =>
            prev.map((exp) => {
              const matchedCause = causes.find(
                (c: any) =>
                  c.categoryName === exp.category &&
                  Number(c.expenseAmount) === exp.amount
              );

              if (matchedCause && matchedCause.violations && matchedCause.violations.length > 0) {
                return {
                  ...exp,
                  policyViolations: matchedCause.violations.map((v: any) => ({
                    type: v.type || "POLICY_RULE",
                    message: v.message,
                  })),
                };
              }
              return exp;
            })
          );
          toast.error("Some expenses violated policy rules. Please review them.");
          setIsSavingDraft(false);
          setIsSubmittingReport(false);
          return;
        }
      }

      toast.error(err?.response?.data?.message || err?.message || "Failed to update report");
      // Reset loading states on error
      setIsSavingDraft(false);
      setIsSubmittingReport(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading report...</span>
      </div>
    );
  }

  const isEmpty = expenses.length === 0;
  // Disable if no changes (unless submitting), or if any action is in progress
  const hasUnresolvedViolations = expenses.some((e) => e.policyViolations && e.policyViolations.length > 0);
  const isActionInProgress = isSavingDraft || isSubmittingReport || isDeletingReport;
  const isSaveDisabled = isActionInProgress || isEmpty || !isDirty; 
  const isSubmitDisabled = isActionInProgress || isEmpty || hasUnresolvedViolations; // Can submit even if not dirty? Usually yes if it was draft.

  const saveDraftClass = isSaveDisabled
    ? "bg-gray-100 text-gray-400 border border-gray-200 rounded-lg h-12 px-8 text-base font-medium cursor-not-allowed focus:outline-none focus:ring-0"
    : "bg-white border border-primary text-primary hover:bg-primary/10 rounded-lg h-12 px-8 text-base font-medium focus:outline-none focus:ring-0";

  const submitClass = isSubmitDisabled
    ? "bg-gray-100 text-gray-400 border border-gray-100 rounded-lg h-12 px-8 text-base font-medium cursor-not-allowed focus:outline-none focus:ring-0"
    : "bg-primary border border-primary text-white hover:bg-primary/90 rounded-lg h-12 px-8 text-base font-medium focus:outline-none focus:ring-0";

  return (
    <div className="max-w-7xl mx-auto p-4 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b">
        <div className="flex items-center gap-4">
          <span className="inline-block border rounded-md px-3 py-1 text-sm font-semibold text-foreground bg-white">
              {reportTitle}
          </span>
          <Button 
              variant="ghost" 
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => setIsDeleteReportModalOpen(true)}
              disabled={isActionInProgress}
          >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Report
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleSubmit("draft")}
            disabled={isSaveDisabled}
            className={saveDraftClass}
          >
            {isActionInProgress ? (isSavingDraft ? "Saving..." : "Processing...") : "Save Changes"}
          </Button>
          <Button
            onClick={() => handleSubmit("pending")}
            disabled={isSubmitDisabled}
            className={submitClass}
          >
            {isActionInProgress ? (isSubmittingReport ? "Submitting..." : "Processing...") : "Submit Report"}
          </Button>
        </div>
      </div>

      {/* ── Main layout: Preview (60%) | Scan/Form (40%) ── */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Left: Preview list — 60% */}
        <div className="w-full lg:w-[60%] min-w-0 overflow-y-auto pr-4">
          <ExpensePreviewList
            expenses={expenses}
            total={expenses.reduce((sum, exp) => sum + exp.amount, 0)}
            onEditName={handleEditName}
            onViewDetails={(id) => { setSelectedExpenseId(id); setIsDetailModalOpen(true); }}
            onViewReceipt={(id) => { setSelectedReceiptId(id); setIsReceiptModalOpen(true); }}
            onDelete={handleDeleteClick}
          />
        </div>

        {/* Right: Scan / Manual form — 40% */}
        <div className="w-full lg:w-[40%] min-w-0 overflow-y-auto pl-2 pr-4">
          <ReceiptUploadSection
            categories={categories}
            onReceiptsUpload={handleReceiptsUpload}
            onAddExpense={handleAddExpense}
          />
        </div>
      </div>



      {/* Modals */}
      <ExpenseDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setSelectedExpenseId(null); }}
        expense={expenses.find((e) => e.id === selectedExpenseId) || null}
        categories={categories}
        onSave={handleSaveExpense}
      />

      <ReceiptPreviewModal
        isOpen={isReceiptModalOpen}
        onClose={() => { setIsReceiptModalOpen(false); setSelectedReceiptId(null); }}
        receiptImage={expenses.find((e) => e.id === selectedReceiptId)?.receiptImage || ""}
        onChangeReceipt={(newReceipt) => {
            if (selectedReceiptId) {
                setExpenses(prev => prev.map(e => e.id === selectedReceiptId ? { ...e, receiptImage: newReceipt } : e));
                toast.success("Receipt updated");
            }
        }}
      />
      
      {/* Delete Expense Confirmation */}
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteExpense}
        title="Delete Expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
      />

      {/* Delete Report Confirmation */}
      <ConfirmationModal 
        isOpen={isDeleteReportModalOpen}
        onClose={() => setIsDeleteReportModalOpen(false)}
        onConfirm={handleDeleteReport}
        title="Delete Entire Report"
        description="Are you sure you want to delete this entire report with all its expenses? This action cannot be undone."
      />

      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Processing receipts...</span>
          </div>
        </div>
      )}
    </div>
  );
}
