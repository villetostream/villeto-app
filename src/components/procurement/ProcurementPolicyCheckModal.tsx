"use client";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ProcurementPolicyViolation } from "@/lib/types/api-error";
import { useAuthStore } from "@/stores/auth-stores";
import { useState } from "react";

interface ProcurementPolicyCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  violations: ProcurementPolicyViolation[];
  onEditRequest: () => void;
  onProceedWithWarnings?: (justifications: Record<string, string>) => void;
}

export function ProcurementPolicyCheckModal({
  isOpen,
  onClose,
  violations,
  onEditRequest,
  onProceedWithWarnings,
}: ProcurementPolicyCheckModalProps) {
  const getCurrencySymbol = useAuthStore((state) => state.getCurrencySymbol);
  const userCurrencySymbol = getCurrencySymbol();
  const [justifications, setJustifications] = useState<Record<string, string>>({});

  // Deduplicate violations by policyId + rule
  const uniqueViolations = violations.filter((v, index, self) => 
    index === self.findIndex((t) => (
      t.policyId === v.policyId && t.rule === v.rule
    ))
  );

  const hardBlocks = uniqueViolations.filter((v) => v.resolution === "BLOCK");
  const softWarnings = uniqueViolations.filter((v) => v.resolution !== "BLOCK");

  const hasHardBlocks = hardBlocks.length > 0;
  
  const allWarningsJustified = softWarnings.every(
    (v) => (justifications[v.policyId] || "").trim().length > 0
  );

  const canProceed = !hasHardBlocks && allWarningsJustified && softWarnings.length > 0;

  const handleJustificationChange = (policyId: string, value: string) => {
    setJustifications((prev) => ({ ...prev, [policyId]: value }));
  };

  const handleProceed = () => {
    if (!canProceed || !onProceedWithWarnings) return;
    const merged: Record<string, string> = {};
    softWarnings.forEach((v) => {
      merged[v.policyId] = justifications[v.policyId] || "";
    });
    onProceedWithWarnings(merged);
  };

  // Header text
  const headerTitle = hasHardBlocks ? "Policy Violations Found" : "Policy Warnings";
  const headerSubtitle = hasHardBlocks
    ? "This purchase request cannot be submitted due to a hard policy block. Edit your request to resolve the issue."
    : "Some items in this request triggered policy warnings.";

  const showHardSection = hardBlocks.length > 0;
  const showSoftSection = softWarnings.length > 0;

  const renderLimitCheck = (v: ProcurementPolicyViolation, color: "red" | "amber") => {
    if (!v.details) return null;
    const { actualAmount, threshold, currency, thresholdCurrency, minimumQuotes, actualQuotes } = v.details;
    
    // If it's a quote requirement
    if (minimumQuotes !== undefined && minimumQuotes !== null) {
      const overageColor = color === "red" ? "text-red-600" : "text-amber-600";
      const borderColor = color === "red" ? "border-red-100" : "border-amber-100";
      
      return (
        <div className={`mt-3 rounded-lg bg-white border ${borderColor} p-3 space-y-2`}>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Quotes required</span>
            <span className="font-semibold text-gray-900">{minimumQuotes}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Quotes attached</span>
            <span className={`font-medium ${overageColor}`}>{actualQuotes || 0}</span>
          </div>
        </div>
      );
    }

    // If it's an amount limit
    if (actualAmount !== undefined && actualAmount !== null) {
      const currSym = currency === "NGN" || thresholdCurrency === "NGN" ? "₦" : (currency || userCurrencySymbol);
      const overageColor = color === "red" ? "text-red-600" : "text-amber-600";
      const borderColor = color === "red" ? "border-red-100" : "border-amber-100";
      
      if (threshold !== undefined && threshold !== null) {
        const percentage = Math.min(100, ((actualAmount || 0) / (threshold || 1)) * 100);
        const bgBar = color === "red" ? "bg-red-100" : "bg-amber-100";
        const fgBar = color === "red" ? "bg-red-500" : "bg-amber-500";
        const overage = (actualAmount || 0) - (threshold || 0);

        return (
          <div className={`mt-3 rounded-lg bg-white border ${borderColor} p-3 space-y-2`}>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Policy threshold</span>
              <span className="font-semibold text-gray-900">{currSym}{Number(threshold).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Request amount</span>
              <span className={`font-medium ${overageColor}`}>{currSym}{Number(actualAmount).toLocaleString()}</span>
            </div>
            {/* Progress bar */}
            <div className="space-y-1">
              <div className={`h-2 rounded-full ${bgBar} overflow-hidden`}>
                <div
                  className={`h-full rounded-full ${fgBar} transition-all`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              {overage > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span className={`${overageColor} font-semibold`}>
                    {currSym}{overage.toLocaleString()} over limit
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      } else {
        return (
          <div className={`mt-3 rounded-lg bg-white border ${borderColor} p-3 space-y-2`}>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Affected Amount</span>
              <span className={`font-medium ${overageColor}`}>{currSym}{Number(actualAmount).toLocaleString()}</span>
            </div>
          </div>
        );
      }
    }
    
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[520px] rounded-2xl p-0 overflow-hidden flex flex-col"
        style={{ maxHeight: "85vh" }}
        showCloseButton={false}
      >
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
          
          {showHardSection && (
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
              Must fix before submitting
            </p>
          )}
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
            <div className="space-y-3">
              {hardBlocks.map((v, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <p className="text-sm font-semibold text-foreground">{v.policyName || "Policy Violation"}</p>
                      </div>
                      <p className="text-[13px] text-red-800 leading-relaxed">
                        {v.message}
                      </p>
                    </div>
                  </div>
                  {renderLimitCheck(v, "red")}
                </div>
              ))}
            </div>
          )}

          {/* Soft Warnings */}
          {showSoftSection && !hasHardBlocks && (
            <div className="space-y-3">
              {softWarnings.map((v, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col gap-2"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <p className="text-sm font-semibold text-foreground">{v.policyName || "Policy Warning"}</p>
                    </div>
                    <p className="text-[13px] text-amber-800 leading-relaxed">
                      {v.message}
                    </p>
                  </div>
                  {renderLimitCheck(v, "amber")}
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5 mt-2">
                      Justification Required
                    </label>
                    <Textarea
                      placeholder="Please provide a justification to proceed..."
                      value={justifications[v.policyId] ?? ""}
                      onChange={(e) => handleJustificationChange(v.policyId, e.target.value)}
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
                Also in this request — pending
              </p>
              {softWarnings.map((v, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col gap-2"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <p className="text-sm font-semibold text-foreground">{v.policyName || "Policy Warning"}</p>
                    </div>
                    <p className="text-[13px] text-amber-800 leading-relaxed">
                      {v.message}
                    </p>
                  </div>
                  {renderLimitCheck(v, "amber")}
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
          {!hasHardBlocks && showSoftSection && onProceedWithWarnings && (
            <Button
              onClick={handleProceed}
              disabled={!canProceed}
              className="bg-primary text-white hover:bg-primary/90 rounded-lg px-6 text-sm"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Submit Anyway
            </Button>
          )}

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
      </DialogContent>
    </Dialog>
  );
}
