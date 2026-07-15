"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  X, Plus, Trash2, ChevronDown, Loader2, Package2,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { useGetProcurementCategories } from "@/queries/procurement/purchase-requests";
import type { LineItemPayload } from "@/queries/procurement/purchase-requests";
import { toast } from "sonner";

// ─── Category Dropdown (self-contained) ──────────────────────────────────────

function PanelCategoryDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: catData, isLoading } = useGetProcurementCategories();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const rawCategories = useMemo(() => catData?.data || [], [catData?.data]);
  const selectedName = useMemo(() => {
    if (!value) return "";
    const all = rawCategories.flatMap(c => [c, ...(c.children || [])]);
    return all.find(c => c.categoryId === value)?.name ?? "Selected";
  }, [value, rawCategories]);

  const q = search.trim().toLowerCase();
  const searchResults = q
    ? rawCategories.flatMap(cat => {
        const results: { id: string; name: string; parentName?: string }[] = [];
        if (cat.name.toLowerCase().includes(q)) results.push({ id: cat.categoryId, name: cat.name });
        (cat.children || []).forEach(sub => {
          if (sub.name.toLowerCase().includes(q)) results.push({ id: sub.categoryId, name: sub.name, parentName: cat.name });
        });
        return results;
      })
    : [];

  const close = () => { setOpen(false); setSearch(""); setExpandedId(null); };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full h-10 px-3 rounded-lg border border-border bg-white text-sm flex items-center justify-between cursor-pointer hover:border-primary/60 focus:outline-none transition-colors">
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value ? selectedName || "Selected" : "Select category..."}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-[60] bg-white border border-border rounded-xl shadow-xl mt-1 overflow-hidden">
          <div className="p-2 border-b border-border">
            <input ref={searchRef} value={search} onChange={e => { setSearch(e.target.value); setExpandedId(null); }}
              placeholder="Search categories..."
              className="w-full h-8 px-3 text-sm rounded-md border border-border focus:outline-none focus:border-primary transition-colors" />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : q ? (
            <div className="max-h-48 overflow-y-auto py-1">
              {searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">No matches for "{search}"</p>
              ) : searchResults.map(r => (
                <button key={r.id} type="button" onClick={() => { onChange(r.id, r.name); close(); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors flex items-baseline gap-2 ${value === r.id ? "text-primary font-medium" : "text-foreground"}`}>
                  <span>{r.name}</span>
                  {r.parentName && <span className="text-xs text-muted-foreground font-normal">in {r.parentName}</span>}
                </button>
              ))}
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto py-1">
              {rawCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground px-4 py-3">No categories yet</p>
              ) : rawCategories.map(cat => {
                const isExpanded = expandedId === cat.categoryId;
                const subs = cat.children || [];
                const isSelected = value === cat.categoryId;
                return (
                  <div key={cat.categoryId}>
                    <div className="flex items-center">
                      <button type="button" onClick={() => { onChange(cat.categoryId, cat.name); close(); }}
                        className={`flex-1 text-left px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {cat.name}
                      </button>
                      {subs.length > 0 && (
                        <button type="button" onClick={() => setExpandedId(isExpanded ? null : cat.categoryId)}
                          className={`w-9 h-9 flex items-center justify-center mr-1 rounded-lg transition-colors ${isExpanded ? "text-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/40"}`}>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </div>
                    {isExpanded && (
                      <div className="bg-muted/10 border-t border-b border-border/40">
                        {subs.map(sub => (
                          <button key={sub.categoryId} type="button" onClick={() => { onChange(sub.categoryId, sub.name); close(); }}
                            className={`w-full text-left pl-7 pr-4 py-2 text-sm flex items-center gap-2 hover:bg-muted/40 transition-colors ${value === sub.categoryId ? "text-primary font-medium" : "text-foreground"}`}>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StagedItem extends LineItemPayload {
  _stagingId: string;
  categoryName?: string;
}

interface FormState {
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  quantity: number | "";
  unitPrice: number | "";
  unitOfMeasure: string;
  sku: string;
  taxAmount: number | "";
}

const EMPTY_FORM: FormState = {
  name: "", description: "", categoryId: "", categoryName: "",
  quantity: "", unitPrice: "", unitOfMeasure: "unit", sku: "", taxAmount: "",
};

function currSym(currency: string): string {
  const map: Record<string, string> = { USD: "$", NGN: "₦", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$" };
  return map[currency] || currency;
}

// ─── LineItemBatchModal ────────────────────────────────────────────────────────

export interface LineItemBatchModalProps {
  open: boolean;
  onClose: () => void;
  currency: string;
  onSaveAll: (items: LineItemPayload[]) => Promise<void>;
  saving: boolean;
  editInitial?: Omit<StagedItem, "_stagingId"> | null;
  onEditSaved?: (payload: LineItemPayload) => Promise<void>;
  editSaving?: boolean;
  persistKey?: string;
}

export default function LineItemBatchModal({
  open,
  onClose,
  currency,
  onSaveAll,
  saving,
  editInitial,
  onEditSaved,
  editSaving,
  persistKey,
}: LineItemBatchModalProps) {
  const isEditMode = !!editInitial;
  const sym = currSym(currency);

  const [form, setForm] = useState<FormState>(() =>
    editInitial
      ? {
          name: editInitial.name,
          description: editInitial.description || "",
          categoryId: editInitial.categoryId || "",
          categoryName: editInitial.categoryName || "",
          quantity: editInitial.quantity || "",
          unitPrice: editInitial.unitPrice ?? "",
          unitOfMeasure: editInitial.unitOfMeasure || "unit",
          sku: editInitial.sku || "",
          taxAmount: editInitial.taxAmount ?? "",
        }
      : EMPTY_FORM
  );

  useEffect(() => {
    setForm(
      editInitial
        ? {
            name: editInitial.name,
            description: editInitial.description || "",
            categoryId: editInitial.categoryId || "",
            categoryName: editInitial.categoryName || "",
            quantity: editInitial.quantity || "",
            unitPrice: editInitial.unitPrice ?? "",
            unitOfMeasure: editInitial.unitOfMeasure || "unit",
            sku: editInitial.sku || "",
            taxAmount: editInitial.taxAmount ?? "",
          }
        : EMPTY_FORM
    );
    setStagingEditId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editInitial]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const subtotal =
    typeof form.quantity === "number" && typeof form.unitPrice === "number"
      ? form.quantity * form.unitPrice
      : 0;

  // ── Staged items ──────────────────────────────────────────────────────────
  const [staged, setStaged] = useState<StagedItem[]>(() => {
    if (persistKey && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`line_item_staging:${persistKey}`);
        if (saved) return JSON.parse(saved) as StagedItem[];
      } catch { /* ignore */ }
    }
    return [];
  });

  useEffect(() => {
    if (!persistKey || typeof window === "undefined") return;
    try {
      if (staged.length > 0) {
        localStorage.setItem(`line_item_staging:${persistKey}`, JSON.stringify(staged));
      } else {
        localStorage.removeItem(`line_item_staging:${persistKey}`);
      }
    } catch { /* ignore */ }
  }, [staged, persistKey]);

  const [stagingEditId, setStagingEditId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; quantity?: string }>({});

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = "Item name is required";
    if (form.quantity === "" || Number(form.quantity) <= 0) errs.quantity = "Quantity must be > 0";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = (): LineItemPayload => ({
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    quantity: Number(form.quantity),
    unitPrice: form.unitPrice === "" ? undefined : Number(form.unitPrice),
    taxAmount: form.taxAmount === "" ? undefined : Number(form.taxAmount),
    sku: form.sku.trim() || undefined,
    unitOfMeasure: form.unitOfMeasure.trim() || undefined,
    categoryId: form.categoryId || undefined,
    accountingResolutionStatus: "unresolved",
  });

  const handleAddToStaging = () => {
    if (!validate()) return;
    const payload = buildPayload();
    if (stagingEditId) {
      setStaged(prev =>
        prev.map(s =>
          s._stagingId === stagingEditId
            ? { ...payload, _stagingId: stagingEditId, categoryName: form.categoryName }
            : s
        )
      );
      setStagingEditId(null);
    } else {
      const newItem: StagedItem = {
        ...payload,
        _stagingId: `staging-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        categoryName: form.categoryName,
      };
      setStaged(prev => [...prev, newItem]);
    }
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const handleEditStaged = (item: StagedItem) => {
    setForm({
      name: item.name,
      description: item.description || "",
      categoryId: item.categoryId || "",
      categoryName: item.categoryName || "",
      quantity: item.quantity,
      unitPrice: item.unitPrice ?? "",
      unitOfMeasure: item.unitOfMeasure || "unit",
      sku: item.sku || "",
      taxAmount: item.taxAmount ?? "",
    });
    setStagingEditId(item._stagingId);
    setErrors({});
  };

  const handleRemoveStaged = (id: string) => {
    setStaged(prev => prev.filter(s => s._stagingId !== id));
    if (stagingEditId === id) {
      setStagingEditId(null);
      setForm(EMPTY_FORM);
    }
  };

  const handleSaveAll = async () => {
    if (staged.length === 0) {
      toast.error("Add at least one item before saving");
      return;
    }
    const payloads: LineItemPayload[] = staged.map(({ _stagingId: _, categoryName: __, ...rest }) => rest);
    await onSaveAll(payloads);
    setStaged([]);
    if (persistKey && typeof window !== "undefined") {
      localStorage.removeItem(`line_item_staging:${persistKey}`);
    }
    handleClose();
  };

  const handleEditSave = async () => {
    if (!validate() || !onEditSaved) return;
    await onEditSaved(buildPayload());
  };

  const handleClose = () => {
    setErrors({});
    if (stagingEditId) {
      setStagingEditId(null);
      setForm(EMPTY_FORM);
    }
    onClose();
  };

  const stagedTotal = staged.reduce((acc, s) => {
    const qty = typeof s.quantity === "number" ? s.quantity : 0;
    const up = typeof s.unitPrice === "number" ? s.unitPrice : 0;
    return acc + qty * up;
  }, 0);

  if (!open) return null;

  // Render the form section
  const renderForm = () => (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${stagingEditId || isEditMode ? "bg-amber-100" : "bg-primary/10"}`}>
            {stagingEditId || isEditMode
              ? <AlertCircle className="w-3 h-3 text-amber-600" />
              : <Plus className="w-3 h-3 text-primary" />}
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {isEditMode ? "Edit item" : stagingEditId ? "Edit staged item" : "New item"}
          </p>
        </div>

        {/* Primary CTA moved to top right */}
        {isEditMode ? (
          <button type="button" onClick={handleEditSave} disabled={editSaving}
            className="h-8 px-4 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm">
            {editSaving && <Loader2 className="w-3 h-3 animate-spin" />}
            Save Changes
          </button>
        ) : (
          <button type="button" onClick={handleAddToStaging}
            className="h-8 px-3 rounded-lg border border-primary text-primary text-xs font-semibold hover:bg-primary/5 transition-colors flex items-center justify-center gap-1.5 shadow-sm">
            <Plus className="w-3 h-3" />
            {stagingEditId ? "Update staged" : "Add to list"}
          </button>
        )}
      </div>

      {/* Item Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Item Name <span className="text-red-500">*</span>
        </label>
        <input type="text" value={form.name}
          onChange={e => { set("name", e.target.value); setErrors(p => ({ ...p, name: undefined })); }}
          placeholder="e.g. Dell XPS Laptop"
          className={`w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:border-primary transition-colors ${errors.name ? "border-destructive" : "border-border"}`}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Category</label>
        <PanelCategoryDropdown
          value={form.categoryId}
          onChange={(id, name) => setForm(p => ({ ...p, categoryId: id, categoryName: name }))}
        />
      </div>

      {/* Qty + Unit Price */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Quantity <span className="text-red-500">*</span>
          </label>
          <input type="number" min={1} value={form.quantity}
            onChange={e => { set("quantity", e.target.value === "" ? "" : Number(e.target.value)); setErrors(p => ({ ...p, quantity: undefined })); }}
            placeholder="0"
            className={`w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:border-primary transition-colors ${errors.quantity ? "border-destructive" : "border-border"}`}
          />
          {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Unit Price</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">{sym}</span>
            <input type="number" min={0} value={form.unitPrice}
              onChange={e => set("unitPrice", e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0.00"
              className="w-full h-10 pl-7 pr-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Unit of Measure */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Unit of Measure</label>
        <input type="text" value={form.unitOfMeasure}
          onChange={e => set("unitOfMeasure", e.target.value)}
          placeholder="unit / box / kg"
          className="w-full h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Description <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea value={form.description} onChange={e => set("description", e.target.value)}
          placeholder="Brief description of this item" rows={2}
          className="w-full px-3 py-2.5 rounded-lg border border-border text-sm resize-none focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Subtotal preview */}
      {subtotal > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 rounded-xl">
          <span className="text-sm text-muted-foreground">Line Subtotal</span>
          <span className="text-sm font-semibold text-foreground">
            {sym}{subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center">
      {/* Backdrop (intentionally ignores clicks to prevent accidental closure) */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Modal Container */}
      <div className={`relative bg-white shadow-2xl rounded-2xl flex flex-col overflow-hidden m-4 sm:m-6 w-full max-h-[90vh] ${isEditMode ? 'max-w-md' : 'max-w-5xl'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0 bg-white">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {isEditMode ? "Edit Line Item" : "Add Line Items"}
            </h3>
            {!isEditMode && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Staged items are saved locally until you submit the batch.
              </p>
            )}
          </div>
          <button onClick={handleClose} title="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors shrink-0">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Body (Split View) */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          
          {/* Left Pane (List of Staged Items) - Only show in batch mode */}
          {!isEditMode && (
            <div className="flex-1 md:w-[55%] border-r border-border bg-muted/10 flex flex-col overflow-hidden min-h-0">
              <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between bg-white shrink-0">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Package2 className="w-4 h-4 text-muted-foreground" />
                  Staged Items
                </span>
                {stagedTotal > 0 && (
                  <span className="text-sm font-bold text-foreground">
                    Total: {sym}{stagedTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto min-h-0 p-5">
                {staged.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Package2 className="w-6 h-6 text-primary/60" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">No items staged yet</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
                        Fill out the form to add items to your staging list.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {staged.map((item, idx) => {
                      const isBeingEdited = stagingEditId === item._stagingId;
                      const lineSubtotal = (item.quantity || 0) * (item.unitPrice || 0);
                      return (
                        <div key={item._stagingId}
                          className={`p-4 rounded-xl border bg-white transition-all shadow-sm ${isBeingEdited ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-border/80"}`}>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-4">
                                <p className="text-sm font-semibold text-foreground truncate" title={item.name}>{item.name}</p>
                                {lineSubtotal > 0 && (
                                  <span className="text-sm font-semibold text-foreground shrink-0">
                                    {sym}{lineSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-xs text-muted-foreground">
                                  {item.quantity} {item.unitOfMeasure || 'unit'} {item.unitPrice ? `@ ${sym}${item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : ""}
                                </span>
                                {item.categoryName && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                                    {item.categoryName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <button type="button" onClick={() => handleEditStaged(item)} title="Edit staged item"
                                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${isBeingEdited ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                                </svg>
                              </button>
                              <button type="button" onClick={() => handleRemoveStaged(item._stagingId)} title="Remove"
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right Pane (Form) */}
          <div className={`${isEditMode ? 'w-full' : 'md:w-[45%]'} bg-white flex flex-col min-h-0 overflow-y-auto`}>
            {renderForm()}
          </div>
        </div>

        {/* Footer (batch save) */}
        {!isEditMode && (
          <div className="shrink-0 border-t border-border bg-muted/5 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {staged.length > 0 ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">
                      {staged.length} item{staged.length !== 1 ? "s" : ""} staged
                    </span>
                    <span className="text-xs text-muted-foreground">Ready to be saved to the request</span>
                  </div>
                </>
              ) : (
                <span className="text-sm text-muted-foreground italic">No items staged yet</span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button type="button" onClick={handleClose}
                className="h-10 px-4 rounded-xl border border-border text-sm font-medium hover:bg-muted/40 transition-colors bg-white">
                Cancel
              </button>
              <button type="button" onClick={handleSaveAll}
                disabled={saving || staged.length === 0}
                className="h-10 px-6 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] justify-center shadow-sm">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  `Save ${staged.length} Item${staged.length !== 1 ? "s" : ""}`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
