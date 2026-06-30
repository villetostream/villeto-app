"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { logger } from "@/lib/logger";
import { ImagePlus, Upload, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ImageUpload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

// Simulated OCR data - in real app this would come from an OCR service
const simulateOCR = (fileName: string): Promise<OCRData> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate extracted data based on "receipt" content
      resolve({
        vendor: "StarBucks Coffee",
        amount: 45.99,
        transactionDate: new Date().toISOString(),
        category: "Meals & Entertainment",
        description: `Receipt from ${fileName}`,
      });
    }, 1500);
  });
};

interface OCRData {
  vendor: string;
  amount: number;
  transactionDate: string;
  category: string;
  description: string;
}

function restoreFilesFromSession(): File[] {
  if (typeof window === "undefined") return [];
  const storedReceipts = sessionStorage.getItem("uploadedReceipts");
  const storedFileMetadata = sessionStorage.getItem("uploadedFileMetadata");

  if (storedReceipts && storedFileMetadata) {
    try {
      const fileMetadata = JSON.parse(storedFileMetadata);
      return fileMetadata.map(
        (meta: { name: string; size: number; type: string }) =>
          new File([], meta.name, { type: meta.type }),
      );
    } catch (error) {
      logger.error("Error restoring file metadata:", error);
      sessionStorage.removeItem("uploadedReceipts");
      sessionStorage.removeItem("uploadedFileMetadata");
      return [];
    }
  }

  sessionStorage.removeItem("uploadedReceipts");
  sessionStorage.removeItem("uploadedFileMetadata");
  return [];
}

export default function UploadReceipt() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>(restoreFilesFromSession);
  const [isProcessing, setIsProcessing] = useState(false);

  const previewUrls = useMemo(
    () => files.map((file) => (file.size > 0 ? URL.createObjectURL(file) : "")),
    [files],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [previewUrls]);

  const reportName = searchParams.get("name") || "";
  const reportDate = searchParams.get("date") || "";

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (droppedFiles.length > 0) {
      setFiles((prev) => [...prev, ...droppedFiles]);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []).filter((file) =>
        file.type.startsWith("image/"),
      );

      if (selectedFiles.length > 0) {
        setFiles((prev) => [...prev, ...selectedFiles]);
      }
    },
    [],
  );

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // Update sessionStorage if we're removing a file
      if (updated.length === 0) {
        sessionStorage.removeItem("uploadedReceipts");
        sessionStorage.removeItem("uploadedFileMetadata");
      } else {
        // Update metadata to match remaining files
        const fileMetadata = updated.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        }));
        sessionStorage.setItem(
          "uploadedFileMetadata",
          JSON.stringify(fileMetadata),
        );
        // Also update receipts array
        const storedReceipts = sessionStorage.getItem("uploadedReceipts");
        if (storedReceipts) {
          try {
            const receipts = JSON.parse(storedReceipts);
            const updatedReceipts = receipts.filter(
              (_: string, i: number) => i !== index,
            );
            sessionStorage.setItem(
              "uploadedReceipts",
              JSON.stringify(updatedReceipts),
            );
          } catch (error) {
            logger.error("Error updating receipts:", error);
          }
        }
      }
      return updated;
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleProceed = async () => {
    if (files.length == 0) {
      document.getElementById("file-input")?.click();
      toast.warning("upload a receipt");
      return;
    }
    setIsProcessing(true);

    try {
      let ocrData: OCRData[] = [];
      let receiptImages: string[] = [];

      // Check if receipts are already stored in sessionStorage (navigating back scenario)
      const storedReceipts = sessionStorage.getItem("uploadedReceipts");
      if (storedReceipts) {
        try {
          receiptImages = JSON.parse(storedReceipts);
          // Use existing receipts, only simulate OCR if we have valid file names
          if (files.length > 0 && files[0].name) {
            ocrData = await Promise.all(
              files.map((file) => simulateOCR(file.name)),
            );
          }
        } catch (error) {
          logger.error("Error parsing stored receipts:", error);
          // Fall through to process files normally
        }
      }

      // If no stored receipts, process files normally
      if (receiptImages.length === 0 && files.length > 0) {
        // Simulate OCR for each file
        ocrData = await Promise.all(
          files.map((file) => simulateOCR(file.name)),
        );

        // Convert files to base64 for storage (only for real files)
        receiptImages = await Promise.all(
          files.map((file) => fileToBase64(file)),
        );
      }

      // Store images and file metadata in sessionStorage
      if (receiptImages.length > 0) {
        sessionStorage.setItem(
          "uploadedReceipts",
          JSON.stringify(receiptImages),
        );
        // Store file metadata for restoration when navigating back
        const fileMetadata = files.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        }));
        sessionStorage.setItem(
          "uploadedFileMetadata",
          JSON.stringify(fileMetadata),
        );
      }

      // Navigate to expense form with OCR data
      const params = new URLSearchParams({
        name: reportName,
        date: reportDate,
        ...(ocrData.length > 0 && { ocr: JSON.stringify(ocrData) }),
      });

      router.push(`/expenses/new-expense?${params.toString()}`);
    } catch (error) {
      logger.error("OCR Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    const params = new URLSearchParams({
      name: reportName,
      date: reportDate,
    });
    router.push(`/expenses/new-expense?${params.toString()}`);
  };

  return (
    <>
      <div className="flex gap-4 pb-4 border-b border-border mb-12">
        <div>
          <p className="text-base leading-[125%] font-medium text-foreground mb-1.5 block">
            {reportName}
          </p>
        </div>
        <div>
          <p className="text-base leading-[125%] font-medium text-foreground mb-1.5 block">
            {reportDate}
          </p>
        </div>
      </div>
      <div className="space-y-5 w-3/4 mx-auto">
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50",
            files.length > 0 && "border-solid border-primary/30 bg-primary/5",
          )}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept="image/*"
            multiple
            aria-label="Upload receipt images"
            className="hidden"
            onChange={handleFileSelect}
          />

          {files.length === 0 ? (
            <>
              <div className="mx-auto w-16 h-16 rounded-full  flex items-center justify-center mb-4">
                <HugeiconsIcon
                  icon={ImageUpload01Icon}
                  className="w-8 h-8 text-muted-foreground"
                />
              </div>
              <p className="text-muted-foreground font-normal text-base">
                Have more than one receipt? Drop them here or tap to upload.
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">Review your receipt(s) before continuing</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="relative rounded-lg border border-border overflow-hidden bg-muted/20 aspect-[4/5]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {previewUrls[index] ? (
                      <Image
                        src={previewUrls[index]}
                        alt={file.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImagePlus className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 border border-border flex items-center justify-center hover:bg-white"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 px-2 py-1">
                      <p className="text-[10px] text-white truncate">{file.name}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground pt-1">
                Click or drop to add more receipts
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-4">
          <Button
            onClick={handleProceed}
            disabled={isProcessing}
            className="min-w-[200px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : files.length > 0 ? (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Continue with {files.length} Receipt
                {files.length > 1 ? "s" : ""}
              </>
            ) : (
              "Upload Receipt"
            )}
          </Button>

          {files.length === 0 && (
            <Button variant="ghost" onClick={handleSkip}>
              Skip, enter manually
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
