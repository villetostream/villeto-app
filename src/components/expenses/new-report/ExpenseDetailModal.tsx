"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check } from "lucide-react";
import { ExpenseForm, type ExpenseDetailFormData } from "./ExpenseForm";

interface ExpenseCategory {
  categoryId: string;
  name: string;
}

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: {
    id: string;
    name: string;
    amount: number;
    merchantName?: string;
    category: string;
    description?: string;
    receiptImage?: string;
    // Policy fields
    policyViolation?: { type: "soft_warning" | "hard_block"; message: string; ruleType: string } | null;
    justification?: string;
  } | null;
  categories: ExpenseCategory[];
  onSave: (expenseId: string, data: ExpenseDetailFormData, newReceipt?: string, justification?: string) => void;
  /**
   * When true (eye icon): shows the expense in an EDITABLE form (with bordered inputs, pre-filled)
   * so the user can view and optionally modify values — matching the manual entry look.
   * When false/undefined (edit from policy flow): same editable form.
   */
  readOnly?: boolean;
}

export function ExpenseDetailModal({
  isOpen,
  onClose,
  expense,
  categories,
  onSave,
  readOnly = true,
}: ExpenseDetailModalProps) {
  if (!expense) return null;

  const hasReceipt = !!expense.receiptImage;
  const hasSoftWarning = expense.policyViolation?.type === "soft_warning";
  const hasHardBlock = expense.policyViolation?.type === "hard_block";

  const getReceiptFileName = (url?: string) => {
    if (!url) return "No receipt uploaded";
    try {
      if (url.startsWith("data:")) return "Receipt.jpeg";
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1]) || "Receipt.jpeg";
    } catch {
      return "Receipt.jpeg";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="rounded-2xl p-0 overflow-hidden"
        style={{ maxWidth: hasReceipt ? "800px" : "480px" }}
        showCloseButton={false}
      >
        <div className="flex h-full">
          {/* Left: editable form with pre-filled bordered inputs */}
          <div className={`flex flex-col p-6 ${hasReceipt ? "flex-1 min-w-0" : "w-full"}`}>
            <DialogHeader className="mb-4">
              <DialogTitle className="text-base font-semibold">
                {expense.name}
              </DialogTitle>
            </DialogHeader>

            {/* Policy violation banners */}
            {hasSoftWarning && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs font-medium text-amber-700">{expense.policyViolation!.message}</p>
              </div>
            )}
            {hasHardBlock && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                <p className="text-xs font-medium text-red-700">{expense.policyViolation!.message}</p>
              </div>
            )}

            <ExpenseForm
              initialData={{
                name: expense.name,
                amount: expense.amount,
                merchantName: expense.merchantName,
                category: expense.category,
                description: expense.description,
                receiptImage: expense.receiptImage,
              }}
              categories={categories}
              onSave={(data, newReceipt) => {
                onSave(expense.id, data, newReceipt);
                onClose();
              }}
              onCancel={onClose}
              submitLabel="Save Update"
              cancelLabel="Cancel"
            />
          </div>

          {/* Right: receipt image preview panel */}
          {hasReceipt && (
            <div className="w-80 shrink-0 border-l border-border bg-gray-50 flex flex-col items-center justify-start p-5 pt-8 overflow-hidden">
              {expense.receiptImage && (expense.receiptImage.startsWith("data:image") || expense.receiptImage.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i)) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={expense.receiptImage}
                  alt="Receipt"
                  className="w-full h-auto rounded-xl object-contain max-h-[80vh] shadow-sm"
                />
              ) : (
                <div className="w-full rounded-lg border border-border bg-white flex flex-col items-center justify-center p-4 gap-2 text-center min-h-[200px]">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-xs text-muted-foreground break-all">{getReceiptFileName(expense.receiptImage)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
