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
import { Check, ImagePlus } from "lucide-react";
import React, { useState, useEffect } from "react";

// Define the raw form values (what the inputs give us, e.g. strings for numbers)
const expenseDetailSchema = z.object({
  name: z.string().min(1, "Expense name is required"),
  amount: z.any().transform((val) => Number(val)).pipe(z.number().min(1, "Amount must be at least 1")),
  merchantName: z.string().min(1, "Merchant is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
});

export type ExpenseDetailFormData = z.infer<typeof expenseDetailSchema>;

interface ExpenseCategory {
  categoryId: string;
  name: string;
}

interface ExpenseFormProps {
  initialData?: Partial<ExpenseDetailFormData> & { receiptImage?: string };
  categories: ExpenseCategory[];
  onSave: (data: ExpenseDetailFormData, receiptImage?: string) => void;
  onCancel: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  formId?: string;
  hideActions?: boolean;
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
}: ExpenseFormProps) {
  const [receiptImage, setReceiptImage] = useState<string>(
    initialData?.receiptImage || ""
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [hasReceiptChanged, setHasReceiptChanged] = useState(false);

  const form = useForm<ExpenseDetailFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(expenseDetailSchema as any),
    defaultValues: {
      name: initialData?.name || "",
      amount: initialData?.amount || 0,
      merchantName: initialData?.merchantName || "",
      category: initialData?.category || "",
      description: initialData?.description || "",
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || "",
        amount: initialData.amount || 0,
        merchantName: initialData.merchantName || "",
        category: initialData.category || "",
        description: initialData.description || "",
      });
      setReceiptImage(initialData.receiptImage || "");
    }
  }, [initialData, form]);

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
      setReceiptImage(base64);
      setHasReceiptChanged(true);
    } catch (error) {
      logger.error("Error converting file:", error);
    }
  };

  const handleSubmit = (data: ExpenseDetailFormData) => {
    onSave(data, receiptImage);
  };

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Expense name and Amount */}
        <div className="grid grid-cols-2 gap-4">
          <FormFieldInput
            control={form.control}
            name="name"
            label="Expenses name"
            placeholder="Enter name"
          />
          <FormFieldInput
            control={form.control}
            name="amount"
            label="Amount"
            placeholder="Enter amount"
            type="number"
            inputMode="numeric"
          />
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

        {/* Description */}
        <FormFieldTextArea
          control={form.control}
          name="description"
          label="Description"
          placeholder="Write here..."
        />

        {/* Upload Receipt */}
        <div className="space-y-2">
  <label className="text-sm font-medium text-foreground">
    Upload Receipt
  </label>
  <div className="relative border-2 border-dashed border-primary border-opacity-50 rounded-lg p-4 bg-white">
    {receiptImage ? (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
            <Check className="w-5 h-5 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
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
    {!receiptImage && (
      <div 
        className="absolute inset-0 cursor-pointer"
        onClick={() => document.getElementById("receipt-upload-input-form")?.click()}
      />
    )}
  </div>
</div>

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
