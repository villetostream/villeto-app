"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ReceiptUploadSection } from "@/components/expenses/new-report/ReceiptUploadSection";
import {
  ExpensePreviewList,
  type ExpenseItem,
  type PolicyViolation,
} from "@/components/expenses/new-report/ExpensePreviewList";
import { ExpenseDetailModal } from "@/components/expenses/new-report/ExpenseDetailModal";
import { ReceiptPreviewModal } from "@/components/expenses/new-report/ReceiptPreviewModal";
import { PolicyCheckModal, type PolicyCheckResult } from "@/components/expenses/new-report/PolicyCheckModal";
import { type ExpenseDetailFormData } from "@/components/expenses/new-report/ExpenseForm";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { logger } from "@/lib/logger";
import { notifySetupGuide } from "@/lib/setupGuideEvents";
import { getApiErrorMessage, getPolicyViolationCauses, isPolicyViolationError } from "@/lib/types/api-error";

interface ExpenseCategory {
  categoryId: string;
  name: string;
  // Policy data returned when ?withPolicies=true
  policies?: Array<{
    policyId: string;
    name: string;
    rules: Array<{
      type: "spend_limit" | "receipt_requirement";
      enforcement: "hard_block" | "soft_warning";
      timeframe?: "monthly" | "per_transaction";
      amount?: number;
      currency?: string;
      requiredAboveAmount?: number;
    }>;
    scope?: {
      type: "all_employees" | "specific";
      departmentIds?: string[];
      roleIds?: string[];
    };
  }>;
}

// ─── Policy Engine ────────────────────────────────────────────────────────────
function checkExpenseAgainstPolicies(
  expense: ExpenseItem,
  categoryMeta: ExpenseCategory | undefined
): PolicyViolation | null {
  if (!categoryMeta?.policies || !Array.isArray(categoryMeta.policies) || categoryMeta.policies.length === 0) return null;

  for (const policy of categoryMeta.policies) {
    // Backend sometimes returns policies without a rules array, which causes a crash.
    const rules = Array.isArray(policy.rules) ? policy.rules : [];
    
    for (const rule of rules) {
      if (rule.type === "spend_limit" && rule.timeframe === "per_transaction") {
        if (rule.amount !== undefined && expense.amount > rule.amount) {
          return {
            type: rule.enforcement,
            message:
              rule.enforcement === "hard_block"
                ? `Amounts over ${rule.currency ?? ""} ${rule.amount.toLocaleString()} are not allowed`
                : `Amounts over ${rule.currency ?? ""} ${rule.amount.toLocaleString()} require justification`,
            ruleType: "spend_limit",
          };
        }
      }
      if (rule.type === "receipt_requirement") {
        if (
          rule.requiredAboveAmount !== undefined &&
          expense.amount > rule.requiredAboveAmount &&
          !expense.receiptImage
        ) {
          return {
            type: rule.enforcement,
            message:
              rule.enforcement === "hard_block"
                ? `A receipt is required for amounts above ${rule.currency ?? ""} ${rule.requiredAboveAmount.toLocaleString()}`
                : `A receipt is recommended for amounts above ${rule.currency ?? ""} ${rule.requiredAboveAmount.toLocaleString()}`,
            ruleType: "receipt_requirement",
          };
        }
      }
    }
  }
  return null;
}

function runPolicyEngine(
  expenses: ExpenseItem[],
  categories: ExpenseCategory[]
): PolicyCheckResult[] {
  const violations: PolicyCheckResult[] = [];
  for (const expense of expenses) {
    const categoryMeta = categories.find((c) => c.name === expense.category);
    const violation = checkExpenseAgainstPolicies(expense, categoryMeta);
    if (violation) {
      violations.push({
        expenseId: expense.id,
        expenseName: expense.name,
        violation,
        justification: expense.justification,
      });
    }
  }
  return violations;
}
// ─────────────────────────────────────────────────────────────────────────────

// Simulated OCR (replace with actual backend endpoint)
const simulateOCR = async (_: string) => {
  await new Promise((r) => setTimeout(r, 1000));
  return { merchantName: "", amount: 0, category: "", transactionDate: new Date().toISOString() };
};

export default function NewReportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const axios = useAxios();
  const queryClient = useQueryClient();

  const reportTitle = searchParams.get("name") || "New Report";

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal states
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailModalReadOnly, setDetailModalReadOnly] = useState(true);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  // Policy check modal
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policyViolations, setPolicyViolations] = useState<PolicyCheckResult[]>([]);
  const [isRecheckingPolicy, setIsRecheckingPolicy] = useState(false);
  // Pending submit action (we run policy then proceed)
  const [pendingSubmitStatus, setPendingSubmitStatus] = useState<"draft" | "pending" | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const response = await axios.get<{
          message: string;
          status: number;
          data: ExpenseCategory[];
        }>(API_KEYS.EXPENSE.CATEGORIES_WITH_POLICIES);
        if (response.data?.data && Array.isArray(response.data.data)) {
          setCategories(response.data.data);
        }
      } catch (error) {
        logger.error("Error fetching categories:", error);
        toast.error("Failed to load expense categories");
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, [axios]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleReceiptsUpload = async (receipts: { base64: string; name: string }[]) => {
    setIsProcessing(true);
    try {
      const ocrResults = await Promise.all(receipts.map((r) => simulateOCR(r.base64)));
      const newExpenses: ExpenseItem[] = ocrResults.map((result, i) => ({
        id: `expense-${Date.now()}-${i}`,
        name: result.merchantName || `Expense ${expenses.length + i + 1}`,
        category: result.category || "",
        amount: 0,
        receiptImage: receipts[i].base64,
        merchantName: result.merchantName,
        transactionDate: new Date(result.transactionDate),
        fileName: receipts[i].name,
      }));
      setExpenses((prev) => [...prev, ...newExpenses]);
      toast.success(`${receipts.length} receipt(s) scanned successfully`);
    } catch (error) {
      logger.error("Error processing receipts:", error);
      toast.error("Failed to process receipts");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddExpense = (data: ExpenseDetailFormData, receiptImage?: string) => {
    setExpenses((prev) => [
      ...prev,
      {
        id: `expense-${Date.now()}`,
        name: data.name,
        amount: data.amount,
        category: data.category,
        merchantName: data.merchantName,
        description: data.description,
        receiptImage: receiptImage || "",
        transactionDate: new Date(),
      },
    ]);
    toast.success("Expense added");
  };

  const handleEditName = (id: string, newName: string) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, name: newName } : e)));
  };

  const handleViewDetails = (id: string) => {
    setSelectedExpenseId(id);
    setDetailModalReadOnly(true);
    setIsDetailModalOpen(true);
  };

  const handleViewReceipt = (id: string) => {
    setSelectedReceiptId(id);
    setIsReceiptModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSaveExpense = (
    expenseId: string,
    data: ExpenseDetailFormData,
    newReceipt?: string,
    justification?: string
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
              justification: justification ?? exp.justification,
              // Clear old policy violation so it can be re-evaluated
              policyViolations: null,
              ...(newReceipt !== undefined && { receiptImage: newReceipt }),
            }
          : exp
      )
    );
    toast.success("Expense updated");
  };

  const handleChangeReceipt = (newReceipt: string) => {
    if (selectedReceiptId) {
      setExpenses((prev) =>
        prev.map((e) => (e.id === selectedReceiptId ? { ...e, receiptImage: newReceipt } : e))
      );
      toast.success("Receipt updated");
    }
  };

  // ── Policy + Submit flow ──────────────────────────────────────────────────
  const runPolicyAndSubmit = async (status: "draft" | "pending") => {
    try {
      logger.log("[runPolicyAndSubmit] Triggered with status:", status);
      logger.log("[runPolicyAndSubmit] Expenses:", expenses);
      
      if (expenses.length === 0) { toast.error("Please add at least one expense"); return; }
      
      if (status === "pending") {
        // Run policy engine
        const violations = runPolicyEngine(expenses, categories);
        logger.log("[runPolicyAndSubmit] Violations found:", violations);

        if (violations.length > 0) {
          setPolicyViolations(violations);
          setPendingSubmitStatus(status);
          setIsPolicyModalOpen(true);
          return; // Wait for user to resolve in modal
        }
      }

      // No violations (or draft) — submit directly
      await doSubmit(status, {});
    } catch (err) {
      logger.error("[runPolicyAndSubmit] Sync Crash:", err);
      toast.error("An unexpected error occurred during submission.");
    }
  };

  const handlePolicyContinue = async (justifications: Record<string, string>) => {
    // Apply justifications to expenses
    setExpenses((prev) =>
      prev.map((e) => (justifications[e.id] ? { ...e, justification: justifications[e.id] } : e))
    );
    setIsPolicyModalOpen(false);
    await doSubmit(pendingSubmitStatus!, justifications);
  };

  const handlePolicyEditExpense = (expenseId: string) => {
    setIsPolicyModalOpen(false);
    setSelectedExpenseId(expenseId);
    setDetailModalReadOnly(false);
    setIsDetailModalOpen(true);
  };

  // Called after expense is saved from policy-triggered edit
  const handleSaveExpenseFromPolicy = async (
    expenseId: string,
    data: ExpenseDetailFormData,
    newReceipt?: string
  ) => {
    handleSaveExpense(expenseId, data, newReceipt);
    setIsDetailModalOpen(false);
    setSelectedExpenseId(null);

    // Re-run policy check after edit
    setIsRecheckingPolicy(true);
    setIsPolicyModalOpen(true);

    // Give state a tick to update
    setTimeout(() => {
      setExpenses((current) => {
        const updated = current.map((e) =>
          e.id === expenseId
            ? {
                ...e,
                name: data.name,
                amount: data.amount,
                merchantName: data.merchantName,
                category: data.category,
                description: data.description,
                policyViolations: null,
                ...(newReceipt !== undefined && { receiptImage: newReceipt }),
              }
            : e
        );
        const newViolations = runPolicyEngine(updated, categories);
        setPolicyViolations(newViolations);
        setIsRecheckingPolicy(false);

        if (newViolations.length === 0) {
          setIsPolicyModalOpen(false);
          // All clear — submit
          doSubmit(pendingSubmitStatus!, {});
        }

        return updated;
      });
    }, 300);
  };

  const extractBase64 = (dataUrl: string): string => {
    if (!dataUrl || typeof dataUrl !== "string") return "";
    if (!dataUrl.startsWith("data:")) return dataUrl.trim();
    const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
    if (match?.[1]) return match[1].trim();
    const idx = dataUrl.indexOf(",");
    return idx !== -1 ? dataUrl.substring(idx + 1).trim() : "";
  };

  const doSubmit = async (status: "draft" | "pending", justifications: Record<string, string>) => {
    const invalid = expenses.filter((e) => !e.name || !e.category);
    if (invalid.length > 0) { toast.error("Please complete all required fields for each expense"); return; }

    setIsSubmitting(true);
    try {
      const expensesPayload = expenses.map((expense) => {
        const category = categories.find((c) => c.name === expense.category);
        if (!category) throw new Error(`Category not found: ${expense.category}`);
        const justificationValue = justifications[expense.id] || expense.justification;
        const payload: Record<string, unknown> = {
          title: expense.name,
          merchantName: expense.merchantName || "",
          description: expense.description || "",
          expenseCategoryId: category.categoryId,
          amount: expense.amount,
          transactionDate: expense.transactionDate
            ? new Date(expense.transactionDate).toISOString()
            : new Date().toISOString(),
          // Only include justification if it has an actual value — sending undefined/null
          // causes the backend policy check pipeline to crash with a null read error.
          ...(justificationValue ? { justification: justificationValue } : {}),
        };
        if (expense.receiptImage?.startsWith("data:")) {
          const b64 = extractBase64(expense.receiptImage);
          if (b64) payload.receiptImage = b64;
        }
        return payload;
      });

      const finalPayload = { reportTitle, status: status === "pending" ? "pending_policy_check" : status, expenses: expensesPayload };
      logger.log("[doSubmit] Final payload being sent:", finalPayload);
      await axios.post(API_KEYS.EXPENSE.REPORTS, finalPayload);

      toast.success(status === "draft" ? "Report saved as draft" : "Report submitted successfully!");
      if (status === "pending") notifySetupGuide("report");
      queryClient.invalidateQueries({ queryKey: [API_KEYS.EXPENSE.PERSONAL_EXPENSES] });

      setTimeout(() => {
        const tab = sessionStorage.getItem("expensesReturnTab") || "personal-expenses";
        const page = sessionStorage.getItem("expensesReturnPage") || "1";
        router.push(`/expenses?tab=${tab}&page=${page}`);
      }, 500);
    } catch (error: unknown) {
      logger.error("Error submitting report:", error);

      if (isPolicyViolationError(error)) {
        const causes = getPolicyViolationCauses(error);
        if (causes.length > 0) {
          setExpenses((prev) =>
            prev.map((exp) => {
              const matchedCause = causes.find(
                (c) =>
                  c.categoryName === exp.category &&
                  Number(c.expenseAmount) === exp.amount
              );

              if (matchedCause?.violations && matchedCause.violations.length > 0) {
                return {
                  ...exp,
                  policyViolations: matchedCause.violations.map((v) => ({
                    type: v.type || "POLICY_RULE",
                    message: v.message ?? "",
                  })),
                };
              }
              return exp;
            })
          );
          toast.error("Some expenses violated policy rules. Please review them.");
          return;
        }
      }

      toast.error(getApiErrorMessage(error, "Failed to submit report"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const selectedExpense = expenses.find((e) => e.id === selectedExpenseId) ?? null;
  const selectedReceipt = expenses.find((e) => e.id === selectedReceiptId);
  const isEmpty = expenses.length === 0;

  const hasUnresolvedViolations = expenses.some((e) => e.policyViolations && e.policyViolations.length > 0);

  if (isLoadingCategories) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b">
        <span className="inline-block border border-border rounded-md px-3 py-1 text-sm font-semibold text-foreground bg-white">
          {reportTitle}
        </span>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => runPolicyAndSubmit("draft")}
            disabled={isSubmitting || isEmpty}
            className={
              (isSubmitting || isEmpty)
                ? "bg-gray-100 text-gray-400 border border-gray-200 rounded-lg h-11 px-8 text-sm font-medium cursor-not-allowed"
                : "bg-white border border-primary text-primary hover:bg-primary/10 rounded-lg h-11 px-8 text-sm font-medium"
            }
          >
            {isSubmitting ? "Saving..." : "Save as Draft"}
          </Button>
          <Button
            onClick={() => runPolicyAndSubmit("pending")}
            disabled={isSubmitting || isEmpty || hasUnresolvedViolations}
            className={
              (isSubmitting || isEmpty || hasUnresolvedViolations)
                ? "bg-gray-100 text-gray-400 border border-gray-100 rounded-lg h-11 px-8 text-sm font-medium cursor-not-allowed"
                : "bg-primary border border-primary text-white hover:bg-primary/90 rounded-lg h-11 px-8 text-sm font-medium"
            }
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </div>

      {/* ── Main layout: Preview (60%) | Scan/Form (40%) ── */}
      <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Left: Preview list — 60% */}
        <div className="w-[60%] min-w-0 overflow-y-auto pr-4">
          <ExpensePreviewList
            expenses={expenses}
            total={total}
            onEditName={handleEditName}
            onViewDetails={handleViewDetails}
            onViewReceipt={handleViewReceipt}
            onDelete={handleDelete}
          />
        </div>

        {/* Right: Scan / Manual form — 40% */}
        <div className="w-[40%] min-w-0 overflow-y-auto pl-2 pr-4">
          <ReceiptUploadSection
            categories={categories}
            onReceiptsUpload={handleReceiptsUpload}
            onAddExpense={handleAddExpense}
          />
        </div>
      </div>



      {/* ── Modals ── */}

      {/* View/edit expense detail (eye icon → read-only; policy edit → editable) */}
      <ExpenseDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setSelectedExpenseId(null); }}
        expense={selectedExpense}
        categories={categories}
        onSave={detailModalReadOnly ? handleSaveExpense : handleSaveExpenseFromPolicy}
        readOnly={detailModalReadOnly}
      />

      {/* Receipt preview */}
      <ReceiptPreviewModal
        isOpen={isReceiptModalOpen}
        onClose={() => { setIsReceiptModalOpen(false); setSelectedReceiptId(null); }}
        receiptImage={selectedReceipt?.receiptImage || ""}
        onChangeReceipt={handleChangeReceipt}
      />

      {/* Policy check */}
      <PolicyCheckModal
        isOpen={isPolicyModalOpen}
        onClose={() => { setIsPolicyModalOpen(false); setPendingSubmitStatus(null); }}
        violations={policyViolations}
        onProceedWithWarnings={handlePolicyContinue}
        onEditExpense={handlePolicyEditExpense}
        isRechecking={isRecheckingPolicy}
      />

      {/* Processing overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-sm">Processing receipts...</span>
          </div>
        </div>
      )}
    </div>
  );
}
