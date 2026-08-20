"use client";

import { useState, useEffect } from "react";
import { Eye, Trash2, Pencil, Check, X, AlertCircle, Plus } from "lucide-react";
import type { SplitParticipant } from "./ExpenseForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-stores";
import { toast } from "sonner";

export interface PolicyViolation {
  type: string;
  message: string;
  ruleType?: string;
  limitChecks?: any[];
  categoryName?: string;
}

export interface ExpenseItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  receiptImage: string;
  receiptExtractionId?: string;
  merchantName?: string;
  description?: string;
  transactionDate?: Date;
  fileName?: string;
  policyViolations?: PolicyViolation[] | null;
  justification?: string;
  /** Flag marking this expense as a split expense — drives expenseType in the submit payload. */
  isSplit?: boolean;
  /** Split participants keyed by userId — fed into splitAllocations payload. */
  splitParticipants?: SplitParticipant[];
  splitAllocationMode?: "equal" | "manual";
  /** Keyed by userId */
  splitAllocations?: Record<string, string>;
}

interface ExpensePreviewListProps {
  expenses: ExpenseItem[];
  total: number;
  onEditName: (id: string, newName: string) => void;
  onViewDetails: (id: string) => void;
  onViewReceipt: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ExpensePreviewList({
  expenses,
  total,
  onEditName,
  onViewDetails,
  onViewReceipt: _onViewReceipt,
  onDelete,
}: ExpensePreviewListProps) {
  const getCurrencySymbol = useAuthStore((state) => state.getCurrencySymbol);
  const currencySymbol = getCurrencySymbol();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);

  // Listen for the manual form state so we don't show the shortcut button when it's already open
  useEffect(() => {
    const handleStateChange = (e: any) => setIsManualFormOpen(e.detail);
    window.addEventListener('villeto:manual-form-state', handleStateChange);
    return () => window.removeEventListener('villeto:manual-form-state', handleStateChange);
  }, []);

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditValue(currentName);
  };

  const handleSaveEdit = (id: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      handleCancelEdit();
      return;
    }
    const isDuplicate = expenses.some(
      (e) => e.id !== id && e.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      toast.error(`An expense named "${trimmed}" already exists.`);
      return;
    }
    onEditName(id, trimmed);
    setEditingId(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") handleSaveEdit(id);
    else if (e.key === "Escape") handleCancelEdit();
  };

  return (
    <div className="border border-border rounded-lg bg-white h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold text-foreground">
          Preview Items{" "}
          <span className="text-muted-foreground font-normal">{expenses.length}</span>
        </h3>
        <span className="text-sm font-semibold text-foreground">
          Total: {currencySymbol}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {expenses.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-[#f0faf8] rounded-[14px] flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-[#087f70]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p className="text-[14px] font-bold text-[#0b100e] mb-1">No expenses added yet</p>
          <p className="text-[13px] text-[#68726d] mb-5">Use the entry form to start adding items to this expense report.</p>
          
          {!isManualFormOpen && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('villeto:open-manual-form'))}
              className="text-[13px] text-[#087f70] hover:underline font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Start with a manual expense
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto flex-1">
          <table className="w-full">
            <thead className="bg-[#f9faf9] border-b border-black/[0.06]">
              <tr>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[#84908a] whitespace-nowrap">Expenses Name</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[#84908a] whitespace-nowrap">Category</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[#84908a] whitespace-nowrap">Merchant</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-[#84908a] whitespace-nowrap">Amount</th>
                <th className="px-2 py-2.5 w-8" />
                <th className="px-2 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-t border-border hover:bg-muted/10 transition-colors">
                  <td className="px-3 py-2.5">
                    {editingId === expense.id ? (
                      <div className="flex items-center gap-1">
                        <Input value={editValue} onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, expense.id)} className="h-7 text-xs" autoFocus />
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => handleSaveEdit(expense.id)}>
                          <Check className="h-3 w-3 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={handleCancelEdit}>
                          <X className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          {expense.policyViolations && expense.policyViolations.length > 0 && (
                            <AlertCircle
                              className="w-3.5 h-3.5 text-red-500 shrink-0 cursor-pointer hover:text-red-600 transition-colors"
                              onClick={() => onViewDetails(expense.id)}
                              aria-label="Policy violation — open expense for details"
                            />
                          )}
                          <div className="flex items-center gap-1.5 group min-w-0">
                            <span className="text-xs font-medium text-foreground truncate max-w-[120px]">{expense.name}</span>
                            {expense.isSplit && (
                              <Badge className="bg-purple-100 text-purple-600 border-transparent px-1.5 py-0.5 text-[10px] leading-none">
                                Split
                              </Badge>
                            )}
                            <Button size="icon" variant="ghost"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              onClick={() => handleStartEdit(expense.id, expense.name)}>
                              <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">{expense.category || "—"}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-muted-foreground">{expense.merchantName || "—"}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-medium text-foreground">{currencySymbol}{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </td>
                  <td className="px-1.5 py-2.5">
                    <button type="button" className="inline-flex items-center justify-center w-7 h-7 rounded-[6px] hover:bg-[#f5f7f6] text-[#68726d] hover:text-[#0b100e] transition-colors" onClick={() => onViewDetails(expense.id)}>
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                  <td className="px-1.5 py-2.5">
                    <button type="button" className="inline-flex items-center justify-center w-7 h-7 rounded-[6px] hover:bg-[#fdf2f2] text-[#d33d44] transition-colors" onClick={() => onDelete(expense.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
