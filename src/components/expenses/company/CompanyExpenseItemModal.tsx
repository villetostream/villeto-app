"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useAuthStore } from "@/stores/auth-stores";

interface CompanyExpenseItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: {
    title: string;
    amount: string;
    merchantName: string;
    categoryName: string;
    description?: string;
    receiptUrl?: string;
  } | null;
}

export function CompanyExpenseItemModal({
  isOpen,
  onClose,
  expense,
}: CompanyExpenseItemModalProps) {
  const getCurrencySymbol = useAuthStore((state) => state.getCurrencySymbol);
  const currencySymbol = getCurrencySymbol();

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
        <div className="flex h-full">
          {/* Left: Content panel */}
          <div className={`flex flex-col p-6 ${hasReceipt ? "flex-1 min-w-0" : "w-full"}`}>
            <DialogHeader className="mb-4">
              <DialogTitle className="text-base font-semibold">
                {expense.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Expense Name and Amount */}
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

              {/* Merchant and Category */}
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
                    Expense Category
                  </label>
                  <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground font-medium">
                    {expense.categoryName || "N/A"}
                  </div>
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

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={onClose} className="rounded-lg font-medium px-4">
                  Close
                </Button>
              </div>
            </div>
          </div>

          {/* Right: receipt image preview panel */}
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
