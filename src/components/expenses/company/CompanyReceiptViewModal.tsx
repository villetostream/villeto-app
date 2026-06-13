"use client";

import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompanyReceiptViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptUrl: string;
}

export function CompanyReceiptViewModal({
  isOpen,
  onClose,
  receiptUrl,
}: CompanyReceiptViewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] sm:rounded-2xl" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Receipt Preview</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Receipt Image */}
          <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
            {receiptUrl ? (
              <Image
                src={receiptUrl}
                alt="Receipt"
                width={600}
                height={500}
                unoptimized
                className="w-full h-auto max-h-[500px] object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No receipt available
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
