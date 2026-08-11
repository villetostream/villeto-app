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
import { type ExpenseDetailFormData, type SplitParticipant } from "@/components/expenses/new-report/ExpenseForm";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { logger } from "@/lib/logger";
import { notifySetupGuide } from "@/lib/setupGuideEvents";
import {
  getApiErrorMessage,
  isPolicyViolationError,
  isDuplicateReceiptError,
  getDuplicateReceipts,
  applyPolicyViolationErrorToExpenses,
  mapDuplicateReceiptsToExpenses,
  getPolicyExpenseResults,
} from "@/lib/types/api-error";
import { invalidatePersonalExpenseQueries } from "@/lib/react-query/expenses";
import {
  dataUrlToFile,
  extractedReceiptValues,
  type ReceiptExtraction,
  uploadAndExtractReceipt,
} from "@/lib/receipt-extraction";

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
      timeframe?: string;
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


interface ExpenseDetail {
  id: string;
  name: string;
  category: string;
  amount: number;
  merchantName?: string;
  transactionDate?: string;
  description?: string;
  receiptImage?: string;
  receiptExtractionId?: string;
  policyViolations?: { type: string; message: string; ruleType?: string; limitChecks?: any[] }[] | null;
  justification?: string;
}

// ─── Humanize backend receipt policy messages ────────────────────────────────
/** Converts the backend's raw receipt policy message into plain English for users.
 *  e.g. 'A receipt is required for "Utilities" expenses of 5000 or more. This expense is 5500.'
 *  becomes: 'Receipt Required: Your expense of 5,500 exceeds the 5,000 receipt threshold for the Utilities category. Please attach a receipt.'
 */
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

// ─── Local Policy Engine (best-effort hint only — backend is authoritative) ──
function checkExpenseAgainstPolicies(
  expense: ExpenseItem,
  categoryMeta: ExpenseCategory | undefined
): PolicyViolation | null {
  if (!categoryMeta?.policies || !Array.isArray(categoryMeta.policies) || categoryMeta.policies.length === 0) return null;

  for (const policy of categoryMeta.policies) {
    const rules = Array.isArray(policy.rules) ? policy.rules : [];
    for (const rule of rules) {
      // Only check per_transaction rules locally — daily/weekly/monthly/yearly
      // require historical spend data that only the backend has.
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
                ? `Receipt Required: Your expense of ${expense.amount.toLocaleString()} exceeds the ${rule.currency ?? ""}${rule.requiredAboveAmount.toLocaleString()} receipt threshold for the ${expense.category} category. Please attach a receipt.`
                : `Receipt Recommended: Your expense of ${expense.amount.toLocaleString()} exceeds the ${rule.currency ?? ""}${rule.requiredAboveAmount.toLocaleString()} receipt threshold for the ${expense.category} category. Please consider attaching a receipt.`,
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

/** Build a fresh PolicyCheckResult[] from current expenses state.
 *  Hard blocks: always included.
 *  Soft warns: only included if the expense has no justification saved yet.
 */
function deriveFreshViolations(expenses: ExpenseItem[]): PolicyCheckResult[] {
  const results: PolicyCheckResult[] = [];
  for (const expense of expenses) {
    if (!expense.policyViolations || expense.policyViolations.length === 0) continue;
    for (const v of expense.policyViolations) {
      const isHardBlock = v.type === "hard_block" || v.type === "block";
      const isSoftWarn = v.type === "soft_warning" || v.type === "soft_warn";
      if (isHardBlock || isSoftWarn) {
        results.push({
          expenseId: expense.id,
          expenseName: expense.name,
          violation: v,
          justification: expense.justification,
        });
        break; // one entry per expense is enough
      }
    }
  }
  return results;
}
// ─────────────────────────────────────────────────────────────────────────────

export default function NewReportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const axios = useAxios();
  const queryClient = useQueryClient();

  const initialTitle = searchParams.get("name") || "New Report";
  const [reportTitle, setReportTitle] = useState(initialTitle);

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  // Modal states
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailModalReadOnly, setDetailModalReadOnly] = useState(true);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  // Policy check modal
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isRecheckingPolicy, setIsRecheckingPolicy] = useState(false);
  // Pending submit action (we run policy then proceed)
  const [pendingSubmitStatus, setPendingSubmitStatus] = useState<"draft" | "pending" | null>(null);

  // Tracks backend-requested actions so we know exactly when we're allowed to send justifications
  const [requiredActionsByExpenseId, setRequiredActionsByExpenseId] = useState<Record<string, any>>({});

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
  const handleReceiptsUpload = (receipts: ReceiptExtraction[], isSplit?: boolean) => {
      const currentNames = [...expenses.map((expense) => expense.name)];
      const newExpenses: ExpenseItem[] = receipts.map((receipt, index) => {
        const extracted = extractedReceiptValues(receipt);
        let name = extracted.merchantName;
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
          id: `expense-${Date.now()}-${index}`,
          name,
          category: "",
          amount: extracted.amount,
          receiptImage: receipt.receiptUrl,
          receiptExtractionId: receipt.expenseReceiptExtractionId,
          merchantName: extracted.merchantName,
          transactionDate: extracted.transactionDate,
          fileName: receipt.filename,
          isSplit: !!isSplit,
        };
      });
      setExpenses((prev) => [...prev, ...newExpenses]);
      toast.success(`${receipts.length} receipt(s) scanned successfully`);
  };

  const handleAddExpense = (
    data: ExpenseDetailFormData,
    receiptImage?: string,
    isSplit?: boolean,
    splitData?: { participants: SplitParticipant[]; allocationMode: "equal" | "manual"; allocations: Record<string, string> },
    receiptExtractionId?: string,
  ) => {
    // Prevent duplicate expense names (case-insensitive)
    const isDuplicate = expenses.some(
      (e) => e.name.trim().toLowerCase() === data.name.trim().toLowerCase()
    );
    if (isDuplicate) {
      toast.error(`An expense named "${data.name}" already exists in this report.`);
      return;
    }

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
        receiptExtractionId,
        transactionDate: data.transactionDate ?? new Date(),
        isSplit: !!isSplit,
        ...(splitData && {
          splitParticipants: splitData.participants,
          splitAllocationMode: splitData.allocationMode,
          splitAllocations: splitData.allocations,
        }),
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

  const handleSaveExpense = async (
    expenseId: string,
    data: ExpenseDetailFormData,
    newReceipt?: string,
    justification?: string,
    splitData?: { participants: SplitParticipant[]; allocationMode: "equal" | "manual"; allocations: Record<string, string> }
  ) => {
    let resolvedReceipt = newReceipt;
    let replacementExtractionId: string | undefined;
    if (newReceipt?.startsWith("data:")) {
      try {
        const extraction = await uploadAndExtractReceipt(
          axios,
          dataUrlToFile(newReceipt, `receipt-${Date.now()}.jpg`),
        );
        resolvedReceipt = extraction.receiptUrl;
        replacementExtractionId = extraction.expenseReceiptExtractionId;
      } catch (error) {
        logger.error("Replacement receipt extraction failed:", error);
        toast.warning("Receipt attached, but its details could not be read automatically.");
      }
    }
    // Check if amount, category, or receipt changed BEFORE updating state (while old value is still in closure)
    const currentExpense = expenses.find((e) => e.id === expenseId);
    const amountOrCategoryChanged = !!(currentExpense &&
      (
        currentExpense.amount !== data.amount ||
        currentExpense.category !== data.category ||
        (resolvedReceipt !== undefined && resolvedReceipt !== currentExpense.receiptImage) // receipt added or replaced
      ));

    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== expenseId) return e;
        return {
          ...e,
          name: data.name,
          amount: data.amount,
          merchantName: data.merchantName,
          category: data.category,
          description: data.description,
          policyViolations: null, // Clear so the alert icon disappears
          // Keep existing justification unless a new one is explicitly provided
          justification: justification !== undefined ? justification : e.justification,
          ...(resolvedReceipt !== undefined && {
            receiptImage: resolvedReceipt,
            receiptExtractionId: replacementExtractionId,
          }),
          ...(splitData && {
            splitParticipants: splitData.participants,
            splitAllocationMode: splitData.allocationMode,
            splitAllocations: splitData.allocations,
          }),
        };
      })
    );

    if (amountOrCategoryChanged) {
      setRequiredActionsByExpenseId((prev) => {
        const next = { ...prev };
        delete next[expenseId];
        return next;
      });
    }

    toast.success("Expense updated");
  };


  const handleChangeReceipt = async (newReceipt: string) => {
    if (selectedReceiptId) {
      let resolvedReceipt = newReceipt;
      let receiptExtractionId: string | undefined;
      if (newReceipt.startsWith("data:")) {
        try {
          const extraction = await uploadAndExtractReceipt(
            axios,
            dataUrlToFile(newReceipt, `receipt-${Date.now()}.jpg`),
          );
          resolvedReceipt = extraction.receiptUrl;
          receiptExtractionId = extraction.expenseReceiptExtractionId;
        } catch (error) {
          logger.error("Receipt replacement extraction failed:", error);
          toast.warning("Receipt updated, but its details could not be read automatically.");
        }
      }
      setExpenses((prev) =>
        prev.map((expense) =>
          expense.id === selectedReceiptId
            ? {
                ...expense,
                receiptImage: resolvedReceipt,
                receiptExtractionId,
              }
            : expense,
        )
      );
      toast.success("Receipt updated");
    }
  };

  // ── Policy + Submit flow ──────────────────────────────────────────────────
  const runPolicyAndSubmit = async (status: "draft" | "pending") => {
    try {
      logger.log("[runPolicyAndSubmit] Triggered with status:", status);

      if (expenses.length === 0) { toast.error("Please add at least one expense"); return; }

      if (status === "pending") {
        // Only clear stale policyViolations (UI banners), NOT justifications or requiredActions.
        // If the user already added a justification after a previous ACTION_REQUIRED response,
        // we must keep it so the next submit correctly sends it to the backend.
        const preparedExpenses = expenses.map((e) => ({
          ...e,
          policyViolations: null,
        }));
        setExpenses(preparedExpenses);

        // Run local policy engine as a best-effort pre-check hint.
        // This only catches per_transaction rules — backend is authoritative.
        const localViolations = runPolicyEngine(preparedExpenses, categories);

        if (localViolations.length > 0) {
          setExpenses(preparedExpenses.map((exp) => {
            const match = localViolations.find((v) => v.expenseId === exp.id);
            return match ? { ...exp, policyViolations: [match.violation] } : exp;
          }));
          setPendingSubmitStatus(status);
          setIsPolicyModalOpen(true);
          return;
        }

        // No local violations — go straight to backend
        await doSubmit(status, {}, preparedExpenses);
        return;
      }

      // Draft — submit directly
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
    newReceipt?: string,
    justification?: string
  ) => {
    await handleSaveExpense(expenseId, data, newReceipt, justification);
    setIsDetailModalOpen(false);
    setSelectedExpenseId(null);
    // Note: We no longer auto-submit here. The user will be returned to the report view
    // so they can edit other expenses before manually clicking "Submit Report" again.
  };

  const extractBase64 = (dataUrl: string): string => {
    if (!dataUrl || typeof dataUrl !== "string") return "";
    if (!dataUrl.startsWith("data:")) return dataUrl.trim();
    const match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
    if (match?.[1]) return match[1].trim();
    const idx = dataUrl.indexOf(",");
    return idx !== -1 ? dataUrl.substring(idx + 1).trim() : "";
  };

  const doSubmit = async (
    status: "draft" | "pending",
    justifications: Record<string, string>,
    overrideExpenses?: typeof expenses,
    overrideRequiredActions?: Record<string, any>,
    retryCount = 0
  ) => {
    const activeExpenses = overrideExpenses ?? expenses;
    const invalid = activeExpenses.filter((e) => !e.name || !e.category);
    if (invalid.length > 0) { toast.error("Please complete all required fields for each expense"); return; }

    setIsSubmitting(true);
    try {
      const expensesPayload = activeExpenses.map((expense) => {
        const category = categories.find((c) => c.name === expense.category);
        if (!category) throw new Error(`Category not found: ${expense.category}`);

        // Justification: use the one from the modal or the one already saved on the expense.
        const justificationValue = justifications[expense.id] || expense.justification;
        const action = (overrideRequiredActions || requiredActionsByExpenseId)[expense.id];
        // Needs policyJustification if the backend explicitly requested it
        const isJustificationRequired = action?.requiredFields?.includes("policyJustification") || action?.requiredFields?.includes("justification");
        // Needs a receipt if the backend requires receiptUrl
        const isReceiptRequired = action?.requiredFields?.includes("receiptUrl");
        const isActionRequired = isJustificationRequired || isReceiptRequired;

        const isSplit = !!expense.isSplit;
        const expenseType = isSplit ? "split" : "individual";

        // Build splitAllocations payload: [{userId, amount}] per backend spec
        let splitAllocations: { userId: string; amount: number }[] | undefined;
        if (isSplit && expense.splitParticipants && expense.splitParticipants.length > 0) {
          if (expense.splitAllocationMode === "equal") {
            const perPersonStr = (expense.amount / expense.splitParticipants.length).toFixed(2);
            const perPerson = parseFloat(perPersonStr);
            const lastIndex = expense.splitParticipants.length - 1;
            const nonLastTotal = perPerson * lastIndex;
            const autoLast = Math.max(0, expense.amount - nonLastTotal);

            splitAllocations = expense.splitParticipants.map((p, idx) => ({
              userId: p.userId,
              amount: idx === lastIndex ? parseFloat(autoLast.toFixed(2)) : perPerson,
            }));
          } else if (expense.splitAllocations) {
            // Manual: compute the last participant's auto-filled amount
            const lastIndex = expense.splitParticipants.length - 1;
            const nonLastTotal = expense.splitParticipants
              .slice(0, lastIndex)
              .reduce((sum, p) => sum + (parseFloat(expense.splitAllocations![p.userId] ?? "") || 0), 0);
            const autoLast = Math.max(0, expense.amount - nonLastTotal);

            splitAllocations = expense.splitParticipants.map((p, idx) => ({
              userId: p.userId,
              amount:
                idx === lastIndex
                  ? parseFloat(autoLast.toFixed(2))
                  : parseFloat(parseFloat(expense.splitAllocations![p.userId] ?? "0").toFixed(2)),
            }));
          }
        }

        const payload: Record<string, unknown> = {
          title: expense.name,
          merchantName: expense.merchantName || "",
          description: expense.description || "",
          expenseCategoryId: category.categoryId,
          amount: expense.amount,
          expenseType,
          transactionDate: expense.transactionDate
            ? new Date(expense.transactionDate).toISOString()
            : new Date().toISOString(),
          // ONLY attach policyJustification if the backend explicitly requested it AND we have a value
          ...(justificationValue && isActionRequired ? { policyJustification: justificationValue } : {}),
          ...(splitAllocations ? { splitAllocations } : {}),
        };
        if (expense.receiptImage?.startsWith("data:")) {
          const b64 = extractBase64(expense.receiptImage);
          if (b64) payload.receiptImage = b64;
        }
        if (expense.receiptExtractionId) {
          payload.receiptExtractionId = expense.receiptExtractionId;
        }
        return payload;
      });

      let finalPayload: any;
      if (status === "draft") {
        finalPayload = { reportTitle, expenses: expensesPayload };
        if (draftId) finalPayload.draftId = draftId;
        logger.log("[doSubmit] Final payload being sent to draft endpoint:", finalPayload);
        const res = await axios.post("reports/draft", finalPayload);
        const returnedId = res.data?.data?.reportId || res.data?.data?.id || res.data?.data?.draftId;
        if (returnedId) {
          setDraftId(returnedId);
        }
      } else {
        finalPayload = { reportTitle, expenses: expensesPayload };
        if (draftId) finalPayload.draftId = draftId;
        logger.log("[doSubmit] Final payload being sent to manual reports endpoint:", finalPayload);
        const res = await axios.post(API_KEYS.EXPENSE.REPORTS, finalPayload);

        // ── Check if the policy engine requires ACTION_REQUIRED (201 but not submitted) ──
        const responseData = res.data?.data;
        if (responseData?.submitted === false && responseData?.resolution === "ACTION_REQUIRED") {
          const requiredActions = Array.isArray(responseData.requiredActions) ? responseData.requiredActions : [];
          // Build a lookup of enforcement action per expense index from the warnings array
          // warnings[].enforcementAction is the authoritative source (soft_warn vs block)
          const warningsByIndex: Record<number, any> = {};
          (Array.isArray(responseData.warnings) ? responseData.warnings : []).forEach((w: any) => {
            (Array.isArray(w.affectedExpenseIndexes) ? w.affectedExpenseIndexes : []).forEach((idx: number) => {
              // If multiple warnings affect the same index, prefer the stricter one
              const existing = warningsByIndex[idx];
              const isHardNew = w.enforcementAction === "block" || w.enforcementAction === "hard_block";
              const isHardExisting = existing?.enforcementAction === "block" || existing?.enforcementAction === "hard_block";
              if (!existing || (isHardNew && !isHardExisting)) {
                warningsByIndex[idx] = w;
              }
            });
          });

          if (requiredActions.length > 0) {
            // Track which expenses exactly need justification according to the backend
            const newRequiredActions: Record<string, any> = { ...requiredActionsByExpenseId };
            let allRequiredHaveJustification = true;

            // 1. Process requiredActions synchronously to evaluate auto-retry
            requiredActions.forEach((action: any) => {
              const exp = activeExpenses[action.expenseIndex];
              if (exp) {
                newRequiredActions[exp.id] = action;
                // Determine enforcement level from the warnings array (authoritative)
                const warning = warningsByIndex[action.expenseIndex];
                const enforcementAction = warning?.enforcementAction ?? "soft_warn";
                const isHardBlock = enforcementAction === "block" || enforcementAction === "hard_block";

                const needsJustification = action.requiredFields?.includes("policyJustification") || action.requiredFields?.includes("justification");
                // Only treat receipt as blocking auto-retry if it's a hard_block enforcement
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
            
            // 2. If we have all required justifications locally, auto-retry immediately
            if (allRequiredHaveJustification && retryCount === 0) {
              return doSubmit(status, justifications, activeExpenses, newRequiredActions, retryCount + 1);
            }

            // 3. Otherwise, update UI state to show the modal
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
            // Only open the modal if there's actually something to show
            const hasPendingWarnings = Object.keys(newRequiredActions).length > 0;
            if (hasPendingWarnings) {
              setIsPolicyModalOpen(true);
            }
            return; // Stop here, wait for user justification
          }
        }
      }

      toast.success(status === "draft" ? "Report saved as draft" : "Report submitted successfully!");
      if (status === "pending") notifySetupGuide("report");
      invalidatePersonalExpenseQueries(queryClient);

      if (status === "pending") {
        setTimeout(() => {
          const tab = sessionStorage.getItem("expensesReturnTab") || "personal-expenses";
          const page = sessionStorage.getItem("expensesReturnPage") || "1";
          router.push(`/expenses?tab=${tab}&page=${page}`);
        }, 500);
      }
    } catch (error: unknown) {
      logger.error("Error submitting report:", error);

      if (isDuplicateReceiptError(error)) {
        const message = getApiErrorMessage(error, "This receipt appears to have been submitted previously");
        const duplicates = getDuplicateReceipts(error);
        setExpenses((prev) => mapDuplicateReceiptsToExpenses(prev, duplicates, message));
        toast.error(message);
        return;
      }

      if (isPolicyViolationError(error)) {
        // Apply violations to expenses from the backend error response
        setExpenses((prev) => {
          const updated = applyPolicyViolationErrorToExpenses(prev, error);

          // ── KEY FIX: Parse backend policy results and open the modal immediately ──
          const expenseResults = getPolicyExpenseResults(error);
          if (expenseResults.length > 0) {
            // Build PolicyCheckResult[] from the error response
            const freshViolations: PolicyCheckResult[] = [];
            // Also build requiredActionsByExpenseId for soft_warn expenses so that
            // the next submit correctly includes policyJustification in the payload
            // even if the user resolves the warning inline (not through the modal).
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
                    limitChecks: (v as any).limitChecks, // type assertion since PolicyViolationItem has it
                  },
                  justification: exp.justification,
                });
                // For soft warnings, mark the expense as requiring policyJustification
                // so the next submit payload includes it (even if user bypasses the modal)
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
              setRequiredActionsByExpenseId((prev) => ({ ...prev, ...newRequiredActions }));
            }

            if (freshViolations.length > 0) {
              setPendingSubmitStatus("pending");
              setIsPolicyModalOpen(true);
            }
          }

          return updated;
        });

        toast.error("Some expenses violated policy rules. Please review the highlighted items.");
        return;
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

  // Fresh violations derived from expenses state — this is the authoritative source
  // passed to the policy modal. Replaces stale policyViolations snapshot state.
  const freshViolations = deriveFreshViolations(expenses);

  const hasHardBlocks = freshViolations.some(
    (v) => v.violation.type === "hard_block" || v.violation.type === "block"
  );
  const hasSoftWarnsNeedingJustification = freshViolations.some(
    (v) => (v.violation.type === "soft_warning" || v.violation.type === "soft_warn") && !v.justification?.trim()
  );

  // Submit button behaviour:
  // - Hard block present → "Fix Violations" (red, still clickable to open modal and show what's wrong)
  // - Soft warn needing justification → "Resolve Warnings" (amber, opens modal)
  // - Otherwise → "Submit Report" (primary, proceeds)
  const submitButtonState: "fix" | "resolve" | "submit" =
    hasHardBlocks ? "fix" : hasSoftWarnsNeedingJustification ? "resolve" : "submit";

  if (isLoadingCategories) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="w-full p-4 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 mb-4 border-b">
        <div className="relative inline-grid items-center group w-full md:w-auto">
          {/* Hidden span dictates the width of the grid container based on text length */}
          <span className="col-start-1 row-start-1 invisible whitespace-pre pl-3 pr-8 py-1 text-sm font-semibold">
            {reportTitle || "Enter report name"}
          </span>
          <input
            type="text"
            value={reportTitle}
            onChange={(e) => {
              const val = e.target.value;
              setReportTitle(val);
              const url = new URL(window.location.href);
              if (val) url.searchParams.set("name", val);
              else url.searchParams.delete("name");
              window.history.replaceState(null, "", url.toString());
            }}
            placeholder="Enter report name"
            className="col-start-1 row-start-1 w-full min-w-0 border border-black/[0.08] rounded-[8px] pl-3 pr-8 py-1 text-[13px] font-semibold text-[#0b100e] bg-white hover:border-gray-400 focus:border-[#087f70] focus:ring-1 focus:ring-[#087f70] outline-none transition-all"
            title="Edit report name"
          />
          <Pencil className="absolute right-2.5 w-3.5 h-3.5 text-muted-foreground opacity-60 pointer-events-none" />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => runPolicyAndSubmit("draft")}
            disabled={isSubmitting || isEmpty}
            className={
              (isSubmitting || isEmpty)
                ? "bg-[#f9faf9] text-[#84908a] border border-black/[0.08] rounded-[8px] h-10 px-6 text-[13px] font-semibold cursor-not-allowed"
                : "bg-white border border-[#087f70] text-[#087f70] hover:bg-[#f0faf8] rounded-[8px] h-10 px-6 text-[13px] font-semibold transition-colors"
            }
          >
            {isSubmitting ? "Saving..." : "Save as Draft"}
          </button>
          <button
            onClick={() => {
              if (submitButtonState === "submit") {
                runPolicyAndSubmit("pending");
              } else {
                setPendingSubmitStatus("pending");
                setIsPolicyModalOpen(true);
              }
            }}
            disabled={isSubmitting || isEmpty}
            className={
              (isSubmitting || isEmpty)
                ? "bg-[#f9faf9] text-[#84908a] border border-black/[0.08] rounded-[8px] h-10 px-6 text-[13px] font-semibold cursor-not-allowed"
                : submitButtonState === "fix"
                  ? "bg-[#d33d44] border border-[#d33d44] text-white hover:bg-[#c33339] rounded-[8px] h-10 px-6 text-[13px] font-semibold shadow-sm transition-colors"
                  : submitButtonState === "resolve"
                    ? "bg-[#b27b00] border border-[#b27b00] text-white hover:bg-[#966800] rounded-[8px] h-10 px-6 text-[13px] font-semibold shadow-sm transition-colors"
                    : "bg-[#087f70] border border-[#087f70] text-white hover:bg-[#076b5e] rounded-[8px] h-10 px-6 text-[13px] font-semibold shadow-sm transition-colors"
            }
          >
            {isSubmitting
              ? "Submitting..."
              : submitButtonState === "fix"
                ? "Fix Violations"
                : submitButtonState === "resolve"
                  ? "Resolve Warnings"
                  : "Submit Report"}
          </button>
        </div>
      </div>

      {/* ── Main layout: Preview (60%) | Scan/Form (40%) ── */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Left: Preview list — 60% */}
        <div className="w-full lg:w-[60%] min-w-0 lg:overflow-y-auto lg:pr-4">
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
        <div className="w-full lg:w-[40%] min-w-0 lg:overflow-y-auto lg:pl-2 lg:pr-4">
          <ReceiptUploadSection
            categories={categories}
            onReceiptsUpload={handleReceiptsUpload}
            onAddExpense={handleAddExpense}
            existingExpenseNames={expenses.map((e) => e.name)}
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
        existingExpenseNames={expenses.map((e) => e.name)}
        isJustificationRequired={!!(selectedExpense && (requiredActionsByExpenseId[selectedExpense.id]?.requiredFields?.includes("policyJustification") || requiredActionsByExpenseId[selectedExpense.id]?.requiredFields?.includes("justification")))}
      />

      {/* Receipt preview */}
      <ReceiptPreviewModal
        isOpen={isReceiptModalOpen}
        onClose={() => { setIsReceiptModalOpen(false); setSelectedReceiptId(null); }}
        receiptImage={selectedReceipt?.receiptImage || ""}
        onChangeReceipt={handleChangeReceipt}
      />

      {/* Policy check — always uses freshViolations derived from expenses state */}
      <PolicyCheckModal
        isOpen={isPolicyModalOpen}
        onClose={() => { setIsPolicyModalOpen(false); setPendingSubmitStatus(null); }}
        violations={freshViolations}
        onProceedWithWarnings={handlePolicyContinue}
        onEditExpense={handlePolicyEditExpense}
        isRechecking={isRecheckingPolicy}
      />

    </div>
  );
}
