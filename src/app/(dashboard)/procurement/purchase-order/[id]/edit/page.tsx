"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown, Plus, Trash2, Calendar as CalendarIcon, X,
  CheckCircle2, Loader2, Pencil, Search, ArrowLeft,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LineItemBatchModal from "@/components/procurement/LineItemBatchModal";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import {
  usePurchaseOrder,
  useUpdatePurchaseOrder,
  useAddPOLineItems,
  useSubmitPurchaseOrderForApproval,
  useCancelPurchaseOrder,
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
import { buildPODetailUrl, buildPOListUrl } from "@/lib/permissions/purchase-order-permissions";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITIES: { label: string; value: string }[] = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "urgent" },
];

const CURRENCIES = ["USD", "NGN", "EUR", "GBP", "CAD", "AUD", "GHS", "KES", "ZAR", "JPY", "CNY"];

// ─── Generic Select Dropdown ──────────────────────────────────────────────────

function SelectDropdown({
  value, onChange, options, placeholder, disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
  disabled?: boolean;
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
        type="button"
        onClick={() => !disabled && setOpen(v => !v)}
        className={`w-full h-11 px-3 rounded-lg border border-black/[0.06] bg-[#f9faf9] text-sm flex items-center justify-between transition-colors ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-[#087f70]/60 focus:outline-none"}`}
      >
        <span className={selected ? "text-[#0b100e]" : "text-[#68726d]"}>
          {selected?.label || placeholder}
        </span>
        {!disabled && <ChevronDown className={`w-4 h-4 text-[#68726d] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 bg-white border border-black/[0.06] rounded-[12px] shadow-lg mt-1 max-h-52 overflow-y-auto">
          {options.map(o => (
            <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#f9faf9] transition-colors ${value === o.value ? "text-[#087f70] font-medium" : "text-[#0b100e]"}`}>
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
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(""); }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = options.find(o => o.value === value);
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full h-11 px-3 rounded-lg border border-black/[0.06] bg-[#f9faf9] text-sm flex items-center justify-between cursor-pointer hover:border-[#087f70]/60 focus:outline-none transition-colors">
        <span className={selected ? "text-[#0b100e]" : "text-[#68726d]"}>
          {selected?.label || "Select vendor..."}
        </span>
        <ChevronDown className={`w-4 h-4 text-[#68726d] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 bg-white border border-black/[0.06] rounded-[12px] shadow-xl mt-1 overflow-hidden">
          <div className="p-2 border-b border-black/[0.06]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#68726d]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors..."
                className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-black/[0.06] focus:outline-none focus:border-[#087f70] transition-colors bg-white" />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-[#68726d]" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-[#68726d] px-4 py-3 text-center">No vendors found</p>
            ) : (
              filtered.map(o => (
                <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); setSearch(""); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#f9faf9] transition-colors ${value === o.value ? "text-[#087f70] font-medium" : "text-[#0b100e]"}`}>
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

// ─── Category Dropdown ────────────────────────────────────────────────────────

function CategoryDropdown({ value, onChange }: { value: string; onChange: (id: string, name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { data: catData, isLoading } = useGetProcurementCategories();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(""); }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { if (open) setTimeout(() => searchRef.current?.focus(), 50); }, [open]);

  const rawCategories = useMemo(() => catData?.data || [], [catData?.data]);
  const selectedName = useMemo(() => {
    if (!value) return "";
    const all = rawCategories.flatMap(c => [c, ...(c.children || [])]);
    return all.find(c => c.categoryId === value)?.name ?? "Selected";
  }, [value, rawCategories]);
  const q = search.trim().toLowerCase();
  const searchResults = q ? rawCategories.flatMap(cat => {
    const results: { id: string; name: string; parentName?: string }[] = [];
    if (cat.name.toLowerCase().includes(q)) results.push({ id: cat.categoryId, name: cat.name });
    (cat.children || []).forEach(sub => {
      if (sub.name.toLowerCase().includes(q)) results.push({ id: sub.categoryId, name: sub.name, parentName: cat.name });
    });
    return results;
  }) : [];

  const close = () => { setOpen(false); setSearch(""); setExpandedId(null); };
  const handleSelect = (id: string, name: string) => { onChange(id, name); close(); };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full h-11 px-3 rounded-lg border border-black/[0.06] bg-[#f9faf9] text-sm flex items-center justify-between cursor-pointer hover:border-[#087f70]/60 focus:outline-none transition-colors">
        <span className={value ? "text-[#0b100e]" : "text-[#68726d]"}>
          {value ? selectedName || "Selected" : "Select category..."}
        </span>
        <ChevronDown className={`w-4 h-4 text-[#68726d] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 bg-white border border-black/[0.06] rounded-[12px] shadow-xl mt-1 overflow-hidden">
          <div className="p-2 border-b border-black/[0.06]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#68726d]" />
              <input ref={searchRef} value={search} onChange={e => { setSearch(e.target.value); setExpandedId(null); }}
                placeholder="Search categories..."
                className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-black/[0.06] focus:outline-none focus:border-[#087f70] transition-colors bg-white" />
              {search && (<button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#68726d] hover:text-[#0b100e]"><X className="w-3 h-3" /></button>)}
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-[#68726d]" /></div>
          ) : q ? (
            <div className="max-h-56 overflow-y-auto py-1">
              {searchResults.length === 0 ? (
                <div className="px-4 py-3 text-sm text-[#68726d] text-center">No matches for &quot;{search}&quot;</div>
              ) : searchResults.map(r => (
                <button key={r.id} type="button" onClick={() => handleSelect(r.id, r.name)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#f9faf9] transition-colors flex items-baseline gap-2 ${value === r.id ? "text-[#087f70] font-medium" : "text-[#0b100e]"}`}>
                  <span>{r.name}</span>
                  {r.parentName && <span className="text-xs text-[#68726d] font-normal">in {r.parentName}</span>}
                </button>
              ))}
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto py-1">
              {rawCategories.map(cat => {
                const isExpanded = expandedId === cat.categoryId;
                const subs = cat.children || [];
                const isSelected = value === cat.categoryId;
                return (
                  <div key={cat.categoryId}>
                    <div className="flex items-center">
                      <button type="button" onClick={() => handleSelect(cat.categoryId, cat.name)}
                        className={`flex-1 text-left px-4 py-2.5 text-sm font-medium hover:bg-[#f9faf9] transition-colors ${isSelected ? "text-[#087f70]" : "text-[#0b100e]"}`}>
                        {cat.name}{isSelected && <span className="ml-2 text-xs font-normal text-[#68726d]">(selected)</span>}
                      </button>
                      <button type="button" onClick={() => setExpandedId(isExpanded ? null : cat.categoryId)}
                        className={`w-9 h-9 flex items-center justify-center mr-1 rounded-lg transition-colors ${isExpanded ? "text-[#087f70] bg-[#f0faf8]" : "text-[#68726d] hover:bg-[#f9faf9]"}`}>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="bg-[#f9faf9] border-t border-b border-border/40">
                        {subs.map(sub => (
                          <button key={sub.categoryId} type="button" onClick={() => handleSelect(sub.categoryId, sub.name)}
                            className={`w-full text-left pl-7 pr-4 py-2 text-sm flex items-center gap-2 hover:bg-[#f9faf9] transition-colors ${value === sub.categoryId ? "text-[#087f70] font-medium" : "text-[#0b100e]"}`}>
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

// ─── Add / Edit Line Item Modal ───────────────────────────────────────────────

interface LocalItem extends POLineItemPayload { localId: string; }

function LineItemModal({
  onClose, onSave, initial, departments, currency,
}: {
  onClose: () => void;
  onSave: (data: LocalItem) => void;
  initial?: LocalItem;
  departments: { label: string; value: string }[];
  currency: string;
}) {
  const [form, setForm] = useState<Partial<LocalItem>>(initial || { quantity: 1, unitPrice: 0, taxAmount: 0, unitOfMeasure: "unit" });
  const currencySymbol = currency === "USD" ? "$" : currency === "NGN" ? "₦" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency;
  const subtotal = (form.quantity || 0) * (form.unitPrice || 0);
  const set = (k: keyof LocalItem, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.name?.trim()) { toast.error("Item name is required"); return; }
    if (!form.quantity || form.quantity <= 0) { toast.error("Quantity must be > 0"); return; }
    if (form.unitPrice === undefined || form.unitPrice < 0) { toast.error("Unit price must be >= 0"); return; }
    if (!form.departmentId) { toast.error("Department is required"); return; }
    onSave({
      localId: initial?.localId || crypto.randomUUID(),
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
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[14px] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] bg-white z-10 shrink-0 rounded-t-2xl">
          <h3 className="text-base font-bold text-[#0b100e]">{initial ? "Edit Line Item" : "Add Line Item"}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f9faf9] transition-colors">
            <X className="w-4 h-4 text-[#68726d]" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#0b100e]">Item Name <span className="text-[#d33d44]">*</span></label>
            <input type="text" value={form.name || ""} onChange={e => set("name", e.target.value)} placeholder="e.g. Dell XPS Laptop"
              className="w-full h-11 px-3 rounded-lg border border-black/[0.06] text-sm focus:outline-none focus:border-[#087f70] transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0b100e]">Category</label>
              <CategoryDropdown value={form.categoryId || ""} onChange={id => setForm(p => ({ ...p, categoryId: id }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0b100e]">Department <span className="text-[#d33d44]">*</span></label>
              <SelectDropdown value={form.departmentId || ""} onChange={v => set("departmentId", v)} options={departments} placeholder="Select dept" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0b100e]">Quantity <span className="text-[#d33d44]">*</span></label>
              <input type="number" min={1} value={form.quantity || ""} onChange={e => set("quantity", Number(e.target.value))} placeholder="0"
                className="w-full h-11 px-3 rounded-lg border border-black/[0.06] text-sm focus:outline-none focus:border-[#087f70] transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0b100e]">Unit Price <span className="text-[#d33d44]">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#68726d] text-sm font-medium">{currencySymbol}</span>
                <input type="number" min={0} value={form.unitPrice || ""} onChange={e => set("unitPrice", Number(e.target.value))} placeholder="0.00"
                  className="w-full h-11 pl-8 pr-3 rounded-lg border border-black/[0.06] text-sm focus:outline-none focus:border-[#087f70] transition-colors bg-white" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0b100e]">Tax Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#68726d] text-sm font-medium">{currencySymbol}</span>
                <input type="number" min={0} value={form.taxAmount || ""} onChange={e => set("taxAmount", Number(e.target.value))} placeholder="0.00"
                  className="w-full h-11 pl-8 pr-3 rounded-lg border border-black/[0.06] text-sm focus:outline-none focus:border-[#087f70] transition-colors bg-white" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0b100e]">Unit of Measure</label>
              <input type="text" value={form.unitOfMeasure || ""} onChange={e => set("unitOfMeasure", e.target.value)} placeholder="unit / box / kg"
                className="w-full h-11 px-3 rounded-lg border border-black/[0.06] text-sm focus:outline-none focus:border-[#087f70] transition-colors" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#0b100e]">Description <span className="text-[#68726d] font-normal">(optional)</span></label>
            <textarea value={form.description || ""} onChange={e => set("description", e.target.value)} placeholder="Brief description" rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-black/[0.06] text-sm resize-none focus:outline-none focus:border-[#087f70] transition-colors" />
          </div>
          {subtotal > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-[#f9faf9] rounded-[12px]">
              <span className="text-sm text-[#68726d]">Line Subtotal</span>
              <span className="text-sm font-semibold text-[#0b100e]">{currencySymbol}{subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-black/[0.06] bg-white z-10 shrink-0 rounded-b-2xl">
          <button type="button" onClick={handleSave}
            className="w-full h-11 rounded-[12px] bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            {initial ? "Save Changes" : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cancel PO Modal ─────────────────────────────────────────────────────────

function CancelPOModal({
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[14px] shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f9faf9] transition-colors">
          <X className="w-4 h-4 text-[#68726d]" />
        </button>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-[#fff5f5] flex items-center justify-center shrink-0">
            <X className="w-5 h-5 text-[#d33d44]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0b100e]">Cancel Purchase Order</h3>
            <p className="text-sm text-[#68726d] mt-0.5">Please provide a reason for cancelling this draft PO.</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#0b100e]">Reason <span className="text-[#d33d44]">*</span></label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Budget was reallocated to a higher-priority purchase."
            rows={4}
            className="w-full rounded-[12px] border border-black/[0.06] px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-400 transition-all"
          />
          {reason.trim().length > 0 && reason.trim().length < 10 && (
            <p className="text-xs text-[#d33d44] flex items-center gap-1"><ArrowLeft className="w-3 h-3 rotate-90" /> At least 10 characters required.</p>
          )}
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 h-10 rounded-[12px] border border-black/[0.06] text-sm font-medium hover:bg-[#f9faf9] transition-colors">Keep Draft</button>
          <button
            onClick={() => reason.trim().length >= 10 && onConfirm(reason.trim())}
            disabled={reason.trim().length < 10 || isPending}
            className="flex-1 h-10 rounded-[12px] bg-[#d33d44] text-white text-sm font-semibold hover:bg-[#b83038] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel PO"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Edit Page ───────────────────────────────────────────────────────────

export default function EditPurchaseOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const outerTab = searchParams.get("outerTab") || "own";
  const innerTab = searchParams.get("innerTab") || undefined;
  const detailUrl = buildPODetailUrl(id, outerTab, innerTab);
  const listUrl = buildPOListUrl(outerTab, innerTab);

  const { data: poData, isLoading, isFetching } = usePurchaseOrder(id);
  const isPageLoading = isLoading || isFetching;
  const po = poData?.data;

  // Header form — seeded from the PO once loaded
  const [vendorId, setVendorId] = useState("");
  const [priority, setPriority] = useState<PRPriority | "">("");
  const [currency, setCurrency] = useState("USD");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (po && !seeded) {
      setVendorId(po.vendorId || (po as any).vendor?.vendorId || "");
      setPriority(isPRPriority((po as any).priority) ? (po as any).priority : "");
      setCurrency((po as any).currency || "USD");
      setDeliveryDate((po as any).deliveryDate || (po as any).expectedDeliveryDate || "");
      setNotes((po as any).notes || "");
      setSeeded(true);
    }
  }, [po, seeded]);

  // Local line items — seeded from existing PO line items
  const [lineItems, setLineItems] = useState<LocalItem[]>([]);
  const [lineItemsSeeded, setLineItemsSeeded] = useState(false);

  useEffect(() => {
    if (po && !lineItemsSeeded) {
      const existing = ((po as any).lineItems || []).map((item: any) => ({
        localId: item.purchaseOrderLineItemId || crypto.randomUUID(),
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxAmount: item.taxAmount || 0,
        sku: item.sku,
        unitOfMeasure: item.unitOfMeasure,
        categoryId: item.categoryId,
        departmentId: item.departmentId,
        accountingResolutionStatus: item.accountingResolutionStatus || "unresolved",
      }));
      setLineItems(existing);
      setLineItemsSeeded(true);
    }
  }, [po, lineItemsSeeded]);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<{ item: LocalItem; index: number } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ item: LocalItem; index: number } | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const updatePO = useUpdatePurchaseOrder(id);
  const addLineItems = useAddPOLineItems(id);
  const submitPO = useSubmitPurchaseOrderForApproval(id);
  const cancelPO = useCancelPurchaseOrder();

  const { data: deptData } = useGetAllDepartmentsApi();
  const { data: catData } = useGetProcurementCategories();
  const { data: vendorData } = useGetVendors();

  const rawCategories = catData?.data || [];
  const categories = rawCategories.flatMap(c => [c, ...(c.children || [])]);
  const getCategoryName = (categoryId?: string | null) => {
    if (!categoryId) return null;
    return categories.find(c => c.categoryId === categoryId)?.name || null;
  };
  const departments: { label: string; value: string }[] = (deptData?.data || []).map(d => ({ label: d.departmentName, value: d.departmentId }));
  const rawVendors = vendorData?.data || [];
  const getVendorName = (vid: string) => {
    const v = rawVendors.find(v => v.vendorId === vid);
    return v ? v.displayName || v.legalName : "Unknown Vendor";
  };

  const currencyOptions = CURRENCIES.map(c => ({ label: c, value: c }));
  const currencySymbol = currency === "USD" ? "$" : currency === "NGN" ? "₦" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency;

  const totals = lineItems.reduce((acc, item) => {
    const sub = item.quantity * item.unitPrice;
    const tax = item.taxAmount || 0;
    return { subtotal: acc.subtotal + sub, tax: acc.tax + tax, total: acc.total + sub + tax };
  }, { subtotal: 0, tax: 0, total: 0 });

  const handleAddItems = async (items: any[]) => {
    setLineItems(prev => [...prev, ...items.map(it => ({
      ...it,
      localId: crypto.randomUUID()
    }))]);
    setShowModal(false);
  };

  const handleEditItem = async (item: any) => {
    if (!editingItem) return;
    setLineItems(prev => {
      const copy = [...prev];
      copy[editingItem.index] = { ...copy[editingItem.index], ...item };
      return copy;
    });
    setEditingItem(null);
    setShowModal(false);
  };

  const confirmDeleteItem = () => {
    if (!itemToDelete) return;
    setLineItems(prev => prev.filter((_, i) => i !== itemToDelete.index));
    setItemToDelete(null);
    toast.success("Item removed");
  };

  // Save draft (update header only — line items are managed locally until submit)
  const [savingDraft, setSavingDraft] = useState(false);
  const handleSaveDraft = async () => {
    if (!vendorId) { toast.error("Vendor is required"); return; }
    setSavingDraft(true);
    try {
      await updatePO.mutateAsync({ vendorId, priority: priority as any, deliveryDate, notes: notes || undefined });
      toast.success("Draft saved.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save draft"));
    } finally {
      setSavingDraft(false);
    }
  };

  // Submit: save header + push any new local line items, then submit for approval
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async () => {
    if (!vendorId) { toast.error("Vendor is required"); return; }
    if (!isPRPriority(priority)) { toast.error("Priority is required"); return; }
    if (!deliveryDate) { toast.error("Delivery date is required"); return; }
    if (lineItems.length === 0) { toast.error("Add at least one line item"); return; }

    setSubmitting(true);
    try {
      // 1. Persist header changes
      await updatePO.mutateAsync({ vendorId, priority: priority as any, deliveryDate, notes: notes || undefined });
      // 2. Push local line items (new ones only — those without a real UUID from the server)
      const newItems = lineItems.filter(it => !it.localId.includes("-"));
      if (newItems.length > 0 || lineItems.length > 0) {
        // Re-send all line items to keep in sync (simplest approach for draft editing)
        await addLineItems.mutateAsync({
          lineItems: lineItems.map(({ localId, ...rest }) => rest),
        });
      }
      // 3. Submit for approval
      await submitPO.mutateAsync();
      toast.success("Purchase Order submitted for approval!");
      router.push(detailUrl);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to submit PO"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (reason: string) => {
    try {
      await cancelPO.mutateAsync({ id, reason });
      toast.success("Purchase Order cancelled.");
      router.push(listUrl);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to cancel PO"));
    }
  };

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#087f70]" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="text-center py-16 text-[#68726d]">Purchase order not found.</div>
    );
  }

  // Only allow editing if it's a draft
  if (String((po as any).status || "").toLowerCase() !== "draft") {
    router.push(detailUrl);
    return null;
  }

  return (
    <>
      <div className="w-full space-y-5">
        {/* Header */}
        <div className="sticky -top-3 sm:-top-5 lg:-top-6 -mt-3 sm:-mt-5 lg:-mt-6 pt-3 sm:pt-5 lg:pt-6 pb-4 z-40 bg-[#f4f7f5] flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#0b100e]">Edit Purchase Order</h1>
            <p className="text-sm text-[#68726d] mt-0.5">Draft — {(po as any).poNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setShowCancelDialog(true)}
              className="h-10 px-5 rounded-[12px] border border-[#d33d44]/20 text-[#d33d44] text-sm font-semibold hover:bg-[#fff5f5] transition-colors">
              Cancel PO
            </button>
            <button type="button" onClick={handleSaveDraft} disabled={savingDraft}
              className="h-10 px-5 rounded-[12px] border border-black/[0.06] text-sm font-semibold hover:bg-[#f9faf9] transition-colors disabled:opacity-60 flex items-center gap-2">
              {savingDraft && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Draft
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitting || lineItems.length === 0}
              className="h-10 px-6 rounded-[12px] bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit for Approval
            </button>
          </div>
        </div>

        {/* PO Details Card */}
        <div className="bg-white rounded-[14px] border border-black/[0.06] p-6 space-y-5">
          <h2 className="text-base font-semibold text-[#0b100e]">PO Details</h2>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#0b100e]">Vendor <span className="text-[#d33d44]">*</span></label>
            <VendorDropdown value={vendorId} onChange={setVendorId} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0b100e]">Priority <span className="text-[#d33d44]">*</span></label>
              <SelectDropdown value={priority} onChange={v => setPriority(isPRPriority(v) ? v : "")} options={PRIORITIES} placeholder="Select priority" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0b100e]">Currency <span className="text-[#d33d44]">*</span></label>
              <SelectDropdown value={currency} onChange={setCurrency} options={currencyOptions} placeholder="Select currency" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0b100e]">Expected Delivery <span className="text-[#d33d44]">*</span></label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className={`w-full h-11 px-3 rounded-lg border border-black/[0.06] text-sm flex items-center justify-between transition-colors focus:outline-none focus:border-[#087f70] cursor-pointer ${!deliveryDate ? "text-[#68726d]" : "text-[#0b100e]"}`}>
                    {deliveryDate ? format(new Date(deliveryDate), "PPP") : "Pick a date"}
                    <CalendarIcon className="w-4 h-4 ml-2 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={deliveryDate ? new Date(deliveryDate) : undefined}
                    onSelect={(d) => {
                      if (d) {
                        setDeliveryDate(format(d, "yyyy-MM-dd"));
                        setCalendarOpen(false);
                      }
                    }}
                    disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#0b100e]">Notes <span className="text-[#68726d] font-normal">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Provide context for this PO..." rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-black/[0.06] text-sm resize-none focus:outline-none focus:border-[#087f70] transition-colors" />
          </div>
        </div>

        {/* Line Items Card */}
        <div className="bg-white rounded-[14px] border border-black/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0b100e] flex items-center gap-2">
              PO Items
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-gray-100 text-xs font-semibold text-[#0b100e] px-1.5">
                {lineItems.length}
              </span>
            </h2>
            <button type="button" onClick={() => { setEditingItem(null); setShowModal(true); }}
              className="flex items-center gap-1 text-sm font-semibold text-[#087f70] hover:text-primary/80 transition-colors">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          {lineItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <p className="text-sm text-[#68726d]">No items yet. Click &quot;Add Item&quot; to get started.</p>
              <button type="button" onClick={() => { setEditingItem(null); setShowModal(true); }}
                className="flex items-center gap-2 h-9 px-4 rounded-lg border border-[#087f70] text-[#087f70] text-sm font-medium hover:bg-[#f0faf8] transition-colors">
                <Plus className="w-4 h-4" /> Add first item
              </button>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-[#f9faf9]">
                    {["Name", "Description", "Category", "Qty", "Unit Price", "Subtotal", ""].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#68726d] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => {
                    const catName = getCategoryName(item.categoryId);
                    const sub = item.quantity * item.unitPrice;
                    return (
                      <tr key={item.localId} className="border-b border-border/40 last:border-0 hover:bg-[#f9faf9] transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-[#0b100e]">{item.name}</td>
                        <td className="px-5 py-3.5 text-[#68726d] max-w-[180px] truncate">{item.description || "—"}</td>
                        <td className="px-5 py-3.5">
                          {catName
                            ? <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">{catName}</span>
                            : <span className="text-[#68726d]">—</span>
                          }
                        </td>
                        <td className="px-5 py-3.5 text-[#0b100e]">{item.quantity}</td>
                        <td className="px-5 py-3.5 text-[#0b100e]">{currencySymbol}{(item.unitPrice || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                        <td className="px-5 py-3.5 font-medium text-[#0b100e]">{currencySymbol}{(sub || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => { setEditingItem({ item, index: i }); setShowModal(true); }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-[#68726d] hover:bg-[#f9faf9] hover:text-[#0b100e] transition-colors" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => setItemToDelete({ item, index: i })}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-[#fff5f5] hover:text-[#d33d44] transition-colors" title="Remove">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="px-5 py-3 border-t border-border/40">
                <button type="button" onClick={() => { setEditingItem(null); setShowModal(true); }}
                  className="flex items-center gap-1.5 text-sm font-semibold text-[#087f70] hover:text-primary/80 transition-colors">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              <div className="flex justify-end px-5 py-4 border-t border-border/60">
                <div className="space-y-1.5 min-w-[220px]">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#68726d]">Subtotal</span>
                    <span className="font-medium">{currencySymbol}{totals.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#68726d]">Tax</span>
                    <span className="font-medium">{currencySymbol}{totals.tax.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-border/60 pt-1.5">
                    <span className="font-semibold text-[#0b100e]">Total</span>
                    <span className="font-bold text-[#0b100e]">{currencySymbol}{totals.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      <LineItemBatchModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingItem(null); }}
        currency={currency}
        onSaveAll={handleAddItems}
        saving={false}
        editInitial={editingItem ? {
          name: editingItem.item.name || "",
          description: editingItem.item.description || "",
          categoryId: editingItem.item.categoryId || "",
          categoryName: "",
          quantity: editingItem.item.quantity || 0,
          unitPrice: editingItem.item.unitPrice,
          taxAmount: editingItem.item.taxAmount || 0,
          sku: editingItem.item.sku || "",
          unitOfMeasure: editingItem.item.unitOfMeasure || "unit",
          accountingResolutionStatus: "unresolved",
        } : null}
        onEditSaved={handleEditItem}
        editSaving={false}
      />

      {/* Delete Item Confirm */}
      <AlertDialog open={!!itemToDelete} onOpenChange={val => !val && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-semibold text-[#0b100e]">{itemToDelete?.item.name}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteItem} className="bg-[#b83038] hover:bg-red-700 text-white">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel PO Modal — collects reason before calling the cancel endpoint */}
      <CancelPOModal
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancel}
        isPending={cancelPO.isPending}
      />
    </>
  );
}
