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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* No max-h on DialogContent itself — we control the layout manually */}
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
                    return (
                    <div
                      key={v.expenseId}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <p className="text-sm font-semibold text-foreground">{v.expenseName}</p>
                        </div>
                        <p className="text-xs text-red-700 leading-relaxed">{v.violation.message}</p>
                        {v.violation.limitChecks && v.violation.limitChecks.length > 0 && v.violation.limitChecks[0].spentBeforeThisReport !== undefined && (
                          <div className="mt-2 text-xs rounded-md bg-white border border-red-100 p-2 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-red-700/70">Daily Limit:</span>
                              <span className="font-medium text-red-900">{currencySymbol}{v.violation.limitChecks[0].limit?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-red-700/70">Already spent today:</span>
                              <span className="font-medium text-red-600">{currencySymbol}{v.violation.limitChecks[0].spentBeforeThisReport?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-t border-red-100 pt-1 mt-1">
                              <span className="text-red-700/70">Remaining limit:</span>
                              <span className="font-medium text-red-900">{currencySymbol}{Math.max(0, (v.violation.limitChecks[0].limit || 0) - (v.violation.limitChecks[0].spentBeforeThisReport || 0)).toLocaleString()}</span>
                            </div>
                          </div>
                        )}
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
                  {softWarnings.map((v) => (
                    <div
                      key={v.expenseId}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                          <p className="text-sm font-semibold text-foreground">{v.expenseName}</p>
                        </div>
                        <p className="text-xs text-amber-700 leading-relaxed">{v.violation.message}</p>
                        {v.violation.limitChecks && v.violation.limitChecks.length > 0 && v.violation.limitChecks[0].spentBeforeThisReport !== undefined && (
                          <div className="mt-2 text-xs rounded-md bg-white border border-amber-100 p-2 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-amber-700/70">Daily Limit:</span>
                              <span className="font-medium text-amber-900">{currencySymbol}{v.violation.limitChecks[0].limit?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-amber-700/70">Already spent today:</span>
                              <span className="font-medium text-red-600">{currencySymbol}{v.violation.limitChecks[0].spentBeforeThisReport?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-t border-amber-100 pt-1 mt-1">
                              <span className="text-amber-700/70">Remaining limit:</span>
                              <span className="font-medium text-amber-900">{currencySymbol}{Math.max(0, (v.violation.limitChecks[0].limit || 0) - (v.violation.limitChecks[0].spentBeforeThisReport || 0)).toLocaleString()}</span>
                            </div>
                          </div>
                        )}
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
                  ))}
                </div>
              )}

              {/* Soft Warnings in mixed mode — shown read-only, no textareas */}
              {showSoftSection && hasHardBlocks && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mt-2">
                    Also in this report — pending
                  </p>
                  {softWarnings.map((v) => (
                    <div
                      key={v.expenseId}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <p className="text-sm font-semibold text-foreground">{v.expenseName}</p>
                      </div>
                      <p className="text-xs text-amber-700 leading-relaxed">{v.violation.message}</p>
                      {v.violation.limitChecks && v.violation.limitChecks.length > 0 && v.violation.limitChecks[0].spentBeforeThisReport !== undefined && (
                        <div className="mt-2 mb-1 text-xs rounded-md bg-white border border-amber-100 p-2 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-amber-700/70">Daily Limit:</span>
                            <span className="font-medium text-amber-900">{currencySymbol}{v.violation.limitChecks[0].limit?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-amber-700/70">Already spent today:</span>
                            <span className="font-medium text-red-600">{currencySymbol}{v.violation.limitChecks[0].spentBeforeThisReport?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between border-t border-amber-100 pt-1 mt-1">
                            <span className="text-amber-700/70">Remaining limit:</span>
                            <span className="font-medium text-amber-900">{currencySymbol}{Math.max(0, (v.violation.limitChecks[0].limit || 0) - (v.violation.limitChecks[0].spentBeforeThisReport || 0)).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Will require justification after the block above is fixed.
                      </p>
                    </div>
                  ))}
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
