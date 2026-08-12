"use client";

import Image from "next/image";
import { useState, useEffect, useMemo, type ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  useFieldArray,
  SubmitHandler,
  FieldValues,
  useWatch,
  type Control,
} from "react-hook-form";
import { z } from "zod";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { Label } from "../ui/label";
import FormFieldInput from "../form fields/formFieldInput";
import FormFieldSelect from "../form fields/formFieldSelect";
import FormFieldTextArea from "../form fields/formFieldTextArea";
import { Trash } from "iconsax-reactjs";
import FormFieldCalendar from "../form fields/FormFieldCalendar";
import { logger } from "@/lib/logger";
import useModal from "@/hooks/useModal";
import SuccessModal from "../modals/SuccessModal";
import { SplitExpense, type SplitExpenseFormValues } from "./split/SplitExpenseform";
import { splitExpenseSchema } from "./split/splitSchema";
import { useRouter, useSearchParams } from "next/navigation";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { Loader2, AlertCircle, Check, Eye, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidatePersonalExpenseQueries } from "@/lib/react-query/expenses";
import { getApiErrorMessage, isPolicyViolationError, isDuplicateReceiptError, getDuplicateReceipts, getPolicyErrorsByExpenseIndex, DuplicateReceiptItem } from "@/lib/types/api-error";
import { normalizeReceiptSrc, hasReceiptSrc } from "@/lib/utils/receipt-image";
import { CompanyExpenseItemModal } from "@/components/expenses/company/CompanyExpenseItemModal";
import { PolicyJustificationDrawer, type PolicyRequiredAction } from "@/components/expenses/PolicyJustificationDrawer";
import {
  extractedReceiptValues,
  uploadAndExtractReceipt,
} from "@/lib/receipt-extraction";

interface ExpenseCategory {
  categoryId: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

interface CategoryApiResponse {
  message: string;
  status: number;
  data: ExpenseCategory[];
}

const expenseItemSchema = z.object({
  title: z.string().min(1, "Expense title is required"),
  vendor: z.string().min(1, "Vendor name is required"),
  amount: z.coerce.number<number>().min(1, "Amount is required"),
  transactionDate: z.date().refine((val) => !!val, {
    message: "Transaction date is required",
  }),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  receipt: z.string().optional(),
  receiptExtractionId: z.string().optional(),
  pendingReceipt: z.string().optional(),
  pendingExtractionId: z.string().optional(),
  splits: z.array(splitExpenseSchema).optional(),
});

const expenseFormSchema = z.object({
  expenses: z
    .array(expenseItemSchema)
    .min(1, "At least one expense is required"),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

type PersonalExpenseStatus = "draft" | "pending";
type PersonalExpenseRow = {
  id: number;
  date: string;
  vendor: string;
  category: string;
  amount: number;
  hasReceipt: boolean;
  status: PersonalExpenseStatus;
  receiptImage?: string;
  reportName?: string;
  title?: string;
  description?: string;
  groupId?: string; // For grouping multiple expenses with same report name
  isGrouped?: boolean; // True if this is a grouped entry
  groupedExpenses?: PersonalExpenseRow[]; // Array of individual expenses in the group
  totalAmount?: number; // Total amount for grouped expenses
};

function formatDateForTable(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear());
  return `${day}-${month}-${year}`;
}

function getNextPersonalExpenseId(existing: PersonalExpenseRow[]): number {
  const maxId = existing.reduce((m, r) => Math.max(m, r.id ?? 0), 0);
  return maxId + 1;
}

function readPersonalExpenses(): PersonalExpenseRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("personal-expenses");
    const parsed = raw ? (JSON.parse(raw) as PersonalExpenseRow[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePersonalExpenses(rows: PersonalExpenseRow[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("personal-expenses", JSON.stringify(rows));
  window.dispatchEvent(new Event("personal-expenses-updated"));
}

// Helper to format date to ISO string format (YYYY-MM-DDTHH:mm:ss.sssZ)
const toISODateString = (date: Date | string) => {
  const d = new Date(date);
  // Set time to midnight UTC for the date
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};

interface ReportDetail {
  reportId: string;
  reportTitle: string;
  status?: string;
  expenses: Array<{
    expenseId: string;
    title: string;
    merchantName: string;
    amount: string;
    transactionDate: string;
    categoryName: string;
    description?: string;
    receiptUrl?: string;
  }>;
}

interface ManualExpenseFormProps {
  isEditMode?: boolean;
  reportDetail?: ReportDetail;
  reportId?: string;
  onDeleteExpense?: (expenseId: string, title: string) => void;
  onUpdateSuccess?: () => void; // Callback to refetch report details after successful update
}

export function ManualExpenseForm({
  isEditMode = false,
  reportDetail,
  reportId,
  onDeleteExpense,
  onUpdateSuccess,
}: ManualExpenseFormProps = {}) {
  const [originalFiles, setOriginalFiles] = useState<string[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [policyErrorsByIndex, setPolicyErrorsByIndex] = useState<Record<number, string>>({});
  const [duplicateErrorsByIndex, setDuplicateErrorsByIndex] = useState<Record<number, DuplicateReceiptItem[]>>({});
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicateReceiptItem | null>(null);
  // ACTION_REQUIRED policy state
  const [requiredActionsByIndex, setRequiredActionsByIndex] = useState<Record<number, PolicyRequiredAction>>({});
  const [justificationsByIndex, setJustificationsByIndex] = useState<Record<number, string>>({});
  const [drawerOpenForIndex, setDrawerOpenForIndex] = useState<number | null>(null);
  // Controlled accordion: start with first item open; auto-expand flagged items
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>(["expense-0"]);
  const searchParams = useSearchParams();
  const reportName = isEditMode
    ? reportDetail?.reportTitle || ""
    : decodeURIComponent((searchParams.get("name") ?? "") as string);
  const reportDate = isEditMode
    ? new Date().toDateString()
    : decodeURIComponent(searchParams.get("date") ?? "");
  const { isOpen: IsSuccess, toggle: successToggle } = useModal();
  const router = useRouter();
  const axios = useAxios();
  const queryClient = useQueryClient();

  // Fetch expense categories from API
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const response = await axios.get<CategoryApiResponse>(
          API_KEYS.EXPENSE.CATEGORIES,
        );
        logger.log(response.data);
        if (response.data?.data && Array.isArray(response.data.data)) {
          setCategories(response.data.data);
        } else {
          toast.error("Failed to load expense categories");
        }
      } catch (error: unknown) {
        logger.error("Error fetching categories:", error);
        const errorMessage =
          (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ||
          "Failed to load expense categories. Please try again.";
        toast.error(errorMessage);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [axios]);

  const [files, setFiles] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const storedImages = sessionStorage.getItem("uploadedReceipts");
    return storedImages ? JSON.parse(storedImages) : [];
  });

  const defaultExpense = useMemo(
    () => ({
      title: "",
      vendor: "",
      amount: 0,
      transactionDate: new Date(),
      category: "",
      description: "",
      receipt: "",
      receiptExtractionId: "",
      pendingReceipt: "",
      pendingExtractionId: "",
    }),
    [],
  );

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      expenses: [defaultExpense],
    },
  });

  // Load receipt images and initialize form fields
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
    if (isEditMode && reportDetail && reportDetail.expenses) {
      // Load existing expenses for edit mode
      const existingExpenses = reportDetail.expenses.map((expense) => ({
        title: expense.title || "",
        vendor: expense.merchantName || "",
        amount: parseFloat(expense.amount) || 0,
        transactionDate: new Date(expense.transactionDate),
        category: expense.categoryName || "",
        description: expense.description || "",
        receipt: expense.receiptUrl || "",
      }));

      // Load receipt images
      const receiptImages = reportDetail.expenses
        .map((expense) => expense.receiptUrl)
        .filter((url): url is string => Boolean(url));
      setFiles(receiptImages);
      setOriginalFiles([...receiptImages]); // Store original for change detection

      form.reset({ expenses: existingExpenses });
    } else {
      const storedImages = sessionStorage.getItem("uploadedReceipts");
      if (storedImages) {
        const parsedImages = JSON.parse(storedImages);
        setFiles(parsedImages);
        setOriginalFiles([...parsedImages]);

        const initialExpenses = parsedImages.map((receipt: string) => {
          return {
            ...defaultExpense,
            title: "",
            receipt,
          };
        });

        if (initialExpenses.length > 0) {
          form.reset({ expenses: initialExpenses });
        }
      }
    }
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [isEditMode, reportDetail, form, defaultExpense]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "expenses",
  });

  const amountFieldsNames = Array(fields.length)
    .fill(null)
    .map(
      (_, index) => `expenses.${index}.amount`,
    ) as Array<`expenses.${number}.amount`>;

  const amounts = useWatch({ control: form.control, name: amountFieldsNames });

  const receiptFieldsNames = Array(fields.length)
    .fill(null)
    .map(
      (_, index) => `expenses.${index}.receipt`,
    ) as Array<`expenses.${number}.receipt`>;
  const receipts = useWatch({ control: form.control, name: receiptFieldsNames });

  const pendingReceiptFieldsNames = Array(fields.length)
    .fill(null)
    .map(
      (_, index) => `expenses.${index}.pendingReceipt`,
    ) as Array<`expenses.${number}.pendingReceipt`>;
  const pendingReceipts = useWatch({ control: form.control, name: pendingReceiptFieldsNames });

  const confirmPendingReceipt = (expenseIndex: number) => {
    const pending = form.getValues(`expenses.${expenseIndex}.pendingReceipt`);
    if (!pending) return;
    setFiles((prev) => {
      const next = [...(prev ?? [])];
      next[expenseIndex] = pending;
      return next;
    });
    form.setValue(`expenses.${expenseIndex}.receipt`, pending, {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.clearErrors(`expenses.${expenseIndex}.receipt`);
    const pendingExtractionId = form.getValues(`expenses.${expenseIndex}.pendingExtractionId`);
    form.setValue(`expenses.${expenseIndex}.receiptExtractionId`, pendingExtractionId || "", { shouldDirty: true });
    
    form.setValue(`expenses.${expenseIndex}.pendingReceipt`, "", { shouldDirty: true });
    form.setValue(`expenses.${expenseIndex}.pendingExtractionId`, "", { shouldDirty: true });
  };

  const cancelPendingReceipt = (expenseIndex: number) => {
    form.setValue(`expenses.${expenseIndex}.pendingReceipt`, "", { shouldDirty: true });
    form.setValue(`expenses.${expenseIndex}.pendingExtractionId`, "", { shouldDirty: true });
  };

  const renderReceiptPanel = (index: number) => {
    const pending = pendingReceipts[index];
    const hasCommitted = hasReceiptSrc(files[index] || receipts?.[index]);
    const inputId = `receipt-input-${index}`;

    return (
      <div className="max-w-sm">
        <Label className="text-xs leading-[125%] font-normal text-foreground mb-1.5 block">
          Receipt
        </Label>
        <div className="rounded-lg border border-border bg-white p-3 h-[420px] flex items-center justify-center relative">
          <input
            id={inputId}
            type="file"
            accept="image/*"
            aria-label={`Upload receipt for item ${index + 1}`}
            className="hidden"
            onChange={(e) => onReceiptSelect(index, e)}
          />
          {pending ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-2">
              <p className="text-xs text-muted-foreground text-center">
                Review your receipt before confirming.
              </p>
              <div className="relative w-full flex-1 min-h-0 rounded-lg overflow-hidden bg-muted/20 border border-border">
                <Image
                  src={normalizeReceiptSrc(pending)}
                  alt="Receipt preview"
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => cancelPendingReceipt(index)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outlinePrimary"
                  size="sm"
                  onClick={() => document.getElementById(inputId)?.click()}
                >
                  Choose different
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => confirmPendingReceipt(index)}
                >
                  Use this receipt
                </Button>
              </div>
            </div>
          ) : hasCommitted ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Receipt uploaded</p>
              <Button
                type="button"
                variant="outlinePrimary"
                size="sm"
                onClick={() => document.getElementById(inputId)?.click()}
              >
                Change Receipt
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center px-6 space-y-3">
              <div className="text-muted-foreground font-medium">
                No receipt uploaded for this item.
              </div>
              <div className="text-muted-foreground">
                Receipt is required for final submission. You can save as draft
                without a receipt.
              </div>
              <Button
                type="button"
                variant="outlinePrimary"
                onClick={() => document.getElementById(inputId)?.click()}
              >
                Continue to upload receipt
              </Button>
            </div>
          )}
        </div>
        <FormField
          control={form.control}
          name={`expenses.${index}.receipt`}
          render={() => (
            <FormItem className="pt-2">
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  };

  const hasAllReceipts = fields.every((_, idx) =>
    hasReceiptSrc(files[idx] || receipts?.[idx]),
  );

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const onReceiptSelect = async (
    expenseIndex: number,
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image receipt.");
      return;
    }

    try {
      const toastId = toast.loading("Reading receipt…");
      try {
        const extraction = await uploadAndExtractReceipt(axios, file);
        const extracted = extractedReceiptValues(extraction);
        form.setValue(`expenses.${expenseIndex}.pendingReceipt`, extraction.receiptUrl, { shouldDirty: true });
        form.setValue(`expenses.${expenseIndex}.pendingExtractionId`, extraction.expenseReceiptExtractionId, { shouldDirty: true });
        if (extracted.merchantName) {
          form.setValue(`expenses.${expenseIndex}.vendor`, extracted.merchantName, {
            shouldDirty: true,
          });
          if (!form.getValues(`expenses.${expenseIndex}.title`)) {
            form.setValue(`expenses.${expenseIndex}.title`, extracted.merchantName, {
              shouldDirty: true,
            });
          }
        }
        if (extracted.amount > 0) {
          form.setValue(`expenses.${expenseIndex}.amount`, extracted.amount, {
            shouldDirty: true,
          });
        }
        form.setValue(
          `expenses.${expenseIndex}.transactionDate`,
          extracted.transactionDate,
          { shouldDirty: true },
        );
        toast.success("Receipt details added. Review them before saving.", {
          id: toastId,
        });
      } catch (error) {
        logger.error("Receipt extraction failed:", error);
        const base64 = await fileToBase64(file);
        form.setValue(`expenses.${expenseIndex}.pendingReceipt`, base64, { shouldDirty: true });
        form.setValue(`expenses.${expenseIndex}.pendingExtractionId`, "", { shouldDirty: true });
        toast.warning("Receipt attached. Enter its details manually.", {
          id: toastId,
        });
      }
    } catch {
      toast.error("Failed to upload receipt. Please try again.");
    } finally {
      e.target.value = "";
    }
  };

  // Watch form values to trigger re-renders when form changes
  const watchedValues = useWatch({ control: form.control });
  const formDirty = form.formState.isDirty;

  // Check if form has been modified from original state (for edit mode)
  const hasFormChanges = (() => {
    if (!isEditMode || !reportDetail) return true; // Always enabled for create mode

    // Check if files have changed
    const filesChanged =
      files.length !== originalFiles.length ||
      files.some((file, idx) => file !== originalFiles[idx]);

    // Check if expense count changed
    const expenseCountChanged =
      watchedValues.expenses?.length !== reportDetail.expenses.length;

    return formDirty || filesChanged || expenseCountChanged;
  })();

  const applyPolicyErrorState = (error: unknown, values: ExpenseFormValues) => {
    const meta = values.expenses.map((e) => ({
      title: e.title,
      category: e.category,
      amount: e.amount,
    }));
    setPolicyErrorsByIndex(getPolicyErrorsByExpenseIndex(meta, error));
  };

  const applyDuplicateErrorState = (error: unknown) => {
    const duplicates = getDuplicateReceipts(error);
    if (duplicates.length > 0) {
      setDuplicateErrorsByIndex({ 0: duplicates });
    } else {
      setDuplicateErrorsByIndex({});
    }
  };

  const addExpense = () => {
    append({
      title: "",
      vendor: "",
      amount: 0,
      category: "",
      description: "",
      transactionDate: new Date(),
      receipt: "",
    });
  };

  const removeExpense = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      toast.error("You must have at least one expense item");
    }
  };

  const handleRemoveOrDelete = (index: number) => {
    if (isEditMode && onDeleteExpense && reportDetail?.expenses?.[index]) {
      const expense = reportDetail.expenses[index];
      onDeleteExpense(expense.expenseId, expense.title);
    } else {
      removeExpense(index);
    }
  };

  // Helper to extract pure base64 string from data URL
  const extractBase64 = (dataUrl: string): string => {
    if (!dataUrl || typeof dataUrl !== "string") return "";

    // If it's already a pure base64 string (no data: prefix), return as-is
    if (!dataUrl.startsWith("data:")) {
      return dataUrl.trim();
    }

    // Remove data:image/...;base64, prefix if present
    const base64Match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
    if (base64Match && base64Match[1]) {
      return base64Match[1].trim();
    }

    // If it's a data URL but doesn't match the pattern, try to extract after comma
    const commaIndex = dataUrl.indexOf(",");
    if (commaIndex !== -1) {
      return dataUrl.substring(commaIndex + 1).trim();
    }

    // Fallback: return empty string if we can't parse it
    logger.warn("Could not extract base64 from:", dataUrl.substring(0, 50));
    return "";
  };

  // Build payload for backend submission (reusable for both submit and draft)
  const buildExpensePayload = (
    data: ExpenseFormValues,
    includeReceipts: boolean,
    status: "draft" | "pending",
    justifications: Record<number, string> = {},
    requiredActions: Record<number, PolicyRequiredAction> = {},
  ) => {
    // Validate all categories exist
    const invalidCategories = data.expenses.filter(
      (expense) => !categories.find((cat) => cat.name === expense.category),
    );

    if (invalidCategories.length > 0) {
      throw new Error(
        "Invalid category selected. Please ensure all expenses have valid categories.",
      );
    }

    // Build expenses array
    const expensesPayload = data.expenses.map((expense, idx) => {
      const category = categories.find((cat) => cat.name === expense.category);
      if (!category) {
        throw new Error(`Category not found: ${expense.category}`);
      }

      // Build base expense object
      const expenseObj: {
        title: string;
        merchantName: string;
        description: string;
        expenseCategoryId: string;
        amount: number;
        transactionDate: string;
        receiptImage?: string;
        receiptExtractionId?: string;
        justification?: string;
      } = {
        title: expense.title,
        merchantName: expense.vendor,
        description: expense.description || "",
        expenseCategoryId: category.categoryId || (category as { id?: string }).id || "",
        amount: Number(expense.amount),
        transactionDate: toISODateString(expense.transactionDate || new Date()),
      };

      if (expense.receiptExtractionId || expense.pendingExtractionId) {
        expenseObj.receiptExtractionId = expense.receiptExtractionId || expense.pendingExtractionId;
      }

      // Only attach justification when the backend explicitly required it for this expense
      // (i.e. there is an active ACTION_REQUIRED entry for this index)
      if (requiredActions[idx] && justifications[idx]?.trim()) {
        expenseObj.justification = justifications[idx].trim();
      }

      // Only include receiptImage if it's a new base64 upload (starts with data:)
      if (includeReceipts) {
        const receiptSource = files[idx] || expense.receipt || "";
        if (receiptSource.startsWith("data:")) {
          const receiptImage = extractBase64(receiptSource);
          if (receiptImage && receiptImage.trim() !== "") {
            expenseObj.receiptImage = receiptImage;
          }
        }
      }

      return expenseObj;
    });

    return {
      reportTitle: reportName || "Expense Report",
      status,
      expenses: expensesPayload,
    };
  };

  // Build payload for PATCH /reports/{reportId} - updates entire report with all expenses
  const buildPatchReportPayload = (
    data: ExpenseFormValues,
    includeReceipts: boolean,
    justifications: Record<number, string> = {},
    requiredActions: Record<number, PolicyRequiredAction> = {},
  ) => {
    // Validate all categories exist
    const invalidCategories = data.expenses.filter(
      (expense) => !categories.find((cat) => cat.name === expense.category),
    );

    if (invalidCategories.length > 0) {
      throw new Error(
        "Invalid category selected. Please ensure all expenses have valid categories.",
      );
    }

    // Build expenses array with all expenses (existing + new)
    const expensesPayload = data.expenses.map((expense, idx) => {
      const category = categories.find((cat) => cat.name === expense.category);
      if (!category) {
        throw new Error(`Category not found: ${expense.category}`);
      }

      // Build base expense object
      const expenseObj: {
        title: string;
        merchantName: string;
        description: string;
        expenseCategoryId: string;
        amount: number;
        transactionDate: string;
        receiptImage?: string;
        receiptExtractionId?: string;
        expenseId?: string;
        justification?: string;
      } = {
        title: expense.title,
        merchantName: expense.vendor,
        description: expense.description || "",
        expenseCategoryId: category.categoryId || (category as { id?: string }).id || "",
        amount: Number(expense.amount),
        transactionDate: toISODateString(expense.transactionDate || new Date()),
      };

      if (expense.receiptExtractionId) {
        expenseObj.receiptExtractionId = expense.receiptExtractionId;
      }

      // Include expenseId for existing expenses (from reportDetail)
      if (isEditMode && reportDetail?.expenses?.[idx]) {
        expenseObj.expenseId = reportDetail.expenses[idx].expenseId;
      }

      // Only attach justification when the backend explicitly required it for this expense
      if (requiredActions[idx] && justifications[idx]?.trim()) {
        expenseObj.justification = justifications[idx].trim();
      }

      // Only include receiptImage if it's a new base64 upload (starts with data:)
      if (includeReceipts) {
        const receiptSource = files[idx] || expense.receipt || "";
        if (receiptSource.startsWith("data:")) {
          const receiptImage = extractBase64(receiptSource);
          if (receiptImage && receiptImage.trim() !== "") {
            expenseObj.receiptImage = receiptImage;
          }
        }
      }

      return expenseObj;
    });

    return {
      reportTitle: reportName || reportDetail?.reportTitle || "Expense Report",
      expenses: expensesPayload,
    };
  };

  const persistToPersonalExpenses = (
    data: ExpenseFormValues,
    status: PersonalExpenseStatus,
  ) => {
    // NOTE: This function is deprecated and should not be used for new expenses
    // All expenses are now stored on the server via API
    // This function is kept for backward compatibility but should not store base64 images
    // to avoid localStorage quota issues
    
    const existing = readPersonalExpenses();
    let nextId = getNextPersonalExpenseId(existing);

    // If multiple expenses submitted in a single session, group them
    if (data.expenses.length > 1) {
      const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const totalAmount = data.expenses.reduce(
        (sum, exp) => sum + Number(exp.amount),
        0,
      );

      // Create individual expense entries for detail view
      // DO NOT store base64 images - only metadata
      const individualExpenses: PersonalExpenseRow[] = data.expenses.map(
        (expense, idx) => {
          const expenseId = nextId++;
          const hasReceipt = Boolean(files[idx] || expense.receipt);

          // Store report name and date for this expense (metadata only)
          if (typeof window !== "undefined" && reportName && reportDate) {
            sessionStorage.setItem(
              `expense-report-name-${expenseId}`,
              reportName,
            );
            sessionStorage.setItem(
              `expense-report-date-${expenseId}`,
              reportDate,
            );
          }

          return {
            id: expenseId,
            date: formatDateForTable(expense.transactionDate),
            vendor: expense.vendor,
            category: expense.category,
            amount: Number(expense.amount),
            hasReceipt,
            status,
            // DO NOT store receiptImage (base64) - it causes localStorage quota issues
            reportName: reportName || undefined,
            title: expense.title,
            description: expense.description || undefined,
            groupId,
          };
        },
      );

      // Create a single grouped entry for the table
      const groupedEntry: PersonalExpenseRow = {
        id: nextId++,
        date: formatDateForTable(data.expenses[0].transactionDate), // Use first expense date
        vendor: "", // Not displayed in table
        category: data.expenses[0].category, // Use first expense category
        amount: totalAmount,
        hasReceipt: individualExpenses.some((e) => e.hasReceipt),
        status,
        reportName: reportName || undefined,
        groupId,
        isGrouped: true,
        groupedExpenses: individualExpenses,
        totalAmount,
      };

      // Store metadata only (no base64 images)
      if (typeof window !== "undefined") {
        // Store individual expenses (already without base64 images)
        const expensesWithoutImages = individualExpenses;
        sessionStorage.setItem(
          `expense-group-${groupId}`,
          JSON.stringify(expensesWithoutImages),
        );
        sessionStorage.setItem(
          `expense-report-name-${groupedEntry.id}`,
          reportName,
        );
        sessionStorage.setItem(
          `expense-report-date-${groupedEntry.id}`,
          reportDate,
        );
      }

      writePersonalExpenses([groupedEntry, ...existing]);
    } else {
      // Single expense or no report name - create individual entries
      // DO NOT store base64 images - only metadata
      const newRows: PersonalExpenseRow[] = data.expenses.map(
        (expense, idx) => {
          const expenseId = nextId++;
          const hasReceipt = Boolean(files[idx] || expense.receipt);

          // Store report name and date for this expense (metadata only)
          if (typeof window !== "undefined" && reportName && reportDate) {
            sessionStorage.setItem(
              `expense-report-name-${expenseId}`,
              reportName,
            );
            sessionStorage.setItem(
              `expense-report-date-${expenseId}`,
              reportDate,
            );
          }

          return {
            id: expenseId,
            date: formatDateForTable(expense.transactionDate),
            vendor: expense.vendor,
            category: expense.category,
            amount: Number(expense.amount),
            hasReceipt,
            status,
            // DO NOT store receiptImage (base64) - it causes localStorage quota issues
            reportName: reportName || undefined,
            title: expense.title,
            description: expense.description || undefined,
          };
        },
      );

      writePersonalExpenses([...newRows, ...existing]);
    }
  };

  const onSubmit = async (data: ExpenseFormValues) => {
    // Receipt is mandatory for final submission.
    const missingReceiptIndexes = data.expenses
      .map((expense, idx) => {
        const receiptBase64 = files[idx] || expense.receipt;
        return receiptBase64 ? null : idx;
      })
      .filter((v): v is number => v !== null);

    if (missingReceiptIndexes.length > 0) {
      missingReceiptIndexes.forEach((idx) => {
        form.setError(`expenses.${idx}.receipt`, {
          type: "manual",
          message: "Receipt is required to submit.",
        });
      });
      toast.error("Please upload a receipt before submitting.");
      return;
    }

    // Validate splits
    const invalidSplits = data.expenses.some((expense) => {
      if (expense.splits && expense.splits.length > 0) {
        const totalSplitAmount = expense.splits.reduce(
          (sum, split) => sum + split.amount,
          0,
        );
        return Math.abs(totalSplitAmount - expense.amount) > 0.01;
      }
      return false;
    });

    if (invalidSplits) {
      toast.error("Total split amounts must equal the expense amount");
      return;
    }

    // In edit mode, check if report is in draft status before allowing submission
    if (isEditMode && reportDetail) {
      const currentStatus = reportDetail.status?.toLowerCase();
      if (currentStatus && currentStatus !== "draft") {
        toast.error(
          `This report is in "${currentStatus}" status and cannot be edited. Only reports in draft status can be modified.`,
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);

      if (isEditMode && reportId && reportDetail?.expenses) {
        // Use single PATCH /reports/{reportId} endpoint to update entire report
        const basePayload = buildPatchReportPayload(data, true, justificationsByIndex, requiredActionsByIndex);
        const reportPayload = {
          ...basePayload,
          status: "pending", // Explicitly set to pending on final submit
        };
        const response = await axios.patch(`reports/${reportId}`, reportPayload);

        // Check if the policy engine requires ACTION_REQUIRED (201 but not submitted)
        const responseData = response.data?.data;
        if (responseData?.submitted === false && responseData?.resolution === "ACTION_REQUIRED") {
          const actions: PolicyRequiredAction[] = Array.isArray(responseData.requiredActions)
            ? responseData.requiredActions
            : [];
          const byIndex: Record<number, PolicyRequiredAction> = {};
          actions.forEach((a) => { byIndex[a.expenseIndex] = a; });
          setRequiredActionsByIndex(byIndex);
          // Auto-expand all flagged accordion items so user can see the amber banners
          setOpenAccordionItems((prev) => {
            const flaggedKeys = actions.map((a) => `expense-${a.expenseIndex}`);
            return Array.from(new Set([...prev, ...flaggedKeys]));
          });
          const needsReceipt = actions.some((a) => a.requiredFields?.includes("receiptUrl"));
          const needsJustification = actions.some((a) => a.requiredFields?.includes("justification") || a.requiredFields?.includes("policyJustification"));
          const toastMsg = needsReceipt && needsJustification
            ? "Some expenses require a receipt and a written explanation before they can be submitted. See highlighted items below."
            : needsReceipt
            ? "Some expenses require a receipt before they can be submitted. Please attach one to the highlighted expense(s) below."
            : "Your report needs a written explanation before it can be submitted. See the highlighted expense(s) below.";
          toast.warning(toastMsg, { duration: 6000 });
          return;
        }

        // Successful submission — clear any pending action state
        setRequiredActionsByIndex({});
        setJustificationsByIndex({});
        setPolicyErrorsByIndex({});
        toast.success(
          `Your ${data.expenses.length} expense(s) have been updated and submitted successfully.`,
        );
        
        // Invalidate React Query cache to refetch personal expenses and report details
        invalidatePersonalExpenseQueries(queryClient);
        queryClient.invalidateQueries({
          queryKey: [API_KEYS.EXPENSE.PERSONAL_EXPENSES, reportId],
        });
        
        // Refetch report details if callback is provided
        if (onUpdateSuccess) {
          onUpdateSuccess();
        }
        
        // Show success modal and navigate after a short delay to allow modal to render
        successToggle();
        sessionStorage.removeItem("uploadedReceipts");
        // Delay navigation slightly to allow success modal to show
        setTimeout(() => {
          const returnTab =
            sessionStorage.getItem("expensesReturnTab") || "personal-expenses";
          const returnPage = sessionStorage.getItem("expensesReturnPage") || "1";
          router.push(`/expenses?tab=${returnTab}&page=${returnPage}`);
        }, 500);
      } else {
        // Use POST for creating new expenses
        const payload = buildExpensePayload(data, true, "pending", justificationsByIndex, requiredActionsByIndex);
        const response = await axios.post(API_KEYS.EXPENSE.REPORTS, payload);

        // Check if the policy engine requires ACTION_REQUIRED (201 but not submitted)
        const responseData = response.data?.data;
        if (responseData?.submitted === false && responseData?.resolution === "ACTION_REQUIRED") {
          const actions: PolicyRequiredAction[] = Array.isArray(responseData.requiredActions)
            ? responseData.requiredActions
            : [];
          const byIndex: Record<number, PolicyRequiredAction> = {};
          actions.forEach((a) => { byIndex[a.expenseIndex] = a; });
          setRequiredActionsByIndex(byIndex);
          // Auto-expand all flagged accordion items so user can see the amber banners
          setOpenAccordionItems((prev) => {
            const flaggedKeys = actions.map((a) => `expense-${a.expenseIndex}`);
            return Array.from(new Set([...prev, ...flaggedKeys]));
          });
          const needsReceipt = actions.some((a) => a.requiredFields?.includes("receiptUrl"));
          const needsJustification = actions.some((a) => a.requiredFields?.includes("justification") || a.requiredFields?.includes("policyJustification"));
          const toastMsg = needsReceipt && needsJustification
            ? "Some expenses require a receipt and a written explanation before they can be submitted. See highlighted items below."
            : needsReceipt
            ? "Some expenses require a receipt before they can be submitted. Please attach one to the highlighted expense(s) below."
            : "Your report needs a written explanation before it can be submitted. See the highlighted expense(s) below.";
          toast.warning(toastMsg, { duration: 6000 });
          return;
        }

        // Successful submission — clear any pending action state
        setRequiredActionsByIndex({});
        setJustificationsByIndex({});
        setPolicyErrorsByIndex({});
        toast.success(
          `Your ${data.expenses.length} expense(s) have been submitted successfully.`,
        );

        // Invalidate React Query cache to refetch personal expenses
        invalidatePersonalExpenseQueries(queryClient);

        form.reset({
          expenses: [
            {
              title: "",
              vendor: "",
              amount: 0,
              category: "",
              description: "",
              transactionDate: new Date(),
              receipt: "",
              splits: [],
            },
          ],
        });
        successToggle();
        sessionStorage.removeItem("uploadedReceipts");
        // Delay navigation slightly to allow success modal to show
        setTimeout(() => {
          const returnTab =
            sessionStorage.getItem("expensesReturnTab") || "personal-expenses";
          const returnPage = sessionStorage.getItem("expensesReturnPage") || "1";
          router.push(`/expenses?tab=${returnTab}&page=${returnPage}`);
        }, 500);
      }
    } catch (error: unknown) {
      logger.error("Error submitting expenses:", error);

      if (isDuplicateReceiptError(error)) {
        applyDuplicateErrorState(error);
        toast.error(getApiErrorMessage(error, "This receipt appears to have been submitted previously"));
        return;
      }
      if (isPolicyViolationError(error)) {
        applyPolicyErrorState(error, data);
        toast.error(getApiErrorMessage(error, "Policy violation — please review your expenses."));
        return;
      }

      const err = error as {
        response?: { data?: { message?: string; error?: string }; status?: number };
        message?: string;
      };
      logger.error("Error response:", err?.response?.data);
      logger.error("Error status:", err?.response?.status);

      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to submit expenses. Please try again.";

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prepare category options for FormFieldSelect
  const categoryOptions = categories.map((category) => ({
    label: category.name,
    value: category.name,
  }));

  return (
    <>
      <SuccessModal
        isOpen={IsSuccess}
        onClose={() => {
          successToggle();
        }}
        onClick={() => {}}
        title="Expense Submitted"
        description="Your expense has been successfully submitted."
        buttonText="Back to Dashboard"
      />
      <div>
        <>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(
                onSubmit as SubmitHandler<FieldValues>,
              )}
              className="space-y-6 px-6 pb-6"
            >
              {/* Modern Report Header */}
              <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl px-6 py-3 border border-primary/20 shadow-sm w-full flex items-center justify-between">
                <p className="text-base font-semibold text-foreground">
                  {reportName || "Expense Report"}
                </p>
                <p className="text-base font-semibold text-foreground">
                  {reportDate}
                </p>
              </div>

              {/* Loading state for categories */}
              {isLoadingCategories && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">
                    Loading expense categories...
                  </span>
                </div>
              )}

              {/* Dynamic Expense Forms */}
              {!isLoadingCategories && (
                <div className="space-y-6">
                  {/* If multiple expenses, render each section inside an accordion; otherwise render plain */}
                  {fields.length > 1 ? (
                    <Accordion
                      type="multiple"
                      value={openAccordionItems}
                      onValueChange={setOpenAccordionItems}
                      className="w-full"
                    >
                      {fields.map((field, index) => {
                        const amount = amounts[index] || 0;
                        return (
                          <AccordionItem
                            key={field.id}
                            value={`expense-${index}`}
                          >
                            <AccordionTrigger className="px-4 py-3 bg-gray-50 rounded-md text-left">
                              <div className="flex w-full justify-between items-center">
                                <div className="flex items-center gap-3 min-w-0">
                                  {policyErrorsByIndex[index] && (
                                    <AlertCircle
                                      className="w-4 h-4 text-red-500 shrink-0 cursor-pointer"
                                      aria-label="Policy violation"
                                    />
                                  )}
                                  {requiredActionsByIndex[index] && (
                                    <AlertTriangle
                                      className="w-4 h-4 text-amber-500 shrink-0 cursor-pointer"
                                      aria-label="Justification required"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDrawerOpenForIndex(index);
                                      }}
                                    />
                                  )}
                                  {duplicateErrorsByIndex[index] && duplicateErrorsByIndex[index].length > 0 && (
                                    <AlertCircle
                                      className="w-4 h-4 text-red-500 shrink-0 cursor-pointer"
                                      aria-label="Duplicate receipt — click to view original"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedDuplicate(duplicateErrorsByIndex[index][0]);
                                      }}
                                    />
                                  )}
                                  <span className="font-medium">
                                    {form.getValues(
                                      `expenses.${index}.title`,
                                    ) || `Expense ${index + 1}`}
                                  </span>
                                  <span className="text-sm text-muted-foreground flex items-center gap-3">
                                    <span>
                                      {form.getValues(
                                        `expenses.${index}.vendor`,
                                      ) || "No vendor"}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      $
                                      {Number(
                                        form.getValues(
                                          `expenses.${index}.amount`,
                                        ) || 0,
                                      ).toLocaleString()}
                                    </span>
                                  </span>
                                </div>
                                {fields.length > 1 && index != 0 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="hover:bg-destructive/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveOrDelete(index);
                                    }}
                                  >
                                    <Trash className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="p-0 gap-8 relative flex items-start px-6 justify-between w-full">
                                {policyErrorsByIndex[index] && (
                                  <div className="absolute top-2 left-6 right-6 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 z-10">
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-600">{policyErrorsByIndex[index]}</p>
                                  </div>
                                )}
                                {requiredActionsByIndex[index] && (
                                  <div className="absolute top-2 left-6 right-6 z-10">
                                    <button
                                      type="button"
                                      className="w-full text-left flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 hover:bg-amber-100 transition-colors cursor-pointer"
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDrawerOpenForIndex(index); }}
                                    >
                                      <div className="flex items-start gap-2 flex-1 min-w-0">
                                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-amber-800">Explanation required to submit</p>
                                          <p className="text-xs text-amber-700 truncate">{requiredActionsByIndex[index].categoryName} · {requiredActionsByIndex[index].policyName}</p>
                                        </div>
                                      </div>
                                      <span className="shrink-0 ml-2 text-xs font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap">
                                        {justificationsByIndex[index] ? "✏ Edit explanation" : "+ Provide explanation"}
                                      </span>
                                    </button>
                                    {justificationsByIndex[index] && (
                                      <p className="mt-1 text-xs text-green-700 flex items-center gap-1 px-1">
                                        <Check className="w-3 h-3" /> Explanation saved
                                      </p>
                                    )}
                                  </div>
                                )}
                                {duplicateErrorsByIndex[index] && duplicateErrorsByIndex[index].length > 0 && (
                                  <button
                                    type="button"
                                    className="absolute top-2 left-6 right-6 z-10 w-[calc(100%-3rem)] flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 cursor-pointer hover:bg-red-100 transition-colors text-left"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSelectedDuplicate(duplicateErrorsByIndex[index][0]);
                                    }}
                                  >
                                    <div className="flex items-start gap-2">
                                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                      <p className="text-xs text-red-600">This receipt was submitted before — <span className="underline font-medium">click to see original</span></p>
                                    </div>
                                    <Eye className="w-4 h-4 text-red-500 shrink-0" />
                                  </button>
                                )}
                                <div className={`space-y-5 max-w-lg flex flex-col pr-16 ${(policyErrorsByIndex[index] || requiredActionsByIndex[index] || duplicateErrorsByIndex[index]) ? "pt-14" : ""}  ${requiredActionsByIndex[index] && justificationsByIndex[index] ? "pt-20" : ""}`}>
                                  <SplitExpense
                                    control={form.control as unknown as Control<SplitExpenseFormValues>}
                                    expenseIndex={index}
                                    totalAmount={amount}
                                  />

                                  <FormFieldInput
                                    control={form.control}
                                    name={`expenses.${index}.title`}
                                    label="Expense Title"
                                    placeholder="Enter a title for this expense"
                                  />

                                  <div className="grid grid-cols-2 gap-4">
                                    <FormFieldInput
                                      control={form.control}
                                      name={`expenses.${index}.amount`}
                                      label="Amount"
                                      placeholder="Enter Amount"
                                      type="number"
                                      inputMode="numeric"
                                    />
                                    <FormFieldSelect
                                      control={form.control}
                                      name={`expenses.${index}.category`}
                                      values={categoryOptions}
                                      placeholder="Select Category"
                                      label="Expense Category"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <FormFieldInput
                                      control={form.control}
                                      name={`expenses.${index}.vendor`}
                                      label="Merchant"
                                      placeholder="Enter Merchant"
                                    />
                                    <FormFieldCalendar
                                      control={form.control}
                                      name={`expenses.${index}.transactionDate`}
                                      label="Transaction Date"
                                    />
                                  </div>

                                  <FormFieldTextArea
                                    control={form.control}
                                    label="Description"
                                    name={`expenses.${index}.description`}
                                    placeholder=""
                                  />

                                  {index === fields.length - 1 && (
                                    <Button
                                      type="button"
                                      variant={"link"}
                                      className="text-primary underline text-base font-bold leading-[150%] w-fit ml-auto place-self-end"
                                      onClick={addExpense}
                                    >
                                      Add Another
                                    </Button>
                                  )}
                                </div>
                                {renderReceiptPanel(index)}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  ) : (
                    fields.map((field, index) => {
                      const amount = amounts[index] || 0;
                      return (
                        <div
                          key={field.id}
                          className="p-0 gap-8 relative flex items-start px-6 justify-between w-full"
                        >
                          <div className="space-y-5 max-w-lg flex flex-col pr-16">
                            {policyErrorsByIndex[index] && (
                              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-600">{policyErrorsByIndex[index]}</p>
                              </div>
                            )}
                            {requiredActionsByIndex[index] && (
                              <div className="space-y-1">
                                <button
                                  type="button"
                                  className="w-full text-left flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 hover:bg-amber-100 transition-colors cursor-pointer"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDrawerOpenForIndex(index); }}
                                >
                                  <div className="flex items-start gap-2 flex-1 min-w-0">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-amber-800">Explanation required to submit</p>
                                      <p className="text-xs text-amber-700">{requiredActionsByIndex[index].categoryName} · {requiredActionsByIndex[index].policyName}</p>
                                    </div>
                                  </div>
                                  <span className="shrink-0 ml-2 text-xs font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap">
                                    {justificationsByIndex[index] ? "✏ Edit explanation" : "+ Provide explanation"}
                                  </span>
                                </button>
                                {justificationsByIndex[index] && (
                                  <p className="text-xs text-green-700 flex items-center gap-1 px-1">
                                    <Check className="w-3 h-3" /> Explanation saved — ready to resubmit
                                  </p>
                                )}
                              </div>
                            )}
                            {duplicateErrorsByIndex[index] && duplicateErrorsByIndex[index].length > 0 && (
                              <button
                                type="button"
                                className="w-full flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 cursor-pointer hover:bg-red-100 transition-colors text-left"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedDuplicate(duplicateErrorsByIndex[index][0]);
                                }}
                              >
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                  <p className="text-xs text-red-600">This receipt was submitted before — <span className="underline font-medium">click to see original</span></p>
                                </div>
                                <Eye className="w-4 h-4 text-red-500 shrink-0" />
                              </button>
                            )}
                            {fields.length > 1 && index != 0 && (
                              <div className="ml-auto w-fit flex">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="hover:bg-destructive/10"
                                  onClick={() => handleRemoveOrDelete(index)}
                                >
                                  <Trash className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            )}

                            <SplitExpense
                              control={form.control as unknown as Control<SplitExpenseFormValues>}
                              expenseIndex={index}
                              totalAmount={amount}
                            />

                            <FormFieldInput
                              control={form.control}
                              name={`expenses.${index}.title`}
                              label="Expense Title"
                              placeholder="Enter a title for this expense"
                            />

                            <div className="grid grid-cols-2 gap-4">
                              <FormFieldInput
                                control={form.control}
                                name={`expenses.${index}.amount`}
                                label="Amount"
                                placeholder="Enter Amount"
                                type="number"
                                inputMode="numeric"
                              />
                              <FormFieldSelect
                                control={form.control}
                                name={`expenses.${index}.category`}
                                values={categoryOptions}
                                placeholder="Select Category"
                                label="Expense Category"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <FormFieldInput
                                control={form.control}
                                name={`expenses.${index}.vendor`}
                                label="Merchant"
                                placeholder="Enter Merchant"
                              />
                              <FormFieldCalendar
                                control={form.control}
                                name={`expenses.${index}.transactionDate`}
                                label="Transaction Date"
                              />
                            </div>

                            <FormFieldTextArea
                              control={form.control}
                              label="Description"
                              name={`expenses.${index}.description`}
                              placeholder=""
                            />

                            {index === fields.length - 1 && (
                              <Button
                                type="button"
                                variant={"link"}
                                className="text-primary underline text-base font-bold leading-[150%] w-fit ml-auto place-self-end"
                                onClick={addExpense}
                              >
                                Add Another
                              </Button>
                            )}
                          </div>
                          {renderReceiptPanel(index)}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Pending policy justification banner */}
              {Object.keys(requiredActionsByIndex).length > 0 && (() => {
                const total = Object.keys(requiredActionsByIndex).length;
                const done = Object.keys(justificationsByIndex).filter(
                  (k) => requiredActionsByIndex[Number(k)] && justificationsByIndex[Number(k)]?.trim()
                ).length;
                const remaining = total - done;
                return (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">
                          {remaining > 0
                            ? `${remaining} expense${remaining > 1 ? "s" : ""} need${remaining === 1 ? "s" : ""} your explanation`
                            : "All explanations provided — ready to submit"}
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          {remaining > 0
                            ? "Click the amber warning on each flagged expense and provide a business reason."
                            : "Click Submit below to complete your submission."}
                        </p>
                      </div>
                    </div>
                    {remaining === 0 && (
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Form Actions */}
              <div className="flex space-x-4 pt-4">
                <Button
                  type="submit"
                  size={"md"}
                  disabled={
                    !hasAllReceipts ||
                    isSubmitting ||
                    isLoadingCategories ||
                    (isEditMode && !hasFormChanges) ||
                    (Object.keys(requiredActionsByIndex).length > 0 &&
                      Object.keys(requiredActionsByIndex).some(
                        (k) => !justificationsByIndex[Number(k)]?.trim()
                      ))
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit{" "}
                      {fields.length > 1
                        ? `${fields.length} Expenses`
                        : "Expense"}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outlinePrimary"
                  onClick={async () => {
                    const values = form.getValues();
                    // Trigger validation so required fields are respected.
                    form.handleSubmit(async (validData) => {
                      try {
                        setIsSubmitting(true);

                        if (
                          isEditMode &&
                          reportId &&
                          reportDetail?.expenses
                        ) {
                          const basePayload = buildPatchReportPayload(
                            validData as ExpenseFormValues,
                            true,
                          );
                          const reportPayload = {
                            ...basePayload,
                            status: "draft", // Explicitly keep as draft
                          };
                          await axios.patch(`reports/${reportId}`, reportPayload);
                          
                          // Invalidate React Query cache to refetch report details
                          invalidatePersonalExpenseQueries(queryClient);
                          queryClient.invalidateQueries({
                            queryKey: [API_KEYS.EXPENSE.PERSONAL_EXPENSES, reportId],
                          });
                          
                          if (onUpdateSuccess) {
                            onUpdateSuccess();
                          }
                          
                          toast.success("Saved as draft.");
                          // Don't navigate away in edit mode - stay on the page
                        } else {
                          const payload = buildExpensePayload(
                            validData as ExpenseFormValues,
                            true,
                            "draft",
                          );
                          await axios.post(API_KEYS.EXPENSE.REPORTS, payload);
                          
                          // Only persist to localStorage for new expenses (not edit mode)
                          // And only store metadata, not base64 images
                          try {
                            persistToPersonalExpenses(
                              values as ExpenseFormValues,
                              "draft",
                            );
                          } catch (storageError) {
                            // If localStorage fails (quota exceeded), log but don't fail the request
                            logger.warn("Failed to persist to localStorage:", storageError);
                          }

                          invalidatePersonalExpenseQueries(queryClient);

                          toast.success("Saved as draft.");
                          sessionStorage.removeItem("uploadedReceipts");
                          // Stay on the page after saving a new draft (unlike submit)
                        }
                      } catch (error: unknown) {
                        logger.error("Error saving draft:", error);
                        if (isDuplicateReceiptError(error)) {
                          applyDuplicateErrorState(error);
                          toast.error(getApiErrorMessage(error, "This receipt appears to have been submitted previously"));
                          return;
                        }
                        if (isPolicyViolationError(error)) {
                          applyPolicyErrorState(error, values as ExpenseFormValues);
                          toast.error(getApiErrorMessage(error, "Policy violation — please review your expenses."));
                          return;
                        }
                        const err = error as {
                          response?: { data?: { message?: string; error?: string } };
                          message?: string;
                        };
                        const errorMessage =
                          err?.response?.data?.message ||
                          err?.response?.data?.error ||
                          err?.message ||
                          "Failed to save draft. Please try again.";
                        toast.error(errorMessage);
                      } finally {
                        setIsSubmitting(false);
                      }
                    })();
                  }}
                  size={"md"}
                  disabled={
                    isSubmitting ||
                    isLoadingCategories ||
                    (isEditMode && !hasFormChanges)
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save As Draft"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </>
      </div>

      {/* Duplicate receipt detail modal */}
      <CompanyExpenseItemModal
        isOpen={selectedDuplicate !== null}
        onClose={() => setSelectedDuplicate(null)}
        expense={selectedDuplicate ? {
          title: selectedDuplicate.title,
          amount: selectedDuplicate.amount,
          merchantName: selectedDuplicate.merchantName,
          categoryName: "Previously Submitted Expense",
          transactionDate: selectedDuplicate.transactionDate,
          receiptUrl: selectedDuplicate.receiptUrl || undefined,
          description: `Expense ID: ${selectedDuplicate.expenseId}`,
        } : null}
      />

      {/* Policy justification drawer */}
      {drawerOpenForIndex !== null && requiredActionsByIndex[drawerOpenForIndex] && (
        <PolicyJustificationDrawer
          isOpen={drawerOpenForIndex !== null}
          onClose={() => setDrawerOpenForIndex(null)}
          expenseTitle={
            form.getValues(`expenses.${drawerOpenForIndex}.title`) ||
            `Expense ${drawerOpenForIndex + 1}`
          }
          action={requiredActionsByIndex[drawerOpenForIndex]}
          existingJustification={justificationsByIndex[drawerOpenForIndex] || ""}
          onSave={(expenseIndex, justification) => {
            setJustificationsByIndex((prev) => ({ ...prev, [expenseIndex]: justification }));
            setDrawerOpenForIndex(null);
          }}
        />
      )}
    </>
  );
}
