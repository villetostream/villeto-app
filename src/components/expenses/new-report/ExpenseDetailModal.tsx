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
    policyViolations?: { type: string; message: string; ruleType?: string }[] | null;
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
  readOnly: _readOnly = true,
}: ExpenseDetailModalProps) {
  if (!expense) return null;

  const hasReceipt = !!expense.receiptImage;

  const fieldErrors: { amount?: string[]; receiptImage?: string[]; general?: string[] } = {};
  let hasHardBlock = false;

  if (expense.policyViolations) {
    expense.policyViolations.forEach((v) => {
      if (v.type === "hard_block" || v.type === "POLICY_RULE") hasHardBlock = true;
      const msg = v.message.toLowerCase();
      if (msg.includes("receipt")) {
        fieldErrors.receiptImage = fieldErrors.receiptImage || [];
        fieldErrors.receiptImage.push(v.message);
      } else if (msg.includes("limit")) {
        fieldErrors.amount = fieldErrors.amount || [];
        fieldErrors.amount.push(v.message);
      } else {
        fieldErrors.general = fieldErrors.general || [];
        fieldErrors.general.push(v.message);
      }
    });
  }

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

            {/* Policy violation banners (General errors only) */}
            {fieldErrors.general && fieldErrors.general.map((msg, i) => (
              <div key={i} className={`mb-4 px-3 py-2 rounded-lg border ${hasHardBlock ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                <p className={`text-xs font-medium ${hasHardBlock ? "text-red-700" : "text-amber-700"}`}>{msg}</p>
              </div>
            ))}

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
              fieldErrors={fieldErrors}
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
