"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ExpenseForm, type ExpenseDetailFormData, type SplitParticipant } from "./ExpenseForm";
import { normalizeReceiptSrc, hasReceiptSrc } from "@/lib/utils/receipt-image";
import { AlertTriangle, XCircle } from "lucide-react";
import { logger } from "@/lib/logger";
import { useAuthStore } from "@/stores/auth-stores";

interface ExpenseCategory {
  categoryId: string;
  name: string;
}

interface PolicyViolationEntry {
  type: string;
  message: string;
  ruleType?: string;
  limitChecks?: any[];
  actionText?: string;
}

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: {
    id: string;
    name: string;
    amount: number;
    merchantName?: string;
    category: string;
    description?: string;
    receiptImage?: string;
    transactionDate?: Date;
    policyViolations?: PolicyViolationEntry[] | null;
    justification?: string;
    isSplit?: boolean;
    splitParticipants?: SplitParticipant[];
    splitAllocationMode?: "equal" | "manual";
    /** Keyed by userId */
    splitAllocations?: Record<string, string>;
  } | null;
  categories: ExpenseCategory[];
  onSave: (
    expenseId: string,
    data: ExpenseDetailFormData,
    newReceipt?: string,
    justification?: string,
    splitData?: { participants: SplitParticipant[]; allocationMode: "equal" | "manual"; allocations: Record<string, string> }
  ) => void;
  readOnly?: boolean;
  /** Names of expenses already added to the report — used to prevent duplicates */
  existingExpenseNames?: string[];
  /** Whether the backend requires a justification for this expense */
  isJustificationRequired?: boolean;
}

export function ExpenseDetailModal({
  isOpen,
  onClose,
  expense,
  categories,
  onSave,
  readOnly: _readOnly = true,
  existingExpenseNames = [],
  isJustificationRequired = false,
}: ExpenseDetailModalProps) {
  const getCurrencySymbol = useAuthStore((state) => state.getCurrencySymbol);
  const currencySymbol = getCurrencySymbol();
  const [receiptImage, setReceiptImage] = useState("");
  const [pendingReceipt, setPendingReceipt] = useState<string | null>(null);
  const [inlineJustification, setInlineJustification] = useState("");
  const [isFormDirty, setIsFormDirty] = useState(false);

  useEffect(() => {
    if (!expense) return;
    setReceiptImage(expense.receiptImage || "");
    setPendingReceipt(null);
    setInlineJustification(expense.justification || "");
    setIsFormDirty(false);
  }, [expense]);

  const initialData = useMemo(() => {
    if (!expense) return undefined;
    return {
      name: expense.name,
      amount: expense.amount,
      merchantName: expense.merchantName,
      category: expense.category,
      description: expense.description,
      receiptImage,
      transactionDate: expense.transactionDate,
      splitParticipants: expense.splitParticipants,
      splitAllocationMode: expense.splitAllocationMode,
      splitAllocations: expense.splitAllocations,
    };
  }, [expense, receiptImage]);

  if (!expense) return null;

  const displayReceipt = pendingReceipt ?? receiptImage;
  const hasReceipt = hasReceiptSrc(displayReceipt);

  // Classify violations
  const violations: PolicyViolationEntry[] = expense.policyViolations || [];
  const hardBlockViolations = violations.filter(
    (v) => v.type === "hard_block" || v.type === "block"
  );
  const softWarnViolations = violations.filter(
    (v) => v.type === "soft_warning" || v.type === "soft_warn"
  );
  const duplicateViolations = violations.filter(
    (v) => v.ruleType === "duplicate_receipt"
  );

  const hasHardBlock = hardBlockViolations.length > 0;
  const hasSoftWarn = softWarnViolations.length > 0;
  const showJustificationBox = (hasSoftWarn || isJustificationRequired || !!expense.justification) && !hasHardBlock;
  const hasDuplicate = duplicateViolations.length > 0;

  // fieldErrors intentionally empty — all messages are in the top banners
  const fieldErrors: { amount?: string[]; receiptImage?: string[] } = {};

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSideReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    try {
      const base64 = await fileToBase64(file);
      setPendingReceipt(base64);
    } catch (error) {
      logger.error("Error converting receipt:", error);
    } finally {
      e.target.value = "";
    }
  };

  const confirmSideReceipt = () => {
    if (!pendingReceipt) return;
    setReceiptImage(pendingReceipt);
    setPendingReceipt(null);
  };

  const cancelSideReceipt = () => {
    setPendingReceipt(null);
  };

  // Unique form ID so the footer's submit button can trigger the form
  const formId = `expense-detail-form-${expense.id}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="rounded-[14px] p-0 overflow-hidden gap-0 flex flex-col"
        style={{
          maxWidth: hasReceipt ? "820px" : "560px",
          maxHeight: "88vh",
        }}
        showCloseButton={false}
      >
        {/* ── Hidden accessible title ── */}
        <DialogTitle className="sr-only">{expense.name}</DialogTitle>

        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Left: form panel — flex column with sticky header + scrollable body + sticky footer ── */}
          <div className={`flex flex-col ${hasReceipt ? "flex-1 min-w-0" : "w-full"}`}>

            {/* Sticky title header */}
            <div className="shrink-0 px-6 pt-5 pb-3 border-b border-black/[0.06]">
              <h2 className="text-[15px] font-semibold text-[#0b100e] tracking-tight">{expense.name}</h2>
            </div>

            {/* Scrollable body: banners + form + inline justification */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">

              {/* ── Policy banners — ALL violation messages shown here, at the top ── */}

              {/* Duplicate receipt — always red */}
              {hasDuplicate && duplicateViolations.map((v, i) => (
                <div key={i} className="px-3 py-2.5 rounded-xl border bg-red-50 border-red-200 flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs font-medium text-red-700">{v.message}</p>
                </div>
              ))}

              {/* Hard block violations (excluding duplicate — already shown above) */}
              {hardBlockViolations
                .filter((v) => v.ruleType !== "duplicate_receipt")
                .map((v, i) => {
                  const lc = v.limitChecks?.[0];
                  const isReceipt = v.ruleType === "RECEIPT_REQUIRED" || v.ruleType === "RECEIPT_REQUIREMENT" || /receipt is required/i.test(v.message);
                  const isCategoryRestriction = v.ruleType === "CATEGORY_RESTRICTION" || v.ruleType === "CATEGORY_RESTRICTED";
                  const isDuplicate = v.ruleType === "DUPLICATE_RECEIPT" || v.ruleType === "duplicate_receipt";
                  const isApproval = v.ruleType === "APPROVAL_REQUIRED" || v.ruleType === "APPROVAL_THRESHOLD";
                  const timeLabel = lc?.timeUnit === "daily" ? "Today's" : lc?.timeUnit === "monthly" ? "This month's" : lc?.timeUnit === "weekly" ? "This week's" : "Period";
                  
                  const cleanRawMessage = (msg: string) => {
                    let c = msg;
                    c = c.replace(/\s*\([A-Z][a-z]+ [A-Z][a-z]+\)/g, '');
                    c = c.replace(/from\s+\d+\s+expenses?\s+in\s+the\s+same\s+\w+\s+[\w\s]+bucket,?\s*/gi, '');
                    c = c.replace(/\bNGN\s*/g, '₦');
                    return c;
                  };

                  let humanMsg = "";
                  let bottomActionMsg = "";

                  if (v.actionText && v.message) {
                    humanMsg = cleanRawMessage(v.message);
                    bottomActionMsg = v.actionText;
                  } else {
                    humanMsg = isReceipt
                      ? "A receipt is required for this expense. You won't be able to submit until a receipt is attached."
                      : isCategoryRestriction
                      ? "Your company's policy doesn't allow expenses in this category for your role. Please choose a different category."
                      : isDuplicate
                      ? "This receipt appears to have been submitted before. Please use a different receipt."
                      : isApproval
                      ? "This expense requires additional approval and cannot be submitted without it."
                      : lc
                      ? `This expense exceeds your ${lc.timeUnit} spending limit. Reduce the amount to continue.`
                      : cleanRawMessage(v.message);
                      
                    bottomActionMsg = isReceipt
                      ? "Upload a receipt to resolve this block before saving."
                      : "Adjust the expense details (e.g. reduce the amount) to resolve this block before saving.";
                  }
                  
                  return (
                  <div key={i} className="px-3 py-2.5 rounded-xl border bg-red-50 border-red-200 space-y-2">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-xs font-medium text-red-800">{humanMsg}</p>
                    </div>
                    {lc && (
                      <div className="rounded-lg bg-white border border-red-100 p-3 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">{timeLabel} limit</span>
                          <span className="font-semibold text-gray-900">{currencySymbol}{lc.limit?.toLocaleString()}</span>
                        </div>
                        {(lc.spentBeforeThisReport ?? 0) > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Already spent</span>
                            <span className="font-medium text-gray-700">{currencySymbol}{lc.spentBeforeThisReport?.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">This expense</span>
                          <span className="font-medium text-red-600">{currencySymbol}{lc.thisReportAmount?.toLocaleString()}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="h-2 rounded-full bg-red-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-red-500 transition-all"
                              style={{ width: `${Math.min(100, ((lc.totalAfterThisReport || 0) / (lc.limit || 1)) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-red-600 font-semibold">
                              {currencySymbol}{(lc.overage || 0).toLocaleString()} over limit
                            </span>
                            <span className="text-gray-400">
                              {currencySymbol}{lc.totalAfterThisReport?.toLocaleString()} / {currencySymbol}{lc.limit?.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-red-500">{bottomActionMsg}</p>
                  </div>
                )})}

              {/* Soft warn violations */}
              {softWarnViolations.map((v, i) => {
                const lc = v.limitChecks?.[0];
                const isReceipt = v.ruleType === "RECEIPT_REQUIRED" || v.ruleType === "RECEIPT_REQUIREMENT" || /receipt is required/i.test(v.message);
                const isCategoryRestriction = v.ruleType === "CATEGORY_RESTRICTION" || v.ruleType === "CATEGORY_RESTRICTED";
                const isApproval = v.ruleType === "APPROVAL_REQUIRED" || v.ruleType === "APPROVAL_THRESHOLD";
                const timeLabel = lc?.timeUnit === "daily" ? "Today's" : lc?.timeUnit === "monthly" ? "This month's" : lc?.timeUnit === "weekly" ? "This week's" : "Period";
                
                const cleanRawMessage = (msg: string) => {
                  let c = msg;
                  c = c.replace(/\s*\([A-Z][a-z]+ [A-Z][a-z]+\)/g, '');
                  c = c.replace(/from\s+\d+\s+expenses?\s+in\s+the\s+same\s+\w+\s+[\w\s]+bucket,?\s*/gi, '');
                  c = c.replace(/\bNGN\s*/g, '₦');
                  return c;
                };

                let humanMsg = "";
                let hasActionText = false;
                
                if (v.actionText && v.message) {
                  humanMsg = `${cleanRawMessage(v.message)} ${v.actionText}`;
                  hasActionText = true;
                } else {
                  humanMsg = isReceipt
                    ? "A receipt is requested for this expense. You can still save it without one, but you'll need to explain why when submitting."
                    : isCategoryRestriction
                    ? "This category has restrictions under your company's policy. Contact your manager for guidance."
                    : isApproval
                    ? "This expense requires additional approval. Please provide a justification when submitting."
                    : lc
                    ? `This expense goes over your ${lc.timeUnit} spending limit. You can still save it, but you'll need to explain why when submitting.`
                    : cleanRawMessage(v.message);
                }
                
                return (
                <div key={i} className="px-3 py-2.5 rounded-xl border bg-amber-50 border-amber-200 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs font-medium text-amber-800">{humanMsg}</p>
                  </div>
                  {lc && (
                    <div className="rounded-lg bg-white border border-amber-100 p-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">{timeLabel} limit</span>
                        <span className="font-semibold text-gray-900">{currencySymbol}{lc.limit?.toLocaleString()}</span>
                      </div>
                      {(lc.spentBeforeThisReport ?? 0) > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Already spent</span>
                          <span className="font-medium text-gray-700">{currencySymbol}{lc.spentBeforeThisReport?.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">This expense</span>
                        <span className="font-medium text-amber-700">{currencySymbol}{lc.thisReportAmount?.toLocaleString()}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-2 rounded-full bg-amber-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all"
                            style={{ width: `${Math.min(100, ((lc.totalAfterThisReport || 0) / (lc.limit || 1)) * 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-amber-600 font-semibold">
                            {currencySymbol}{(lc.overage || 0).toLocaleString()} over limit
                          </span>
                          <span className="text-gray-400">
                            {currencySymbol}{lc.totalAfterThisReport?.toLocaleString()} / {currencySymbol}{lc.limit?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )})}

              {/* ── Inline Justification — moved to the top, right under the warning! ── */}
              {showJustificationBox && (
                <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-3 mb-2">
                  <label className="text-xs font-semibold text-amber-900 block mb-1">
                    Policy Justification Required
                  </label>
                  <p className="text-xs text-amber-700/80 mb-2">
                    Provide a reason for exceeding the policy limit. Your approver will review this.
                  </p>
                  <Textarea
                    placeholder="Why is this expense above the standard limit?..."
                    value={inlineJustification}
                    onChange={(e) => setInlineJustification(e.target.value)}
                    className="text-xs min-h-[80px] resize-none border-amber-200 focus:border-amber-400 bg-white"
                  />
                </div>
              )}

              {/* ── Expense Form (actions hidden — we use the sticky footer instead) ── */}
              <ExpenseForm
                initialData={initialData}
                categories={categories}
                mode={expense.isSplit ? "split" : "individual"}
                onSave={(data, formReceiptImage, splitData) => {
                  const justificationToSave = showJustificationBox ? inlineJustification : undefined;
                  onSave(expense.id, data, formReceiptImage || receiptImage, justificationToSave, splitData);
                  onClose();
                }}
                onCancel={onClose}
                submitLabel="Save Update"
                cancelLabel="Cancel"
                fieldErrors={fieldErrors}
                hideReceiptUpload={hasReceipt}
                hideActions
                formId={formId}
                compact
                forceDisableSubmit={hasHardBlock && !isFormDirty}
                existingExpenseNames={existingExpenseNames}
                onDirtyChange={setIsFormDirty}
              />
            </div>

            {/* ── Sticky Footer ── */}
            <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-black/[0.06] bg-white">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-5 rounded-[8px] border border-black/[0.08] text-[#68726d] font-semibold text-[13px] hover:bg-[#f9faf9] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form={formId}
                disabled={hasHardBlock && !isFormDirty}
                className="h-10 px-5 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Update
              </button>
            </div>
          </div>

          {/* ── Right: receipt preview panel ── */}
          {hasReceipt && (
            <div className="w-72 shrink-0 border-l border-black/[0.06] bg-[#f9faf9] flex flex-col p-4 gap-3">
              <p className="text-[11px] font-semibold text-[#84908a] uppercase tracking-widest">Receipt</p>
              <div className="relative flex-1 min-h-[220px] max-h-[420px] rounded-[10px] overflow-hidden bg-white border border-black/[0.08]">
                <Image
                  src={normalizeReceiptSrc(displayReceipt)}
                  alt="Receipt"
                  fill
                  unoptimized
                  className="object-contain p-2"
                />
              </div>
              {pendingReceipt ? (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-muted-foreground">Confirm this receipt?</p>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" className="px-4" onClick={cancelSideReceipt}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" className="px-4" onClick={confirmSideReceipt}>
                      Use receipt
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    id="expense-detail-receipt-change"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSideReceiptChange}
                  />
                  <button
                    type="button"
                    className="w-full h-9 rounded-[8px] border border-black/[0.08] text-[13px] font-semibold text-[#68726d] hover:bg-[#f5f7f6] hover:text-[#0b100e] transition-colors"
                    onClick={() => document.getElementById("expense-detail-receipt-change")?.click()}
                  >
                    Change Receipt
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
