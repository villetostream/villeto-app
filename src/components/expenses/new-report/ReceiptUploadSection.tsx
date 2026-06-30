"use client";

import { logger } from "@/lib/logger";
import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImagePlus, X } from "lucide-react";
import { ExpenseForm, type ExpenseDetailFormData } from "./ExpenseForm";

interface ReceiptUploadSectionProps {
  onReceiptsUpload: (receipts: { base64: string; name: string }[]) => void;
  onAddExpense: (data: ExpenseDetailFormData, receiptImage?: string) => void;
  categories: { categoryId: string; name: string }[];
}

interface PendingReceipt {
  file: File;
  previewUrl: string;
}

export function ReceiptUploadSection({
  onReceiptsUpload,
  onAddExpense,
  categories,
}: ReceiptUploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([]);

  const hasPending = pendingReceipts.length > 0;

  useEffect(() => {
    return () => {
      pendingReceipts.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    };
  }, [pendingReceipts]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const queueFiles = useCallback((incoming: File[]) => {
    const imageFiles = incoming.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    setPendingReceipts((prev) => [
      ...prev,
      ...imageFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      queueFiles(Array.from(e.dataTransfer.files));
    },
    [queueFiles],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      queueFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const removePending = (index: number) => {
    setPendingReceipts((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearPending = () => {
    pendingReceipts.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    setPendingReceipts([]);
  };

  const confirmPendingReceipts = async () => {
    if (pendingReceipts.length === 0) return;
    setIsUploading(true);
    try {
      const processedFiles = await Promise.all(
        pendingReceipts.map(async ({ file }) => ({
          base64: await fileToBase64(file),
          name: file.name,
        })),
      );
      onReceiptsUpload(processedFiles);
      clearPending();
    } catch (error) {
      logger.error("Error processing files:", error);
    } finally {
      setIsUploading(false);
    }
  };

  if (showManualForm) {
    return (
      <div className="h-full flex flex-col animate-in fade-in zoom-in-[0.99] duration-150 ease-out">
        <div className="mb-4 flex flex-row justify-between items-center bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
          <span className="font-semibold text-dashboard-text-primary">Manual Expense Entry</span>
        </div>
        <ExpenseForm
          formId="manual-expense-form"
          categories={categories}
          onSave={(data, receipt) => {
            onAddExpense(data, receipt);
            setShowManualForm(false);
          }}
          onCancel={() => setShowManualForm(false)}
          submitLabel="Add to Report"
          cancelLabel="Cancel"
        />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in zoom-in-[0.99] duration-150 ease-out space-y-4">
      <div
        className={cn(
          "border-2 border-dashed border-primary rounded-lg transition-colors bg-white overflow-hidden",
          isDragging && "bg-primary/10",
          hasPending ? "flex min-h-[320px]" : "flex flex-col items-center justify-center min-h-[320px] p-10",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Upload controls */}
        <div
          className={cn(
            "flex flex-col items-center justify-center text-center",
            hasPending
              ? "w-[38%] shrink-0 border-r border-primary/20 px-6 py-8"
              : "w-full max-w-sm space-y-6",
          )}
        >
          <div className="w-14 h-14 rounded-2xl bg-[#F0FBFA] flex items-center justify-center">
            {hasPending ? (
              <ImagePlus className="w-7 h-7 text-[#111827]" />
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 9C20.5523 9 21 8.55228 21 8V6C21 4.34315 19.6569 3 18 3H6C4.34315 3 3 4.34315 3 6V8C3 8.55228 3.44772 9 4 9C4.55228 9 5 8.55228 5 8V6C5 5.44772 5.44772 5 6 5H18C18.5523 5 19 5.44772 19 6V8C19 8.55228 19.4477 9 20 9Z" fill="#111827" />
                <path fillRule="evenodd" clipRule="evenodd" d="M12 18C14.2091 18 16 16.2091 16 14C16 11.7909 14.2091 10 12 10C9.79086 10 8 11.7909 8 14C8 16.2091 9.79086 18 12 18ZM12 16C13.1046 16 14 15.1046 14 14C14 12.8954 13.1046 12 12 12C10.8954 12 10 12.8954 10 14C10 15.1046 10.8954 16 12 16Z" fill="#111827" />
                <path d="M3 13C3 12.4477 3.44772 12 4 12C4.55228 12 5 12.4477 5 13V18C5 18.5523 5.44772 19 6 19H18C18.5523 19 19 18.5523 19 18V13C19 12.4477 19.4477 12 20 12C20.5523 12 21 12.4477 21 13V18C21 20.2091 19.2091 22 17 22H7C4.79086 22 3 20.2091 3 18V13Z" fill="#111827" />
              </svg>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-[#111827]">
              {hasPending ? "Add more receipts" : "Scan Receipts"}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {hasPending
                ? `${pendingReceipts.length} selected — review on the right, then add to your report.`
                : "Upload receipt images to scan and add them to your report."}
            </p>
          </div>

          <input
            id="receipt-upload-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            onClick={() => document.getElementById("receipt-upload-input")?.click()}
            disabled={isUploading}
            variant={hasPending ? "outline" : "default"}
            className={cn(
              "h-10 px-6 rounded-lg font-medium",
              !hasPending &&
                "bg-white border-2 border-primary text-primary hover:bg-primary/10 min-w-[160px]",
            )}
          >
            {isUploading ? "Adding..." : hasPending ? "Upload more" : "Upload Receipts"}
          </Button>
        </div>

        {/* Preview panel — only when files are selected */}
        {hasPending && (
          <div className="flex-1 flex flex-col min-w-0 p-5 gap-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                Preview ({pendingReceipts.length})
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={clearPending} disabled={isUploading}>
                Clear all
              </Button>
            </div>

            <div
              className={cn(
                "flex-1 min-h-0 grid gap-3 overflow-y-auto",
                pendingReceipts.length === 1 ? "grid-cols-1" : "grid-cols-2",
              )}
            >
              {pendingReceipts.map(({ file, previewUrl }, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className={cn(
                    "relative rounded-lg border border-border overflow-hidden bg-muted/20",
                    pendingReceipts.length === 1 ? "min-h-[200px]" : "aspect-[4/5]",
                  )}
                >
                  <Image src={previewUrl} alt={file.name} fill unoptimized className="object-contain p-1" />
                  <button
                    type="button"
                    onClick={() => removePending(index)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 border border-border flex items-center justify-center"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              onClick={confirmPendingReceipts}
              disabled={isUploading}
              className="w-full sm:w-auto sm:self-end"
            >
              {isUploading
                ? "Adding..."
                : `Add ${pendingReceipts.length} receipt${pendingReceipts.length > 1 ? "s" : ""} to report`}
            </Button>
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Can&apos;t scan a receipt?{" "}
          <button
            type="button"
            onClick={() => setShowManualForm(true)}
            className="text-primary hover:underline font-semibold"
          >
            Add Expense Manually
          </button>
        </p>
      </div>
    </div>
  );
}
