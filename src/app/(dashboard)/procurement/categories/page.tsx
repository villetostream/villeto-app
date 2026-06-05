"use client";

import { useState, useMemo, useEffect } from "react";
import {
  PlusCircle, Trash2, Search, RefreshCcw, Loader2, X, Plus, FolderOpen, Tag, ArrowUpDown, Check,
} from "lucide-react";
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
import {
  useGetProcurementCategories,
  useCreateProcurementCategory,
} from "@/actions/procurement/purchase-requests";
import { useDeleteCategoryApi } from "@/actions/companies/delete-category";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import { toast } from "sonner";

// ─── Add Category / Subcategory Modal ─────────────────────────────────────────

function AddProcurementCategoryModal({
  open,
  onClose,
  parentCategory,
}: {
  open: boolean;
  onClose: () => void;
  parentCategory?: { id: string; name: string } | null;
}) {
  const [name, setName] = useState("");
  const createCategory = useCreateProcurementCategory();

  useEffect(() => { if (open) setName(""); }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    try {
      await createCategory.mutateAsync({ name: name.trim(), parentCategoryId: parentCategory?.id });
      toast.success(parentCategory ? `Subcategory added to "${parentCategory.name}"` : `Category "${name.trim()}" created`);
      setName("");
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[460px]">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {parentCategory ? "Add Subcategory" : "New Category"}
              </h2>
              {parentCategory && (
                <p className="text-sm text-muted-foreground mt-0.5">Under <span className="font-medium text-foreground">{parentCategory.name}</span></p>
              )}
            </div>
            <button onClick={() => { setName(""); onClose(); }} className="w-8 h-8 rounded-full bg-muted/40 hover:bg-muted/70 flex items-center justify-center transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                {parentCategory ? "Subcategory Name" : "Category Name"} <span className="text-red-500">*</span>
              </label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") { setName(""); onClose(); } }}
                placeholder={parentCategory ? "e.g. Laptop Stands" : "e.g. IT Equipment"}
                className="w-full h-11 px-3.5 rounded-xl border border-border text-sm focus:outline-none focus:border-primary transition-colors bg-white"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setName(""); onClose(); }}
                className="flex-1 h-11 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit}
                disabled={createCategory.isPending || !name.trim()}
                className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {createCategory.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {parentCategory ? "Add Subcategory" : "Create Category"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProcurementCategoriesPage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [parentForAdd, setParentForAdd] = useState<{ id: string; name: string } | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);
  const [sortBy, setSortBy] = useState<"az" | "za" | "most" | "least">("az");
  const [sortOpen, setSortOpen] = useState(false);

  const { data: catData, isLoading, refetch } = useGetProcurementCategories();
  const deleteCategoryMutation = useDeleteCategoryApi();

  const rawCategories = useMemo(() => catData?.data || [], [catData?.data]);

  // Register header CTA
  const { setAction, clearAction } = useHeaderActionStore();
  useEffect(() => {
    setAction({ label: "Add Category", onClick: () => { setParentForAdd(null); setIsAddOpen(true); } });
    return () => clearAction();
  }, [setAction, clearAction]);

  // Auto-select first category
  useEffect(() => {
    if (rawCategories.length > 0 && !selectedId) {
      setSelectedId(rawCategories[0].categoryId);
    }
  }, [rawCategories, selectedId]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    let results = !q
      ? rawCategories
      : rawCategories.filter((cat: any) =>
          cat.name.toLowerCase().includes(q) ||
          (cat.children || []).some((sub: any) => sub.name.toLowerCase().includes(q))
        );

    // Sort
    results = [...results].sort((a: any, b: any) => {
      if (sortBy === "az") return a.name.localeCompare(b.name);
      if (sortBy === "za") return b.name.localeCompare(a.name);
      const aCount = (a.children || []).length;
      const bCount = (b.children || []).length;
      if (sortBy === "most") return bCount - aCount;
      if (sortBy === "least") return aCount - bCount;
      return 0;
    });

    return results;
  }, [search, rawCategories, sortBy]);

  const selectedCategory = useMemo(
    () => rawCategories.find((c: any) => c.categoryId === selectedId) || null,
    [rawCategories, selectedId]
  );

  const executeDelete = async () => {
    if (!categoryToDelete) return;
    const isParent = rawCategories.some((c: any) => c.categoryId === categoryToDelete.id);
    try {
      await deleteCategoryMutation.mutateAsync({ categoryId: categoryToDelete.id });
      toast.success("Deleted successfully");
      if (isParent && selectedId === categoryToDelete.id) setSelectedId(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete");
    } finally {
      setCategoryToDelete(null);
    }
  };

  const totalSubs = rawCategories.reduce((acc: number, c: any) => acc + (c.children?.length || 0), 0);

  return (
    <div className="flex flex-col gap-4" style={{ height: "calc(100vh - 7rem)" }}>
      {/* Description + Stats strip */}
      <div className="flex items-center justify-between flex-wrap gap-3 shrink-0">
        <p className="text-sm text-muted-foreground">Manage categories and subcategories for purchase requests.</p>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium text-muted-foreground">
            <FolderOpen className="w-3.5 h-3.5 text-primary" />
            {rawCategories.length} Categories
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium text-muted-foreground">
            <Tag className="w-3.5 h-3.5 text-teal-500" />
            {totalSubs} Subcategories
          </span>
        </div>
      </div>

      {/* ── Split panel (fills remaining height) ── */}
      <div className="flex-1 bg-card rounded-[1.25rem] border border-border shadow-sm flex overflow-hidden min-h-0">

        {/* ── LEFT: Category list ── */}
        <div className="w-72 shrink-0 border-r border-border flex flex-col bg-muted/20">
          {/* Search + Sort */}
          <div className="p-4 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-border bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            {/* Sort control */}
            <div className="relative">
              <button
                onClick={() => setSortOpen(v => !v)}
                className="w-full h-8 px-3 rounded-xl border border-border bg-white text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border/80 flex items-center gap-2 transition-colors"
              >
                <ArrowUpDown className="w-3 h-3 shrink-0" />
                <span className="flex-1 text-left">
                  {sortBy === "az" ? "A → Z" : sortBy === "za" ? "Z → A" : sortBy === "most" ? "Most subcategories" : "Fewest subcategories"}
                </span>
              </button>
              {sortOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-border rounded-xl shadow-lg overflow-hidden">
                  {([
                    { key: "az", label: "A → Z" },
                    { key: "za", label: "Z → A" },
                    { key: "most", label: "Most subcategories" },
                    { key: "least", label: "Fewest subcategories" },
                  ] as { key: typeof sortBy; label: string }[]).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => { setSortBy(opt.key); setSortOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs font-medium flex items-center justify-between hover:bg-muted/40 transition-colors"
                    >
                      <span className={sortBy === opt.key ? "text-primary" : "text-foreground"}>{opt.label}</span>
                      {sortBy === opt.key && <Check className="w-3 h-3 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category items */}
          <div className="flex-1 overflow-y-auto py-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-sm text-muted-foreground">{search ? "No matches found." : "No categories yet."}</p>
              </div>
            ) : (
              filteredCategories.map((cat: any) => {
                const isActive = selectedId === cat.categoryId;
                const subCount = (cat.children || []).length;
                return (
                  <button
                    key={cat.categoryId}
                    onClick={() => setSelectedId(cat.categoryId)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all group relative ${
                      isActive
                        ? "bg-primary/[0.07] border-r-[3px] border-primary"
                        : "hover:bg-muted/40 border-r-[3px] border-transparent"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                      {cat.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>{cat.name}</p>
                      <p className="text-xs text-muted-foreground">{subCount} subcategor{subCount === 1 ? "y" : "ies"}</p>
                    </div>
                    {/* Delete parent — shows on hover */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setCategoryToDelete({ id: cat.categoryId, name: cat.name }); }}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </button>
                );
              })
            )}
          </div>

          {/* Add category */}
          <div className="p-3 border-t border-border">
            <button
              onClick={() => { setParentForAdd(null); setIsAddOpen(true); }}
              className="w-full h-9 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>
        </div>

        {/* ── RIGHT: Subcategory detail ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedCategory ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-4">
                <FolderOpen className="w-7 h-7 text-muted-foreground/50" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Select a category to view its subcategories</p>
            </div>
          ) : (
            <>
              {/* Right panel header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 shrink-0">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{selectedCategory.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(selectedCategory.children || []).length} subcategor{(selectedCategory.children || []).length === 1 ? "y" : "ies"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refetch()}
                    className="h-8 w-8 rounded-lg border border-border bg-white flex items-center justify-center text-muted-foreground hover:bg-muted/30 transition-colors"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setParentForAdd({ id: selectedCategory.categoryId, name: selectedCategory.name }); setIsAddOpen(true); }}
                    className="h-8 px-4 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Subcategory
                  </button>
                </div>
              </div>

              {/* Subcategory list */}
              <div className="flex-1 overflow-y-auto">
                {(selectedCategory.children || []).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <div className="w-12 h-12 rounded-xl bg-muted/40 flex items-center justify-center mb-3">
                      <Tag className="w-5 h-5 text-muted-foreground/50" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">No subcategories</p>
                    <p className="text-xs text-muted-foreground mb-5">Add subcategories to help teams classify purchase items more precisely.</p>
                    <button
                      onClick={() => { setParentForAdd({ id: selectedCategory.categoryId, name: selectedCategory.name }); setIsAddOpen(true); }}
                      className="h-9 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Subcategory
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {(selectedCategory.children || []).map((sub: any, i: number) => (
                      <div key={sub.categoryId || i} className="flex items-center justify-between px-6 py-3.5 group hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                            <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium text-foreground truncate">{sub.name}</span>
                        </div>
                        <button
                          onClick={() => setCategoryToDelete({ id: sub.categoryId, name: sub.name })}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all shrink-0 ml-4"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <AddProcurementCategoryModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        parentCategory={parentForAdd}
      />

      <AlertDialog open={categoryToDelete !== null} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{categoryToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              This will permanently delete this item. If it is a parent category, its subcategories may also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="rounded-xl bg-destructive hover:bg-destructive/90 text-white">
              {deleteCategoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}