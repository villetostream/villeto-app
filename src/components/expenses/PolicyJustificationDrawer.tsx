"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

export interface PolicyRequiredAction {
  expenseIndex: number;
  affectedExpenseIndexes?: number[];
  type: string;
  policyId: string;
  policyName: string;
  categoryId: string;
  categoryName: string;
  message: string;
  requiredFields: string[];
}

interface PolicyJustificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  expenseTitle: string;
  action: PolicyRequiredAction;
  existingJustification?: string;
  onSave: (expenseIndex: number, justification: string) => void;
}

/** Simplifies raw backend policy messages into plain English sentences. */
function humanizeMessage(message: string, categoryName: string): string {
  if (!message) return `Your expense in the "${categoryName}" category exceeded a policy limit.`;

  // ── Spend Limit violations ──
  // Pattern: "Daily spend limit exceeded for Travel and Transportation (Sarah Lee). Daily limit is NGN 500,000. ..."
  const spendMatch = message.match(/(daily|weekly|monthly)\s+spend\s+limit\s+exceeded\s+for\s+([^(]+)/i);
  if (spendMatch) {
    const timeframe = spendMatch[1].toLowerCase();
    const category = spendMatch[2].trim();

    // Extract the limit and overage amounts
    const limitMatch = message.match(/limit is\s+\w{3}\s+([\d,]+)/i);
    const overMatch = message.match(/([\d,]+)\s+over the limit/i);

    const limitAmt = limitMatch ? limitMatch[1] : null;
    const overAmt = overMatch ? overMatch[1] : null;

    let result = `Your ${category} expense goes over your company's ${timeframe} spending limit`;
    if (limitAmt) result += ` of ${limitAmt}`;
    result += `.`;
    if (overAmt) result += ` You're ${overAmt} over the limit.`;
    result += ` Please provide a reason below so your approver can review it.`;
    return result;
  }

  // ── Receipt Requirement violations ──
  // Pattern: "A receipt is required for \"Utilities\" expenses of 5000 or more. This expense is 5500."
  const receiptMatch = message.match(/A receipt is required for "([^"]+)" expenses of ([\d,.]+) or more\. This expense is ([\d,.]+)\./i);
  if (receiptMatch) {
    const [_, category, thresholdStr, expenseStr] = receiptMatch;
    const thresholdNum = Number(thresholdStr.replace(/,/g, ''));
    const expenseNum = Number(expenseStr.replace(/,/g, ''));
    const formattedThreshold = isNaN(thresholdNum) ? thresholdStr : thresholdNum.toLocaleString();
    const formattedExpense = isNaN(expenseNum) ? expenseStr : expenseNum.toLocaleString();
    return `Your ${category} expense of ${formattedExpense} exceeds the ${formattedThreshold} threshold for requiring a receipt. Please attach a receipt, or provide a reason below to submit without one.`;
  }

  // Simpler receipt pattern: just mentions "receipt is required"
  if (/receipt\s+(is\s+)?required/i.test(message)) {
    return `A receipt is requested for this expense based on your company's policy. Please attach a receipt, or provide a reason below to submit without one.`;
  }

  // ── Category Restriction violations ──
  if (/category\s+(is\s+)?restricted/i.test(message) || /not\s+allowed\s+(for|in)\s+this\s+category/i.test(message)) {
    return `Your company's policy doesn't allow expenses in the "${categoryName}" category for your role. Please contact your manager or choose a different category.`;
  }

  // ── Duplicate Receipt violations ──
  if (/duplicate/i.test(message) && /receipt/i.test(message)) {
    return `This receipt has already been submitted in a previous expense report. Please use a different receipt or contact your manager if this is a mistake.`;
  }

  // ── Approval Threshold violations ──
  if (/approval\s+(is\s+)?required/i.test(message) || /requires\s+approval/i.test(message)) {
    return `This expense requires additional approval based on your company's policy. Please provide a reason below.`;
  }

  // ── Generic fallback: clean up raw technical messages ──
  // Remove internal identifiers like "(Sarah Lee)", "policyUserId", "bucket", etc.
  let cleaned = message;
  // Remove parenthesized user names like "(Sarah Lee)"
  cleaned = cleaned.replace(/\s*\([A-Z][a-z]+ [A-Z][a-z]+\)/g, '');
  // Remove "from X expense(s) in the same daily/monthly ... bucket"
  cleaned = cleaned.replace(/from\s+\d+\s+expenses?\s+in\s+the\s+same\s+\w+\s+[\w\s]+bucket,?\s*/gi, '');
  // Replace "NGN" with the simpler ₦ symbol for readability
  cleaned = cleaned.replace(/\bNGN\s*/g, '₦');

  return cleaned;
}

function getPolicyTypeLabel(type: string): string {
  const map: Record<string, string> = {
    SPEND_LIMIT: "Spending Limit",
    RECEIPT_REQUIREMENT: "Receipt Required",
    CATEGORY_RESTRICTION: "Category Restriction",
  };
  return map[type] ?? "Policy Rule";
}

export function PolicyJustificationDrawer({
  isOpen,
  onClose,
  expenseTitle,
  action,
  existingJustification = "",
  onSave,
}: PolicyJustificationDrawerProps) {
  const [justification, setJustification] = useState(existingJustification);
  const canSave = justification.trim().length >= 10;

  const handleSave = () => {
    if (!canSave) return;
    onSave(action.expenseIndex, justification.trim());
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[480px] flex flex-col p-0 gap-0 overflow-y-auto">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Approval Required
            </span>
          </div>
          <SheetTitle className="text-base font-semibold text-foreground leading-snug">
            {expenseTitle}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            This expense needs your explanation before it can be submitted.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* ── What was flagged ───────────────────────────────────────── */}
          <div className="px-6 pt-5">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              {/* Rule label */}
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-semibold text-amber-700">
                  {getPolicyTypeLabel(action.type)} · {action.policyName}
                </span>
              </div>

              {/* Category badge */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-amber-700 font-medium">Category:</span>
                <span className="bg-amber-100 border border-amber-200 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full">
                  {action.categoryName}
                </span>
              </div>

              {/* Plain-English explanation */}
              <p className="text-sm text-amber-800 leading-relaxed">
                {humanizeMessage(action.message, action.categoryName)}
              </p>
            </div>
          </div>

          {/* ── What happens next ──────────────────────────────────────── */}
          <div className="px-6 pt-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-semibold text-foreground">What happens next?</span>
              </div>
              <ul className="space-y-2">
                {[
                  "You provide a reason below explaining why this expense is necessary.",
                  "Your manager or finance team will review your explanation.",
                  "If approved, your report will be submitted successfully.",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Justification input ────────────────────────────────────── */}
          <div className="px-6 pt-5 pb-4 space-y-2">
            <label className="text-sm font-semibold text-foreground block">
              Your Explanation{" "}
              <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-muted-foreground">
              Briefly explain why this expense is necessary despite exceeding the policy limit. Be
              specific — vague answers may be rejected.
            </p>
            <Textarea
              placeholder="e.g. This was an urgent client meeting that required premium venue booking due to short notice. Approval was verbally given by the Head of Finance."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="min-h-[130px] text-sm resize-none focus-visible:ring-amber-400 border-amber-200"
            />
            {/* Character guidance */}
            <div className="flex items-center justify-between">
              <span className={`text-xs ${justification.trim().length < 10 ? "text-muted-foreground" : "text-green-600"}`}>
                {justification.trim().length < 10
                  ? `${10 - justification.trim().length} more characters needed`
                  : "✓ Explanation looks good"}
              </span>
              <span className="text-xs text-muted-foreground">
                {justification.length} chars
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer actions ─────────────────────────────────────────── */}
        <SheetFooter className="px-6 py-4 border-t border-border shrink-0 flex-col gap-2">
          <Button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className="w-full gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save Explanation &amp; Continue
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
