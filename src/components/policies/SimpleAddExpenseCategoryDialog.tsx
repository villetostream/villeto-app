"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useCreateExpenseCategoryApi } from "@/queries/companies/create-expense-category";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/constants/api-query-key";
import { getApiErrorMessage } from "@/lib/types/api-error";

interface SimpleAddExpenseCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a category is successfully created */
  onSuccess?: () => void;
}

/**
 * Lightweight "Add Category" dialog that matches the tour-guide design:
 * – Category Name field
 * – Description textarea
 * – Cancel  |  Add Category buttons
 *
 * Used on the Policies → Expense Category tab and inside PolicyCreationModal.
 */
export default function SimpleAddExpenseCategoryDialog({
  open,
  onOpenChange,
  onSuccess,
}: SimpleAddExpenseCategoryDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useCreateExpenseCategoryApi();
  const queryClient = useQueryClient();
  const isLoading = createMutation.isPending;

  const reset = () => {
    setName("");
    setDescription("");
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }
    try {
      await createMutation.mutateAsync({
        categories: [
          {
            name: name.trim(),
            description: description.trim(),
            module: "expense",
          },
        ],
      });
      // Refresh the expense categories list wherever it is consumed
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EXPENSE_CATEGORIES] });
      toast.success("Category added!");
      reset();
      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to add category"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[480px] rounded-[2rem] p-0 overflow-hidden border-0 shadow-2xl bg-white"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="p-8 pb-10">
          {/* ── Header ── */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
              Add Category
            </h2>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="bg-[#f0f0f0] p-2.5 rounded-full hover:bg-gray-200 transition-colors text-gray-900 disabled:opacity-50"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* ── Divider ── */}
          <div className="h-px bg-gray-100 w-full mb-8 max-w-[85%]" />

          {/* ── Fields ── */}
          <div className="space-y-6 mb-10">
            {/* Category Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleAdd()}
                placeholder="Enter name"
                disabled={isLoading}
                className="w-full h-[50px] rounded-[14px] border border-gray-200 focus:border-[#88ded3] focus:outline-none text-[15px] px-4 transition-colors disabled:opacity-50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what it covers..."
                disabled={isLoading}
                rows={4}
                className="w-full rounded-[14px] border border-gray-200 focus:border-[#88ded3] focus:outline-none resize-none text-[15px] p-4 transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="h-12 flex-1 rounded-xl border border-gray-800 text-gray-800 hover:bg-gray-50 font-medium text-[15px] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!name.trim() || isLoading}
              className="h-12 flex-[1.25] rounded-xl bg-[#03C3A6] hover:bg-[#03C3A6]/90 text-white font-medium text-sm transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </span>
              ) : (
                "Add Category"
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
