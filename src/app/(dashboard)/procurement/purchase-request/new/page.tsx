"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown, Plus, Trash2, Calendar as CalendarIcon, X,
  CheckCircle2, Loader2, Pencil,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { useAuthStore } from "@/stores/auth-stores";
import {
  useCreatePurchaseRequest,
  useAddLineItem,
  useUpdateLineItem,
  useDeleteLineItem,
  useSubmitPurchaseRequest,
  useGetProcurementCategories,
  useCreateProcurementCategory,
  type LineItemPayload,
  type PurchaseRequestLineItem,
  type PRPriority,
} from "@/queries/procurement/purchase-requests";
import { useGetAllDepartmentsApi } from "@/queries/departments/get-all-departments";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/types/api-error";
import { isPRPriority, parseLineItemsFromAddResponse, toApiLineItemPayload } from "@/lib/types/purchase-request-helpers";

function cleanLineItemPayload(payload: LineItemPayload): LineItemPayload {
  return toApiLineItemPayload(payload);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITIES: { label: string; value: string }[] = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "urgent" },   // UI shows "High", sends "urgent" to backend
];

const CURRENCIES = ["USD", "NGN", "EUR", "GBP", "CAD", "AUD", "GHS", "KES", "ZAR", "JPY", "CNY"];

// Department editability is now driven by permissions, not role names

// ─── Generic Select Dropdown ──────────────────────────────────────────────────

function SelectDropdown({
  value, onChange, options, placeholder, disabled = false, id,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
  disabled?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = options.find(o => o.value === value);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button" id={id}
        onClick={() => !disabled && setOpen(v => !v)}
        className={`w-full h-11 px-3 rounded-lg border border-border bg-muted/30 text-sm flex items-center justify-between transition-colors ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-primary/60 focus:outline-none"}`}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected?.label || placeholder}
        </span>
        {!disabled && <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 bg-white border border-border rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
          {options.map(o => (
            <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors ${value === o.value ? "text-primary font-medium" : "text-foreground"}`}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Two-Step Category Dropdown ───────────────────────────────────────────────

function CategoryDropdown({
  value, onChange,
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
  const _createCategory = useCreateProcurementCategory();

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

  // Flat search results: matches from parents and subcategories
  const searchResults: { id: string; name: string; parentName?: string }[] = q
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

  const handleSelectParent = (id: string, name: string) => { onChange(id, name); close(); };
  const handleSelectSub = (id: string, name: string) => { onChange(id, name); close(); };
  const handleSelectResult = (id: string, name: string) => { onChange(id, name); close(); };



  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full h-11 px-3 rounded-lg border border-border bg-muted/30 text-sm flex items-center justify-between cursor-pointer hover:border-primary/60 focus:outline-none transition-colors">
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value ? selectedName || "Selected" : "Select category..."}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 bg-white border border-border rounded-xl shadow-xl mt-1 overflow-hidden">
          {/* Search bar — always visible */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input ref={searchRef} value={search} onChange={e => { setSearch(e.target.value); setExpandedId(null); }}
                placeholder="Search categories..."
                className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-border focus:outline-none focus:border-primary transition-colors bg-white" />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : q ? (
            /* ── Search results (flat) ── */
            <div className="max-h-56 overflow-y-auto py-1">
              {searchResults.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                  <span className="block font-medium text-foreground">No matches for &quot;{search}&quot;</span>
                </div>
              ) : (
                searchResults.map(r => (
                  <button key={r.id} type="button" onClick={() => handleSelectResult(r.id, r.name)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors flex items-baseline gap-2 ${value === r.id ? "text-primary font-medium" : "text-foreground"}`}>
                    <span>{r.name}</span>
                    {r.parentName && <span className="text-xs text-muted-foreground font-normal">in {r.parentName}</span>}
                  </button>
                ))
              )}
            </div>
          ) : (
            /* ── Accordion browse (no search) ── */
            <div className="max-h-56 overflow-y-auto py-1">
              {rawCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground px-4 py-3">No categories yet</p>
              ) : (
                rawCategories.map(cat => {
                  const isExpanded = expandedId === cat.categoryId;
                  const subs = cat.children || [];
                  const isSelected = value === cat.categoryId;
                  return (
                    <div key={cat.categoryId}>
                      <div className="flex items-center">
                        <button type="button" onClick={() => handleSelectParent(cat.categoryId, cat.name)}
                          className={`flex-1 text-left px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {cat.name}
                          {isSelected && <span className="ml-2 text-xs font-normal text-muted-foreground">(selected)</span>}
                        </button>
                        <button type="button" onClick={() => setExpandedId(isExpanded ? null : cat.categoryId)}
                          className={`w-9 h-9 flex items-center justify-center mr-1 rounded-lg transition-colors ${isExpanded ? "text-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/40"}`}
                          title={`${subs.length} subcategory${subs.length !== 1 ? "s" : ""}`}>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="bg-muted/10 border-t border-b border-border/40">
                          {subs.map(sub => (
                            <button key={sub.categoryId} type="button" onClick={() => handleSelectSub(sub.categoryId, sub.name)}
                              className={`w-full text-left pl-7 pr-4 py-2 text-sm flex items-center gap-2 hover:bg-muted/40 transition-colors ${value === sub.categoryId ? "text-primary font-medium" : "text-foreground"}`}>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
                              {sub.name}
                            </button>
                          ))}

                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}


        </div>
      )}
    </div>
  );
}

// ─── Add / Edit Line Item Modal ───────────────────────────────────────────────

interface ModalItem {
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  departmentId: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  sku: string;
  unitOfMeasure: string;
}

const EMPTY_MODAL: ModalItem = {
  name: "", description: "", categoryId: "", categoryName: "",
  departmentId: "", quantity: 0, unitPrice: 0, taxAmount: 0,
  sku: "", unitOfMeasure: "unit",
};

function LineItemModal({
  onClose, onSave, initial, loading, departments: _departments, currency,
}: {
  onClose: () => void;
  onSave: (data: LineItemPayload) => void;
  initial?: ModalItem;
  loading: boolean;
  departments: { label: string; value: string }[];
  currency: string;
}) {
  const [form, setForm] = useState<ModalItem>(initial || EMPTY_MODAL);
  const currencySymbol = currency === "USD" ? "$" : currency === "NGN" ? "₦" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency;
  const subtotal = form.quantity * form.unitPrice;

  const set = (k: keyof ModalItem, v: string | number) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Item name is required"); return; }
    if (!form.quantity || form.quantity <= 0) { toast.error("Quantity must be > 0"); return; }
    const payload: LineItemPayload = {
      name: form.name,
      description: form.description || undefined,
      quantity: form.quantity,
      unitPrice: form.unitPrice,
      taxAmount: form.taxAmount || undefined,
      sku: form.sku || undefined,
      unitOfMeasure: form.unitOfMeasure || undefined,
      categoryId: form.categoryId || undefined,
      departmentId: form.departmentId || undefined,
      accountingResolutionStatus: "unresolved",
    };
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white z-10 shrink-0 rounded-t-2xl">
          <h3 className="text-base font-bold text-foreground">{initial ? "Edit Line Item" : "Add Line Item"}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Item Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="e.g. Dell XPS Laptop"
              className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Category</label>
            <CategoryDropdown
              value={form.categoryId}
              onChange={(id, name) => setForm(p => ({ ...p, categoryId: id, categoryName: name }))}
            />
          </div>

          {/* Qty + Unit Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Quantity <span className="text-red-500">*</span></label>
              <input type="number" min={1} value={form.quantity || ""}
                onChange={e => set("quantity", Number(e.target.value))} placeholder="0"
                className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Unit Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                  {currencySymbol}
                </span>
                <input type="number" min={0} value={form.unitPrice || ""}
                  onChange={e => set("unitPrice", Number(e.target.value))} placeholder="0.00"
                  className="w-full h-11 pl-8 pr-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors bg-white" />
              </div>
            </div>
          </div>

          {/* Unit of Measure */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Unit of Measure</label>
            <input type="text" value={form.unitOfMeasure} onChange={e => set("unitOfMeasure", e.target.value)}
              placeholder="unit / box / kg"
              className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Brief description of this item"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm resize-none focus:outline-none focus:border-primary transition-colors" />
          </div>

          {/* Subtotal preview */}
          {subtotal > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-xl">
              <span className="text-sm text-muted-foreground">Line Subtotal</span>
              <span className="text-sm font-semibold text-foreground">
                {currencySymbol}{subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border bg-white z-10 shrink-0 rounded-b-2xl">
          <button type="button" onClick={handleSave} disabled={loading}
            className="w-full h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {initial ? "Save Changes" : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3">
      {[1, 2].map((s, i) => {
        const done = step > s;
        const active = step === s;
        return (
          <div key={s} className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${done ? "bg-emerald-50 text-emerald-600" : active ? "bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground"}`}>
              {done ? <CheckCircle2 className="w-4 h-4" /> : (
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${active ? "bg-primary text-white" : "bg-muted-foreground/30 text-muted-foreground"}`}>{s}</span>
              )}
              {s === 1 ? "Request Details" : "Add Items"}
            </div>
            {i === 0 && (
              <div className={`w-8 h-px ${step > 1 ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function NewPurchaseRequestPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);

  // Department dropdown visibility:
  // Only users who can create/convert POs (i.e. procurement staff who may
  // need to raise a request on behalf of another department) see the
  // department dropdown. All other requesters get their own department
  // auto-filled (read-only) from their login/profile record.
  const can = useAuthStore(s => s.can);
  const canChangeDept =
    can("procurement.purchase_request", "convert_to_po") ||
    can("procurement.purchase_order", "create");

  // Step state
  const [step, setStep] = useState<1 | 2>(1);
  const [purchaseRequestId, setPurchaseRequestId] = useState<string | null>(null);
  const [savedLineItems, setSavedLineItems] = useState<PurchaseRequestLineItem[]>([]);

  // Header form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<PRPriority | "">("");
  const [currency, setCurrency] = useState("USD");
  const [neededByDate, setNeededByDate] = useState("");
  const defaultDepartmentId = user?.departmentId || (user?.department as { departmentId?: string })?.departmentId || "";
  const [departmentOverride, setDepartmentOverride] = useState<string | null>(null);
  const departmentId = departmentOverride ?? defaultDepartmentId;
  const [headerSaving, setHeaderSaving] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<{ item: PurchaseRequestLineItem; index: number } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ item: PurchaseRequestLineItem; index: number } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // API hooks
  const createPR = useCreatePurchaseRequest();
  // Only fetch the full department list when the user can actually pick a
  // different department. Read-only requesters get their department name
  // directly from their profile (user.department.departmentName), avoiding
  // an unnecessary request to an endpoint they have no use for.
  const { data: deptData } = useGetAllDepartmentsApi({ enabled: canChangeDept });
  const { data: catData } = useGetProcurementCategories();
  const addLineItem = useAddLineItem(purchaseRequestId || "");
  const updateLineItem = useUpdateLineItem(purchaseRequestId || "", editingItem?.item.purchaseRequestLineItemId || "");
  const deleteLineItem = useDeleteLineItem(purchaseRequestId || "");
  const submitPR = useSubmitPurchaseRequest(purchaseRequestId || "");

  const rawCategories = catData?.data || [];
  const categories = rawCategories.flatMap(c => [c, ...(c.children || [])]);
  const getCategoryName = (categoryId?: string | null) => {
    if (!categoryId) return null;
    return categories.find(c => c.categoryId === categoryId)?.name || null;
  };

  const departments: { label: string; value: string }[] = (deptData?.data || []).map(d => ({
    label: d.departmentName,
    value: d.departmentId,
  }));

  const currencyOptions = CURRENCIES.map(c => ({ label: c, value: c }));

  // Department defaults from the signed-in user when available.

  const handleSaveHeader = async () => {
    if (!title.trim()) { toast.error("Request title is required"); return; }
    if (!isPRPriority(priority)) { toast.error("Priority is required"); return; }
    if (!neededByDate) { toast.error("Expected date is required"); return; }
    if (!departmentId) { toast.error("Department is required"); return; }

    setHeaderSaving(true);
    try {
      const res = await createPR.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        neededByDate,
        currency,
        departmentId,
      });
      const id = res.data.purchaseRequestId;
      setPurchaseRequestId(id);
      setSavedLineItems(res.data.lineItems || []);
      setStep(2);
      toast.success("Draft saved! Now add your line items.");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to save draft"));
    } finally {
      setHeaderSaving(false);
    }
  };

  const handleAddItem = async (payload: LineItemPayload) => {
    if (!purchaseRequestId) return;
    setModalLoading(true);
    try {
      // Remove forbidden properties defined by the backend
      const cleanPayload = cleanLineItemPayload(payload);
      const res = await addLineItem.mutateAsync({ lineItems: [cleanPayload] });
      // The API might return the updated PR or an array of items. 
      const returnedData = res.data;
      const parsedItems = parseLineItemsFromAddResponse(returnedData);
      if (parsedItems.length > 0) {
        const isFullList =
          Array.isArray(returnedData) ||
          (returnedData && typeof returnedData === "object" && "lineItems" in returnedData);

        if (isFullList) {
          setSavedLineItems(parsedItems);
        } else {
          setSavedLineItems((prev) => {
            const combined = [...prev, ...parsedItems];
            const unique: PurchaseRequestLineItem[] = [];
            const seen = new Set<string>();
            for (const item of combined) {
              if (!seen.has(item.purchaseRequestLineItemId)) {
                seen.add(item.purchaseRequestLineItemId);
                unique.push(item);
              }
            }
            return unique;
          });
        }
      }
      setShowModal(false);
      toast.success("Item added");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to add item"));
    } finally {
      setModalLoading(false);
    }
  };

  const handleEditItem = async (payload: LineItemPayload) => {
    if (!purchaseRequestId || !editingItem) return;
    setModalLoading(true);
    try {
      const res = await updateLineItem.mutateAsync(payload);
      setSavedLineItems(prev => prev.map((it, i) => i === editingItem.index ? res.data : it));
      setEditingItem(null);
      setShowModal(false);
      toast.success("Item updated");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to update item"));
    } finally {
      setModalLoading(false);
    }
  };

  const confirmDeleteItem = async () => {
    if (!purchaseRequestId || !itemToDelete) return;
    try {
      await deleteLineItem.mutateAsync(itemToDelete.item.purchaseRequestLineItemId);
      setSavedLineItems(prev => prev.filter((_, i) => i !== itemToDelete.index));
      toast.success("Item removed");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to remove item"));
    } finally {
      setItemToDelete(null);
    }
  };

  const openEditModal = (item: PurchaseRequestLineItem, index: number) => {
    setEditingItem({ item, index });
    setShowModal(true);
  };

  const editInitial: ModalItem | undefined = editingItem ? {
    name: editingItem.item.name,
    description: editingItem.item.description || "",
    categoryId: editingItem.item.categoryId || "",
    categoryName: "",
    departmentId: editingItem.item.departmentId || "",
    quantity: editingItem.item.quantity,
    unitPrice: editingItem.item.unitPrice,
    taxAmount: editingItem.item.taxAmount,
    sku: editingItem.item.sku || "",
    unitOfMeasure: editingItem.item.unitOfMeasure || "unit",
  } : undefined;

  const totals = savedLineItems.reduce(
    (acc, it) => ({
      subtotal: acc.subtotal + it.subtotal,
      tax: acc.tax + it.taxAmount,
      total: acc.total + it.lineTotal,
    }),
    { subtotal: 0, tax: 0, total: 0 }
  );

  // For the read-only "Your department" display, prefer the department name
  // returned directly on the user's profile. The backend may return this
  // either nested (user.department.departmentName) or as a flat sibling
  // field next to departmentId (user.departmentName) — support both shapes.
  // Either way, `departmentId` (set above from user?.departmentId) remains
  // the only value sent to the backend on create; departmentName is purely
  // for display.
  const userDepartmentName =
    user?.department?.departmentName ||
    user?.departmentName ||
    "";
  const selectedDeptName =
    userDepartmentName ||
    departments.find(d => d.value === departmentId)?.label ||
    "";
  const currencySymbol = currency === "USD" ? "$" : currency === "NGN" ? "₦" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency;

  return (
    <>
      {/* Line Item Modal */}
      {showModal && (
        <LineItemModal
          onClose={() => { setShowModal(false); setEditingItem(null); }}
          onSave={editingItem ? handleEditItem : handleAddItem}
          initial={editInitial}
          loading={modalLoading}
          departments={departments}
          currency={currency}
        />
      )}

      {/* ════════════════════════════════════════════════
          STEP 1 — Plain layout, no scroll, fits viewport
          ════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="max-w-5xl mx-auto space-y-5">
          {/* Title + stepper */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">New Purchase Request</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Fill in the details and add line items</p>
            </div>
            <StepIndicator step={step} />
          </div>

          {/* Request Details card */}
          <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
            <h2 className="text-base font-semibold text-foreground">Request Details</h2>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Request Title <span className="text-red-500">*</span></label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Engineering Laptops Q3 2026"
                className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors" />
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Priority <span className="text-red-500">*</span></label>
                <SelectDropdown
                  value={priority}
                  onChange={(v) => setPriority(isPRPriority(v) ? v : "")}
                  options={PRIORITIES}
                  placeholder="Select priority"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Currency <span className="text-red-500">*</span></label>
                <SelectDropdown value={currency} onChange={setCurrency} options={currencyOptions} placeholder="Select currency" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Expected Date <span className="text-red-500">*</span></label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className={`w-full h-11 px-3 rounded-lg border border-border text-sm flex items-center justify-between transition-colors focus:outline-none focus:border-primary cursor-pointer ${!neededByDate ? "text-muted-foreground" : "text-foreground"}`}>
                      {neededByDate ? format(new Date(neededByDate), "PPP") : "Pick a date"}
                      <CalendarIcon className="w-4 h-4 ml-2 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={neededByDate ? new Date(neededByDate) : undefined}
                      onSelect={(d) => d && setNeededByDate(format(d, "yyyy-MM-dd"))}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Department <span className="text-red-500">*</span></label>
              {canChangeDept ? (
                <SelectDropdown value={departmentId} onChange={setDepartmentOverride} options={departments} placeholder="Select department" />
              ) : (
                <div className="w-full h-11 px-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between text-sm text-foreground">
                  <span>{selectedDeptName || <span className="text-muted-foreground italic">No department assigned</span>}</span>
                  <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">Your department</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Provide context for this request..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm resize-none focus:outline-none focus:border-primary transition-colors" />
            </div>

            <div className="pt-1 flex justify-end">
              <button type="button" onClick={handleSaveHeader} disabled={headerSaving}
                className="h-11 px-8 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
                {headerSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          STEP 2 — Sticky title + scrollable table + sticky Submit
          ════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="flex flex-col h-full max-w-5xl mx-auto">

          {/* Sticky page header */}
          <div className="flex items-center justify-between py-4 shrink-0">
            <div>
              <h1 className="text-xl font-bold text-foreground">New Purchase Request</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Fill in the details and add line items</p>
            </div>
            <StepIndicator step={step} />
          </div>

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pb-4 pr-2">

            {/* Read-only request summary */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground">Request Details</h2>
                <div className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved as draft
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Title", value: title },
                  { label: "Priority", value: PRIORITIES.find(p => p.value === priority)?.label || priority },
                  { label: "Currency", value: currency },
                  { label: "Expected Date", value: neededByDate },
                  { label: "Department", value: selectedDeptName || "—" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Line Items Card */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  Request Items
                  <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-gray-100 text-xs font-semibold text-foreground px-1.5">
                    {savedLineItems.length}
                  </span>
                </h2>
                <button type="button" onClick={() => { setEditingItem(null); setShowModal(true); }}
                  className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              {savedLineItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <p className="text-sm text-muted-foreground">No items yet. Click &quot;Add Item&quot; to get started.</p>
                  <button type="button" onClick={() => { setEditingItem(null); setShowModal(true); }}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
                    <Plus className="w-4 h-4" /> Add first item
                  </button>
                </div>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/5">
                        {["Name", "Description", "Category", "Qty", "Unit Price", "Subtotal", ""].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {savedLineItems.map((item, i) => {
                        const catName = getCategoryName(item.categoryId);
                        return (
                          <tr key={item.purchaseRequestLineItemId} className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
                            <td className="px-5 py-3.5 font-semibold text-foreground">{item.name}</td>
                            <td className="px-5 py-3.5 text-muted-foreground max-w-[180px] truncate">{item.description || "—"}</td>
                            <td className="px-5 py-3.5">
                              {catName
                                ? <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">{catName}</span>
                                : <span className="text-muted-foreground">—</span>
                              }
                            </td>
                            <td className="px-5 py-3.5 text-foreground">{item.quantity}</td>
                            <td className="px-5 py-3.5 text-foreground">{currencySymbol}{item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                            <td className="px-5 py-3.5 font-medium text-foreground">{currencySymbol}{item.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1">
                                <div className="relative group">
                                  <button type="button" onClick={() => openEditModal(item, i)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap text-foreground text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity z-10">Edit item</span>
                                </div>
                                <div className="relative group">
                                  <button type="button" onClick={() => setItemToDelete({ item, index: i })}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap text-foreground text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity z-10">Remove item</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="px-5 py-3 border-t border-border/40">
                    <button type="button" onClick={() => { setEditingItem(null); setShowModal(true); }}
                      className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                      <Plus className="w-4 h-4" /> Add Item
                    </button>
                  </div>

                  <div className="flex justify-end px-5 py-4 border-t border-border/60">
                    <div className="space-y-1.5 min-w-[220px]">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">{currencySymbol}{totals.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span className="font-medium">{currencySymbol}{totals.tax.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-border/60 pt-1.5">
                        <span className="font-semibold text-foreground">Total</span>
                        <span className="font-bold text-foreground">{currencySymbol}{totals.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sticky Submit footer */}
          <div className="shrink-0 border-t border-border bg-white py-4 flex items-center justify-end">
            <button type="button" disabled={savedLineItems.length === 0 || submitPR.isPending}
              onClick={async () => {
                if (!purchaseRequestId) return;
                try {
                  await submitPR.mutateAsync();
                  toast.success("Purchase request submitted for review!");
                  router.push("/procurement/purchase-request");
                } catch (err: unknown) {
                  toast.error(getApiErrorMessage(err, "Failed to submit"));
                }
              }}
              className="h-11 px-8 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
              {submitPR.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Request
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(val) => !val && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-semibold text-foreground">{itemToDelete?.item.name}</span> from the request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLineItem.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteItem} disabled={deleteLineItem.isPending}
              className="bg-red-600 hover:bg-red-700 text-white">
              {deleteLineItem.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}