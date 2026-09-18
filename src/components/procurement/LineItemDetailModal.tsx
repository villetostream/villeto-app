import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, AlertCircle, ShieldAlert, Package, Hash, DollarSign, Tag, FileText, Loader2, Save, ChevronDown } from "lucide-react";
import type { ProcurementPolicyViolation } from "@/lib/types/api-error";
import { useGetProcurementCategories } from "@/queries/procurement/purchase-requests";
import { toast } from "sonner";
import { UnitOfMeasureCombobox } from "@/components/procurement/UnitOfMeasureCombobox";

export interface LineItemForDetail {
  purchaseRequestLineItemId?: string;
  id?: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
  taxAmount?: number;
  unitOfMeasure?: string;
  sku?: string;
  purchaseOrderLineItemId?: string;
  policyViolations?: { type: string; message: string; ruleType?: string; actionText?: string }[] | null;
  index?: number;
}

interface LineItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: LineItemForDetail | null;
  currency?: string;
  onEdit?: () => void;
  onSave?: (updatedItem: LineItemForDetail) => Promise<void> | void;
  startInEditMode?: boolean;
}

export function LineItemDetailModal({ isOpen, onClose, item, currency = "USD", onSave, startInEditMode = false }: LineItemDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<Partial<LineItemForDetail>>({});

  useEffect(() => {
    if (isOpen && item) {
      setIsEditing(startInEditMode);
      setForm({ ...item });
    }
  }, [isOpen, item, startInEditMode]);

  if (!isOpen || !item) return null;

  const currencySymbol = currency === "USD" ? "$" : currency === "NGN" ? "₦" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency;
  const displaySubtotal = isEditing 
    ? (Number(form.quantity || 0) * Number(form.unitPrice || 0)) 
    : (item.subtotal ?? item.quantity * item.unitPrice);
    
  const hasViolations = !!(item.policyViolations && item.policyViolations.length > 0);
  const hasBlock = hasViolations && item.policyViolations!.some(v => v.type === "hard_block");

  const handleSave = async () => {
    if (!form.name?.trim() || !form.categoryId || Number(form.quantity) <= 0 || Number(form.unitPrice) <= 0) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }
    
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave({
          ...item,
          ...form,
          quantity: Number(form.quantity),
          unitPrice: Number(form.unitPrice),
          taxAmount: form.taxAmount ? Number(form.taxAmount) : 0,
        } as LineItemForDetail);
        setIsEditing(false);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => !isSaving && onClose()} />

      {/* Modal */}
      <div className="relative bg-white rounded-[16px] shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-black/[0.06] bg-white shrink-0">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${
              hasBlock ? "bg-red-50" : hasViolations ? "bg-amber-50" : "bg-[#f0faf8]"
            }`}>
              <Package className={`w-5 h-5 ${
                hasBlock ? "text-red-500" : hasViolations ? "text-amber-500" : "text-[#087f70]"
              }`} />
            </div>
            
            {isEditing ? (
              <h3 className="text-[16px] font-bold text-[#0b100e]">Edit Line Item</h3>
            ) : (
              <div className="min-w-0 pt-0.5">
                <h3 className="text-[16px] font-bold text-[#0b100e] truncate">{item.name}</h3>
                {item.categoryName && (
                  <p className="text-xs text-[#68726d] mt-0.5">{item.categoryName}</p>
                )}
              </div>
            )}
          </div>
          <button onClick={() => !isSaving && onClose()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f9faf9] transition-colors shrink-0">
            <X className="w-4 h-4 text-[#68726d]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Policy Violations Section */}
          {!isEditing && hasViolations && (
            <div className="px-6 pt-5 pb-1">
              <div className={`rounded-[12px] overflow-hidden border ${hasBlock ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                <div className={`px-4 py-2.5 flex items-center gap-2 ${hasBlock ? "bg-red-50 border-b border-red-100" : "bg-amber-50 border-b border-amber-100"}`}>
                  <ShieldAlert className={`w-4 h-4 shrink-0 ${hasBlock ? "text-red-600" : "text-amber-600"}`} />
                  <span className={`text-xs font-bold ${hasBlock ? "text-red-700" : "text-amber-700"}`}>
                    {hasBlock ? "Spend Control Violation" : "Spend Control Warning"}
                  </span>
                  <span className={`ml-auto inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-[10px] font-bold px-1.5 ${
                    hasBlock ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {item.policyViolations!.length}
                  </span>
                </div>
                <div className="divide-y divide-red-100/60">
                  {item.policyViolations!.map((v, idx) => (
                    <div key={idx} className="px-4 py-3 flex items-start gap-2.5">
                      <AlertCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${v.type === "hard_block" ? "text-red-500" : "text-amber-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium leading-relaxed ${v.type === "hard_block" ? "text-red-700" : "text-amber-700"}`}>
                          {v.message}
                        </p>
                        {v.actionText && (
                          <p className={`text-[11px] mt-1 ${v.type === "hard_block" ? "text-red-500" : "text-amber-500"}`}>
                            {v.actionText}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        v.type === "hard_block"
                          ? "bg-red-100 text-red-600"
                          : "bg-amber-100 text-amber-600"
                      }`}>
                        {v.type === "hard_block" ? "BLOCK" : "WARNING"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Item Details */}
          <div className="px-6 py-5 space-y-5">
            {isEditing && (
              <div className="space-y-4 pb-1">
                <div>
                  <label className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider mb-1.5 block">Item Name *</label>
                  <input type="text" value={form.name || ""} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-black/[0.08] text-[15px] font-medium text-[#0b100e] focus:outline-none focus:border-[#087f70] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider mb-1.5 block">Category *</label>
                  <PanelCategoryDropdown 
                    value={form.categoryId || ""} 
                    onChange={(id, name) => setForm(p => ({ ...p, categoryId: id, categoryName: name }))} 
                  />
                </div>
              </div>
            )}

            <h4 className="text-[11px] font-bold text-[#68726d] uppercase tracking-wider">Item Details</h4>

            <div className="grid grid-cols-2 gap-x-5 gap-y-4">
              {isEditing ? (
                <>
                  <EditField icon={<Hash className="w-3.5 h-3.5" />} label="Quantity *">
                    <PriceInput value={form.quantity || 0} onChange={val => setForm(p => ({ ...p, quantity: val }))} />
                  </EditField>
                  <EditField icon={<DollarSign className="w-3.5 h-3.5" />} label="Unit Price *">
                    <div className="relative flex items-center h-8">
                      <span className="text-sm font-semibold text-[#68726d] pr-1">{currencySymbol}</span>
                      <PriceInput value={form.unitPrice || 0} onChange={val => setForm(p => ({ ...p, unitPrice: val }))} isFloat />
                    </div>
                  </EditField>
                  <EditField icon={<Tag className="w-3.5 h-3.5" />} label="Tax Amount">
                    <div className="relative flex items-center h-8">
                      <span className="text-sm font-semibold text-[#68726d] pr-1">{currencySymbol}</span>
                      <PriceInput value={form.taxAmount || 0} onChange={val => setForm(p => ({ ...p, taxAmount: val }))} isFloat />
                    </div>
                  </EditField>
                  <EditField icon={<Package className="w-3.5 h-3.5" />} label="Unit of Measure">
                    <div className="w-full h-8 flex items-center border-b border-black/[0.1] focus-within:border-[#087f70] bg-transparent transition-colors">
                      <UnitOfMeasureCombobox
                        value={form.unitOfMeasure || ""}
                        onChange={val => setForm(p => ({ ...p, unitOfMeasure: val }))}
                        className="!border-none"
                      />
                    </div>
                  </EditField>
                </>
              ) : (
                <>
                  <DetailField icon={<Hash className="w-3.5 h-3.5" />} label="Quantity" value={item.quantity.toLocaleString("en-US")} />
                  <DetailField icon={<DollarSign className="w-3.5 h-3.5" />} label="Unit Price" value={`${currencySymbol}${item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
                  {item.taxAmount != null && item.taxAmount > 0 && (
                    <DetailField icon={<Tag className="w-3.5 h-3.5" />} label="Tax" value={`${currencySymbol}${item.taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} />
                  )}
                  {item.unitOfMeasure && (
                    <DetailField icon={<Package className="w-3.5 h-3.5" />} label="Unit of Measure" value={item.unitOfMeasure} />
                  )}
                </>
              )}
            </div>

            {isEditing ? (
              <div className="pt-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#68726d]" />
                  <span className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">Description</span>
                </div>
                <textarea rows={2} value={form.description || ""} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Optional details..."
                  className="w-full px-3 py-2 text-sm font-medium text-[#0b100e] border border-black/[0.1] rounded-[8px] focus:outline-none focus:border-[#087f70] bg-transparent resize-none transition-colors" />
              </div>
            ) : item.description ? (
              <div className="pt-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#68726d]" />
                  <span className="text-[11px] font-semibold text-[#68726d] uppercase tracking-wider">Description</span>
                </div>
                <p className="text-sm text-[#0b100e] leading-relaxed bg-[#f9faf9] rounded-[10px] px-3.5 py-2.5 border border-black/[0.04]">
                  {item.description}
                </p>
              </div>
            ) : null}

            {/* Subtotal bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#f9faf9] rounded-[10px] border border-black/[0.04] mt-4">
              <span className="text-sm font-medium text-[#68726d]">Line Subtotal</span>
              <span className="text-[15px] font-bold text-[#0b100e]">
                {currencySymbol}{displaySubtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/[0.06] bg-white shrink-0 flex items-center justify-end gap-3">
          {isEditing ? (
            <>
              <button onClick={() => { setIsEditing(false); setForm({ ...item }); }} disabled={isSaving}
                className="h-10 px-5 rounded-[10px] bg-[#f5f7f6] text-[#0b100e] text-sm font-semibold hover:bg-[#e8ebe9] transition-colors disabled:opacity-60">
                Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving}
                className="h-10 px-5 rounded-[10px] bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </>
          ) : (
            <>
              {onSave && (
                <button onClick={() => setIsEditing(true)}
                  className="h-10 px-5 rounded-[10px] border border-[#087f70] text-[#087f70] text-sm font-semibold hover:bg-[#f0faf8] transition-colors">
                  Edit Item
                </button>
              )}
              <button onClick={onClose}
                className="h-10 px-5 rounded-[10px] bg-[#f5f7f6] text-[#0b100e] text-sm font-semibold hover:bg-[#e8ebe9] transition-colors">
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function DetailField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-[8px] bg-[#f5f7f6] flex items-center justify-center shrink-0 text-[#68726d] mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-[#68726d] font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-[15px] font-bold text-[#0b100e] mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

function EditField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-[8px] bg-[#f0faf8] flex items-center justify-center shrink-0 text-[#087f70] mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-[#087f70] font-semibold uppercase tracking-wider">{label}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

function PriceInput({ value, onChange, isFloat = false }: { value: number; onChange: (v: number) => void; isFloat?: boolean }) {
  const [localStr, setLocalStr] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      if (value === 0) setLocalStr("");
      else setLocalStr(value.toLocaleString("en-US", isFloat ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : {}));
    }
  }, [value, isFocused, isFloat]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === "") {
      setLocalStr("");
      onChange(0);
      return;
    }
    if (!isNaN(Number(raw))) {
      setLocalStr(e.target.value);
      onChange(Number(raw));
    }
  };

  return (
    <input 
      type="text" 
      value={localStr} 
      onFocus={() => {
        setIsFocused(true);
        if (value !== 0) setLocalStr(value.toString());
      }}
      onBlur={() => {
        setIsFocused(false);
      }}
      onChange={handleChange}
      className="w-full h-8 px-1 text-sm font-semibold text-[#0b100e] border-b border-black/[0.1] focus:outline-none focus:border-[#087f70] bg-transparent transition-colors" 
    />
  );
}

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
        className="w-full h-10 px-3 rounded-lg border border-black/[0.08] bg-white text-[15px] font-medium flex items-center justify-between cursor-pointer hover:border-[#087f70]/60 focus:outline-none transition-colors">
        <span className={value ? "text-[#0b100e]" : "text-[#68726d]"}>
          {value ? selectedName || "Selected" : "Select category..."}
        </span>
        <ChevronDown className={`w-4 h-4 text-[#68726d] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-[80] bg-white border border-black/[0.06] rounded-[12px] shadow-xl mt-1 overflow-hidden">
          <div className="p-2 border-b border-black/[0.06]">
            <input ref={searchRef} value={search} onChange={e => { setSearch(e.target.value); setExpandedId(null); }}
              placeholder="Search categories..."
              className="w-full h-9 px-3 text-sm rounded-md border border-black/[0.06] focus:outline-none focus:border-[#087f70] transition-colors" />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-[#68726d]" />
            </div>
          ) : q ? (
            <div className="max-h-48 overflow-y-auto py-1">
              {searchResults.length === 0 ? (
                <p className="text-sm text-[#68726d] text-center py-3">No matches for "{search}"</p>
              ) : searchResults.map(r => (
                <button key={r.id} type="button" onClick={() => { onChange(r.id, r.name); close(); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#f9faf9] transition-colors flex items-baseline gap-2 ${value === r.id ? "text-[#087f70] font-medium" : "text-[#0b100e]"}`}>
                  <span>{r.name}</span>
                  {r.parentName && <span className="text-xs text-[#68726d] font-normal">in {r.parentName}</span>}
                </button>
              ))}
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto py-1">
              {rawCategories.length === 0 ? (
                <p className="text-sm text-[#68726d] px-4 py-3">No categories yet</p>
              ) : rawCategories.map(cat => {
                const isExpanded = expandedId === cat.categoryId;
                const subs = cat.children || [];
                const isSelected = value === cat.categoryId;
                return (
                  <div key={cat.categoryId}>
                    <div className="flex items-center">
                      <button type="button" onClick={() => { onChange(cat.categoryId, cat.name); close(); }}
                        className={`flex-1 text-left px-4 py-2.5 text-sm font-medium hover:bg-[#f9faf9] transition-colors ${isSelected ? "text-[#087f70]" : "text-[#0b100e]"}`}>
                        {cat.name}
                      </button>
                      {subs.length > 0 && (
                        <button type="button" onClick={() => setExpandedId(isExpanded ? null : cat.categoryId)}
                          className={`w-9 h-9 flex items-center justify-center mr-1 rounded-lg transition-colors ${isExpanded ? "text-[#087f70] bg-[#f0faf8]" : "text-[#68726d] hover:bg-[#f9faf9]"}`}>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </div>
                    {isExpanded && (
                      <div className="bg-[#f9faf9] border-t border-b border-border/40">
                        {subs.map(sub => (
                          <button key={sub.categoryId} type="button" onClick={() => { onChange(sub.categoryId, sub.name); close(); }}
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
