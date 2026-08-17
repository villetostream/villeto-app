"use client";

import { useState, useEffect } from "react";
import {
  X, Plus, Trash2, Loader2, Package2,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-stores";

export interface BillLineItemPayload {
  description: string;
  quantity: number;
  unitPrice?: number;
  unitOfMeasure?: string;
}

export interface StagedBillItem extends BillLineItemPayload {
  _stagingId: string;
}

interface FormState {
  description: string;
  quantity: string;
  unitPrice: string;
  unitOfMeasure: string;
}

const EMPTY_FORM: FormState = {
  description: "",
  quantity: "",
  unitPrice: "",
  unitOfMeasure: "",
};

function formatNumberInput(value: string) {
  let numeric = value.replace(/[^0-9.]/g, '');
  const parts = numeric.split('.');
  if (parts.length > 2) numeric = parts[0] + '.' + parts.slice(1).join('');
  if (!numeric) return '';
  const [int, dec] = numeric.split('.');
  const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec !== undefined ? `${formattedInt}.${dec}` : formattedInt;
}

function parseNumber(value: string) {
  const num = parseFloat(value.replace(/,/g, ''));
  return isNaN(num) ? undefined : num;
}

function currSym(currency: string): string {
  const map: Record<string, string> = { USD: "$", NGN: "₦", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$" };
  return map[currency] || currency;
}

export interface BillLineItemBatchModalProps {
  open: boolean;
  onClose: () => void;
  currency: string;
  onSaveAll: (items: BillLineItemPayload[]) => Promise<void>;
  saving: boolean;
  persistKey?: string;
}

export default function BillLineItemBatchModal({
  open,
  onClose,
  currency,
  onSaveAll,
  saving,
  persistKey,
}: BillLineItemBatchModalProps) {
  const sym = currSym(currency);
  const userId = useAuthStore(state => state.user?.userId);
  const scopedPersistKey = persistKey && userId ? `${userId}:${persistKey}` : null;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [staged, setStaged] = useState<StagedBillItem[]>(() => {
    if (scopedPersistKey && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`bill_line_item_staging:${scopedPersistKey}`);
        if (saved) return JSON.parse(saved) as StagedBillItem[];
      } catch { /* ignore */ }
    }
    return [];
  });
  
  useEffect(() => {
    if (!scopedPersistKey || typeof window === "undefined") return;
    try {
      if (staged.length > 0) {
        localStorage.setItem(`bill_line_item_staging:${scopedPersistKey}`, JSON.stringify(staged));
      } else {
        localStorage.removeItem(`bill_line_item_staging:${scopedPersistKey}`);
      }
    } catch { /* ignore */ }
  }, [staged, scopedPersistKey]);
  const [stagingEditId, setStagingEditId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ description?: string; quantity?: string }>({});

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.description.trim()) errs.description = "Item description is required";
    if (form.quantity === "" || (parseNumber(form.quantity) || 0) <= 0) errs.quantity = "Quantity must be > 0";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = (): BillLineItemPayload => ({
    description: form.description.trim(),
    quantity: parseNumber(form.quantity) || 0,
    unitPrice: parseNumber(form.unitPrice),
    unitOfMeasure: form.unitOfMeasure.trim() || undefined,
  });

  const handleAddToStaging = () => {
    if (!validate()) return;
    const payload = buildPayload();
    if (stagingEditId) {
      setStaged(prev =>
        prev.map(s =>
          s._stagingId === stagingEditId
            ? { ...payload, _stagingId: stagingEditId }
            : s
        )
      );
      setStagingEditId(null);
    } else {
      const newItem: StagedBillItem = {
        ...payload,
        _stagingId: `staging-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };
      setStaged(prev => [...prev, newItem]);
    }
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const handleEditStaged = (item: StagedBillItem) => {
    setForm({
      description: item.description,
      quantity: item.quantity ? String(item.quantity) : "",
      unitPrice: item.unitPrice !== undefined ? formatNumberInput(String(item.unitPrice)) : "",
      unitOfMeasure: item.unitOfMeasure || "",
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
    if (staged.length === 0) return;
    const payloads: BillLineItemPayload[] = staged.map(({ _stagingId, ...rest }) => rest);
    await onSaveAll(payloads);
    setStaged([]);
    setForm(EMPTY_FORM);
    if (scopedPersistKey && typeof window !== "undefined") {
      localStorage.removeItem(`bill_line_item_staging:${scopedPersistKey}`);
    }
    handleClose();
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

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      <div className="relative bg-white shadow-2xl rounded-[14px] flex flex-col overflow-hidden m-4 sm:m-6 w-full max-h-[90vh] max-w-5xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06] shrink-0 bg-white">
          <div>
            <h3 className="text-lg font-bold text-[#0b100e]">
              Add Line Items
            </h3>
            <p className="text-sm text-[#68726d] mt-0.5">
              Staged items are saved locally until you submit the batch.
            </p>
          </div>
          <button onClick={handleClose} title="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f4f7f5] hover:bg-[#e9ecea] transition-colors shrink-0">
            <X className="w-4 h-4 text-[#68726d]" />
          </button>
        </div>

        {/* Body (Split View) */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          
          {/* Left Pane (Form) */}
          <div className="md:w-[45%] bg-white flex flex-col min-h-0 overflow-y-auto border-r border-black/[0.06] p-6 space-y-5">
            <h4 className="text-[14px] font-bold text-[#10231d]">New Item Details</h4>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#10231d]">
                Item Description <span className="text-[#d33d44]">*</span>
              </label>
              <input type="text" value={form.description}
                onChange={e => { set("description", e.target.value); setErrors(p => ({ ...p, description: undefined })); }}
                placeholder="e.g. Dell XPS Laptop"
                className={`w-full h-10 px-3 rounded-[8px] border text-[13px] focus:outline-none focus:border-[#087f70] transition-colors ${errors.description ? "border-destructive" : "border-black/[0.08]"}`}
              />
              {errors.description && <p className="text-[12px] text-destructive">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#10231d]">
                  Quantity <span className="text-[#d33d44]">*</span>
                </label>
                <input type="text" value={form.quantity}
                  onChange={e => { set("quantity", formatNumberInput(e.target.value)); setErrors(p => ({ ...p, quantity: undefined })); }}
                  placeholder="0"
                  className={`w-full h-10 px-3 rounded-[8px] border text-[13px] focus:outline-none focus:border-[#087f70] transition-colors ${errors.quantity ? "border-destructive" : "border-black/[0.08]"}`}
                />
                {errors.quantity && <p className="text-[12px] text-destructive">{errors.quantity}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#10231d]">Unit Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#68726d] text-[13px] font-medium">{sym}</span>
                  <input type="text" value={form.unitPrice}
                    onChange={e => set("unitPrice", formatNumberInput(e.target.value))}
                    placeholder="0.00"
                    className="w-full h-10 pl-7 pr-3 rounded-[8px] border border-black/[0.08] text-[13px] focus:outline-none focus:border-[#087f70] transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#10231d]">
                Unit of Measure
              </label>
              <input type="text" value={form.unitOfMeasure}
                onChange={e => set("unitOfMeasure", e.target.value)}
                placeholder="e.g. unit, kg, box"
                className="w-full h-10 px-3 rounded-[8px] border border-black/[0.08] text-[13px] focus:outline-none focus:border-[#087f70] transition-colors"
              />
            </div>

            <div className="pt-2">
              <button type="button" onClick={handleAddToStaging}
                className="w-full h-10 rounded-[8px] border border-[#087f70]/30 bg-[#f0faf8] text-[#087f70] text-[13px] font-semibold hover:bg-[#e6f7f3] transition-colors flex items-center justify-center gap-2 shadow-sm">
                <Plus className="w-4 h-4" />
                {stagingEditId ? "Update Staged Item" : "Add to Staged Items"}
              </button>
            </div>
          </div>

          {/* Right Pane (Staged Items list) */}
          <div className="flex-1 md:w-[55%] bg-[#f9faf9] flex flex-col overflow-hidden min-h-0">
            <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-black/[0.06] shrink-0">
              <div className="flex items-center gap-2">
                <Package2 className="w-4 h-4 text-[#68726d]" />
                <span className="text-[13px] font-bold text-[#10231d] uppercase tracking-wider">
                  Staged Items
                </span>
                <span className="ml-1 bg-[#f0faf8] text-[#087f70] text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {staged.length}
                </span>
              </div>
              {stagedTotal > 0 && (
                <span className="text-[14px] font-bold text-[#10231d]">
                  Total: {sym}{stagedTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-6 pt-0">
              {staged.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4 mt-10">
                  <div className="w-20 h-20 rounded-full bg-[#f0faf8] flex items-center justify-center">
                    <Package2 className="w-8 h-8 text-[#087f70]" />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-[#10231d]">No items staged yet</p>
                    <p className="text-[13px] text-[#68726d] mt-1 max-w-[250px] mx-auto">
                      Fill out the form to add items to your staging list.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {staged.map((item) => {
                    const isBeingEdited = stagingEditId === item._stagingId;
                    const lineSubtotal = (item.quantity || 0) * (item.unitPrice || 0);
                    return (
                      <div key={item._stagingId}
                        className={`p-4 rounded-[12px] border bg-white transition-all shadow-sm ${isBeingEdited ? "border-[#087f70] ring-1 ring-primary/20" : "border-black/[0.08]"}`}>
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-4">
                              <p className="text-sm font-bold text-[#10231d] truncate" title={item.description}>{item.description}</p>
                              {lineSubtotal > 0 && (
                                <span className="text-sm font-bold text-[#10231d] shrink-0">
                                  {sym}{lineSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[13px] text-[#68726d]">
                                {item.quantity} {item.unitOfMeasure || ''} {item.unitPrice ? `@ ${sym}${item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : ""}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button type="button" onClick={() => handleEditStaged(item)} title="Edit staged item"
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isBeingEdited ? 'bg-[#f0faf8] text-[#087f70]' : 'text-[#68726d] hover:bg-[#f9faf9] hover:text-[#10231d]'}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                              </svg>
                            </button>
                            <button type="button" onClick={() => handleRemoveStaged(item._stagingId)} title="Remove"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-[#fff5f5] hover:text-[#d33d44] transition-colors">
                              <Trash2 className="w-4 h-4" />
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
        </div>

        {/* Footer (batch save) */}
        <div className="shrink-0 border-t border-black/[0.06] bg-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {staged.length > 0 ? (
              <span className="text-[13px] text-[#68726d]">
                {staged.length} item{staged.length !== 1 ? "s" : ""} staged. Ready to be saved to the bill.
              </span>
            ) : (
              <span className="text-[13px] text-[#68726d] italic">No items staged yet</span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button type="button" onClick={handleClose}
              className="h-10 px-5 rounded-[8px] border border-black/[0.08] text-[13px] font-semibold text-[#52605b] hover:bg-[#f9faf9] transition-colors bg-white">
              Cancel
            </button>
            <button type="button" onClick={handleSaveAll}
              disabled={saving || staged.length === 0}
              className="h-10 px-6 rounded-[8px] bg-[#087f70] text-white text-[13px] font-bold hover:bg-[#076b5e] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center shadow-sm">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...
                </>
              ) : (
                "Save All to Line Items"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
