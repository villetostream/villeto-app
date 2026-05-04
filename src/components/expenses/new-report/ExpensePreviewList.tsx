"use client";

import { useState } from "react";
import { Eye, Trash2, Pencil, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthStore } from "@/stores/auth-stores";

export interface PolicyViolation {
  type: "soft_warning" | "hard_block";
  message: string;
  ruleType: string;
}

export interface ExpenseItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  receiptImage: string;
  merchantName?: string;
  description?: string;
  transactionDate?: Date;
  fileName?: string;
  policyViolations?: { type: string; message: string; ruleType?: string }[] | null;
  justification?: string;
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
  onViewReceipt,
  onDelete,
}: ExpensePreviewListProps) {
  const getCurrencySymbol = useAuthStore((state) => state.getCurrencySymbol);
  const currencySymbol = getCurrencySymbol();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditValue(currentName);
  };

  const handleSaveEdit = (id: string) => {
    if (editValue.trim()) onEditName(id, editValue.trim());
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
          Total: {currencySymbol}{total.toFixed(2)}
        </span>
      </div>

      {expenses.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-3">
            <svg className="w-10 h-10 text-muted-foreground/30 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No expenses added yet</p>
          <p className="text-xs text-muted-foreground">Use the entry form to start adding items to this expense report.</p>
        </div>
      ) : (
        <div className="overflow-x-auto flex-1">
          <table className="w-full">
            <thead className="bg-muted/20">
              <tr>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Expenses Name</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Category</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Merchant</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
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
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertCircle 
                                    className="w-3.5 h-3.5 text-red-500 shrink-0 cursor-pointer hover:text-red-600 transition-colors" 
                                    onClick={() => onViewDetails(expense.id)}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{expense.policyViolations.length} policy violation(s)</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <div className="flex items-center gap-1.5 group">
                            <span className="text-xs font-medium text-foreground truncate max-w-[120px]">{expense.name}</span>
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
                    <span className="text-xs font-medium text-foreground">{currencySymbol}{expense.amount.toFixed(2)}</span>
                  </td>
                  <td className="px-1.5 py-2.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onViewDetails(expense.id)}>
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </td>
                  <td className="px-1.5 py-2.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(expense.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
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
