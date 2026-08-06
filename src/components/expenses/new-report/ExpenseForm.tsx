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
import { Check, ImagePlus, CalendarIcon, Search } from "lucide-react";
import Image from "next/image";
import { normalizeReceiptSrc, hasReceiptSrc } from "@/lib/utils/receipt-image";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import React, { useState } from "react";
import { useAuthStore } from "@/stores/auth-stores";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X as XIcon } from "lucide-react";
import { useGetAllUsersApi } from "@/queries/users/get-all-users";

// Define the raw form values (what the inputs give us, e.g. strings for numbers)
const baseExpenseDetailSchema = z.object({
  name: z.string().min(1, "Expense name is required"),
  amount: z.any().transform((val) => Number(val)).pipe(z.number().min(1, "Amount must be at least 1")),
  merchantName: z.string().min(1, "Merchant is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  transactionDate: z.date({ message: "Transaction date is required" }),
});

export type ExpenseDetailFormData = z.infer<typeof baseExpenseDetailSchema>;

interface ExpenseCategory {
  categoryId: string;
  name: string;
}

/** A split participant — stored by userId so the backend payload is ready. */
export interface SplitParticipant {
  userId: string;
  displayName: string;
  jobTitle?: string | null;
  departmentName?: string | null;
}

interface ExpenseFormProps {
  initialData?: Partial<ExpenseDetailFormData> & {
    receiptImage?: string;
    transactionDate?: Date;
    /** Existing split participants/allocation, used to re-populate the Split Expense UI when editing. */
    splitParticipants?: SplitParticipant[];
    splitAllocationMode?: "equal" | "manual";
    /** Keyed by userId */
    splitAllocations?: Record<string, string>;
  };
  categories: ExpenseCategory[];
  onSave: (
    data: ExpenseDetailFormData,
    receiptImage?: string,
    splitData?: {
      participants: SplitParticipant[];
      allocationMode: "equal" | "manual";
      /** Keyed by userId */
      allocations: Record<string, string>;
    }
  ) => void;
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
  /** When true, the submit button is always disabled (e.g. hard policy block active). */
  forceDisableSubmit?: boolean;
  /** Names of expenses already added to the report — used to prevent duplicates */
  existingExpenseNames?: string[];
  /** Callback fired when the form dirty state changes */
  onDirtyChange?: (isDirty: boolean) => void;
  /**
   * UI-only rendering mode. "split" adds the Participants + Allocation sections
   * seen in the Split Expense tab.
   */
  mode?: "individual" | "split";
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
  forceDisableSubmit = false,
  existingExpenseNames = [],
  onDirtyChange,
  mode = "individual",
}: ExpenseFormProps) {
  const [receiptImage, setReceiptImage] = useState<string>(
    initialData?.receiptImage || ""
  );
  const [pendingReceipt, setPendingReceipt] = useState<string | null>(null);
  const [hasReceiptChanged, setHasReceiptChanged] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // ── Split Expense — Participants + Allocation ─────────────────────────────
  const isSplitMode = mode === "split";
  const currentUser = useAuthStore((state) => state.user);
  const currentUserParticipant: SplitParticipant | null = currentUser
    ? {
        userId: currentUser.userId ?? "",
        displayName:
          `${currentUser.firstName ?? ""} ${currentUser.lastName ?? ""}`.trim() ||
          "You",
      }
    : null;

  // Fetch all users from the real endpoint GET /users
  const { data: usersData, isLoading: isLoadingUsers } = useGetAllUsersApi({
    enabled: isSplitMode,
  });
  const allUsers: SplitParticipant[] = (usersData?.data ?? []).map((u: any) => ({
    userId: u.userId,
    displayName: `${u.firstName} ${u.lastName}`.trim(),
    jobTitle: u.jobTitle || (u.position ? u.position.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : null),
    departmentName: u.department?.name || u.departmentName,
  }));

  const [splitParticipants, setSplitParticipants] = useState<SplitParticipant[]>(
    initialData?.splitParticipants && initialData.splitParticipants.length > 0
      ? initialData.splitParticipants
      : currentUserParticipant
      ? [currentUserParticipant]
      : []
  );
  const [allocationMode, setAllocationMode] = useState<"equal" | "manual">(
    initialData?.splitAllocationMode ?? "equal"
  );
  const [manualAllocations, setManualAllocations] = useState<Record<string, string>>(
    initialData?.splitAllocations ?? {}
  );

  const [participantSearch, setParticipantSearch] = useState("");

  const availableUsers = allUsers.filter((u) => {
    if (u.userId === currentUserParticipant?.userId) return false; // Never show current user in dropdown
    if (splitParticipants.some((p) => p.userId === u.userId)) return false;
    if (!participantSearch) return true;
    
    const searchLower = participantSearch.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(searchLower) ||
      (u.jobTitle && u.jobTitle.toLowerCase().includes(searchLower)) ||
      (u.departmentName && u.departmentName.toLowerCase().includes(searchLower))
    );
  });

  const addSplitParticipant = (userId: string) => {
    const user = allUsers.find((u) => u.userId === userId);
    if (!user || splitParticipants.some((p) => p.userId === userId)) return;
    setSplitParticipants((prev) => [...prev, user]);
  };

  const removeSplitParticipant = (userId: string) => {
    if (userId === currentUserParticipant?.userId) return; // current user always stays
    setSplitParticipants((prev) => prev.filter((p) => p.userId !== userId));
    setManualAllocations((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const formSchema = React.useMemo(() => {
    return baseExpenseDetailSchema.superRefine((data, ctx) => {
      // If we are editing and the name hasn't changed, it's valid
      if (initialData?.name && initialData.name.trim().toLowerCase() === data.name.trim().toLowerCase()) {
        return;
      }
      // Check for duplicates against the existing names
      const isDuplicate = existingExpenseNames.some(
        (existingName) => existingName.trim().toLowerCase() === data.name.trim().toLowerCase()
      );
      if (isDuplicate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `An expense named "${data.name}" already exists in this report.`,
          path: ["name"],
        });
      }
    });
  }, [existingExpenseNames, initialData?.name]);

  const form = useForm<ExpenseDetailFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      amount: initialData?.amount || 0,
      merchantName: initialData?.merchantName || "",
      category: initialData?.category || "",
      description: initialData?.description || "",
      transactionDate: initialData?.transactionDate ?? new Date(),
    },
  });

  const watchedAmount = Number(form.watch("amount")) || 0;
  const equalShare =
    splitParticipants.length > 0 ? watchedAmount / splitParticipants.length : 0;

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
    setSplitParticipants(
      initialData.splitParticipants && initialData.splitParticipants.length > 0
        ? initialData.splitParticipants
        : currentUserParticipant
        ? [currentUserParticipant]
        : []
    );
    setAllocationMode(initialData.splitAllocationMode ?? "equal");
    setManualAllocations(initialData.splitAllocations ?? {});
  }

  const receiptPreviewSrc = normalizeReceiptSrc(pendingReceipt ?? "");
  const hasCommittedReceipt = hasReceiptSrc(receiptImage);
  const isPreviewingSelection = Boolean(pendingReceipt);

  const isFormDirty = form.formState.isDirty || hasReceiptChanged;

  React.useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isFormDirty);
    }
  }, [isFormDirty, onDirtyChange]);

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
    if (isSplitMode) {
      let finalAllocations = { ...manualAllocations };
      // Compute and include the auto-filled last participant value
      if (allocationMode === "manual" && splitParticipants.length >= 2) {
        const lastIndex = splitParticipants.length - 1;
        const lastUserId = splitParticipants[lastIndex].userId;
        const allocatedByNonLast = splitParticipants.slice(0, lastIndex).reduce((sum, p) => {
          return sum + (parseFloat(finalAllocations[p.userId] ?? "") || 0);
        }, 0);
        const autoLastValue = Math.max(0, data.amount - allocatedByNonLast);
        finalAllocations[lastUserId] = autoLastValue.toFixed(2);
      }
      onSave(data, receiptImage, {
        participants: splitParticipants,
        allocationMode,
        allocations: finalAllocations,
      });
      return;
    }
    onSave(data, receiptImage);
  };

  const isSubmitDisabled = (() => {
    if (isSplitMode) {
      if (splitParticipants.length < 2) return true;
      if (allocationMode === "manual") {
        // Last participant is always auto-filled (remaining amount), so only check non-last ones
        const lastIndex = splitParticipants.length - 1;
        const nonLastParticipants = splitParticipants.slice(0, lastIndex);
        const nonLastHaveValues = nonLastParticipants.every((p) => {
          const val = manualAllocations[p.userId];
          return val !== undefined && val !== "" && Number(val) > 0;
        });
        if (!nonLastHaveValues) return true;
        // Also check that the total doesn't exceed the expense amount
        const allocatedByNonLast = nonLastParticipants.reduce(
          (sum, p) => sum + (parseFloat(manualAllocations[p.userId] ?? "") || 0),
          0
        );
        if (allocatedByNonLast >= watchedAmount) return true;
      }
    }

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

  const submitDisabled = forceDisableSubmit || isSubmitDisabled;

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
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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
                onSelect={(date) => {
                  form.setValue("transactionDate", date ?? new Date(), { shouldValidate: true });
                  setCalendarOpen(false);
                }}
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

        {/* Participants + Allocation — shown only in Split Expense mode */}
        {isSplitMode && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Participants</label>
              <Select
                key={splitParticipants.length}
                onValueChange={addSplitParticipant}
                disabled={isLoadingUsers}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingUsers ? "Loading participants…" : ""} />
                </SelectTrigger>
                <SelectContent>
                  <div className="flex items-center border-b px-3 pb-2 pt-2 sticky top-0 bg-white z-10">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input
                      value={participantSearch}
                      onChange={(e) => setParticipantSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="Search participants..."
                      className="flex h-8 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  {isLoadingUsers ? (
                    <div className="px-2 py-4 text-center text-xs text-muted-foreground">Loading…</div>
                  ) : availableUsers.length === 0 ? (
                    <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                      {participantSearch ? "No participants found" : "No more participants to add"}
                    </div>
                  ) : (
                    availableUsers.map((user) => (
                      <SelectItem key={user.userId} value={user.userId}>
                        <div className="flex flex-col py-0.5">
                          <span className="font-medium leading-none">{user.displayName}</span>
                          {(user.jobTitle || user.departmentName) && (
                            <span className="text-[10px] text-muted-foreground mt-1 leading-none">
                              {[user.jobTitle, user.departmentName].filter(Boolean).join(" • ")}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 pt-1">
                {splitParticipants.map((participant) => (
                  <span
                    key={participant.userId}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1"
                  >
                    {participant.userId === currentUserParticipant?.userId
                      ? `${participant.displayName} (You)`
                      : participant.displayName}
                    {participant.userId !== currentUserParticipant?.userId && (
                      <button
                        type="button"
                        onClick={() => removeSplitParticipant(participant.userId)}
                        aria-label={`Remove ${participant.displayName}`}
                        className="rounded-full hover:bg-primary/20"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Allocation</label>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setAllocationMode("equal")}
                    className={cn(
                      "hover:underline",
                      allocationMode === "equal" ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    Split equally
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocationMode("manual")}
                    className={cn(
                      "hover:underline",
                      allocationMode === "manual" ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    Add manually
                  </button>
                </div>
              </div>
              <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                {(() => {
                  const totalAmt = watchedAmount;
                  const lastIndex = splitParticipants.length - 1;
                  // Sum of all non-last participants
                  const allocatedByOthers = splitParticipants.slice(0, lastIndex).reduce((sum, p) => {
                    return sum + (parseFloat(manualAllocations[p.userId] ?? "") || 0);
                  }, 0);
                  const autoLastValue = Math.max(0, totalAmt - allocatedByOthers);

                  return splitParticipants.map((participant, idx) => {
                    const isLast = idx === lastIndex;
                    const isOnly = splitParticipants.length === 1;

                    // For non-last participants, max = totalAmt minus what all other non-last have entered
                    const allocatedBeforeThis = splitParticipants.slice(0, idx).reduce((sum, p) => {
                      return sum + (parseFloat(manualAllocations[p.userId] ?? "") || 0);
                    }, 0);
                    const maxForThis = Math.max(0, totalAmt - allocatedBeforeThis);

                    const handleAllocationChange = (rawVal: string) => {
                      const parsed = parseFloat(rawVal);
                      if (!isNaN(parsed) && parsed > maxForThis) return; // block over-entry
                      setManualAllocations((prev) => ({ ...prev, [participant.userId]: rawVal }));
                    };

                    const displayLabel =
                      participant.userId === currentUserParticipant?.userId
                        ? `${participant.displayName} (You)`
                        : participant.displayName;

                    if (allocationMode === "equal") {
                      const perPersonStr = equalShare.toFixed(2);
                      const perPerson = parseFloat(perPersonStr);
                      const isLast = idx === lastIndex;
                      
                      let displayShare = perPerson;
                      if (isLast && splitParticipants.length > 1) {
                        const nonLastTotal = perPerson * lastIndex;
                        displayShare = Math.max(0, watchedAmount - nonLastTotal);
                      }

                      return (
                        <div key={participant.userId} className="flex items-center justify-between px-3 py-2.5 bg-white">
                          <span className="text-sm text-foreground">{displayLabel}</span>
                          <span className="text-sm text-muted-foreground">{displayShare.toFixed(2)}</span>
                        </div>
                      );
                    }

                    // Manual mode:
                    // Auto-fill the last participant ONLY when ALL preceding ones have valid values
                    const precedingParticipants = splitParticipants.slice(0, lastIndex);
                    const allPrecedingFilled = precedingParticipants.every((p) => {
                      const v = parseFloat(manualAllocations[p.userId] ?? "");
                      return !isNaN(v) && v > 0;
                    });
                    const isAutoFilled = isLast && !isOnly && splitParticipants.length >= 2 && allPrecedingFilled;
                    const displayValue = isAutoFilled
                      ? autoLastValue.toFixed(2)
                      : (manualAllocations[participant.userId] ?? "");

                    return (
                      <div key={participant.userId} className="flex items-center justify-between px-3 py-2.5 bg-white">
                        <span className="text-sm text-foreground">{displayLabel}</span>
                        <div className="flex flex-col items-end gap-0.5">
                          <input
                            type="number"
                            inputMode="numeric"
                            readOnly={isAutoFilled}
                            placeholder={
                              isLast && !isOnly && !allPrecedingFilled
                                ? "Fill above first"
                                : isAutoFilled
                                ? "Auto"
                                : ""
                            }
                            value={displayValue}
                            max={maxForThis}
                            min={0}
                            onChange={(e) => !isAutoFilled && handleAllocationChange(e.target.value)}
                            className={cn(
                              "w-28 text-right text-sm border rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-ring",
                              isAutoFilled
                                ? "border-primary/30 bg-primary/5 text-primary font-medium cursor-not-allowed"
                                : isLast && !isOnly && !allPrecedingFilled
                                ? "border-dashed border-muted-foreground/40 bg-muted/20 text-muted-foreground cursor-not-allowed"
                                : "border-input"
                            )}
                          />
                          {!isAutoFilled && !isOnly && (!isLast || allPrecedingFilled) && (
                            <span className="text-[10px] text-muted-foreground">
                              max {maxForThis.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              {/* Running balance summary (manual mode only) */}
              {allocationMode === "manual" && splitParticipants.length >= 2 && (() => {
                const lastIndex = splitParticipants.length - 1;
                const allocatedByNonLast = splitParticipants.slice(0, lastIndex).reduce((sum, p) => {
                  return sum + (parseFloat(manualAllocations[p.userId] ?? "") || 0);
                }, 0);
                const autoLast = Math.max(0, watchedAmount - allocatedByNonLast);
                const total = allocatedByNonLast + autoLast;
                const isBalanced = Math.abs(total - watchedAmount) < 0.01;
                return (
                  <div className={cn(
                    "flex items-center justify-between text-xs font-medium px-1 pt-1",
                    isBalanced ? "text-green-600" : "text-amber-600"
                  )}>
                    <span>Total allocated</span>
                    <span>{total.toFixed(2)} / {watchedAmount.toFixed(2)}</span>
                  </div>
                );
              })()}
            </div>
          </>
        )}

        {/* Actions */}
        {!hideActions && (
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-none h-10 px-5 rounded-[8px] border border-black/[0.08] text-[#68726d] font-semibold text-[13px] hover:bg-[#f9faf9] transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={submitDisabled || forceDisableSubmit}
              className="flex-1 sm:flex-none h-10 px-5 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors shadow-sm disabled:opacity-50"
            >
              {submitLabel}
            </button>
          </div>
        )}
      </form>
    </Form>
  );
}
