"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Trash2, Calendar, CircleCheck, X } from "lucide-react";

const DEPARTMENTS = ["Engineering","Finance","Marketing","Operations","HR","Legal","IT","Procurement","Product Engineering"];
const PRIORITIES  = ["Low","Medium","High","Critical"];
const CATEGORIES  = ["IT Equipment","Equipment","Office Supplies","Furniture","Software","Services","Other"];

interface Item { name: string; description: string; category: string; qty: number; unitPrice: number; }

const EMPTY_MODAL_ITEM = { name: "", category: "", qty: 0, unitPrice: 0, description: "" };

function SelectDropdown({
  value, onChange, options, placeholder, id,
}: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string; id?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full h-11 px-3 rounded-lg border border-border bg-muted/30 text-sm flex items-center justify-between focus:outline-none hover:border-primary/60 transition-colors">
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{value || placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 bg-white border border-border rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
          {options.map(o => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors ${value === o ? "text-primary font-medium" : "text-foreground"}`}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add Line Item Modal ───────────────────────────────────────────────────────

function AddLineItemModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (item: Item) => void;
}) {
  const [form, setForm] = useState(EMPTY_MODAL_ITEM);
  const subtotal = form.qty * form.unitPrice;

  const handleAdd = () => {
    if (!form.name.trim()) return;
    onAdd({ name: form.name, description: form.description, category: form.category, qty: form.qty, unitPrice: form.unitPrice });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">Add Line Item</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Item Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Item Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Enter item name"
            className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Category</label>
          <SelectDropdown value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))} options={CATEGORIES} placeholder="Select" />
        </div>

        {/* Quantity + Unit Price */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Quantity</label>
            <input
              type="number"
              min={0}
              value={form.qty || ""}
              onChange={e => setForm(p => ({ ...p, qty: Number(e.target.value) }))}
              placeholder="0"
              className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Unit Price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">NGN</span>
              <input
                type="number"
                min={0}
                value={form.unitPrice || ""}
                onChange={e => setForm(p => ({ ...p, unitPrice: Number(e.target.value) }))}
                placeholder="0.00"
                className="w-full h-11 pl-12 pr-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Description <span className="text-muted-foreground font-normal">(Optional)</span></label>
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Brief description"
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg border border-border text-sm resize-none focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="w-full h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Add Item
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function NewPurchaseRequestPage() {
  const router = useRouter();
  const [requestTitle, setRequestTitle] = useState("");
  const [department, setDepartment]     = useState("Engineering");
  const [priority, setPriority]         = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [submitted, setSubmitted]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [items, setItems] = useState<Item[]>([
    { name: "MacBook Pro 2026", description: "14' screen display, 32gb ram and 1tb storage", category: "IT Equipment", qty: 10, unitPrice: 400000 },
  ]);

  const addItem    = (item: Item) => setItems(p => [...p, item]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));

  const totalAmount = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setSubmitted(true); }, 1000);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
          <CircleCheck className="w-8 h-8 text-emerald-500" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-1">Request Submitted!</h3>
          <p className="text-sm text-muted-foreground">Your purchase request has been submitted for review.</p>
        </div>
        <button onClick={() => router.push("/procurement/purchase-request")}
          className="h-10 px-6 rounded-full bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          Back to Purchase Requests
        </button>
      </div>
    );
  }

  return (
    <>
      {showModal && (
        <AddLineItemModal
          onClose={() => setShowModal(false)}
          onAdd={addItem}
        />
      )}

      <div className="mx-auto space-y-5 max-w-5xl">
        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-foreground">New Purchase Request</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Define what you need</p>
        </div>

        {/* Basic Information */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
          <h2 className="text-base font-semibold text-foreground">Basic Information</h2>

          {/* Request Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Request Title</label>
            <input
              type="text"
              value={requestTitle}
              onChange={e => setRequestTitle(e.target.value)}
              placeholder="Enter a title"
              className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Department / Priority / Expected Date */}
          <div className="grid grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Department</label>
              <div className="w-full h-11 px-3 rounded-lg border border-border bg-muted/30 flex items-center text-sm text-foreground">
                {department}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Priority</label>
              <SelectDropdown value={priority} onChange={setPriority} options={PRIORITIES} placeholder="Select" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Expected Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={expectedDate}
                  onChange={e => setExpectedDate(e.target.value)}
                  placeholder="dd/mm/yyyy"
                  className="w-full h-11 px-3 pr-10 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Request Items */}
        <div className="bg-white rounded-2xl border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">
              Request Items <span className="text-muted-foreground font-normal ml-1">{items.length}</span>
            </h2>
            <button type="button" onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1.5fr_2fr_120px_80px_140px_100px_40px] gap-3">
            {["Name","Description","Category","Qty","Unit Price","Subtotal",""].map(h => (
              <span key={h} className="text-sm font-medium text-foreground">{h}</span>
            ))}
          </div>

          {/* Item rows */}
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1.5fr_2fr_120px_80px_140px_100px_40px] gap-3 items-center">
                <span className="text-sm font-semibold text-foreground truncate">{item.name}</span>
                <span className="text-sm text-muted-foreground truncate">{item.description}</span>
                <span className="inline-flex">
                  <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-medium">{item.category}</span>
                </span>
                <span className="text-sm text-foreground text-center">{item.qty}</span>
                <span className="text-sm text-foreground">{item.unitPrice.toLocaleString("en-NG", { minimumFractionDigits: 1 })}</span>
                <span className="text-sm text-foreground">{(item.qty * item.unitPrice).toLocaleString("en-NG", { minimumFractionDigits: 1 })}</span>
                <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add item link */}
          <button type="button" onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline mt-1">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <button
            type="button"
            onClick={() => router.push("/procurement/purchase-request")}
            className="h-11 px-6 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="h-11 px-6 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
              </svg>
            ) : null}
            Submit Request
          </button>
        </div>
      </div>
    </>
  );
}
