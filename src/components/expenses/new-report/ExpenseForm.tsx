"use client";

import { logger } from "@/lib/logger";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import FormFieldInput from "@/components/form fields/formFieldInput";
import FormFieldSelect from "@/components/form fields/formFieldSelect";
import FormFieldTextArea from "@/components/form fields/formFieldTextArea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ImagePlus, CalendarIcon } from "lucide-react";
import Image from "next/image";
import { normalizeReceiptSrc, hasReceiptSrc } from "@/lib/utils/receipt-image";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import React, { useState } from "react";

// Define the raw form values (what the inputs give us, e.g. strings for numbers)
const expenseDetailSchema = z.object({
  name: z.string().min(1, "Expense name is required"),
  amount: z.any().transform((val) => Number(val)).pipe(z.number().min(1, "Amount must be at least 1")),
  merchantName: z.string().min(1, "Merchant is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  transactionDate: z.date({ message: "Transaction date is required" }),
});

export type ExpenseDetailFormData = z.infer<typeof expenseDetailSchema>;

interface ExpenseCategory {
  categoryId: string;
  name: string;
}

interface ExpenseFormProps {
  initialData?: Partial<ExpenseDetailFormData> & { receiptImage?: string; transactionDate?: Date };
  categories: ExpenseCategory[];
  onSave: (data: ExpenseDetailFormData, receiptImage?: string) => void;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  formId?: string;
  hideActions?: boolean;
  hideReceiptUpload?: boolean;
  compact?: boolean;
  fieldErrors?: {
    amount?: string[];
    receiptImage?: string[];
    general?: string[];
  };
}

export function ExpenseForm({
  initialData,
  categories,
  onSave,
  onCancel,
  submitLabel = "Save Update",
  cancelLabel = "Cancel",
  formId,
  hideActions = false,
  hideReceiptUpload = false,
  compact = false,
  fieldErrors,
}: ExpenseFormProps) {
  const [receiptImage, setReceiptImage] = useState<string>(
    initialData?.receiptImage || ""
  );
  const [pendingReceipt, setPendingReceipt] = useState<string | null>(null);
  const [hasReceiptChanged, setHasReceiptChanged] = useState(false);

  const form = useForm<ExpenseDetailFormData>({
     
    resolver: zodResolver(expenseDetailSchema),
    defaultValues: {
      name: initialData?.name || "",
      amount: initialData?.amount || 0,
      merchantName: initialData?.merchantName || "",
      category: initialData?.category || "",
      description: initialData?.description || "",
      transactionDate: initialData?.transactionDate ?? new Date(),
    },
  });

  const [syncedInitialData, setSyncedInitialData] = useState(initialData);
  if (initialData && initialData !== syncedInitialData) {
    const receiptChangedFromParent =
      Boolean(syncedInitialData) &&
      initialData.receiptImage !== syncedInitialData?.receiptImage;
    setSyncedInitialData(initialData);
    form.reset({
      name: initialData.name || "",
      amount: initialData.amount || 0,
      merchantName: initialData.merchantName || "",
      category: initialData.category || "",
      description: initialData.description || "",
      transactionDate: initialData.transactionDate ?? new Date(),
    });
    setReceiptImage(initialData.receiptImage || "");
    setPendingReceipt(null);
    if (receiptChangedFromParent) {
      setHasReceiptChanged(true);
    } else {
      setHasReceiptChanged(false);
    }
  }

  const receiptPreviewSrc = normalizeReceiptSrc(pendingReceipt ?? "");
  const hasCommittedReceipt = hasReceiptSrc(receiptImage);
  const isPreviewingSelection = Boolean(pendingReceipt);

  const categoryOptions = categories.map((cat) => ({
    label: cat.name,
    value: cat.name,
  }));

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleReceiptChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setPendingReceipt(base64);
    } catch (error) {
      logger.error("Error converting file:", error);
    } finally {
      e.target.value = "";
    }
  };

  const confirmPendingReceipt = () => {
    if (!pendingReceipt) return;
    setReceiptImage(pendingReceipt);
    setPendingReceipt(null);
    setHasReceiptChanged(true);
  };

  const cancelPendingReceipt = () => {
    setPendingReceipt(null);
  };

  const handleSubmit = (data: ExpenseDetailFormData) => {
    onSave(data, receiptImage);
  };

  const isSubmitDisabled = (() => {
    if (!fieldErrors) return false;
    
    // Check amount
    if (fieldErrors.amount && fieldErrors.amount.length > 0) {
      if (!form.formState.dirtyFields.amount) return true;
    }
    
    // Check receipt
    if (fieldErrors.receiptImage && fieldErrors.receiptImage.length > 0) {
      if (!hasReceiptChanged) return true;
    }

    // Check general
    if (fieldErrors.general && fieldErrors.general.length > 0) {
      if (!form.formState.isDirty && !hasReceiptChanged) return true;
    }

    return false;
  })();

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className={compact ? "space-y-3" : "space-y-4"}>
        {/* Expense name and Amount */}
        <div className="grid grid-cols-2 gap-4">
          <FormFieldInput
            control={form.control}
            name="name"
            label="Expenses name"
            placeholder="Enter name"
          />
          <div>
            <FormFieldInput
              control={form.control}
              name="amount"
              label="Amount"
              placeholder="Enter amount"
              type="number"
              inputMode="numeric"
            />
            {fieldErrors?.amount && fieldErrors.amount.map((err, i) => (
              <p key={i} className="text-xs font-medium text-red-500 mt-1">{err}</p>
            ))}
          </div>
        </div>

        {/* Merchant and Category */}
        <div className="grid grid-cols-2 gap-4">
          <FormFieldInput
            control={form.control}
            name="merchantName"
            label="Merchant"
            placeholder="Select Merchant"
          />
          <FormFieldSelect
            control={form.control}
            name="category"
            label="Expense Category"
            placeholder="Select expense"
            values={categoryOptions}
          />
        </div>

        {/* Transaction Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Transaction Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  !form.watch("transactionDate") && "text-muted-foreground"
                )}
              >
                <span>
                  {form.watch("transactionDate")
                    ? format(form.watch("transactionDate"), "PPP")
                    : "Pick a date"}
                </span>
                <CalendarIcon className="h-4 w-4 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={form.watch("transactionDate")}
                onSelect={(date) => form.setValue("transactionDate", date ?? new Date(), { shouldValidate: true })}
                disabled={(date) => date > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {form.formState.errors.transactionDate && (
            <p className="text-xs font-medium text-red-500">
              {form.formState.errors.transactionDate.message}
            </p>
          )}
        </div>

        {/* Description */}
        <FormFieldTextArea
          control={form.control}
          name="description"
          label="Description"
          placeholder="Write here..."
          rows={compact ? 2 : undefined}
        />

        {/* Upload Receipt — hidden in modal when receipt is shown in side panel */}
        {!hideReceiptUpload && (
        <div className="space-y-2">
  <label className="text-sm font-medium text-foreground">
    Upload Receipt
  </label>
  <div className="relative border-2 border-dashed border-primary border-opacity-50 rounded-lg p-4 bg-white">
    {isPreviewingSelection ? (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">Review your receipt before confirming.</p>
        <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted/20 border border-border">
          <Image
            src={receiptPreviewSrc}
            alt="Receipt preview"
            fill
            unoptimized
            className="object-contain"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cancelPendingReceipt}
          >
            Cancel
          </Button>
          <input
            id="receipt-form-input-reselect"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleReceiptChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              document.getElementById("receipt-form-input-reselect")?.click()
            }
          >
            Choose different
          </Button>
          <Button type="button" size="sm" onClick={confirmPendingReceipt}>
            Use this receipt
          </Button>
        </div>
      </div>
    ) : hasCommittedReceipt ? (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
            <Check className="w-5 h-5 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">
            Receipt Uploaded
          </span>
        </div>
        <input
          id="receipt-form-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleReceiptChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            document.getElementById("receipt-form-input")?.click()
          }
          className="text-primary border-primary hover:bg-primary/10 bg-white"
        >
          Change
        </Button>
      </div>
    ) : (
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded bg-gray-50 flex items-center justify-center border">
          <ImagePlus className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Upload Document</p>
          <p className="text-xs text-muted-foreground">pdf, jpeg, png, etc</p>
        </div>
        <input
          id="receipt-upload-input-form"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleReceiptChange}
        />
      </div>
    )}
    {!isPreviewingSelection && !hasCommittedReceipt && (
      <div 
        className="absolute inset-0 cursor-pointer"
        onClick={() => document.getElementById("receipt-upload-input-form")?.click()}
      />
    )}
  </div>
  {fieldErrors?.receiptImage && fieldErrors.receiptImage.map((err, i) => (
    <p key={i} className="text-xs font-medium text-red-500 mt-1">{err}</p>
  ))}
</div>
        )}

        {/* Actions */}
        {!hideActions && (
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground hover:bg-transparent px-0 underline"
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitDisabled}
              className="bg-primary hover:bg-primary/90 text-white rounded-lg px-6"
            >
              {submitLabel}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
