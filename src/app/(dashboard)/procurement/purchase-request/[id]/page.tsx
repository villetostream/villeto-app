"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Pencil, X, ChevronDown, AlertCircle, Loader2,
  Plus, Trash2, ArrowLeft, CheckCircle2, Calendar as CalendarIcon
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useAuthStore } from "@/stores/auth-stores";
import {
  useGetPurchaseRequestById,
  useUpdatePurchaseRequest,
  useAddLineItem,
  useUpdateLineItem,
  useDeleteLineItem,
  useSubmitPurchaseRequest,
  useCancelPurchaseRequest,
  useConvertToPO,
  useGetProcurementCategories,
  useCreateProcurementCategory,
  type PurchaseRequest,
  type PurchaseRequestLineItem,
  type LineItemPayload,
  type CreatePurchaseRequestPayload,
} from "@/actions/procurement/purchase-requests";
import { useGetAllDepartmentsApi } from "@/actions/departments/get-all-departments";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITIES = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "urgent" },
];

const CURRENCIES = ["USD", "NGN", "EUR", "GBP", "CAD", "AUD"];

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  draft:           { label: "Draft",            color: "text-amber-600 bg-amber-50" },
  submitted:       { label: "Awaiting Approval", color: "text-violet-600 bg-violet-50" },
  converted_to_po: { label: "Converted to PO",  color: "text-emerald-600 bg-emerald-50" },
  cancelled:       { label: "Cancelled",        color: "text-red-500 bg-red-50" },
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low", medium: "Medium", urgent: "High",
};

const FINANCE_ROLES = ["CONTROLLING_OFFICER", "FINANCE", "OWNER", "ORGANIZATION_OWNER"];
const MANAGER_ROLES = ["MANAGER"];

// ─── Mini Components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || { label: status, color: "text-muted-foreground bg-muted/40" };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

/** Info card with a teal left-border accent — matches the screenshot design */
function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 flex-1 border-l-[3px] border-l-emerald-500">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-base font-bold text-foreground">{value}</p>
    </div>
  );
}

function SimpleSelect({
  value, onChange, options, disabled = false,
}: {
  value: string; onChange: (v: string) => void;
  options: { label: string; value: string }[]; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  if (disabled) {
    return (
      <div className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30 text-sm flex items-center text-foreground">
        {selected?.label || value}
      </div>
    );
  }
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30 text-sm flex items-center justify-between hover:border-primary/60 focus:outline-none transition-colors">
        <span>{selected?.label || "Select..."}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 bg-white border border-border rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
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

// ─── Confirm Modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ title, message, onConfirm, onClose, confirmLabel = "Confirm", danger = false, loading = false }: {
  title: string; message: string; onConfirm: () => void; onClose: () => void;
  confirmLabel?: string; danger?: boolean; loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${danger ? "bg-red-50" : "bg-amber-50"}`}>
            <AlertCircle className={`w-7 h-7 ${danger ? "text-red-500" : "text-amber-500"}`} />
          </div>
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: message }} />
        </div>
        <button onClick={onConfirm} disabled={loading}
          className={`w-full h-11 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 ${danger ? "bg-red-500" : "bg-primary"}`}>
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Convert to PO Modal ──────────────────────────────────────────────────────

function ConvertToPOModal({
  onClose, onConfirm, loading,
}: {
  onClose: () => void;
  onConfirm: (vendorId: string, deliveryDate: string, notes: string) => void;
  loading: boolean;
}) {
  const [vendorId, setVendorId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!vendorId.trim()) { toast.error("Vendor ID is required"); return; }
    if (!deliveryDate) { toast.error("Delivery date is required"); return; }
    onConfirm(vendorId, deliveryDate, notes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-base font-bold text-foreground">Convert to Purchase Order</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Vendor ID <span className="text-red-500">*</span></label>
            <input type="text" value={vendorId} onChange={e => setVendorId(e.target.value)}
              placeholder="Enter vendor UUID"
              className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Delivery Date <span className="text-red-500">*</span></label>
            <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any notes for the vendor..."
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm resize-none focus:outline-none focus:border-primary transition-colors" />
          </div>
        </div>
        <div className="px-6 pb-6">
          <button type="button" onClick={handleSubmit} disabled={loading}
            className="w-full h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Purchase Order
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Header Modal ─────────────────────────────────────────────────────────

function EditHeaderModal({
  pr, onClose, onSave, loading, departments,
}: {
  pr: PurchaseRequest;
  onClose: () => void;
  onSave: (data: Partial<CreatePurchaseRequestPayload>) => void;
  loading: boolean;
  departments: { label: string; value: string }[];
}) {
  const user = useAuthStore(s => s.user);
  const userPosition = user?.position?.toUpperCase() || "";
  const villetoRole = (user as any)?.villetoRole?.name?.toUpperCase() || "";
  const canChangeDept = FINANCE_ROLES.includes(userPosition) || FINANCE_ROLES.includes(villetoRole);

  const [title, setTitle] = useState(pr.title);
  const [description, setDescription] = useState(pr.description || "");
  const [priority, setPriority] = useState(pr.priority);
  const [currency, setCurrency] = useState(pr.currency);
  const [neededByDate, setNeededByDate] = useState(pr.neededByDate?.split("T")[0] || "");
  const [departmentId, setDepartmentId] = useState(pr.departmentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white z-10">
          <h3 className="text-base font-bold text-foreground">Edit Request Details</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm resize-none focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Priority</label>
              <SimpleSelect value={priority} onChange={v => setPriority(v as any)} options={PRIORITIES} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Currency</label>
              <SimpleSelect value={currency} onChange={setCurrency} options={CURRENCIES.map(c => ({ label: c, value: c }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Expected Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className={`w-full h-10 px-3 rounded-lg border border-border text-sm flex items-center justify-between transition-colors focus:outline-none focus:border-primary ${!neededByDate ? "text-muted-foreground" : "text-foreground"}`}>
                    {neededByDate ? format(new Date(neededByDate), "PPP") : "Pick a date"}
                    <CalendarIcon className="w-4 h-4 ml-2 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={neededByDate ? new Date(neededByDate) : undefined}
                    onSelect={(d) => d && setNeededByDate(format(d, "yyyy-MM-dd"))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Department</label>
              <SimpleSelect
                value={departmentId}
                onChange={setDepartmentId}
                options={departments}
                disabled={!canChangeDept}
              />
            </div>
          </div>
        </div>
        <div className="px-6 pb-6">
          <button type="button" disabled={loading}
            onClick={() => onSave({ title, description: description || undefined, priority: priority as any, currency, neededByDate, departmentId })}
            className="w-full h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 transition-opacity">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(n: number, currency = "USD") {
  const sym = currency === "USD" ? "$" : currency === "NGN" ? "₦" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency;
  return `${sym}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d?: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
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
  const [selectedName, setSelectedName] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: catData, isLoading } = useGetProcurementCategories();
  const createCategory = useCreateProcurementCategory();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setSearch("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const rawCategories = catData?.data || [];
  const q = search.trim().toLowerCase();

  useEffect(() => {
    if (value && !selectedName) {
      const all = rawCategories.flatMap(c => [c, ...(c.children || [])]);
      const found = all.find(c => c.categoryId === value);
      if (found) setSelectedName(found.name);
    }
  }, [value, rawCategories, selectedName]);

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
  const handleSelectParent = (id: string, name: string) => { onChange(id, name); setSelectedName(name); close(); };
  const handleSelectSub = (id: string, name: string) => { onChange(id, name); setSelectedName(name); close(); };
  const handleSelectResult = (id: string, name: string) => { onChange(id, name); setSelectedName(name); close(); };



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
          {/* Search bar */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input ref={searchRef} value={search} onChange={e => { setSearch(e.target.value); setExpandedId(null); }}
                placeholder="Search categories..."
                className="w-full h-8 pl-8 pr-7 text-sm rounded-md border border-border focus:outline-none focus:border-primary transition-colors bg-white" />
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
                  <span className="block font-medium text-foreground">No matches for "{search}"</span>
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
                        <button type="button"
                          onClick={() => handleSelectParent(cat.categoryId, cat.name)}
                          className={`flex-1 text-left px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {cat.name}
                          {isSelected && <span className="ml-2 text-xs font-normal text-muted-foreground">(selected)</span>}
                        </button>
                        <button type="button"
                          onClick={() => setExpandedId(isExpanded ? null : cat.categoryId)}
                          className={`w-9 h-9 flex items-center justify-center mr-1 rounded-lg transition-colors ${isExpanded ? "text-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/40"}`}
                          title={`${subs.length} subcategory${subs.length !== 1 ? "s" : ""}`}>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="bg-muted/10 border-t border-b border-border/40">
                          {subs.map(sub => (
                            <button key={sub.categoryId} type="button"
                              onClick={() => handleSelectSub(sub.categoryId, sub.name)}
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

// ─── Line Item Modal ──────────────────────────────────────────────────────────

interface ModalItem {
  name: string; categoryName: string; description: string; categoryId: string;
  departmentId: string; quantity: number; unitPrice: number;
  taxAmount: number; sku: string; unitOfMeasure: string;
}
const EMPTY_ITEM: ModalItem = {
  name: "", categoryName: "", description: "", categoryId: "", departmentId: "",
  quantity: 0, unitPrice: 0, taxAmount: 0, sku: "", unitOfMeasure: "unit",
};

function LineItemModal({
  onClose, onSave, initial, loading, departments,
}: {
  onClose: () => void;
  onSave: (d: LineItemPayload) => void;
  initial?: ModalItem;
  loading: boolean;
  departments: { label: string; value: string }[];
}) {
  const [form, setForm] = useState<ModalItem>(initial || EMPTY_ITEM);
  const set = (k: keyof ModalItem, v: string | number) => setForm(p => ({ ...p, [k]: v }));
  const subtotal = form.quantity * form.unitPrice;

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
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Item Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Dell XPS Laptop"
              className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Category</label>
            <CategoryDropdown
              value={form.categoryId}
              onChange={(id, name) => setForm(p => ({ ...p, categoryId: id, categoryName: name }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Quantity <span className="text-red-500">*</span></label>
              <input type="number" min={1} value={form.quantity || ""} onChange={e => set("quantity", Number(e.target.value))} placeholder="0"
                className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Unit Price</label>
              <input type="number" min={0} value={form.unitPrice || ""} onChange={e => set("unitPrice", Number(e.target.value))} placeholder="0.00"
                className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Unit of Measure</label>
            <input type="text" value={form.unitOfMeasure} onChange={e => set("unitOfMeasure", e.target.value)} placeholder="unit / box / kg"
              className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} placeholder="Brief description of this item"
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm resize-none focus:outline-none focus:border-primary transition-colors" />
          </div>
          {subtotal > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-xl mt-2">
              <span className="text-sm text-muted-foreground">Line Subtotal</span>
              <span className="text-sm font-semibold text-foreground">
                {subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border bg-white z-10 shrink-0 rounded-b-2xl">
          <button type="button" disabled={loading}
            onClick={() => {
              if (!form.name.trim()) { toast.error("Item name required"); return; }
              if (!form.quantity || form.quantity <= 0) { toast.error("Quantity must be > 0"); return; }
              onSave({
                name: form.name, description: form.description || undefined,
                quantity: form.quantity, unitPrice: form.unitPrice,
                taxAmount: form.taxAmount || undefined, sku: form.sku || undefined,
                unitOfMeasure: form.unitOfMeasure || undefined,
                categoryId: form.categoryId || undefined,
                departmentId: form.departmentId || undefined,
                accountingResolutionStatus: "unresolved",
              });
            }}
            className="w-full h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {initial ? "Save Changes" : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Workflow Sidebar ─────────────────────────────────────────────────────────

type StepStatus = "done" | "pending" | "inactive";
interface WorkflowStep { label: string; person?: string; timestamp?: string; badge?: string; badgeColor?: string; status: StepStatus; }

function WorkflowProgress({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="relative flex flex-col items-center">
            <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-1 ${
              step.status === "done" ? "border-primary bg-primary"
              : step.status === "pending" ? "border-amber-400 bg-amber-100"
              : "border-gray-300 bg-white"}`} />
            {i < steps.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1 min-h-[28px]" />}
          </div>
          <div className="pb-5 min-w-0">
            <p className={`text-sm font-semibold leading-tight ${step.status === "inactive" ? "text-gray-400" : "text-foreground"}`}>
              {step.label}
            </p>
            {step.person && (
              <p className={`text-xs mt-0.5 ${step.status === "inactive" ? "text-gray-300" : "text-muted-foreground"}`}>
                {step.person}
                {step.badge && (
                  <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${step.badgeColor}`}>
                    {step.badge}
                  </span>
                )}
              </p>
            )}
            {step.timestamp && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{step.timestamp}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PRDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const user = useAuthStore(s => s.user);

  const userPosition = user?.position?.toUpperCase() || "";
  const villetoRole = (user as any)?.villetoRole?.name?.toUpperCase() || "";
  const roleKey = FINANCE_ROLES.includes(userPosition) || FINANCE_ROLES.includes(villetoRole)
    ? "finance"
    : MANAGER_ROLES.includes(userPosition) || MANAGER_ROLES.includes(villetoRole)
    ? "manager"
    : "employee";

  const { data, isLoading, isError, refetch } = useGetPurchaseRequestById(id);
  const updatePR = useUpdatePurchaseRequest(id);
  const addLineItem = useAddLineItem(id);
  const deleteLineItem = useDeleteLineItem(id);
  const submitPR = useSubmitPurchaseRequest(id);
  const cancelPR = useCancelPurchaseRequest(id);
  const convertToPO = useConvertToPO(id);
  const { data: deptData } = useGetAllDepartmentsApi();
  const { data: catData } = useGetProcurementCategories();

  const [editingLineItem, setEditingLineItem] = useState<PurchaseRequestLineItem | null>(null);
  const updateLineItemHook = useUpdateLineItem(id, editingLineItem?.purchaseRequestLineItemId || "");
  const [modal, setModal] = useState<"submit" | "cancel" | "convert_to_po" | "add_item" | "edit_header" | "delete_item" | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  const pr: PurchaseRequest | undefined = data?.data;
  const departments = (deptData?.data || []).map(d => ({ label: d.departmentName, value: d.departmentId }));
  const rawCategories = catData?.data || [];
  const categories = rawCategories.flatMap(c => [c, ...(c.children || [])]);
  const currency = pr?.currency || "USD";

  const isDraft = pr?.status === "draft";
  const isSubmitted = pr?.status === "submitted";
  const canEdit = isDraft;
  const canSubmit = isDraft && (pr?.lineItems?.length || 0) > 0;
  const canCancel = isDraft || isSubmitted;
  const canConvert = isSubmitted && roleKey === "finance";

  // Helper to resolve category name from id
  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return null;
    return categories.find(c => c.categoryId === categoryId)?.name || null;
  };

  const handleEditHeader = async (payload: Partial<CreatePurchaseRequestPayload>) => {
    try {
      await updatePR.mutateAsync(payload);
      setModal(null);
      toast.success("Request details updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update");
    }
  };

  const handleAddItem = async (payload: LineItemPayload) => {
    try {
      const { departmentId, accountingResolutionStatus, ...cleanPayload } = payload as any;
      await addLineItem.mutateAsync({ lineItems: [cleanPayload as any] });
      setModal(null);
      toast.success("Item added");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to add item");
    }
  };

  const handleEditItem = async (payload: LineItemPayload) => {
    try {
      await updateLineItemHook.mutateAsync(payload);
      setEditingLineItem(null);
      setModal(null);
      toast.success("Item updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update item");
    }
  };

  const handleDeleteItem = async (lineItemId: string) => {
    try {
      await deleteLineItem.mutateAsync(lineItemId);
      toast.success("Item removed");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete item");
    }
  };

  const handleSubmit = async () => {
    try {
      await submitPR.mutateAsync();
      setModal(null);
      toast.success("Purchase request submitted for review!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit");
    }
  };

  const handleCancel = async () => {
    try {
      await cancelPR.mutateAsync();
      setModal(null);
      toast.success("Purchase request cancelled");
      router.push("/procurement/purchase-request");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to cancel");
    }
  };

  const handleConvertToPO = async (vendorId: string, deliveryDate: string, notes: string) => {
    try {
      await convertToPO.mutateAsync({ vendorId, deliveryDate, notes: notes || undefined });
      setModal(null);
      toast.success("Successfully converted to Purchase Order!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to convert to PO");
    }
  };

  const workflowSteps: WorkflowStep[] = pr ? [
    { label: "Draft Created", status: "done", timestamp: formatDate(pr.createdAt) },
    {
      label: "Submitted for Review",
      status: ["submitted", "converted_to_po"].includes(pr.status) ? "done" : "inactive",
    },
    {
      label: "Manager Approval",
      status: ["converted_to_po"].includes(pr.status) ? "done" : pr.status === "submitted" ? "pending" : "inactive",
    },
    {
      label: "Purchase Order Created",
      status: pr.status === "converted_to_po" ? "done" : "inactive",
    },
  ] : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading request...</span>
      </div>
    );
  }

  if (isError || !pr) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Failed to load purchase request.</p>
        <button onClick={() => refetch()} className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm hover:bg-muted/40 transition-colors">
          Try again
        </button>
      </div>
    );
  }

  const lineItems = pr.lineItems || [];

  return (
    <>
      {/* ── Modals ── */}
      {modal === "submit" && (
        <ConfirmModal
          title="Submit Request"
          message={`You are submitting <strong>${pr.title}</strong> for approval. Once submitted, items cannot be edited.`}
          confirmLabel="Submit Request"
          loading={submitPR.isPending}
          onClose={() => setModal(null)}
          onConfirm={handleSubmit}
        />
      )}
      {modal === "delete_item" && itemToDelete && (
        <ConfirmModal
          title="Remove Item"
          message={`Are you sure you want to remove <strong class="font-semibold text-foreground">${itemToDelete.name}</strong> from the request? This action cannot be undone.`}
          confirmLabel="Remove Item"
          danger
          loading={deleteLineItem.isPending}
          onClose={() => { setModal(null); setItemToDelete(null); }}
          onConfirm={async () => {
            await handleDeleteItem(itemToDelete.id);
            setModal(null);
            setItemToDelete(null);
          }}
        />
      )}
      {modal === "cancel" && (
        <ConfirmModal
          title="Cancel Request"
          message="Are you sure you want to cancel this purchase request? This action cannot be undone."
          confirmLabel="Cancel Request"
          danger
          loading={cancelPR.isPending}
          onClose={() => setModal(null)}
          onConfirm={handleCancel}
        />
      )}
      {modal === "convert_to_po" && (
        <ConvertToPOModal
          onClose={() => setModal(null)}
          onConfirm={handleConvertToPO}
          loading={convertToPO.isPending}
        />
      )}
      {(modal === "add_item" || (modal === null && editingLineItem)) && (
        <LineItemModal
          onClose={() => { setModal(null); setEditingLineItem(null); }}
          onSave={editingLineItem ? handleEditItem : handleAddItem}
          initial={editingLineItem ? {
            name: editingLineItem.name, description: editingLineItem.description || "",
            categoryId: editingLineItem.categoryId || "", categoryName: getCategoryName(editingLineItem.categoryId) || "",
            departmentId: editingLineItem.departmentId || "",
            quantity: editingLineItem.quantity, unitPrice: editingLineItem.unitPrice,
            taxAmount: editingLineItem.taxAmount, sku: editingLineItem.sku || "",
            unitOfMeasure: editingLineItem.unitOfMeasure || "unit",
          } : undefined}
          loading={addLineItem.isPending || updateLineItemHook.isPending}
          departments={departments}
        />
      )}
      {modal === "edit_header" && (
        <EditHeaderModal
          pr={pr}
          onClose={() => setModal(null)}
          onSave={handleEditHeader}
          loading={updatePR.isPending}
          departments={departments}
        />
      )}

      <div className="flex gap-6 items-start h-full max-w-6xl mx-auto pb-4">
        {/* ── Left Column ── */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          
          {/* ── Header and Info Cards Wrapper ── */}
          <div className="shrink-0 space-y-4 mb-4 pr-1">
            {/* ── Page Header ── */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-foreground">{pr.requestNumber}</h1>
                  <StatusBadge status={pr.status} />
                  {pr.accountingResolutionStatus === "resolved" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="w-3 h-3" /> Reconciled
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{pr.title}</p>
                {pr.description && <p className="text-xs text-muted-foreground mt-0.5">{pr.description}</p>}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                {canEdit && (
                  <button onClick={() => setModal("edit_header")}
                    className="h-9 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted/40 transition-colors flex items-center gap-2">
                    <Pencil className="w-3.5 h-3.5" /> Edit Request
                  </button>
                )}
                {isDraft && (
                  <button onClick={() => setModal("submit")} disabled={(pr?.lineItems?.length || 0) === 0}
                    className="h-9 px-5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
                    Submit Request
                  </button>
                )}
                {canConvert && (
                  <button onClick={() => setModal("convert_to_po")}
                    className="h-9 px-5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                    Convert to PO
                  </button>
                )}
                {canCancel && (
                  <button onClick={() => setModal("cancel")}
                    className="h-9 px-4 rounded-lg border border-red-400 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
                    Cancel Request
                  </button>
                )}
              </div>
            </div>

          {/* ── Info Cards — teal left-border accent matching screenshot ── */}
          <div className="flex gap-4">
            <InfoCard label="Department" value={departments.find(d => d.value === pr.departmentId)?.label || pr.departmentId || "—"} />
            <InfoCard label="Priority" value={PRIORITY_LABELS[pr.priority] || pr.priority} />
            <InfoCard label="Expected Date" value={formatDate(pr.neededByDate)} />
            <InfoCard label="Currency" value={pr.currency} />
          </div>

          </div>

          {/* ── Line Items ── */}
          <div className="bg-white rounded-2xl border border-border flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Card header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                Request Items
                {/* Count badge */}
                <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-gray-100 text-xs font-semibold text-foreground px-1.5">
                  {lineItems.length}
                </span>
              </h2>
              {canEdit && (
                // "+ Add Item" button — teal text style matching screenshot
                <button
                  onClick={() => setModal("add_item")}
                  className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              )}
            </div>

            {/* Empty state */}
            {lineItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <p className="text-sm text-muted-foreground">No items added yet.</p>
                {canEdit && (
                  <button onClick={() => setModal("add_item")}
                    className="flex items-center gap-2 h-9 px-4 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
                    <Plus className="w-4 h-4" /> Add first item
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="border-b border-border/60 bg-muted/5 shadow-sm">
                      {[
                        "Name",
                        "Description",
                        "Category",
                        "Qty",
                        "Unit Price",
                        "Subtotal",
                        ...(canEdit ? [""] : []),
                      ].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item) => {
                      const catName = getCategoryName(item.categoryId);
                      return (
                        <tr key={item.purchaseRequestLineItemId} className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-foreground">{item.name}</td>
                          <td className="px-5 py-3.5 text-muted-foreground max-w-[180px] truncate">{item.description || "—"}</td>
                          {/* Category pill */}
                          <td className="px-5 py-3.5">
                            {catName ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium whitespace-nowrap">
                                {catName}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-foreground">{item.quantity}</td>
                          <td className="px-5 py-3.5 text-foreground">{formatAmount(item.unitPrice, currency)}</td>
                          <td className="px-5 py-3.5 font-medium text-foreground">{formatAmount(item.subtotal, currency)}</td>
                          {canEdit && (
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1">
                                {/* Edit — tooltip: no background, dark text, centered above */}
                                <div className="relative group">
                                  <button
                                    onClick={() => setEditingLineItem(item)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap text-foreground text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    Edit item
                                  </span>
                                </div>
                                {/* Delete — tooltip: no background, dark text, centered above */}
                                <div className="relative group">
                                  <button
                                    onClick={() => { setItemToDelete({ id: item.purchaseRequestLineItemId, name: item.name }); setModal("delete_item"); }}
                                    disabled={deleteLineItem.isPending}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap text-foreground text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    Remove item
                                  </span>
                                </div>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

                {/* Inline "+ Add Item" row link — matches screenshot bottom link */}
                {canEdit && (
                  <div className="shrink-0 px-5 py-3 border-t border-border/40 bg-white">
                    <button
                      onClick={() => setModal("add_item")}
                      className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                  </div>
                )}

                {/* Totals */}
                <div className="shrink-0 flex justify-end px-5 py-4 border-t border-border/60 bg-white">
                  <div className="space-y-1.5 min-w-[220px]">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatAmount(pr.subtotal, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">{formatAmount(pr.taxAmount, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-border/60 pt-1.5">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="font-bold text-foreground">{formatAmount(pr.totalAmount, currency)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="w-[300px] shrink-0 h-full overflow-y-auto pr-1 space-y-4 pb-4">
          {/* Summary card */}
          <div className="bg-[#1C2B36] rounded-2xl p-5 text-white space-y-4">
            <h3 className="text-sm font-semibold">Request Summary</h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">Items</span>
                <span className="text-sm font-semibold">{lineItems.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">Subtotal</span>
                <span className="text-sm font-semibold">{formatAmount(pr.subtotal, currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">Tax</span>
                <span className="text-sm">{formatAmount(pr.taxAmount, currency)}</span>
              </div>
            </div>
            <p className="text-xl font-bold border-t border-white/10 pt-3">{formatAmount(pr.totalAmount, currency)}</p>
          </div>

          {/* Workflow */}
          <div className="bg-white rounded-2xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Workflow Progress</h3>
            <WorkflowProgress steps={workflowSteps} />
          </div>
        </div>
      </div>
    </>
  );
}