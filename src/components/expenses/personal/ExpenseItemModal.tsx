"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-stores";
import { useGetSplitExpenseUsersApi } from "@/queries/users/get-all-users";

interface ExpenseItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: {
    title: string;
    amount: string;
    merchantName: string;
    categoryName: string;
    description?: string;
    receiptUrl?: string;
    transactionDate?: string;
    createdAt?: string;
    /** Justification submitted when the expense exceeded a soft-warn policy limit */
    policyJustification?: string | null;
    isSplit?: boolean;
    expenseType?: "individual" | "split";
    splitParticipants?: string[];
    splitAllocations?: { amount: number; userId: string }[] | Record<string, string>;
  } | null;
}

export function ExpenseItemModal({
  isOpen,
  onClose,
  expense,
}: ExpenseItemModalProps) {
  const getCurrencySymbol = useAuthStore((state) => state.getCurrencySymbol);
  const currencySymbol = getCurrencySymbol();

  const hasAllocations = Array.isArray(expense?.splitAllocations) && expense.splitAllocations.length > 0;
  const isSplit = expense?.isSplit || expense?.expenseType?.toLowerCase() === "split" || hasAllocations;

  const { data: usersData } = useGetSplitExpenseUsersApi({ enabled: isSplit });

  if (!expense) return null;

  // Extract filename from URL if available
  const getReceiptFileName = (url?: string) => {
    if (!url) return "No receipt uploaded";
    try {
      const urlParts = url.split("/");
      const filename = urlParts[urlParts.length - 1];
      // Decode URL-encoded filename
      return decodeURIComponent(filename) || "Receipt.jpeg";
    } catch {
      return "Receipt.jpeg";
    }
  };

  const hasReceipt = !!expense.receiptUrl;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="rounded-2xl p-0 overflow-hidden"
        style={{ maxWidth: hasReceipt ? "800px" : "480px" }}
        showCloseButton={false}
      >
        <div className="flex h-full max-h-[85vh]">
          {/* Left: Input-like Read-Only UI matching ExpenseForm */}
          <div className={`flex flex-col p-6 overflow-y-auto custom-scrollbar ${hasReceipt ? "flex-1 min-w-0" : "w-full"}`}>
            <style>{`
              .custom-scrollbar::-webkit-scrollbar { width: 6px; }
              .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
              .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
            `}</style>
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                {expense.title}
                {isSplit && (
                  <Badge className="bg-purple-100 text-purple-600 border-transparent px-1.5 py-0.5 text-[10px] leading-none font-medium">
                    Split
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Expense Name and Transaction Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Expenses name
                  </label>
                  <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground font-medium">
                    {expense.title}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Transaction Date
                  </label>
                  <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground font-medium">
                    {(expense.transactionDate || expense.createdAt)
                      ? new Date((expense.transactionDate || expense.createdAt)!).toLocaleDateString()
                      : "—"}
                  </div>
                </div>
              </div>

              {/* Merchant and Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Merchant
                  </label>
                  <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground font-medium">
                    {expense.merchantName || "N/A"}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Amount
                  </label>
                  <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground font-medium">
                    {currencySymbol}{parseFloat(expense.amount).toLocaleString("en-US", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Expense Category
                </label>
                <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground font-medium">
                  {expense.categoryName || "N/A"}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Description
                </label>
                <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground min-h-[100px]">
                  {expense.description || "—"}
                </div>
              </div>

              {/* Split Allocation */}
              {isSplit && (
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Allocation
                  </label>
                  <div className="bg-white border border-border rounded-lg p-3 space-y-3">
                    {Array.isArray(expense.splitAllocations) ? (
                      // New Array format
                      expense.splitAllocations.map((alloc, idx) => {
                        const user = usersData?.data?.find((u: any) => u.userId === alloc.userId);
                        const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : "Unknown User";
                        const jobTitle = user?.jobTitle || (user?.position ? user.position.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : null);
                        const dept = (user as any)?.department?.name || (user as any)?.departmentName;
                        const subLabel = [dept, jobTitle].filter(Boolean).join(" • ");

                        return (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{displayName}</span>
                              {subLabel && <span className="text-xs text-muted-foreground">{subLabel}</span>}
                            </div>
                            <span className="font-medium text-foreground">
                              {currencySymbol}
                              {Number(alloc.amount).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      // Fallback: old mock structure or Record
                      (expense.splitParticipants || []).map((participant, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">{participant}</span>
                          <span className="font-medium text-foreground">
                            {currencySymbol}
                            {parseFloat((expense.splitAllocations as Record<string, string>)?.[participant] || "0").toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Policy Justification — only shown when it exists */}
              {expense.policyJustification && (
                <div>
                  <label className="text-sm text-muted-foreground mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                    Policy Justification
                  </label>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm text-amber-800 leading-relaxed">
                    {expense.policyJustification}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={onClose} className="rounded-lg font-medium px-4">
                  Close
                </Button>
              </div>
            </div>
          </div>

          {/* Right: receipt image preview panel exactly like ExpenseDetailModal */}
          {hasReceipt && (
            <div className="w-80 shrink-0 border-l border-border bg-gray-50 flex flex-col items-center justify-start p-5 pt-8 overflow-hidden">
              {expense.receiptUrl && (expense.receiptUrl.startsWith("data:image") || expense.receiptUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i)) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={expense.receiptUrl}
                  alt="Receipt"
                  className="w-full h-auto rounded-xl object-contain max-h-[80vh] shadow-sm"
                />
              ) : (
                <div className="w-full rounded-lg border border-border bg-white flex flex-col items-center justify-center p-4 gap-2 text-center min-h-[200px]">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-xs text-muted-foreground break-all">{getReceiptFileName(expense.receiptUrl)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
