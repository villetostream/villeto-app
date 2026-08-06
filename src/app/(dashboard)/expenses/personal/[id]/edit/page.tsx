"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ReceiptUploadSection } from "@/components/expenses/new-report/ReceiptUploadSection";
import { ExpensePreviewList, type ExpenseItem } from "@/components/expenses/new-report/ExpensePreviewList";
import { ExpenseDetailModal } from "@/components/expenses/new-report/ExpenseDetailModal";
import { ReceiptPreviewModal } from "@/components/expenses/new-report/ReceiptPreviewModal";
import { PolicyCheckModal, type PolicyCheckResult } from "@/components/expenses/new-report/PolicyCheckModal";
import { type ExpenseDetailFormData, type SplitParticipant } from "@/components/expenses/new-report/ExpenseForm";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { toast } from "sonner";
import { Loader2, Trash2, Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { logger } from "@/lib/logger";
import { getApiErrorMessage, isPolicyViolationError, applyPolicyViolationErrorToExpenses, getPolicyExpenseResults } from "@/lib/types/api-error";

interface ExpenseCategory {
  categoryId: string;
  name: string;
}

interface DraftDetail {
  draftId: string;
  reportTitle: string;
  status: string;
  expensesPayload?: Array<{
    title: string;
    merchantName: string;
    amount: number;
    transactionDate: string;
    expenseCategoryId: string;
    description?: string;
    receiptImage?: string;
  }>;
  expenses?: Array<{
    title: string;
    merchantName: string;
    amount: number;
    transactionDate: string;
    expenseCategoryId: string;
    description?: string;
    receiptImage?: string;
  }>;
}

// Simulated OCR function
const simulateOCR = async (_receiptBase64: string): Promise<{
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

// ─── Humanize backend receipt policy messages ────────────────────────────────
function humanizeReceiptMessage(message: string): string {
  if (!message) return message;
  const match = message.match(/A receipt is required for "([^"]+)" expenses of ([\d,.]+) or more\. This expense is ([\d,.]+)\./i);
  if (match) {
    const [, category, thresholdStr, expenseStr] = match;
    const threshold = Number(thresholdStr.replace(/,/g, ""));
    const expense = Number(expenseStr.replace(/,/g, ""));
    const fmtThreshold = isNaN(threshold) ? thresholdStr : threshold.toLocaleString();
    const fmtExpense = isNaN(expense) ? expenseStr : expense.toLocaleString();
    return `Receipt Required: Your expense of ${fmtExpense} exceeds the ${fmtThreshold} receipt threshold for the ${category} category. Please attach a receipt.`;
  }
  return message;
}

/** Build a fresh PolicyCheckResult[] from current expenses state. */
function deriveFreshViolations(expenses: ExpenseItem[]): PolicyCheckResult[] {
  const results: PolicyCheckResult[] = [];
  for (const expense of expenses) {
    if (expense.policyViolations && expense.policyViolations.length > 0) {
      for (const v of expense.policyViolations) {
        if (v.type === "hard_block" || v.type === "block") {
          results.push({ expenseId: expense.id, expenseName: expense.name, violation: v as any, justification: expense.justification });
        } else if (v.type === "soft_warning" || v.type === "soft_warn") {
          if (!expense.justification?.trim()) {
            results.push({ expenseId: expense.id, expenseName: expense.name, violation: v as any, justification: expense.justification });
          }
        }
      }
    }
  }
  return results;
}

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

  // Policy modal states
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [pendingSubmitStatus, setPendingSubmitStatus] = useState<"draft" | "pending" | null>(null);
  const [requiredActionsByExpenseId, setRequiredActionsByExpenseId] = useState<Record<string, any>>({});
  const [detailModalReadOnly, setDetailModalReadOnly] = useState(false);

  // Dirty state tracking
  const [initialData, setInitialData] = useState<string>("");
  const isDirty = !isLoading && JSON.stringify(expenses) !== initialData;

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
        const reportResponse = await axios.get<any>(
          `reports/drafts/${reportId}`
        );
        // Handle double-nested data if present
        const innerData = reportResponse.data?.data || {};
        const reportData = innerData.data ? innerData.data : innerData;
        
        setReportTitle(reportData.reportTitle || "Draft");

        // Map existing expenses to local state (handle both expenses and expensesPayload)
        const rawExpenses = reportData.expenses || reportData.expensesPayload || [];
        const mappedExpenses: ExpenseItem[] = rawExpenses.map((e: any, index: number) => {
          // Find the category name since backend only returns category ID
          const categoryName = categoriesResponse.data?.data?.find((c: ExpenseCategory) => c.categoryId === e.expenseCategoryId)?.name || "Uncategorized";

          // Convert raw base64 to a full data URL if the receipt is not already one
          let receiptImage = e.receiptImage || "";
          if (receiptImage && !receiptImage.startsWith("data:") && !receiptImage.startsWith("http")) {
            receiptImage = `data:image/jpeg;base64,${receiptImage}`;
          }

          return {
            id: `draft-${index}-${Date.now()}`,
            name: e.title,
            category: categoryName,
            amount: Number(e.amount),
            merchantName: e.merchantName || "",
            description: e.description || "",
            transactionDate: new Date(e.transactionDate),
            receiptImage,
          };
        });

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
      queueMicrotask(() => {
        void fetchData();
      });
    }
  }, [reportId, axios, router]);

  // Handle receipt upload (New expenses)
  const handleReceiptsUpload = async (receipts: { base64: string; name: string }[], isSplit?: boolean) => {
    setIsProcessing(true);
    try {
      const ocrResults = await Promise.all(
        receipts.map((receipt) => simulateOCR(receipt.base64))
      );

      let currentNames = [...expenses.map((e) => e.name)];
      const newExpenses: ExpenseItem[] = ocrResults.map((result, index) => {
        let name = result.merchantName;
        if (!name) {
          let counter = 1;
          name = `Expense ${counter}`;
          while (currentNames.some((n) => n.trim().toLowerCase() === name.toLowerCase())) {
            counter++;
            name = `Expense ${counter}`;
          }
        }
        currentNames.push(name);
        return {
          id: `new-${Date.now()}-${index}`, // Temporary ID for new items
          name,
        category: result.category || "",
        amount: 0,
        receiptImage: receipts[index].base64,
        merchantName: result.merchantName,
        transactionDate: new Date(result.transactionDate),
        fileName: receipts[index].name,
        isSplit: !!isSplit,
      };
    });

      setExpenses((prev) => [...prev, ...newExpenses]);
      toast.success(`${receipts.length} receipt(s) scanned successfully`);
    } catch (error) {
      logger.error("Error processing receipts:", error);
      toast.error("Failed to process receipts");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle manual expense addition
  const handleAddExpense = (
    data: ExpenseDetailFormData,
    receiptImage?: string,
    isSplit?: boolean,
    splitData?: { participants: SplitParticipant[]; allocationMode: "equal" | "manual"; allocations: Record<string, string> }
  ) => {
    const newExpense: ExpenseItem = {
      id: `new-${Date.now()}`,
      name: data.name,
      amount: data.amount,
      category: data.category,
      merchantName: data.merchantName,
      description: data.description,
      receiptImage: receiptImage || "",
      transactionDate: data.transactionDate ?? new Date(),
      isSplit: !!isSplit,
      ...(splitData && {
        splitParticipants: splitData.participants,
        splitAllocationMode: splitData.allocationMode,
        splitAllocations: splitData.allocations,
      }),
    };
    setExpenses((prev) => [...prev, newExpense]);
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
    newReceipt?: string,
    justification?: string,
    splitData?: { participants: SplitParticipant[]; allocationMode: "equal" | "manual"; allocations: Record<string, string> }
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
              transactionDate: data.transactionDate ?? exp.transactionDate,
              policyViolations: null,
              ...(justification !== undefined && { justification }),
              ...(newReceipt !== undefined && { receiptImage: newReceipt }),
              ...(splitData && {
                splitParticipants: splitData.participants,
                splitAllocationMode: splitData.allocationMode,
                splitAllocations: splitData.allocations,
              }),
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
 // Mark as dirty
    toast.success("Expense removed (will be deleted on save)");
    setIsDeleteModalOpen(false);
    setExpenseToDeleteId(null);
  };

  // Handle Delete Entire Report
  const handleDeleteReport = async () => {
      try {
          setIsDeletingReport(true);
          await axios.delete(`reports/drafts/${reportId}`);
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

  const handlePolicyContinue = async (justifications: Record<string, string>) => {
    // Apply justifications to expenses
    setExpenses((prev) =>
      prev.map((e) => (justifications[e.id] ? { ...e, justification: justifications[e.id] } : e))
    );
    setIsPolicyModalOpen(false);
    await handleSubmit(pendingSubmitStatus!, justifications);
  };

  const handlePolicyEditExpense = (expenseId: string) => {
    setIsPolicyModalOpen(false);
    setSelectedExpenseId(expenseId);
    setDetailModalReadOnly(false);
    setIsDetailModalOpen(true);
  };

  // Submit Changes (PATCH)
  const handleSubmit = async (
    status: "draft" | "pending",
    justifications: Record<string, string> = {},
    overrideExpenses?: typeof expenses,
    overrideRequiredActions?: Record<string, any>,
    retryCount = 0
  ) => {
    const activeExpenses = overrideExpenses ?? expenses;
    if (activeExpenses.length === 0) {
      toast.error("Report must have at least one expense");
      return;
    }

    // Validation
    if (status === "pending") {
      const missingReceipts = activeExpenses.filter((exp) => !exp.receiptImage);
      if (missingReceipts.length > 0) {
        toast.error("All expenses must have receipts before submitting");
        return;
      }
    }

    const invalidExpenses = activeExpenses.filter(
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
      // For drafts, we don't need to individually delete expenses before patching. 
      // The PATCH request or Submit request will overwrite with the provided expenses array.
      if (deletedExpenseIds.length > 0) {
        setDeletedExpenseIds([]);
      }

      // Helper to extract base64
      const extractBase64 = (dataUrl: string) => {
          if (!dataUrl || !dataUrl.startsWith("data:")) return undefined;
          return dataUrl.split(",")[1];
      };

      const expensesPayload = activeExpenses.map((expense) => {
        const category = categories.find((cat) => cat.name === expense.category);
        if (!category) throw new Error(`Category not found: ${expense.category}`);

        const justificationValue = justifications[expense.id] || expense.justification;
        const action = (overrideRequiredActions || requiredActionsByExpenseId)[expense.id];
        const isJustificationRequired = action?.requiredFields?.includes("policyJustification") || action?.requiredFields?.includes("justification");
        const isReceiptRequired = action?.requiredFields?.includes("receiptUrl");
        const isActionRequired = isJustificationRequired || isReceiptRequired;

        const payload: Record<string, unknown> = {
          title: expense.name,
          merchantName: expense.merchantName || "",
          description: expense.description || "",
          expenseCategoryId: category.categoryId,
          amount: expense.amount,
          transactionDate: expense.transactionDate
            ? new Date(expense.transactionDate).toISOString()
            : new Date().toISOString(),
          // isSplit: expense.isSplit,
          // splitParticipants: expense.splitParticipants,
          // splitAllocationMode: expense.splitAllocationMode,
          // splitAllocations: expense.splitAllocations,
          ...(justificationValue && isActionRequired ? { policyJustification: justificationValue } : {}),
        };
        
        // Add receipt if it's new (base64)
        const base64 = extractBase64(expense.receiptImage);
        if (base64) {
            payload.receiptImage = base64;
        }

        return payload;
      });

      if (status === "draft") {
        const requestPayload = {
          reportTitle: reportTitle,
          expenses: expensesPayload,
        };
        // Use PATCH to update the draft
        await axios.patch(`reports/drafts/${reportId}`, requestPayload);
      } else {
        const requestPayload = {
          reportTitle: reportTitle,
          draftId: reportId,
          expenses: expensesPayload,
        };
        // Use POST to submit the draft
        const res = await axios.post(API_KEYS.EXPENSE.REPORTS, requestPayload);

        // ── Check if the policy engine requires ACTION_REQUIRED (201 but not submitted) ──
        const responseData = res.data?.data;
        if (responseData?.submitted === false && responseData?.resolution === "ACTION_REQUIRED") {
          const requiredActions = Array.isArray(responseData.requiredActions) ? responseData.requiredActions : [];
          // Build a lookup of enforcement action per expense index from the warnings array
          // warnings[].enforcementAction is the authoritative source (soft_warn vs block)
          const warningsByIndex: Record<number, any> = {};
          (Array.isArray(responseData.warnings) ? responseData.warnings : []).forEach((w: any) => {
            (Array.isArray(w.affectedExpenseIndexes) ? w.affectedExpenseIndexes : []).forEach((idx: number) => {
              const existing = warningsByIndex[idx];
              const isHardNew = w.enforcementAction === "block" || w.enforcementAction === "hard_block";
              const isHardExisting = existing?.enforcementAction === "block" || existing?.enforcementAction === "hard_block";
              if (!existing || (isHardNew && !isHardExisting)) {
                warningsByIndex[idx] = w;
              }
            });
          });

          if (requiredActions.length > 0) {
            const newRequiredActions: Record<string, any> = { ...requiredActionsByExpenseId };
            let allRequiredHaveJustification = true;

            requiredActions.forEach((action: any) => {
              const exp = activeExpenses[action.expenseIndex];
              if (exp) {
                newRequiredActions[exp.id] = action;
                // Determine enforcement level from the warnings array (authoritative)
                const warning = warningsByIndex[action.expenseIndex];
                const enforcementAction = warning?.enforcementAction ?? "soft_warn";
                const isHardBlock = enforcementAction === "block" || enforcementAction === "hard_block";

                const needsJustification = action.requiredFields?.includes("policyJustification") || action.requiredFields?.includes("justification");
                // Only block auto-retry if enforcement is genuinely hard
                if (isHardBlock) {
                  allRequiredHaveJustification = false;
                } else if (needsJustification) {
                  const hasJustification = justifications[exp.id] || exp.justification?.trim();
                  if (!hasJustification) {
                    allRequiredHaveJustification = false;
                  }
                }
              }
            });

            if (allRequiredHaveJustification && retryCount === 0) {
              return handleSubmit(status, justifications, activeExpenses, newRequiredActions, retryCount + 1);
            }

            setExpenses((prev) => {
              const next = [...prev];
              requiredActions.forEach((action: any) => {
                const idx = action.expenseIndex;
                if (next[idx]) {
                  // Resolve enforcement level from warnings array — this is authoritative
                  const warning = warningsByIndex[idx];
                  const enforcementAction = warning?.enforcementAction ?? "soft_warn";
                  const isHardBlock = enforcementAction === "block" || enforcementAction === "hard_block";
                  const violationType = isHardBlock ? "hard_block" : "soft_warning";
                  const violationMsg = humanizeReceiptMessage(action.message || "Policy action required for this expense.");

                  next[idx] = {
                    ...next[idx],
                    policyViolations: [{
                      type: violationType,
                      message: violationMsg,
                      ruleType: action.type || "POLICY_RULE",
                    }],
                  };
                }
              });
              return next;
            });

            setRequiredActionsByExpenseId(newRequiredActions);
            setPendingSubmitStatus(status);
            
            const hasPendingWarnings = Object.keys(newRequiredActions).length > 0;
            if (hasPendingWarnings) {
              setIsPolicyModalOpen(true);
            }
            return;
          }
        }
      }

      toast.success(
        status === "draft"
          ? "Draft saved successfully"
          : "Report submitted successfully"
      );

      queryClient.invalidateQueries({
        queryKey: [API_KEYS.EXPENSE.PERSONAL_EXPENSES],
      });
      queryClient.invalidateQueries({ queryKey: ["expense-drafts"] });

      if (status === "draft") {
        // Stay on the page — just reset dirty state so user knows it saved
        setInitialData(JSON.stringify(expenses));
        setIsSavingDraft(false);
      } else {
        // Submitting closes the edit page
        setTimeout(() => {
          router.push("/expenses?tab=personal-expenses");
        }, 500);
      }

    } catch (error: unknown) {
      logger.error("Error updating report:", error);

      if (isPolicyViolationError(error)) {
        setExpenses((prev) => {
          const updated = applyPolicyViolationErrorToExpenses(prev, error);
          const expenseResults = getPolicyExpenseResults(error);

          if (expenseResults.length > 0) {
            const freshViolations: PolicyCheckResult[] = [];
            const newRequiredActions: Record<string, any> = {};

            expenseResults.forEach((result) => {
              const idx = result.expenseIndex ?? -1;
              const exp = idx >= 0 ? updated[idx] : undefined;
              if (!exp) return;
              (result.violations ?? []).forEach((v) => {
                const isHard = v.enforcementAction === "block";
                freshViolations.push({
                  expenseId: exp.id,
                  expenseName: exp.name,
                  violation: {
                    type: isHard ? "hard_block" : "soft_warning",
                    message: humanizeReceiptMessage(v.message ?? "Policy violation"),
                    ruleType: v.type,
                    limitChecks: (v as any).limitChecks,
                  },
                  justification: exp.justification,
                });
                
                if (!isHard) {
                  newRequiredActions[exp.id] = {
                    requiredFields: ["policyJustification"],
                    message: humanizeReceiptMessage(v.message ?? "Justification required"),
                    type: v.type,
                    expenseIndex: idx,
                  };
                }
              });
            });

            if (Object.keys(newRequiredActions).length > 0) {
              setRequiredActionsByExpenseId((prevReq) => ({ ...prevReq, ...newRequiredActions }));
            }

            if (freshViolations.length > 0) {
              setPendingSubmitStatus("pending");
              setIsPolicyModalOpen(true);
            }
          }

          return updated;
        });

        toast.error("Some expenses violated policy rules. Please review them.");
        setIsSavingDraft(false);
        setIsSubmittingReport(false);
        return;
      }

      toast.error(getApiErrorMessage(error, "Failed to update report"));
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
    ? "bg-[#f9faf9] text-[#84908a] border border-black/[0.08] rounded-[8px] h-10 px-6 text-[13px] font-semibold cursor-not-allowed"
    : "bg-white border border-[#087f70] text-[#087f70] hover:bg-[#f0faf8] rounded-[8px] h-10 px-6 text-[13px] font-semibold transition-colors";

  const submitClass = isSubmitDisabled
    ? "bg-[#f9faf9] text-[#84908a] border border-black/[0.08] rounded-[8px] h-10 px-6 text-[13px] font-semibold cursor-not-allowed"
    : "bg-[#087f70] border border-[#087f70] text-white hover:bg-[#076b5e] rounded-[8px] h-10 px-6 text-[13px] font-semibold shadow-sm transition-colors";

  return (
    <div className="max-w-7xl mx-auto p-4 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 mb-4 border-b">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="relative inline-grid items-center group w-full md:w-auto">
            {/* Hidden span dictates the width of the grid container based on text length */}
            <span className="col-start-1 row-start-1 invisible whitespace-pre pl-3 pr-8 py-1 text-sm font-semibold">
              {reportTitle || "Enter report name"}
            </span>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="Enter report name"
              className="col-start-1 row-start-1 w-full min-w-0 border border-black/[0.08] rounded-[8px] pl-3 pr-8 py-1 text-[13px] font-semibold text-[#0b100e] bg-white hover:border-gray-400 focus:border-[#087f70] focus:ring-1 focus:ring-[#087f70] outline-none transition-all"
              title="Edit report name"
            />
            <Pencil className="absolute right-2.5 w-3.5 h-3.5 text-muted-foreground opacity-60 pointer-events-none" />
          </div>
          <button 
              type="button"
              className="flex items-center text-[13px] font-semibold text-[#d33d44] hover:text-[#c33339] hover:bg-[#fdf2f2] px-3 py-1.5 rounded-[6px] transition-colors disabled:opacity-50"
              onClick={() => setIsDeleteReportModalOpen(true)}
          >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete Report
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => handleSubmit("draft")}
            disabled={isSaveDisabled}
            className={saveDraftClass}
          >
            {isActionInProgress ? (isSavingDraft ? "Saving..." : "Processing...") : "Save Changes"}
          </button>
          <button
            onClick={() => handleSubmit("pending")}
            disabled={isSubmitDisabled}
            className={submitClass}
          >
            {isActionInProgress ? (isSubmittingReport ? "Submitting..." : "Processing...") : "Submit Report"}
          </button>
        </div>
      </div>

      {/* ── Main layout: Preview (60%) | Scan/Form (40%) ── */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Left: Preview list — 60% */}
        <div className="w-full lg:w-[60%] min-w-0 lg:overflow-y-auto lg:pr-4">
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
        <div className="w-full lg:w-[40%] min-w-0 lg:overflow-y-auto lg:pl-2 lg:pr-4">
          <ReceiptUploadSection
            categories={categories}
            onReceiptsUpload={handleReceiptsUpload}
            onAddExpense={handleAddExpense}
            existingExpenseNames={expenses.map((e) => e.name)}
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
        existingExpenseNames={expenses.map((e) => e.name)}
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

      <PolicyCheckModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        violations={deriveFreshViolations(expenses)}
        onProceedWithWarnings={handlePolicyContinue}
        onEditExpense={handlePolicyEditExpense}
        isRechecking={isSubmittingReport}
      />

      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-[14px] p-6 flex items-center gap-3 shadow-xl">
            <Loader2 className="h-6 w-6 animate-spin text-[#087f70]" />
            <span className="text-[14px] font-semibold text-[#0b100e]">Processing receipts...</span>
          </div>
        </div>
      )}
    </div>
  );
}
