"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Pencil, Trash2, X } from "lucide-react";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCreateExpenseCategoryApi } from "@/actions/companies/create-expense-category";
import { useGetExpenseCategoriesApi } from "@/actions/companies/get-expense-categories";

interface AddCategoryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    onSkip: () => void;
    cancelText?: string;
    showOnboardingIntro?: boolean;
}

export default function AddCategoryModal({
    open,
    onOpenChange,
    onSuccess,
    onSkip,
    cancelText = "Cancel",
    showOnboardingIntro = true,
}: AddCategoryModalProps) {
    const [categories, setCategories] = useState<{ id: number | string; name: string; description: string }[]>([]);

    const categoriesQuery = useGetExpenseCategoriesApi({ enabled: open });

    // Sync fetched categories into local state (only on first load)
    const [hasSynced, setHasSynced] = useState(false);
    useEffect(() => {
        if (categoriesQuery.data?.data && !hasSynced) {
            const mappedCategories = categoriesQuery.data.data.map((c: any) => ({
                id: c.categoryId ?? c.id,
                name: c.name,
                description: c.description || "",
            }));
            setCategories(mappedCategories);
            setHasSynced(true);
        }
    }, [categoriesQuery.data?.data, hasSynced]);

    const [showAddForm, setShowAddForm] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [hasInteracted, setHasInteracted] = useState(false);

    const createCategoryMutation = useCreateExpenseCategoryApi();

    const openAddForm = () => {
        setName("");
        setDescription("");
        setEditingId(null);
        setShowAddForm(true);
        setHasInteracted(true);
    };

    const openEditForm = (cat: { id: number | string; name: string; description: string }) => {
        setName(cat.name);
        setDescription(cat.description);
        setEditingId(cat.id as number);
        setShowAddForm(true);
    };

    const handleDelete = (id: number) => {
        setCategories(categories.filter(c => c.id !== id));
    };

    const handleSaveCategory = async () => {
        if (!name.trim()) {
            toast.error("Category name is required");
            return;
        }

        if (editingId) {
            // For edits, just update locally (no re-POST for existing items)
            setCategories(categories.map(c =>
                c.id === editingId ? { ...c, name, description } : c
            ));
            toast.success("Category updated!");
            setShowAddForm(false);
            setEditingId(null);
            return;
        }

        // POST new category to API
        try {
            await createCategoryMutation.mutateAsync({
                categories: [{ name: name.trim(), description: description.trim(), module: "expense" }],
            });
            setCategories(prev => [...prev, { id: Date.now(), name: name.trim(), description: description.trim() }]);
            toast.success("Category added!");
            setShowAddForm(false);
        } catch (error: any) {
            const errorMessage =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                "Failed to add category";
            toast.error(errorMessage);
        }
    };

    const isLoading = createCategoryMutation.isPending;

    return (
        <>
            <Dialog open={open} onOpenChange={(val) => {
                if (!val) return;
                onOpenChange(val);
            }}>
                <DialogContent
                    showCloseButton={false}
                    className="sm:max-w-2xl rounded-[2rem] p-0 overflow-hidden border-0 shadow-2xl bg-[#fdfdfd] max-h-[calc(100vh-150px)] flex flex-col"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                <div className="p-10 pl-12 pr-12 flex flex-col flex-1 overflow-hidden">
                        <div className="mb-5 mt-2 shrink-0">
                            {showOnboardingIntro ? (
                                <>
                                    <h2 className="text-2xl font-semibold text-gray-800 mb-1.5 break-words tracking-tight">Almost done</h2>
                                    <p className="text-gray-500 text-[13px]">
                                        Let&apos;s get your organization set up.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-2xl font-semibold text-gray-800 mb-1.5 break-words tracking-tight">Expense categories</h2>
                                    <p className="text-gray-500 text-[13px]">
                                        Manage available categories used for policy creation and submissions.
                                    </p>
                                </>
                            )}
                        </div>

                        <div className="h-px bg-gray-200/60 w-full mb-8 shrink-0"></div>

                        <div className="mb-6 shrink-0">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Configure Expense Categories</h3>
                            <p className="text-gray-500 text-[13px]">
                                Expense categories define the types of expenses employees can submit.
                            </p>
                        </div>

                        <div className="border border-gray-200/80 rounded-[1.25rem] mb-6 overflow-hidden flex flex-col flex-1 min-h-[100px]">
                            <div className="flex px-6 py-4 bg-[#FAFAFA] border-b border-gray-100/60 text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0">
                                <div className="flex-1">Category</div>
                                <div className="flex-[2] pl-2">Description</div>
                                <div className="w-16"></div>
                            </div>
                            <div className="bg-white overflow-y-auto flex-1">
                                {categoriesQuery.isLoading ? (
                                    <div className="flex items-center justify-center px-6 py-8 gap-2 text-sm text-gray-400">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Loading categories...
                                    </div>
                                ) : categories.length === 0 ? (
                                    <div className="px-6 py-6 text-sm text-gray-400 italic text-center">
                                        No categories added yet. Add one below.
                                    </div>
                                ) : (
                                    categories.map((c, idx) => (
                                        <div key={c.id} className={`flex px-6 py-4 items-center text-sm ${idx !== categories.length - 1 ? 'border-b border-gray-100/60' : ''}`}>
                                            <div className="flex-1 font-medium text-gray-900">{c.name}</div>
                                            <div className="flex-[2] text-gray-500 pl-2">{c.description}</div>
                                            <div className="w-16 flex justify-end gap-3 text-gray-400">
                                                <button onClick={() => openEditForm(c)} className="hover:text-gray-700 transition-colors">
                                                    <Pencil className="w-4 h-4 stroke-[1.5]" />
                                                </button>
                                                <button onClick={() => handleDelete(c.id as number)} className="text-red-400 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-4 h-4 stroke-[1.5]" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <button onClick={openAddForm} className="text-[#03C3A6] hover:text-[#03C3A6]/80 font-medium flex items-center gap-1.5 text-sm transition-colors mb-4 shrink-0">
                            <Plus className="w-[18px] h-[18px] stroke-[2]" /> Add Category
                        </button>

                        <div className="flex justify-center sm:justify-end gap-4 mt-auto pt-4 shrink-0">
                            <Button
                                variant="outline"
                                onClick={onSkip}
                                className="h-12 px-8 rounded-xl border border-gray-800 text-gray-800 hover:bg-gray-50 font-medium text-[15px] min-w-[140px]"
                            >
                                {cancelText}
                            </Button>
                            <Button
                                onClick={onSuccess}
                                disabled={!hasInteracted}
                                className="h-12 px-10 rounded-xl bg-[#03C3A6] hover:bg-[#03C3A6]/90 text-primary-foreground shadow-none font-medium text-sm border-0 min-w-[140px] disabled:opacity-50 disabled:pointer-events-none transition-all"
                            >
                                Done
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
                <DialogContent
                    showCloseButton={false}
                    className="sm:max-w-[480px] rounded-[2rem] p-0 overflow-hidden border-0 shadow-2xl bg-white"
                >
                    <div className="p-8 pb-10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">{editingId ? "Edit Category" : "Add Category"}</h2>
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="bg-[#f0f0f0] p-2.5 rounded-full hover:bg-gray-200 transition-colors text-gray-900"
                            >
                                <X className="w-4 h-4 stroke-[2.5]" />
                            </button>
                        </div>

                        <div className="h-px bg-gray-100 w-full mb-8 max-w-[85%]"></div>

                        <div className="space-y-6 mb-10">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                                    Category Name
                                </label>
                                <Input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter name"
                                    className="h-[50px] rounded-[14px] border border-gray-200/80 focus:border-[#88ded3] text-[15px] px-4 shadow-none"
                                    disabled={isLoading}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                                    Description
                                </label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe what it covers..."
                                    className="min-h-[110px] rounded-[14px] border border-gray-200/80 focus:border-[#88ded3] resize-none text-[15px] p-4 shadow-none"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <Button
                                variant="outline"
                                onClick={() => setShowAddForm(false)}
                                disabled={isLoading}
                                className="h-12 flex-1 rounded-xl border border-gray-800 text-gray-800 hover:bg-gray-50 font-medium text-[15px]"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveCategory}
                                disabled={!name.trim() || isLoading}
                                className="h-12 flex-[1.25] rounded-xl bg-[#03C3A6] hover:bg-[#03C3A6]/90 text-primary-foreground shadow-none font-medium text-sm border-0 disabled:opacity-50 disabled:pointer-events-none transition-all"
                            >
                                {isLoading ? (
                                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...</>
                                ) : (
                                    editingId ? "Update Category" : "Add Category"
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
