"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Yes",
  destructive = false,
}: ConfirmationModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="rounded-[14px] p-6 max-w-[400px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[18px] font-bold text-[#0b100e]">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[13px] text-[#68726d] leading-relaxed mt-2">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex gap-3 sm:justify-end">
          <AlertDialogCancel 
            onClick={onClose}
            className="h-10 px-6 rounded-[8px] border border-black/[0.08] bg-white text-[#68726d] font-semibold text-[13px] hover:bg-[#f9faf9] hover:text-[#0b100e] transition-colors mt-0"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              destructive 
                ? "h-10 px-6 rounded-[8px] bg-[#d33d44] text-white font-semibold text-[13px] hover:bg-[#c33339] transition-colors shadow-sm"
                : "h-10 px-6 rounded-[8px] bg-[#087f70] text-white font-semibold text-[13px] hover:bg-[#076b5e] transition-colors shadow-sm"
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
