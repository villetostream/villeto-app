"use client";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ProcurementPolicyViolation } from "@/lib/types/api-error";
import { useAuthStore } from "@/stores/auth-stores";

interface SubmissionSuccessWarningsModalProps {
  isOpen: boolean;
  onClose: () => void;
  violations: ProcurementPolicyViolation[];
}

export function SubmissionSuccessWarningsModal({
  isOpen,
  onClose,
  violations,
}: SubmissionSuccessWarningsModalProps) {
  const getCurrencySymbol = useAuthStore((state) => state.getCurrencySymbol);
  const userCurrencySymbol = getCurrencySymbol();

  const uniqueViolations = violations.filter((v, index, self) => 
    index === self.findIndex((t) => (
      t.policyId === v.policyId && t.rule === v.rule
    ))
  );

  const renderLimitCheck = (v: ProcurementPolicyViolation) => {
    const ruleText = `${v.rule || ""} ${v.policyGroup || ""} ${v.message || ""}`.toLowerCase();
    const isQuantityViolation = ruleText.includes("quantity") || ruleText.includes("qty");

    if (isQuantityViolation) {
      const qtyLimitMatch = v.message.match(/allowed\s+quantity\s+is\s+([\d,]+)/i)
        || v.message.match(/quantity\s+limit.*?([\d,]+)/i)
        || v.message.match(/limit\s+is\s+([\d,]+)/i);
      if (qtyLimitMatch) {
        const limit = parseFloat(qtyLimitMatch[1].replace(/,/g, ''));
        const maxQty = v.lineItems
          ? Math.max(...v.lineItems.map((li: any) => li.quantity || 0))
          : 0;
        const percentage = Math.min(100, (maxQty / (limit || 1)) * 100);

        return (
          <div className="mt-3 rounded-lg bg-white border border-amber-100 p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Quantity limit</span>
              <span className="font-semibold text-gray-900">{limit.toLocaleString()} units</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Highest item quantity</span>
              <span className="font-medium text-amber-600">{maxQty.toLocaleString()} units</span>
            </div>
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-amber-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              {maxQty > limit && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-amber-600 font-semibold">
                    {(maxQty - limit).toLocaleString()} units over limit
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      }
    }

    if (!v.details) return null;
    const { actualAmount, threshold, currency, thresholdCurrency, minimumQuotes, actualQuotes } = v.details;
    
    if (minimumQuotes !== undefined && minimumQuotes !== null) {
      return (
        <div className="mt-3 rounded-lg bg-white border border-amber-100 p-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Quotes required</span>
            <span className="font-semibold text-gray-900">{minimumQuotes}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Quotes attached</span>
            <span className="font-medium text-amber-600">{actualQuotes || 0}</span>
          </div>
        </div>
      );
    }

    if (actualAmount !== undefined && actualAmount !== null) {
      const currSym = currency === "NGN" || thresholdCurrency === "NGN" ? "₦" : (currency || userCurrencySymbol);
      
      if (threshold !== undefined && threshold !== null) {
        const percentage = Math.min(100, ((actualAmount || 0) / (threshold || 1)) * 100);
        const overage = (actualAmount || 0) - (threshold || 0);

        return (
          <div className="mt-3 rounded-lg bg-white border border-amber-100 p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Policy threshold</span>
              <span className="font-semibold text-gray-900">{currSym}{Number(threshold).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Request amount</span>
              <span className="font-medium text-amber-600">{currSym}{Number(actualAmount).toLocaleString()}</span>
            </div>
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-amber-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              {overage > 0 && (
                <div className="flex justify-between text-[10px]">
                  <span className="text-amber-600 font-semibold">
                    {currSym}{overage.toLocaleString()} over limit
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      } else {
        return (
          <div className="mt-3 rounded-lg bg-white border border-amber-100 p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Affected Amount</span>
              <span className="font-medium text-amber-600">{currSym}{Number(actualAmount).toLocaleString()}</span>
            </div>
          </div>
        );
      }
    }
    
    return null;
  };

  const renderAffectedItems = (v: ProcurementPolicyViolation) => {
    if (!v.lineItems || v.lineItems.length === 0) return null;
    
    const ruleText = `${v.rule || ""} ${v.policyGroup || ""} ${v.message || ""}`.toLowerCase();
    const isQuantityViolation = ruleText.includes("quantity") || ruleText.includes("qty");

    let parsedLimit: number | null = null;
    if (isQuantityViolation) {
      const qtyLimitMatch = v.message.match(/allowed\s+quantity\s+is\s+([\d,]+)/i)
        || v.message.match(/quantity\s+limit.*?([\d,]+)/i)
        || v.message.match(/limit\s+is\s+([\d,]+)/i);
      if (qtyLimitMatch) {
        parsedLimit = parseFloat(qtyLimitMatch[1].replace(/,/g, ''));
      }
    }

    let displayItems = v.lineItems;
    let compliantItems: any[] = [];
    if (isQuantityViolation && parsedLimit !== null) {
      displayItems = v.lineItems.filter((li: any) => (li.quantity || 0) > parsedLimit!);
      compliantItems = v.lineItems.filter((li: any) => (li.quantity || 0) <= parsedLimit!);
    }

    return (
      <div className="mt-2 rounded-lg bg-amber-100/50 p-3 space-y-2">
        <p className="text-xs font-semibold text-amber-900">
          {isQuantityViolation
            ? `${displayItems.length} item${displayItems.length !== 1 ? "s" : ""} exceed${displayItems.length === 1 ? "s" : ""} the quantity limit${parsedLimit !== null ? ` of ${parsedLimit.toLocaleString()}` : ""}:`
            : "Affected items:"}
        </p>
        <div className="space-y-1.5">
          {displayItems.map((li: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-2 bg-white/60 rounded-md px-2.5 py-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-semibold text-amber-800">{li.lineItemName || "Item"}</span>
                {li.categoryName && <span className="text-[10px] opacity-60 text-amber-800">({li.categoryName})</span>}
              </div>
              {isQuantityViolation ? (
                <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                  Qty: {(li.quantity || 0).toLocaleString()}
                </span>
              ) : (
                <span className="shrink-0 text-[11px] font-semibold text-amber-800">
                  {userCurrencySymbol}{(li.lineTotal || 0).toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[520px] rounded-2xl p-0 overflow-hidden flex flex-col"
        style={{ maxHeight: "85vh" }}
        showCloseButton={false}
      >
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border bg-[#087f70]/5">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-[#087f70] shrink-0" />
            <h2 className="text-base font-semibold text-foreground">Submitted with Warnings</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Your request was submitted successfully, but it triggered the following policy warnings. You may want to review these or inform your manager.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
          {uniqueViolations.map((v, i) => (
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
              {renderLimitCheck(v)}
              {renderAffectedItems(v)}
            </div>
          ))}
        </div>

        <div className="shrink-0 px-6 py-4 border-t border-border flex items-center justify-end">
          <Button
            onClick={onClose}
            className="bg-[#087f70] text-white hover:opacity-90 rounded-lg px-6 text-sm"
          >
            I understand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
