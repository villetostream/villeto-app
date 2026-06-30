"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExpenseForm, type ExpenseDetailFormData } from "./ExpenseForm";
import { normalizeReceiptSrc, hasReceiptSrc } from "@/lib/utils/receipt-image";
import { logger } from "@/lib/logger";

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
    transactionDate?: Date;
    policyViolations?: { type: string; message: string; ruleType?: string }[] | null;
    justification?: string;
  } | null;
  categories: ExpenseCategory[];
  onSave: (expenseId: string, data: ExpenseDetailFormData, newReceipt?: string, justification?: string) => void;
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
  const [receiptImage, setReceiptImage] = useState("");
  const [pendingReceipt, setPendingReceipt] = useState<string | null>(null);

  useEffect(() => {
    if (!expense) return;
    setReceiptImage(expense.receiptImage || "");
    setPendingReceipt(null);
  }, [expense]);

  if (!expense) return null;

  const displayReceipt = pendingReceipt ?? receiptImage;
  const hasReceipt = hasReceiptSrc(displayReceipt);

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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSideReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;

    try {
      const base64 = await fileToBase64(file);
      setPendingReceipt(base64);
    } catch (error) {
      logger.error("Error converting receipt:", error);
    } finally {
      e.target.value = "";
    }
  };

  const confirmSideReceipt = () => {
    if (!pendingReceipt) return;
    setReceiptImage(pendingReceipt);
    setPendingReceipt(null);
  };

  const cancelSideReceipt = () => {
    setPendingReceipt(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="rounded-2xl p-0 overflow-hidden gap-0"
        style={{ maxWidth: hasReceipt ? "760px" : "480px" }}
        showCloseButton={false}
      >
        <div className="flex max-h-[85vh]">
          <div className={`flex flex-col p-5 overflow-y-auto ${hasReceipt ? "flex-1 min-w-0" : "w-full"}`}>
            <DialogHeader className="mb-3 shrink-0">
              <DialogTitle className="text-base font-semibold">
                {expense.name}
              </DialogTitle>
            </DialogHeader>

            {fieldErrors.general?.map((msg, i) => (
              <div
                key={i}
                className={`mb-3 px-3 py-2 rounded-lg border shrink-0 ${hasHardBlock ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}
              >
                <p className={`text-xs font-medium ${hasHardBlock ? "text-red-700" : "text-amber-700"}`}>
                  {msg}
                </p>
              </div>
            ))}

            <ExpenseForm
              initialData={{
                name: expense.name,
                amount: expense.amount,
                merchantName: expense.merchantName,
                category: expense.category,
                description: expense.description,
                receiptImage,
                transactionDate: expense.transactionDate,
              }}
              categories={categories}
              onSave={(data) => {
                onSave(expense.id, data, receiptImage);
                onClose();
              }}
              onCancel={onClose}
              submitLabel="Save Update"
              cancelLabel="Cancel"
              fieldErrors={fieldErrors}
              hideReceiptUpload={hasReceipt}
              compact
            />
          </div>

          {hasReceipt && (
            <div className="w-64 shrink-0 border-l border-border bg-gray-50 flex flex-col p-4 gap-3">
              <p className="text-xs font-medium text-muted-foreground">Receipt</p>
              <div className="relative flex-1 min-h-[220px] max-h-[360px] rounded-lg overflow-hidden bg-white border border-border">
                <Image
                  src={normalizeReceiptSrc(displayReceipt)}
                  alt="Receipt"
                  fill
                  unoptimized
                  className="object-contain p-2"
                />
              </div>
              {pendingReceipt ? (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-muted-foreground">Confirm this receipt?</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" className="flex-1" onClick={cancelSideReceipt}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" className="flex-1" onClick={confirmSideReceipt}>
                      Use receipt
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <input
                    id="expense-detail-receipt-change"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSideReceiptChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("expense-detail-receipt-change")?.click()}
                  >
                    Change Receipt
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
