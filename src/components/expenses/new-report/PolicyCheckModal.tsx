"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, XCircle, CheckCircle, Loader2 } from "lucide-react";
import type { PolicyViolation } from "./ExpensePreviewList";
import { useAuthStore } from "@/stores/auth-stores";

export interface PolicyCheckResult {
  expenseId: string;
  expenseName: string;
  violation: PolicyViolation;
  justification?: string;
}

interface PolicyCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  violations: PolicyCheckResult[];
  /** Called when user fills all soft-warning justifications and wants to proceed */
  onProceedWithWarnings: (justifications: Record<string, string>) => void;
  /** Called when hard-block forces user to edit the expense */
  onEditExpense: (expenseId: string) => void;
  /** Whether we're currently re-running the policy check */
  isRechecking?: boolean;
}

export function PolicyCheckModal({
  isOpen,
  onClose,
  violations,
  onProceedWithWarnings,
  onEditExpense,
  isRechecking = false,
}: PolicyCheckModalProps) {
  const getCurrencySymbol = useAuthStore((state) => state.getCurrencySymbol);
  const currencySymbol = getCurrencySymbol();
  const [justifications, setJustifications] = useState<Record<string, string>>({});

  const hardBlocks = violations.filter(
    (v) => v.violation.type === "hard_block" || v.violation.type === "block"
  );
  const softWarnings = violations.filter(
    (v) =>
      v.violation.type === "soft_warning" ||
      v.violation.type === "soft_warn"
  );

  const hasHardBlocks = hardBlocks.length > 0;

  const allWarningsJustified = softWarnings.every(
    (v) => (justifications[v.expenseId] || v.justification || "").trim().length > 0
  );

  // Can only proceed if NO hard blocks exist AND all soft-warns have justification
  const canProceed = !hasHardBlocks && allWarningsJustified && softWarnings.length > 0;

  const handleJustificationChange = (expenseId: string, value: string) => {
    setJustifications((prev) => ({ ...prev, [expenseId]: value }));
  };

  const handleProceed = () => {
    if (!canProceed) return;
    const merged: Record<string, string> = {};
    softWarnings.forEach((v) => {
      merged[v.expenseId] = justifications[v.expenseId] || v.justification || "";
    });
    onProceedWithWarnings(merged);
  };

  // Header text
  const headerTitle = hasHardBlocks ? "Policy Violations Found" : "Policy Warnings";
  const headerSubtitle = hasHardBlocks
    ? `${hardBlocks.length} expense${hardBlocks.length > 1 ? "s" : ""} cannot be submitted due to a hard policy block. Edit ${hardBlocks.length > 1 ? "them" : "it"} to resolve the issue before submitting.`
    : "Some expenses need justification before they can be submitted.";

  // Section label (below subtitle, in the sticky header)
  const showHardSection = hardBlocks.length > 0;
  const showSoftSection = softWarnings.length > 0;

  /** Renders a human-friendly spending breakdown card for a limitCheck */
  const renderSpendingBreakdown = (
    lc: NonNullable<PolicyViolation["limitChecks"]>[0],
    categoryName: string | undefined,
    color: "red" | "amber"
  ) => {
    const timeLabel = lc.timeUnit === "daily" ? "Today's" : lc.timeUnit === "monthly" ? "This month's" : lc.timeUnit === "weekly" ? "This week's" : "Period";
    const percentage = Math.min(100, ((lc.totalAfterThisReport || 0) / (lc.limit || 1)) * 100);
    const bgBar = color === "red" ? "bg-red-100" : "bg-amber-100";
    const fgBar = color === "red" ? "bg-red-500" : "bg-amber-500";
    const overageColor = color === "red" ? "text-red-600" : "text-amber-600";
    const borderColor = color === "red" ? "border-red-100" : "border-amber-100";

    return (
      <div className={`rounded-lg bg-white border ${borderColor} p-3 space-y-2`}>
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
          <span className={`font-medium ${overageColor}`}>{currencySymbol}{lc.thisReportAmount?.toLocaleString()}</span>
        </div>
        {/* Progress bar */}
        <div className="space-y-1">
          <div className={`h-2 rounded-full ${bgBar} overflow-hidden`}>
            <div
              className={`h-full rounded-full ${fgBar} transition-all`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px]">
            <span className={`${overageColor} font-semibold`}>
              {currencySymbol}{(lc.overage || 0).toLocaleString()} over limit
            </span>
            <span className="text-gray-400">
              {currencySymbol}{lc.totalAfterThisReport?.toLocaleString()} / {currencySymbol}{lc.limit?.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  /** Creates a plain-English summary for all policy violation types */
  const getHumanSummary = (
    lc: NonNullable<PolicyViolation["limitChecks"]>[0] | undefined,
    categoryName: string | undefined,
    isHardBlock: boolean,
    ruleType?: string,
    rawMessage?: string,
  ) => {
    const catLabel = categoryName || "this category";

    // Receipt requirement
    if (ruleType === "RECEIPT_REQUIRED" || ruleType === "RECEIPT_REQUIREMENT") {
      if (isHardBlock) {
        return `A receipt is required for this ${catLabel} expense. You won't be able to submit until a receipt is attached.`;
      }
      return "A receipt is requested for this expense. You can still submit it without one, but you'll need to explain why.";
    }

    // Category restriction / Scope
    if (ruleType === "CATEGORY_RESTRICTION" || ruleType === "CATEGORY_RESTRICTED" || ruleType === "SCOPE" || /restricted to:/i.test(rawMessage || "")) {
      // Try to extract the restricted groups (e.g. "restricted to: People.")
      const match = rawMessage?.match(/restricted to:\s*([^.]+)\./i);
      const restrictedTo = match ? match[1].trim() : "specific roles or departments";
      // Attempt to extract category from rawMessage as a bulletproof fallback if categoryName is missing
      let finalCatLabel = catLabel;
      if (finalCatLabel === "this category" && rawMessage) {
        const catMatch = rawMessage.match(/Category\s+"([^"]+)"/i);
        if (catMatch) finalCatLabel = catMatch[1];
      }

      return `Your profile does not match the active policy scope for the "${finalCatLabel}" category. This category's policies are restricted to designated departments, job grades, or management levels (e.g., ${restrictedTo}). Please choose a different category or contact your manager.`;
    }

    // Duplicate receipt
    if (ruleType === "DUPLICATE_RECEIPT" || ruleType === "duplicate_receipt") {
      return "This receipt appears to have been submitted before. Please use a different receipt or contact your manager if this is a mistake.";
    }

    // Approval threshold
    if (ruleType === "APPROVAL_REQUIRED" || ruleType === "APPROVAL_THRESHOLD") {
      return `This expense requires additional approval based on your company's policy. ${isHardBlock ? "It cannot be submitted without approval." : "Please provide a justification below."}`;
    }

    // Spend limit (with breakdown data)
    if (lc) {
      const timeWord = lc.timeUnit === "daily" ? "daily" : lc.timeUnit === "monthly" ? "monthly" : lc.timeUnit === "weekly" ? "weekly" : lc.timeUnit;
      if (isHardBlock) {
        return `This expense exceeds your ${timeWord} spending limit for ${catLabel}. You'll need to reduce the amount or remove this expense before you can submit.`;
      }
      return `This expense goes over your ${timeWord} spending limit for ${catLabel}. You can still submit it, but you'll need to explain why.`;
    }

    // Generic fallback — clean up the raw backend message
    if (rawMessage) {
      let cleaned = rawMessage;
      // Remove parenthesized user names like "(Sarah Lee)"
      cleaned = cleaned.replace(/\s*\([A-Z][a-z]+ [A-Z][a-z]+\)/g, '');
      // Remove "from X expense(s) in the same daily/monthly ... bucket"
      cleaned = cleaned.replace(/from\s+\d+\s+expenses?\s+in\s+the\s+same\s+\w+\s+[\w\s]+bucket,?\s*/gi, '');
      // Replace "NGN" with ₦ for readability
      cleaned = cleaned.replace(/\bNGN\s*/g, '₦');
      return cleaned;
    }

    return "This expense doesn't meet your company's policy requirements.";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[520px] rounded-2xl p-0 overflow-hidden flex flex-col"
        style={{ maxHeight: "85vh" }}
        showCloseButton={false}
      >
        {isRechecking ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Re-checking policy compliance…</p>
          </div>
        ) : (
          <>
            {/* ── Sticky Header ── */}
            <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-center gap-2 mb-1">
                {hasHardBlocks ? (
                  <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                )}
                <h2 className="text-base font-semibold text-foreground">{headerTitle}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{headerSubtitle}</p>

              {/* Section label for hard blocks */}
              {showHardSection && (
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                  Must fix before submitting
                </p>
              )}
              {/* Section label for soft warns — only shown if no hard blocks */}
              {!hasHardBlocks && showSoftSection && (
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                  Justification required
                </p>
              )}
            </div>

            {/* ── Scrollable Body ── */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">

              {/* Hard Blocks */}
              {showHardSection && (
                <div className="space-y-2">
                  {hardBlocks.map((v) => {
                    const isReceiptViolation = v.violation.ruleType === "RECEIPT_REQUIRED";
                    const lc = v.violation.limitChecks?.[0];
                    return (
                    <div
                      key={`${v.expenseId}-${v.violation.ruleType}`}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <p className="text-sm font-semibold text-foreground">{v.expenseName}</p>
                        </div>
                        <p className="text-[13px] text-red-800 leading-relaxed">
                          {getHumanSummary(lc, v.violation.categoryName, true, v.violation.ruleType, v.violation.message)}
                        </p>
                        {lc && renderSpendingBreakdown(lc, v.violation.categoryName, "red")}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs border-red-300 text-red-600 hover:bg-red-50 rounded-lg"
                        onClick={() => {
                          onEditExpense(v.expenseId);
                        }}
                      >
                        {isReceiptViolation ? "Add Receipt" : "Edit"}
                      </Button>
                    </div>
                  )})}
                </div>
              )}

              {/* Soft Warnings — only show justification textareas when NO hard block exists */}
              {showSoftSection && !hasHardBlocks && (
                <div className="space-y-3">
                  {softWarnings.map((v) => {
                    const lc = v.violation.limitChecks?.[0];
                    return (
                    <div
                      key={`${v.expenseId}-${v.violation.ruleType}`}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-3"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                          <p className="text-sm font-semibold text-foreground">{v.expenseName}</p>
                        </div>
                        <p className="text-[13px] text-amber-800 leading-relaxed">
                          {getHumanSummary(lc, v.violation.categoryName, false, v.violation.ruleType, v.violation.message)}
                        </p>
                        {lc && renderSpendingBreakdown(lc, v.violation.categoryName, "amber")}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground block mb-1.5">
                          Justification Required
                        </label>
                        <Textarea
                          placeholder="Why is this expense above the standard limit?..."
                          value={justifications[v.expenseId] ?? v.justification ?? ""}
                          onChange={(e) => handleJustificationChange(v.expenseId, e.target.value)}
                          className="text-xs min-h-[72px] bg-white border-amber-200 focus:border-amber-400 resize-none"
                        />
                      </div>
                    </div>
                  )})}
                </div>
              )}

              {/* Soft Warnings in mixed mode — shown read-only, no textareas */}
              {showSoftSection && hasHardBlocks && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mt-2">
                    Also in this report — pending
                  </p>
                  {softWarnings.map((v) => {
                    const lc = v.violation.limitChecks?.[0];
                    return (
                    <div
                      key={v.expenseId}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <p className="text-sm font-semibold text-foreground">{v.expenseName}</p>
                      </div>
                      <p className="text-[13px] text-amber-800 leading-relaxed">
                        {getHumanSummary(lc, v.violation.categoryName, false, v.violation.ruleType, v.violation.message)}
                      </p>
                      {lc && renderSpendingBreakdown(lc, v.violation.categoryName, "amber")}
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Will require justification after the block above is fixed.
                      </p>
                    </div>
                  )})}
                </div>
              )}
            </div>

            {/* ── Sticky Footer ── */}
            <div className="shrink-0 px-6 py-4 border-t border-border flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground hover:bg-transparent px-0 underline text-sm"
              >
                Cancel
              </Button>

              {/* Submit Anyway — only shown when there are ONLY soft warns and all are filled */}
              {!hasHardBlocks && showSoftSection && (
                <Button
                  onClick={handleProceed}
                  disabled={!canProceed}
                  className="bg-primary text-white hover:bg-primary/90 rounded-lg px-6 text-sm"
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  Submit Anyway
                </Button>
              )}

              {/* Hard-block mode — disabled submit with explanation */}
              {hasHardBlocks && (
                <Button
                  disabled
                  className="bg-red-100 text-red-400 border border-red-200 rounded-lg px-6 text-sm cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Fix block{hardBlocks.length > 1 ? "s" : ""} to submit
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
