"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown, Plus, Trash2, Calendar as CalendarIcon, X,
  CheckCircle2, Loader2, Pencil, Search
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { useAuthStore } from "@/stores/auth-stores";
import {
  useCreatePurchaseOrder,
  type CreatePurchaseOrderPayload,
  type POLineItemPayload,
} from "@/queries/procurement/purchase-orders";
import {
  useGetProcurementCategories,
  useGetVendors,
  type PRPriority,
} from "@/queries/procurement/purchase-requests";
import { useGetAllDepartmentsApi } from "@/queries/departments/get-all-departments";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/types/api-error";
import { isPRPriority } from "@/lib/types/purchase-request-helpers";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITIES: { label: string; value: string }[] = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "urgent" },
];

const CURRENCIES = ["USD", "NGN", "EUR", "GBP", "CAD", "AUD", "GHS", "KES", "ZAR", "JPY", "CNY"];

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

// ─── Searchable Vendor Dropdown ───────────────────────────────────────────────

function VendorDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: vendorData, isLoading } = useGetVendors();
  const rawVendors = useMemo(() => vendorData?.data || [], [vendorData?.data]);
  const options = rawVendors.map(v => ({ label: v.displayName || v.legalName || "Unknown", value: v.vendorId }));
  
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

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

  const selected = options.find(o => o.value === value);
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full h-11 px-3 rounded-lg border border-border bg-muted/30 text-sm flex items-center justify-between cursor-pointer hover:border-primary/60 focus:outline-none transition-colors">
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected?.label || "Select vendor..."}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 bg-white border border-border rounded-xl shadow-xl mt-1 overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search vendors..."
                className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-border focus:outline-none focus:border-primary transition-colors bg-white" />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-3 text-center">No vendors found</p>
            ) : (
              filtered.map(o => (
                <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); setSearch(""); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors ${value === o.value ? "text-primary font-medium" : "text-foreground"}`}>
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Two-Step Category Dropdown ───────────────────────────────────────────────

function CategoryDropdown({ value, onChange }: { value: string; onChange: (id: string, name: string) => void }) {
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
  const handleSelect = (id: string, name: string) => { onChange(id, name); close(); };

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
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
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
            <div className="max-h-56 overflow-y-auto py-1">
              {searchResults.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                  <span className="block font-medium text-foreground">No matches for &quot;{search}&quot;</span>
                </div>
              ) : (
                searchResults.map(r => (
                  <button key={r.id} type="button" onClick={() => handleSelect(r.id, r.name)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors flex items-baseline gap-2 ${value === r.id ? "text-primary font-medium" : "text-foreground"}`}>
                    <span>{r.name}</span>
                    {r.parentName && <span className="text-xs text-muted-foreground font-normal">in {r.parentName}</span>}
                  </button>
                ))
              )}
            </div>
          ) : (
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
                        <button type="button" onClick={() => handleSelect(cat.categoryId, cat.name)}
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
                            <button key={sub.categoryId} type="button" onClick={() => handleSelect(sub.categoryId, sub.name)}
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

interface LocalItem extends POLineItemPayload {
  id: string; // purely for local list management
}

function LineItemModal({
  onClose, onSave, initial, departments, currency,
}: {
  onClose: () => void;
  onSave: (data: LocalItem) => void;
  initial?: LocalItem;
  departments: { label: string; value: string }[];
  currency: string;
}) {
  const [form, setForm] = useState<Partial<LocalItem>>(initial || {
    quantity: 1, unitPrice: 0, taxAmount: 0, unitOfMeasure: "unit",
  });
  
  const currencySymbol = currency === "USD" ? "$" : currency === "NGN" ? "₦" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency;
  const qty = form.quantity || 0;
  const price = form.unitPrice || 0;
  const subtotal = qty * price;

  const set = (k: keyof LocalItem, v: string | number) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.name?.trim()) { toast.error("Item name is required"); return; }
    if (!form.quantity || form.quantity <= 0) { toast.error("Quantity must be > 0"); return; }
    if (!form.unitPrice || form.unitPrice < 0) { toast.error("Unit price must be >= 0"); return; }
    if (!form.departmentId) { toast.error("Department is required"); return; }
    
    const payload: LocalItem = {
      id: initial?.id || crypto.randomUUID(),
      name: form.name,
      description: form.description || undefined,
      quantity: form.quantity,
      unitPrice: form.unitPrice,
      taxAmount: form.taxAmount || 0,
      sku: form.sku || undefined,
      unitOfMeasure: form.unitOfMeasure || undefined,
      categoryId: form.categoryId || undefined,
      departmentId: form.departmentId,
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
            <input type="text" value={form.name || ""} onChange={e => set("name", e.target.value)}
              placeholder="e.g. Dell XPS Laptop"
              className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Category</label>
              <CategoryDropdown
                value={form.categoryId || ""}
                onChange={(id) => setForm(p => ({ ...p, categoryId: id }))}
              />
            </div>
            
            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Department <span className="text-red-500">*</span></label>
              <SelectDropdown
                value={form.departmentId || ""}
                onChange={(v) => set("departmentId", v)}
                options={departments}
                placeholder="Select dept"
              />
            </div>
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
              <label className="text-sm font-medium text-foreground">Unit Price <span className="text-red-500">*</span></label>
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
          
          <div className="grid grid-cols-2 gap-4">
            {/* Tax Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Tax Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                  {currencySymbol}
                </span>
                <input type="number" min={0} value={form.taxAmount || ""}
                  onChange={e => set("taxAmount", Number(e.target.value))} placeholder="0.00"
                  className="w-full h-11 pl-8 pr-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors bg-white" />
              </div>
            </div>
            
            {/* Unit of Measure */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Unit of Measure</label>
              <input type="text" value={form.unitOfMeasure || ""} onChange={e => set("unitOfMeasure", e.target.value)}
                placeholder="unit / box / kg"
                className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors" />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea value={form.description || ""}
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
          <button type="button" onClick={handleSave}
            className="w-full h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
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
              {s === 1 ? "PO Details" : "Add Items"}
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

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);

  // Step state
  const [step, setStep] = useState<1 | 2>(1);

  // PO Header form
  const [vendorId, setVendorId] = useState("");
  const [priority, setPriority] = useState<PRPriority | "">("");
  const [currency, setCurrency] = useState("USD");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");

  // Line items
  const [lineItems, setLineItems] = useState<LocalItem[]>([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<{ item: LocalItem; index: number } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ item: LocalItem; index: number } | null>(null);

  // API Hooks
  const createPO = useCreatePurchaseOrder();
  const { data: deptData } = useGetAllDepartmentsApi();
  const { data: catData } = useGetProcurementCategories();
  const { data: vendorData } = useGetVendors();

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
  
  const rawVendors = vendorData?.data || [];
  const getVendorName = (vid: string) => {
    const v = rawVendors.find(v => v.vendorId === vid);
    return v ? v.displayName || v.legalName : "Unknown Vendor";
  };

  const currencyOptions = CURRENCIES.map(c => ({ label: c, value: c }));

  const handleSaveHeader = () => {
    if (!vendorId) { toast.error("Vendor is required"); return; }
    if (!isPRPriority(priority)) { toast.error("Priority is required"); return; }
    if (!deliveryDate) { toast.error("Delivery date is required"); return; }

    setStep(2);
  };

  const handleSaveItem = (payload: LocalItem) => {
    if (editingItem) {
      setLineItems(prev => prev.map((it, i) => i === editingItem.index ? payload : it));
      setEditingItem(null);
      toast.success("Item updated");
    } else {
      setLineItems(prev => [...prev, payload]);
      toast.success("Item added");
    }
    setShowModal(false);
  };

  const confirmDeleteItem = () => {
    if (!itemToDelete) return;
    setLineItems(prev => prev.filter((_, i) => i !== itemToDelete.index));
    setItemToDelete(null);
    toast.success("Item removed");
  };

  const openEditModal = (item: LocalItem, index: number) => {
    setEditingItem({ item, index });
    setShowModal(true);
  };

  const totals = lineItems.reduce((acc, item) => {
    const sub = item.quantity * item.unitPrice;
    const tax = item.taxAmount || 0;
    return { subtotal: acc.subtotal + sub, tax: acc.tax + tax, total: acc.total + sub + tax };
  }, { subtotal: 0, tax: 0, total: 0 });

  const currencySymbol = currency === "USD" ? "$" : currency === "NGN" ? "₦" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency;

  return (
    <>
      {step === 1 && (
        <div className="max-w-5xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">New Purchase Order</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Fill in the PO details and add line items</p>
            </div>
            <StepIndicator step={step} />
          </div>

          <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
            <h2 className="text-base font-semibold text-foreground">PO Details</h2>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Vendor <span className="text-red-500">*</span></label>
              <VendorDropdown value={vendorId} onChange={setVendorId} />
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
                <label className="text-sm font-medium text-foreground">Expected Delivery <span className="text-red-500">*</span></label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className={`w-full h-11 px-3 rounded-lg border border-border text-sm flex items-center justify-between transition-colors focus:outline-none focus:border-primary cursor-pointer ${!deliveryDate ? "text-muted-foreground" : "text-foreground"}`}>
                      {deliveryDate ? format(new Date(deliveryDate), "PPP") : "Pick a date"}
                      <CalendarIcon className="w-4 h-4 ml-2 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={deliveryDate ? new Date(deliveryDate) : undefined}
                      onSelect={(d) => d && setDeliveryDate(format(d, "yyyy-MM-dd"))}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Provide context for this PO..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-border text-sm resize-none focus:outline-none focus:border-primary transition-colors" />
            </div>

            <div className="pt-1 flex justify-end">
              <button type="button" onClick={handleSaveHeader}
                className="h-11 px-8 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
                Save &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col h-full max-w-5xl mx-auto">
          <div className="flex items-center justify-between py-4 shrink-0">
            <div>
              <h1 className="text-xl font-bold text-foreground">New Purchase Order</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Fill in the details and add line items</p>
            </div>
            <StepIndicator step={step} />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pb-4 pr-2">
            {/* Read-only PO summary */}
            <div className="bg-white rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground">PO Details</h2>
                <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 hover:bg-primary/10 px-3 py-1 rounded-full font-medium transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Edit Details
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Vendor", value: getVendorName(vendorId) },
                  { label: "Priority", value: PRIORITIES.find(p => p.value === priority)?.label || priority },
                  { label: "Currency", value: currency },
                  { label: "Expected Delivery", value: deliveryDate },
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
                  PO Items
                  <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-gray-100 text-xs font-semibold text-foreground px-1.5">
                    {lineItems.length}
                  </span>
                </h2>
                <button type="button" onClick={() => { setEditingItem(null); setShowModal(true); }}
                  className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              {lineItems.length === 0 ? (
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
                      {lineItems.map((item, i) => {
                        const catName = getCategoryName(item.categoryId);
                        const sub = item.quantity * item.unitPrice;
                        return (
                          <tr key={item.id} className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
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
                            <td className="px-5 py-3.5 font-medium text-foreground">{currencySymbol}{sub.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
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

          <div className="shrink-0 border-t border-border bg-white py-4 flex items-center justify-end">
            <button type="button" disabled={lineItems.length === 0 || createPO.isPending}
              onClick={async () => {
                if (!vendorId || !deliveryDate) return;
                try {
                  const payload: CreatePurchaseOrderPayload = {
                    vendorId,
                    priority: priority as any,
                    deliveryDate,
                    currency,
                    notes: notes || undefined,
                    lineItems: lineItems.map(it => {
                      const { id, ...rest } = it;
                      return rest;
                    }),
                  };
                  await createPO.mutateAsync(payload);
                  toast.success("Purchase Order created successfully!");
                  router.push("/procurement/purchase-order");
                } catch (err: unknown) {
                  toast.error(getApiErrorMessage(err, "Failed to create PO"));
                }
              }}
              className="h-11 px-8 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
              {createPO.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Purchase Order
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <LineItemModal
          initial={editingItem?.item}
          onClose={() => setShowModal(false)}
          onSave={handleSaveItem}
          departments={departments}
          currency={currency}
        />
      )}

      <AlertDialog open={!!itemToDelete} onOpenChange={(val) => !val && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-semibold text-foreground">{itemToDelete?.item.name}</span> from the order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteItem} className="bg-red-600 hover:bg-red-700 text-white">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
