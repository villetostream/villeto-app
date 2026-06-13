"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, XCircle, CheckCircle, Loader2 } from "lucide-react";
import type { PolicyViolation } from "./ExpensePreviewList";

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
  /** Called when user resolves all soft warnings (with justifications) and wants to proceed */
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
  const [justifications, setJustifications] = useState<Record<string, string>>({});

  const hardBlocks = violations.filter((v) => v.violation.type === "hard_block");
  const softWarnings = violations.filter((v) => v.violation.type === "soft_warning");

  const hasHardBlocks = hardBlocks.length > 0;

  const allWarningsJustified = softWarnings.every(
    (v) => (justifications[v.expenseId] || v.justification || "").trim().length > 0
  );

  const canProceed = !hasHardBlocks && allWarningsJustified;

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] rounded-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            {hasHardBlocks ? (
              <>
                <XCircle className="w-5 h-5 text-red-500" />
                Policy Violations Found
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Policy Warnings
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {isRechecking ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Re-checking policy compliance…</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {hasHardBlocks
                ? "Some expenses cannot be submitted due to policy violations. Please edit them to resolve the issues before submitting."
                : "Some expenses have soft policy warnings. Please provide justifications to proceed with submission."}
            </p>

            {/* Hard Blocks */}
            {hardBlocks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Must fix before submitting</p>
                {hardBlocks.map((v) => (
                  <div
                    key={v.expenseId}
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{v.expenseName}</p>
                      <p className="text-xs text-red-600 mt-0.5">{v.violation.message}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 text-xs border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        onEditExpense(v.expenseId);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Soft Warnings */}
            {softWarnings.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                  {hasHardBlocks ? "Also requires justification" : "Justification required"}
                </p>
                {softWarnings.map((v) => (
                  <div key={v.expenseId} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{v.expenseName}</p>
                      <p className="text-xs text-amber-700 mt-0.5">{v.violation.message}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1">
                        Justification Required
                      </label>
                      <Textarea
                        placeholder="Why is this expense above the standard limit?..."
                        value={justifications[v.expenseId] || v.justification || ""}
                        onChange={(e) => handleJustificationChange(v.expenseId, e.target.value)}
                        className="text-xs min-h-[72px] bg-white border-amber-200 focus:border-amber-400 resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground hover:bg-transparent px-0 underline text-sm"
              >
                Cancel
              </Button>
              {!hasHardBlocks && (
                <Button
                  onClick={handleProceed}
                  disabled={!canProceed}
                  className="bg-primary text-white hover:bg-primary/90 rounded-lg px-6 text-sm"
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  Submit Anyway
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
