"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown, Plus, Trash2, Calendar as CalendarIcon, X,
  CheckCircle2, Loader2, Pencil, Search,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LineItemBatchModal from "@/components/procurement/LineItemBatchModal";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { useAuthStore } from "@/stores/auth-stores";
import {
  useCreatePurchaseOrder,
  useAddPOLineItems,
  useUpdatePOLineItem,
  useDeletePOLineItem,
  usePurchaseOrder,
  useSubmitPurchaseOrderForApproval,
  type CreatePurchaseOrderPayload,
  type POLineItemPayload,
} from "@/queries/procurement/purchase-orders";
import withPermissions from "@/components/permissions/permission-protected-routes";
import {
  useGetProcurementCategories,
  useGetVendors,
  type PRPriority,
} from "@/queries/procurement/purchase-requests";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/types/api-error";
import { isPRPriority } from "@/lib/types/purchase-request-helpers";
import {
  isProcurementReadyLegalEntity,
  useLegalEntities,
} from "@/queries/legal-entities";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITIES: { label: string; value: string }[] = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "urgent" },
];

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
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search vendors..."
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

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3">
      {[1, 2].map((s, i) => {
        const done = step > s;
        const active = step === s;
        return (
          <div key={s} className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${done ? "bg-[#f0faf8] text-[#087f70]" : active ? "bg-[#f0faf8] text-[#087f70]" : "bg-[#f9faf9] text-[#68726d]"}`}>
              {done ? <CheckCircle2 className="w-4 h-4" /> : (
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${active ? "bg-[#087f70] text-white" : "bg-muted-foreground/30 text-[#68726d]"}`}>{s}</span>
              )}
              <span className="hidden sm:inline">{s === 1 ? "PO Details" : "Add Items"}</span>
            </div>
            {i === 0 && (
              <div className={`w-8 h-px ${step > 1 ? "bg-[#087f70]" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

function NewPurchaseOrderPage() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<1 | 2>(1);
  const [purchaseOrderId, setPurchaseOrderId] = useState<string | null>(null);

  // PO Header form
  const [vendorId, setVendorId] = useState("");
  const [priority, setPriority] = useState<PRPriority | "">("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [legalEntityId, setLegalEntityId] = useState("");
  const [notes, setNotes] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [headerSaving, setHeaderSaving] = useState(false);

  // Line items
  const [savedLineItems, setSavedLineItems] = useState<any[]>([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<{ item: any; index: number } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ item: any; index: number } | null>(null);
  const [panelSaving, setPanelSaving] = useState(false);

  // API Hooks
  const createPO = useCreatePurchaseOrder();
  const addLineItem = useAddPOLineItems(purchaseOrderId || "");
  const updateLineItem = useUpdatePOLineItem(purchaseOrderId || "", editingItem?.item?.purchaseOrderLineItemId || editingItem?.item?.id || "");
  const deleteLineItem = useDeletePOLineItem(purchaseOrderId || "");
  const submitPO = useSubmitPurchaseOrderForApproval(purchaseOrderId || "");
  const { refetch: refetchPO } = usePurchaseOrder(purchaseOrderId || "");

  const { data: catData } = useGetProcurementCategories();
  const { data: vendorData } = useGetVendors();
  const { data: legalEntityData } = useLegalEntities();

  const rawCategories = catData?.data || [];
  const categories = rawCategories.flatMap(c => [c, ...(c.children || [])]);
  const getCategoryName = (categoryId?: string | null) => {
    if (!categoryId) return null;
    return categories.find(c => c.categoryId === categoryId)?.name || null;
  };

  const rawVendors = vendorData?.data || [];
  const getVendorName = (vid: string) => {
    const v = rawVendors.find(v => v.vendorId === vid);
    return v ? v.displayName || v.legalName : "Unknown Vendor";
  };

  const legalEntities = (legalEntityData?.data || []).filter(
    isProcurementReadyLegalEntity,
  );
  const legalEntityOptions = legalEntities.map(entity => ({
    label: `${entity.legalName} (${entity.baseCurrency})`,
    value: entity.legalEntityId,
  }));

  const effectiveLegalEntityId =
    legalEntityId ||
    (legalEntities.length === 1 ? legalEntities[0].legalEntityId : "");
  const requiresLegalEntitySelection = legalEntities.length > 1;
  const currency =
    legalEntities.find(
      (entity) => entity.legalEntityId === effectiveLegalEntityId,
    )?.baseCurrency || "";

  const selectLegalEntity = (id: string) => {
    setLegalEntityId(id);
  };

  const handleSaveHeader = async () => {
    if (!vendorId) { toast.error("Vendor is required"); return; }
    if (!isPRPriority(priority)) { toast.error("Priority is required"); return; }
    if (!deliveryDate) { toast.error("Delivery date is required"); return; }
    if (legalEntities.length === 0) { toast.error("No procurement-ready legal entity is available"); return; }
    if (requiresLegalEntitySelection && !effectiveLegalEntityId) { toast.error("Select the legal entity for this purchase order"); return; }

    setHeaderSaving(true);
    try {
      const payload: CreatePurchaseOrderPayload = {
        legalEntityId: effectiveLegalEntityId || undefined,
        vendorId,
        priority: priority as any,
        deliveryDate,
        currency,
        notes: notes || undefined,
      };
      const res = await createPO.mutateAsync(payload);
      const id = res.data?.purchaseOrderId || res.data?.id;
      if (!id) throw new Error("Purchase Order ID not returned");
      setPurchaseOrderId(id);
      setSavedLineItems(res.data?.lineItems || []);
      setStep(2);
      toast.success("Draft PO saved! Now add your line items.");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to create PO"));
    } finally {
      setHeaderSaving(false);
    }
  };

  const handleAddItems = async (payloads: POLineItemPayload[]) => {
    if (!purchaseOrderId) return;
    setPanelSaving(true);
    try {
      await addLineItem.mutateAsync({ lineItems: payloads });
      const refetched = await refetchPO();
      const items = refetched.data?.data?.lineItems || [];
      if (items.length > 0) setSavedLineItems(items);
      toast.success(`${payloads.length} item${payloads.length !== 1 ? "s" : ""} added`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to add items"));
      throw err;
    } finally {
      setPanelSaving(false);
    }
  };

  const handleEditItem = async (payload: POLineItemPayload) => {
    if (!purchaseOrderId || !editingItem) return;
    setPanelSaving(true);
    try {
      await updateLineItem.mutateAsync(payload);
      const refetched = await refetchPO();
      const items = refetched.data?.data?.lineItems || [];
      if (items.length > 0) setSavedLineItems(items);
      setEditingItem(null);
      setShowModal(false);
      toast.success("Item updated");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to update item"));
      throw err;
    } finally {
      setPanelSaving(false);
    }
  };

  const confirmDeleteItem = async () => {
    if (!purchaseOrderId || !itemToDelete) return;
    try {
      const lineItemId = itemToDelete.item.purchaseOrderLineItemId || itemToDelete.item.id;
      if (!lineItemId) throw new Error("Item ID is missing");
      await deleteLineItem.mutateAsync(lineItemId);
      const refetched = await refetchPO();
      const items = refetched.data?.data?.lineItems;
      if (items) {
        setSavedLineItems(items);
      } else {
        setSavedLineItems(prev => prev.filter((_, i) => i !== itemToDelete.index));
      }
      toast.success("Item removed");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to remove item"));
    } finally {
      setItemToDelete(null);
    }
  };

  const openEditModal = (item: any, index: number) => {
    setEditingItem({ item, index });
    setShowModal(true);
  };

  const totals = savedLineItems.reduce((acc, item) => {
    const qty = item.quantity || 0;
    const price = item.unitPrice || 0;
    const tax = item.taxAmount || 0;
    const sub = qty * price;
    return { subtotal: acc.subtotal + sub, tax: acc.tax + tax, total: acc.total + sub + tax };
  }, { subtotal: 0, tax: 0, total: 0 });

  const currencySymbol = currency === "USD" ? "$" : currency === "NGN" ? "₦" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency;

  return (
    <>
      {step === 1 && (
        <div className="w-full space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky -top-3 sm:-top-5 lg:-top-6 -mt-3 sm:-mt-5 lg:-mt-6 pt-3 sm:pt-5 lg:pt-6 pb-4 z-40 bg-[#f4f7f5]">
            <div>
              <h1 className="text-[24px] font-semibold tracking-[-0.035em] text-[#0b100e]">Create purchase order</h1>
              <p className="mt-1 text-[12px] text-[#68726d]">Define the supplier commitment, entity, and delivery expectation.</p>
            </div>
            <StepIndicator step={step} />
          </div>

          <div className="bg-white rounded-[14px] border border-black/[0.06] p-6 space-y-5">
            <h2 className="text-base font-semibold text-[#0b100e]">PO Details</h2>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0b100e]">Vendor <span className="text-[#d33d44]">*</span></label>
              <VendorDropdown value={vendorId} onChange={setVendorId} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#0b100e]">Priority <span className="text-[#d33d44]">*</span></label>
                <SelectDropdown
                  value={priority}
                  onChange={(v) => setPriority(isPRPriority(v) ? v : "")}
                  options={PRIORITIES}
                  placeholder="Select priority"
                />
              </div>
              {legalEntities.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#0b100e]">Legal entity <span className="text-[#d33d44]">*</span></label>
                  <SelectDropdown value={effectiveLegalEntityId} onChange={selectLegalEntity} options={legalEntityOptions} placeholder="Select legal entity" />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#0b100e]">Delivery Date <span className="text-[#d33d44]">*</span></label>
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
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#0b100e]">Currency</label>
                <div className="flex h-11 items-center rounded-lg border border-black/[0.06] bg-[#f9faf9] px-3 text-sm font-medium">{currency || "Select a legal entity"}</div>
                <p className="text-xs text-[#68726d]">Locked to the legal entity base currency.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0b100e]">Notes <span className="text-[#68726d] font-normal">(optional)</span></label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Provide context for this PO..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-black/[0.06] text-sm resize-none focus:outline-none focus:border-[#087f70] transition-colors" />
            </div>

            <div className="pt-1 flex justify-end">
              <button type="button" onClick={handleSaveHeader} disabled={!vendorId || !priority || legalEntities.length === 0 || (requiresLegalEntitySelection && !effectiveLegalEntityId) || !deliveryDate || headerSaving}
                className="h-11 px-8 rounded-[12px] bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm">
                {headerSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col h-full w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 sticky -top-3 sm:-top-5 lg:-top-6 -mt-3 sm:-mt-5 lg:-mt-6 pt-3 sm:pt-5 lg:pt-6 pb-4 z-40 bg-[#f4f7f5]">
            <div>
              <h1 className="text-[24px] font-semibold tracking-[-0.035em] text-[#0b100e]">Build the purchase order</h1>
              <p className="mt-1 text-[12px] text-[#68726d]">Add the exact items, quantities, categories, and pricing.</p>
            </div>
            <StepIndicator step={step} />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pb-4 pr-2">
            {/* Read-only PO summary */}
            <div className="bg-white rounded-[14px] border border-black/[0.06] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-[#0b100e]">PO Details</h2>
                <div className="flex items-center gap-1.5 text-xs bg-[#f0faf8] text-[#087f70] px-3 py-1 rounded-full font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved as draft
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Vendor", value: getVendorName(vendorId) },
                  { label: "Priority", value: PRIORITIES.find(p => p.value === priority)?.label || priority },
                  { label: "Currency", value: currency },
                  { label: "Expected Delivery", value: deliveryDate },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-[#68726d]">{label}</p>
                    <p className="text-sm font-medium text-[#0b100e] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Line Items Card */}
            <div className="bg-white rounded-[14px] border border-black/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.06] flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-[#0b100e] flex items-center gap-2">
                  PO Items
                  <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-gray-100 text-xs font-semibold text-[#0b100e] px-1.5">
                    {savedLineItems.length}
                  </span>
                </h2>
                <button type="button" onClick={() => { setEditingItem(null); setShowModal(true); }}
                  className="flex items-center gap-1 text-sm font-semibold text-[#087f70] hover:text-primary/80 transition-colors">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              {savedLineItems.length === 0 ? (
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
                      {savedLineItems.map((item, i) => {
                        const catName = getCategoryName(item.categoryId);
                        const sub = (item.quantity || 0) * (item.unitPrice || 0);
                        return (
                          <tr key={item.id || item.purchaseOrderLineItemId} className="border-b border-border/40 last:border-0 hover:bg-[#f9faf9] transition-colors">
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
                                <div className="relative group">
                                  <button type="button" onClick={() => openEditModal(item, i)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[#68726d] hover:bg-[#f9faf9] hover:text-[#0b100e] transition-colors">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap text-[#0b100e] text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity z-10">Edit item</span>
                                </div>
                                <div className="relative group">
                                  <button type="button" onClick={() => setItemToDelete({ item, index: i })}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-[#fff5f5] hover:text-[#d33d44] transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap text-[#0b100e] text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity z-10">Remove item</span>
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

          <div className="shrink-0 border-t border-black/[0.06] bg-white py-4 flex items-center justify-end">
            <button type="button" disabled={savedLineItems.length === 0 || submitPO.isPending}
              onClick={async () => {
                if (!purchaseOrderId) return;
                try {
                  await submitPO.mutateAsync();
                  toast.success("Purchase order submitted for approval!");
                  router.push("/procurement/purchase-order");
                } catch (err: unknown) {
                  toast.error(getApiErrorMessage(err, "Failed to submit"));
                }
              }}
              className="h-11 px-8 rounded-[12px] bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm">
              {submitPO.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Order
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      <LineItemBatchModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingItem(null); }}
        currency={currency}
        onSaveAll={handleAddItems as any}
        saving={panelSaving}
        editInitial={editingItem ? {
          name: editingItem.item.name || "",
          description: editingItem.item.description || "",
          categoryId: editingItem.item.categoryId || "",
          categoryName: getCategoryName(editingItem.item.categoryId) || "",
          quantity: editingItem.item.quantity || 0,
          unitPrice: editingItem.item.unitPrice,
          taxAmount: editingItem.item.taxAmount || 0,
          sku: editingItem.item.sku || "",
          unitOfMeasure: editingItem.item.unitOfMeasure || "unit",
          accountingResolutionStatus: "unresolved",
        } : null}
        onEditSaved={handleEditItem as any}
        editSaving={panelSaving}
        persistKey={`po-draft-${purchaseOrderId}`}
      />

      <AlertDialog open={!!itemToDelete} onOpenChange={(val) => !val && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-semibold text-[#0b100e]">{itemToDelete?.item.name}</span> from the order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteItem} className="bg-[#b83038] hover:bg-red-700 text-white">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default withPermissions(NewPurchaseOrderPage, [
  { resource: "procurement.purchase_order", action: "create" },
]);

