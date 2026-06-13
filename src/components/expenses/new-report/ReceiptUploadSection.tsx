"use client";

import { logger } from "@/lib/logger";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExpenseForm, type ExpenseDetailFormData } from "./ExpenseForm";

interface ReceiptUploadSectionProps {
  onReceiptsUpload: (receipts: { base64: string; name: string }[]) => void;
  onAddExpense: (data: ExpenseDetailFormData, receiptImage?: string) => void;
  categories: { categoryId: string; name: string }[];
}

export function ReceiptUploadSection({
  onReceiptsUpload,
  onAddExpense,
  categories,
}: ReceiptUploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

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

  const processFiles = useCallback(
    async (files: File[]) => {
      setIsUploading(true);
      try {
        const processedFiles = await Promise.all(
          files.map(async (file) => ({
            base64: await fileToBase64(file),
            name: file.name,
          }))
        );
        onReceiptsUpload(processedFiles);
      } catch (error) {
        logger.error("Error processing files:", error);
      } finally {
        setIsUploading(false);
      }
    },
    [onReceiptsUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/")
      );
      if (files.length > 0) {
        processFiles(files);
      }
    },
    [processFiles]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  return (
    <>
      {showManualForm ? (
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
      ) : (
        <div className="animate-in fade-in zoom-in-[0.99] duration-150 ease-out">
          <div 
            className={cn(
                "border-2 border-dashed border-primary rounded-lg p-12 transition-colors relative flex flex-col items-center justify-center min-h-[350px]",
                isDragging ? "bg-primary/10" : "bg-white"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-center space-y-6 max-w-sm w-full">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-[#F0FBFA] flex items-center justify-center">
                   <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 9C20.5523 9 21 8.55228 21 8V6C21 4.34315 19.6569 3 18 3H6C4.34315 3 3 4.34315 3 6V8C3 8.55228 3.44772 9 4 9C4.55228 9 5 8.55228 5 8V6C5 5.44772 5.44772 5 6 5H18C18.5523 5 19 5.44772 19 6V8C19 8.55228 19.4477 9 20 9Z" fill="#111827"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 18C14.2091 18 16 16.2091 16 14C16 11.7909 14.2091 10 12 10C9.79086 10 8 11.7909 8 14C8 16.2091 9.79086 18 12 18ZM12 16C13.1046 16 14 15.1046 14 14C14 12.8954 13.1046 12 12 12C10.8954 12 10 12.8954 10 14C10 15.1046 10.8954 16 12 16Z" fill="#111827"/>
                    <path d="M3 13C3 12.4477 3.44772 12 4 12C4.55228 12 5 12.4477 5 13V18C5 18.5523 5.44772 19 6 19H18C18.5523 19 19 18.5523 19 18V13C19 12.4477 19.4477 12 20 12C20.5523 12 21 12.4477 21 13V18C21 20.2091 19.2091 22 17 22H7C4.79086 22 3 20.2091 3 18V13Z" fill="#111827"/>
                    </svg>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-[#111827]">
                Scan Receipts
              </h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                Upload one or multiple receipts. It will automatically extract
                merchant, amount, and dates.
              </p>

              {/* Upload button */}
              <div className="pt-2 flex justify-center">
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
                  onClick={() =>
                    document.getElementById("receipt-upload-input")?.click()
                  }
                  disabled={isUploading}
                  className="bg-white border-2 border-primary text-primary hover:bg-primary/10 h-10 px-8 rounded-lg font-medium min-w-[160px]"
                >
                  {isUploading ? "Uploading..." : "Upload Receipts"}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-6">
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
      )}
    </>
  );
}
