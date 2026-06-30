"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ManagerOverrideBanner } from "@/components/procurement/ManagerOverrideBanner";
import {
  Pencil, X, ChevronDown, AlertCircle, Loader2,
  Plus, Trash2, Calendar as CalendarIcon,
  Scissors, Check, Search,
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
  useWithdrawPurchaseRequest,
  useApprovePurchaseRequest,
  useRejectPurchaseRequest,
  useConvertToPO,
  useDeletePurchaseRequest,
  useGetProcurementCategories,
  useGetVendors,
  type PurchaseRequest,
  type PurchaseRequestLineItem,
  type LineItemPayload,
  type CreatePurchaseRequestPayload,
  type Vendor,
  type PRPriority,
  type DraftPurchaseOrder,
} from "@/queries/procurement/purchase-requests";
import { useGetAllDepartmentsApi } from "@/queries/departments/get-all-departments";
import { toast } from "sonner";
import withPermissions from "@/components/permissions/permission-protected-routes";
import {
  PR_STATUS_CFG,
  getPRDisplayStatus,
} from "@/lib/constants/purchase-request-status";
import { getApiErrorMessage, isRecord, getOptionalString } from "@/lib/types/api-error";
import {
  getRequesterName,
  getRoleName,
  mergeDepartmentOption,
  resolveDepartmentLabel,
  PurchaseRequestDetail,
  toApiLineItemPayload,
} from "@/lib/types/purchase-request-helpers";



function cleanLineItemPayload(payload: LineItemPayload): LineItemPayload {
  return toApiLineItemPayload(payload);
}

function isPRPriorityValue(value: string): value is PRPriority {
  return value === "low" || value === "medium" || value === "urgent";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITIES = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "urgent" },
];

const CURRENCIES = ["USD", "NGN", "EUR", "GBP", "CAD", "AUD"];

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low", medium: "Medium", urgent: "High",
};

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

function formatTs(d?: string) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    const date = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
    const time = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${date}  ${time}`;
  } catch { return d; }
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, approvalStatus, isOwnRequest }: { status: string; approvalStatus?: string | null; isOwnRequest?: boolean }) {
  const displayKey = getPRDisplayStatus(status, approvalStatus, isOwnRequest);
  const cfg = PR_STATUS_CFG[displayKey] || PR_STATUS_CFG[status] || { label: status, className: "text-muted-foreground bg-muted/40" };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

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
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = options.find(o => o.value === value);
  if (disabled) {
    return (
      <div className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30 text-sm flex items-center text-foreground">
        {selected?.label || value}
      </div>
    );
  }
  return (
    <div className="relative" ref={ref}>
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

// ─── Workflow Progress Sidebar ─────────────────────────────────────────────────

type StepStatus = "done" | "pending" | "inactive";
interface WorkflowStep {
  label: string;
  person?: string;
  timestamp?: string;
  badge?: string;
  badgeColor?: string;
  status: StepStatus;
}

function WorkflowProgress({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="space-y-0 pt-1 pl-1">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <div key={idx} className={`flex items-start gap-3 ${step.status === "inactive" ? "opacity-45" : ""}`}>
            {/* Icon + connector */}
            <div className="flex flex-col items-center shrink-0 pt-0.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                step.status === "done"
                  ? "bg-primary/10"
                  : "bg-muted border border-border"
              }`}>
                {step.status === "done"
                  ? <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  : <div className={`w-1.5 h-1.5 rounded-full ${step.status === "pending" ? "bg-amber-400" : "bg-muted-foreground/40"}`} />
                }
              </div>
              {!isLast && (
                <div className="w-px bg-border/60 flex-1 min-h-[16px] mt-0.5" />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 min-w-0 ${isLast ? "pb-0" : ""}`}>
              <p className={`text-xs font-medium ${step.status === "done" ? "text-muted-foreground" : "text-muted-foreground/60"}`}>{step.label}</p>
              {step.person && (
                <p className={`text-sm font-semibold flex items-center gap-1.5 flex-wrap mt-0.5 ${step.status === "done" || step.status === "pending" ? "text-foreground" : "text-muted-foreground/60"}`}>
                  {step.person}
                  {step.badge && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${step.badgeColor}`}>
                      {step.badge}
                    </span>
                  )}
                </p>
              )}
              {!step.person && step.badge && (
                <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${step.badgeColor}`}>
                  {step.badge}
                </span>
              )}
              {step.timestamp && (
                <p className="text-xs text-muted-foreground mt-0.5">{step.timestamp}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Withdraw Modal (with justification) ─────────────────────────────────────

function WithdrawModal({ onClose, onConfirm, loading }: {
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-foreground">Withdraw Request</h3>
          <p className="text-sm text-muted-foreground">Please provide a reason for withdrawing this purchase request.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Reason for withdrawal <span className="text-red-500">*</span></label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="e.g. Requirements have changed, budget re-allocated..."
            className="w-full px-3 py-2.5 rounded-lg border border-border text-sm resize-none focus:outline-none focus:border-primary transition-colors" />
        </div>
        <button onClick={() => {
          if (!reason.trim()) { toast.error("Please provide a reason"); return; }
          onConfirm(reason.trim());
        }} disabled={loading}
          className="w-full h-11 rounded-xl bg-red-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 transition-opacity">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Withdraw Request
        </button>
      </div>
    </div>
  );
}

// ─── Reject Modal (with reason) ───────────────────────────────────────────────

function RejectModal({ onClose, onConfirm, loading }: {
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-foreground">Reject Request</h3>
          <p className="text-sm text-muted-foreground">Please provide a reason for rejecting this purchase request.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Rejection reason <span className="text-red-500">*</span></label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="e.g. Over budget, needs revision..."
            className="w-full px-3 py-2.5 rounded-lg border border-border text-sm resize-none focus:outline-none focus:border-primary transition-colors" />
        </div>
        <button onClick={() => {
          if (!reason.trim()) { toast.error("Please provide a reason"); return; }
          onConfirm(reason.trim());
        }} disabled={loading}
          className="w-full h-11 rounded-xl bg-red-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 transition-opacity">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Reject Request
        </button>
      </div>
    </div>
  );
}

// ─── Generic Confirm Modal ─────────────────────────────────────────────────────

function ConfirmModal({ title, message, onConfirm, onClose, confirmLabel = "Confirm", danger = false, loading = false }: {
  title: string; message: React.ReactNode; onConfirm: () => void; onClose: () => void;
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
          <p className="text-sm text-muted-foreground">{message}</p>
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

// ─── Category Dropdown ─────────────────────────────────────────────────────────

function CategoryDropdown({ value, onChange }: {
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
        setOpen(false); setSearch("");
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
                <p className="text-sm text-muted-foreground px-4 py-3 text-center">No matches for &ldquo;{search}&rdquo;</p>
              ) : (
                searchResults.map(r => (
                  <button key={r.id} type="button" onClick={() => { onChange(r.id, r.name); close(); }}
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

function LineItemModal({ onClose, onSave, initial, loading, departments: _departments, currency = "USD" }: {
  onClose: () => void;
  onSave: (d: LineItemPayload) => void;
  initial?: ModalItem;
  loading: boolean;
  departments: { label: string; value: string }[];
  currency?: string;
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
            <CategoryDropdown value={form.categoryId} onChange={(id, name) => setForm(p => ({ ...p, categoryId: id, categoryName: name }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Quantity <span className="text-red-500">*</span></label>
              <input type="number" min={1} value={form.quantity || ""} onChange={e => set("quantity", Number(e.target.value))} placeholder="0"
                className="w-full h-11 px-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Unit Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                  {{ USD: "$", NGN: "₦", EUR: "€", GBP: "£", CAD: "$", AUD: "$" }[currency] || currency}
                </span>
                <input type="number" min={0} value={form.unitPrice || ""} onChange={e => set("unitPrice", Number(e.target.value))} placeholder="0.00"
                  className="w-full h-11 pl-8 pr-3 rounded-lg border border-border text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
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
                {formatAmount(subtotal, currency)}
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

// ─── Edit Header Modal ─────────────────────────────────────────────────────────

function EditHeaderModal({ pr, onClose, onSave, loading, departments }: {
  pr: PurchaseRequest;
  onClose: () => void;
  onSave: (data: Partial<CreatePurchaseRequestPayload>) => void;
  loading: boolean;
  departments: { label: string; value: string }[];
}) {
  const can = useAuthStore(s => s.can);
  const canChangeDept = can("procurement.purchase_request", "manage") || can("department", "manage");

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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Priority</label>
              <SimpleSelect value={priority} onChange={v => { if (isPRPriorityValue(v)) setPriority(v); }} options={PRIORITIES} />
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
              <SimpleSelect value={departmentId} onChange={setDepartmentId} options={departments} disabled={!canChangeDept} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Provide context for this request..."
              className="w-full px-3 py-2.5 rounded-lg border border-border text-sm resize-none focus:outline-none focus:border-primary transition-colors" />
          </div>
        </div>
        <div className="px-6 pb-6">
          <button type="button" disabled={loading}
            onClick={() => onSave({ title, description: description || undefined, priority, currency, neededByDate, departmentId })}
            className="w-full h-11 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 transition-opacity">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Vendor Select Dropdown ────────────────────────────────────────────────────

function VendorSelect({ value, onChange, vendors }: {
  value: string;
  onChange: (vendorId: string) => void;
  vendors: Vendor[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  // Focus the search input whenever the dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const clearSearch = () => setSearch("");

  const selected = vendors.find(v => v.vendorId === value);
  const filtered = vendors.filter(v => {
    const name = (v.displayName || v.legalName || "").toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => {
        setOpen(v => {
          if (v) clearSearch();
          return !v;
        });
      }}
        className="w-full h-9 px-3 rounded-lg border border-border bg-white text-sm flex items-center justify-between hover:border-primary/60 focus:outline-none transition-colors">
        <span className={selected ? "text-foreground" : "text-muted-foreground text-xs"}>
          {selected ? (selected.displayName || selected.legalName || "Unknown Vendor") : "Select vendor"}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 bg-white border border-border rounded-xl shadow-lg mt-1 overflow-hidden" style={{ minWidth: "200px" }}>
          {/* Search input */}
          <div className="px-2 pt-2 pb-1 border-b border-border/40">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vendor..."
                className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-border/60 bg-muted/20 focus:outline-none focus:border-primary/50 focus:bg-white transition-colors"
              />
            </div>
          </div>
          {/* Vendor list */}
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-3 text-center">No vendors found</p>
            ) : filtered.map(v => (
              <button key={v.vendorId} type="button" onClick={() => { onChange(v.vendorId); setOpen(false); setSearch(""); }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors ${value === v.vendorId ? "text-primary font-medium bg-primary/5" : "text-foreground"}`}>
                {v.displayName || v.legalName || "Unknown Vendor"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create PO View ───────────────────────────────────────────────────────────

interface _LineItemGroup {
  vendorId: string;
  lineItemIds: string[];
}

type PurchaseRequestLineItemType = NonNullable<PurchaseRequest["lineItems"]>[number];

const CARD_ACCENTS = [
  { border: "border-violet-300", header: "bg-violet-50 border-b border-violet-200", badge: "bg-violet-100 text-violet-700", dot: "bg-violet-500", rowAccent: "bg-violet-50/40" },
  { border: "border-emerald-300", header: "bg-emerald-50 border-b border-emerald-200", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", rowAccent: "bg-emerald-50/40" },
  { border: "border-sky-300",     header: "bg-sky-50 border-b border-sky-200",         badge: "bg-sky-100 text-sky-700",         dot: "bg-sky-500",     rowAccent: "bg-sky-50/40" },
  { border: "border-amber-300",   header: "bg-amber-50 border-b border-amber-200",     badge: "bg-amber-100 text-amber-700",     dot: "bg-amber-500",   rowAccent: "bg-amber-50/40" },
  { border: "border-pink-300",    header: "bg-pink-50 border-b border-pink-200",       badge: "bg-pink-100 text-pink-700",       dot: "bg-pink-500",    rowAccent: "bg-pink-50/40" },
  { border: "border-teal-300",    header: "bg-teal-50 border-b border-teal-200",       badge: "bg-teal-100 text-teal-700",       dot: "bg-teal-500",    rowAccent: "bg-teal-50/40" },
];

function PurchaseRequestTableHead() {
  return (
    <thead>
      <tr className="border-b border-border/60 bg-white">
        {["Item", "Qty", "Unit Price", "Subtotal", "Vendor"].map(h => (
          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
        ))}
        <th className="w-10" />
      </tr>
    </thead>
  );
}

function CreatePOView({
  pr,
  vendors,
  onConvertToPOs,
  onReject,
  convertLoading,
  rejectLoading,
  departmentName,
  workflowSteps,
}: {
  pr: PurchaseRequest;
  vendors: Vendor[];
  onConvertToPOs: (draftPurchaseOrders: DraftPurchaseOrder[]) => void;
  onReject: () => void;
  convertLoading: boolean;
  rejectLoading: boolean;
  departmentName?: string | null;
  workflowSteps: WorkflowStep[];
}) {
  const lineItems = useMemo<PurchaseRequestLineItemType[]>(() => pr.lineItems || [], [pr.lineItems]);
  const currency = pr.currency || "USD";
  const user = useAuthStore(s => s.user);
  const totalAmount = pr.totalAmount || 0;

  // ── Single source of truth: lineItemId → vendorId ─────────────────────
  const [vendorMap, setVendorMap] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    lineItems.forEach(li => { init[li.purchaseRequestLineItemId] = ""; });
    return init;
  });

  const assignVendor = (lineItemId: string, vendorId: string) =>
    setVendorMap(prev => ({ ...prev, [lineItemId]: vendorId }));

  const removeFromGroup = (lineItemId: string) =>
    setVendorMap(prev => ({ ...prev, [lineItemId]: "" }));

  const ungroupAllForVendor = (vendorId: string) =>
    setVendorMap(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => { if (next[id] === vendorId) next[id] = ""; });
      return next;
    });

  // ── Derived state ─────────────────────────────────────────────────────
  const vendorGroups = useMemo(() => {
    const map = new Map<string, PurchaseRequestLineItemType[]>();
    lineItems.forEach(li => {
      const vId = vendorMap[li.purchaseRequestLineItemId];
      if (!vId) return;
      if (!map.has(vId)) map.set(vId, []);
      map.get(vId)!.push(li);
    });
    return map;
  }, [vendorMap, lineItems]);

  const unassignedItems = lineItems.filter(li => !vendorMap[li.purchaseRequestLineItemId]);
  const assignedCount = lineItems.length - unassignedItems.length;
  const poCount = vendorGroups.size;
  const readyToCreate = unassignedItems.length === 0 && poCount > 0;

  const [vendorDetails, setVendorDetails] = useState<Record<string, { deliveryDate: string; notes: string }>>({});

  const vendorIdList = Array.from(vendorGroups.keys());
  const accentFor = (vendorId: string) =>
    CARD_ACCENTS[vendorIdList.indexOf(vendorId) % CARD_ACCENTS.length];

  const defaultDate = pr.neededByDate ? pr.neededByDate.split("T")[0] : "";

  const handleCreate = () => {
    if (unassignedItems.length > 0) {
      toast.error(`${unassignedItems.length} item(s) still have no vendor assigned`);
      return;
    }
    const draftPurchaseOrders: DraftPurchaseOrder[] = [];
    let missingDate = false;
    vendorGroups.forEach((items, vId) => {
      const details = vendorDetails[vId];
      const deliveryDate = details?.deliveryDate || defaultDate;
      if (!deliveryDate) missingDate = true;
      draftPurchaseOrders.push({
        vendorId: vId,
        deliveryDate: deliveryDate,
        notes: details?.notes || undefined,
        lineItems: items.map(i => ({ purchaseRequestLineItemId: i.purchaseRequestLineItemId }))
      });
    });
    if (draftPurchaseOrders.length === 0) { toast.error("No items to create PO from"); return; }
    if (missingDate) { toast.error("Please specify a delivery date for all vendor groups"); return; }
    onConvertToPOs(draftPurchaseOrders);
  };

  const ItemRow = ({
    item,
    inGroup,
    vendorId,
    accent,
  }: {
    item: PurchaseRequestLineItemType;
    inGroup: boolean;
    vendorId: string;
    accent?: typeof CARD_ACCENTS[0];
  }) => (
    <tr className={`border-b border-border/30 last:border-0 transition-colors hover:bg-muted/10 ${inGroup && accent ? accent.rowAccent : ""}`}>
      <td className="px-4 py-3">
        <p className="font-semibold text-foreground text-sm leading-tight">{item.name}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">{item.description}</p>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{item.quantity}</td>
      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{formatAmount(item.unitPrice, currency)}</td>
      <td className="px-4 py-3 text-sm font-semibold text-foreground whitespace-nowrap">{formatAmount(item.subtotal, currency)}</td>
      <td className="px-4 py-3 min-w-[180px]">
        <VendorSelect
          value={vendorId}
          onChange={v => assignVendor(item.purchaseRequestLineItemId, v)}
          vendors={vendors}
        />
      </td>
      {inGroup && (
        <td className="px-2 py-3">
          <button
            onClick={() => removeFromGroup(item.purchaseRequestLineItemId)}
            title="Move back to Unassigned"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </td>
      )}
      {!inGroup && <td className="px-2 py-3" />}
    </tr>
  );


  return (
    <div className="flex flex-col max-w-6xl mx-auto pb-24">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{pr.requestNumber}</h1>
            <StatusBadge status={pr.status} approvalStatus={pr.approvalStatus} />
          </div>
          {pr.title && <p className="text-sm text-muted-foreground mt-1">{pr.title}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
          <button onClick={onReject} disabled={rejectLoading}
            className="h-9 px-4 rounded-lg border border-red-400 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-60 flex items-center gap-1.5">
            {rejectLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Reject Request
          </button>
          <button
            onClick={handleCreate}
            disabled={!readyToCreate || convertLoading}
            className="h-9 px-5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
          >
            {convertLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Convert to {poCount} Purchase Order{poCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-start flex-1 min-h-0">
        {/* ── Left ─────────────────────────────────────────────────────── */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Info cards */}
          <div className="flex gap-4">
            <InfoCard label="Department" value={departmentName || pr.departmentId || "—"} />
            <InfoCard label="Priority" value={PRIORITY_LABELS[pr.priority] || pr.priority} />
            <InfoCard label="Expected Date" value={formatDate(pr.neededByDate)} />
          </div>

          {/* Instructions */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-sky-50 border border-sky-200">
            <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-white text-[10px] font-bold">i</span>
            </div>
            <p className="text-sm text-sky-800 leading-relaxed">
              Assign a <strong>vendor</strong> to each line item. Items sharing the same vendor are
              automatically grouped into <strong>one Purchase Order</strong>. Different vendors create separate POs.
            </p>
          </div>

          {/* Progress */}
          <div className="bg-white rounded-xl border border-border px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Vendor assignment progress</span>
              <span className="text-xs font-semibold text-foreground">{assignedCount} / {lineItems.length} items assigned</span>
            </div>
            <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: lineItems.length ? `${(assignedCount / lineItems.length) * 100}%` : "0%" }}
              />
            </div>
            {poCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                <span className="font-semibold text-foreground">{poCount}</span>{" "}
                Purchase Order{poCount > 1 ? "s" : ""} will be created
              </p>
            )}
          </div>

          {/* No vendors onboarded */}
          {vendors.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-6 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No vendors onboarded yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  You need at least one approved vendor before creating a Purchase Order.
                  Onboard a vendor first, then return here to complete this step.
                </p>
              </div>
            </div>
          )}

          {vendors.length > 0 && (
            <div className="space-y-4">
              {/* ── Vendor Group Cards ──────────────────────────────────── */}
              {Array.from(vendorGroups.entries()).map(([vendorId, groupItems]) => {
                const vendor = vendors.find(v => v.vendorId === vendorId);
                const accent = accentFor(vendorId);
                const groupTotal = groupItems.reduce((s, li) => s + (li.subtotal || 0), 0);

                return (
                  <div key={vendorId} className={`rounded-2xl border-2 bg-white overflow-visible ${accent.border}`}>
                    {/* Card header */}
                    <div className={`px-5 py-3 flex items-center justify-between rounded-t-xl ${accent.header}`}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${accent.dot}`} />
                        <div>
                          <p className="text-sm font-bold text-foreground leading-tight">{vendor?.displayName || vendor?.legalName || vendorId}</p>
                          {vendor?.email && <p className="text-xs text-muted-foreground">{vendor.email}</p>}
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${accent.badge}`}>
                          {groupItems.length} item{groupItems.length > 1 ? "s" : ""} · 1 PO
                        </span>
                        {groupTotal > 0 && (
                          <span className="text-xs font-semibold text-foreground">
                            · {formatAmount(groupTotal, currency)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => ungroupAllForVendor(vendorId)}
                        title="Move all items back to Unassigned"
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 transition-colors shrink-0"
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        Ungroup All
                      </button>
                    </div>
                    {/* Setup PO Details */}
                    <div className="px-5 py-3 border-b border-border/50 bg-white grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">Delivery Date <span className="text-red-500">*</span></label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button type="button" className={`w-full h-8 px-3 rounded-md border text-xs flex items-center justify-between transition-colors focus:outline-none focus:border-primary ${!(vendorDetails[vendorId]?.deliveryDate || defaultDate) ? "text-muted-foreground border-border" : "text-foreground border-border/80"}`}>
                                  {(vendorDetails[vendorId]?.deliveryDate || defaultDate) ? format(new Date(vendorDetails[vendorId]?.deliveryDate || defaultDate), "PPP") : "Pick a date"}
                                  <CalendarIcon className="w-3.5 h-3.5 ml-1.5 opacity-50 shrink-0" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarPicker
                                  mode="single"
                                  selected={(vendorDetails[vendorId]?.deliveryDate || defaultDate) ? new Date(vendorDetails[vendorId]?.deliveryDate || defaultDate) : undefined}
                                  onSelect={(d) => {
                                    if (!d) return;
                                    setVendorDetails(p => ({...p, [vendorId]: { ...(p[vendorId] || {notes:""}), deliveryDate: format(d, "yyyy-MM-dd") }}));
                                  }}
                                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">Notes <span className="text-muted-foreground/60 font-normal">(optional)</span></label>
                            <input 
                                type="text" 
                                className="w-full h-8 px-2 text-sm border rounded-md focus:outline-none focus:border-primary" 
                                placeholder="e.g. Hardware for new hires"
                                value={vendorDetails[vendorId]?.notes || ""} 
                                onChange={e => setVendorDetails(p => ({...p, [vendorId]: { ...(p[vendorId] || {deliveryDate:""}), notes: e.target.value }}))} 
                            />
                        </div>
                    </div>
                    {/* Items table */}
                    <div className="bg-white overflow-visible">
                      <table className="w-full text-sm">
                        <PurchaseRequestTableHead />
                        <tbody>
                          {groupItems.map(item => (
                            <ItemRow
                              key={item.purchaseRequestLineItemId}
                              item={item}
                              inGroup
                              vendorId={vendorId}
                              accent={accent}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {/* ── Unassigned Pool ─────────────────────────────────────── */}
              {unassignedItems.length > 0 && (
                <div className="rounded-2xl border-2 border-dashed border-border bg-white overflow-visible">
                  <div className="px-5 py-3 bg-muted/20 flex items-center justify-between rounded-t-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                      <p className="text-sm font-semibold text-muted-foreground">Unassigned Items</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                        {unassignedItems.length} item{unassignedItems.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Assign a vendor to proceed
                    </span>
                  </div>
                  <div className="bg-white overflow-visible">
                    <table className="w-full text-sm">
                      <PurchaseRequestTableHead />
                      <tbody>
                        {unassignedItems.map(item => (
                          <ItemRow
                            key={item.purchaseRequestLineItemId}
                            item={item}
                            inGroup={false}
                            vendorId=""
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* All assigned confirmation */}
              {unassignedItems.length === 0 && poCount > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-sm text-emerald-800">
                    All items assigned. Ready to create{" "}
                    <strong>{poCount} Purchase Order{poCount > 1 ? "s" : ""}</strong>.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ───────────────────────────────────────────────────── */}
        <div className="w-[300px] shrink-0 space-y-4">
          <div className="bg-[#1C2B36] rounded-2xl p-5 text-white space-y-4">
            <h3 className="text-sm font-semibold">Request Summary</h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">Total Items</span>
                <span className="text-sm font-semibold">{lineItems.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">Total Amount</span>
                <span className="text-sm font-semibold">{formatAmount(totalAmount, currency)}</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">Assigned</span>
                <span className={`text-sm font-semibold ${assignedCount === lineItems.length ? "text-emerald-400" : "text-amber-400"}`}>
                  {assignedCount} / {lineItems.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-300">POs to create</span>
                <span className="text-sm font-semibold text-violet-300">{poCount}</span>
              </div>
            </div>
          </div>

          {/* PO Breakdown */}
          {poCount > 0 && (
            <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">PO Breakdown</h3>
              <div className="space-y-2.5">
                {Array.from(vendorGroups.entries()).map(([vId, items], idx) => {
                  const vendor = vendors.find(v => v.vendorId === vId);
                  const accent = CARD_ACCENTS[idx % CARD_ACCENTS.length];
                  const gTotal = items.reduce((s, li) => s + (li.subtotal || 0), 0);
                  return (
                    <div key={vId} className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${accent.dot} mt-1.5 shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{vendor?.displayName || vendor?.legalName || vId}</p>
                        <p className="text-xs text-muted-foreground">
                          {items.length} item{items.length > 1 ? "s" : ""} · {formatAmount(gTotal, currency)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Workflow Progress</h3>
            <WorkflowProgress steps={workflowSteps.map(step => {
              if (step.label === "Converted to PO" && step.status === "inactive") {
                return {
                  ...step,
                  label: "Create PO",
                  person: user ? `${user.firstName || ""} ${user.lastName || ""} (You)` : "You",
                  badge: "Pending",
                  badgeColor: "text-amber-600 bg-amber-50",
                  status: "pending"
                };
              }
              return step;
            })} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// Gate matches the list page and sidebar-constants.tsx — the backend
// requires at least procurement.purchase_request.read_own to view any PR,
// including the user's own.
export default withPermissions(PRDetailPage, [
  { resource: "procurement.purchase_request", action: "read_own" },
  { resource: "procurement.purchase_request", action: "read_department" },
  { resource: "procurement.purchase_request", action: "read_company" },
]);

function PRDetailPage() {
  const params       = useParams();
  const id           = params.id as string;
  const router       = useRouter();
  const searchParams = useSearchParams();
  const can          = useAuthStore(s => s.can);
  const user         = useAuthStore(s => s.user);

  // ── Scope validation: never trust ?scope= blindly from the URL ────────────
  // A user could manually type ?scope=company to try to elevate their view.
  // We re-validate the requested scope against the same permission gates used
  // on the list page before honouring it.
  const hasTeamScopePermission    = can("procurement.purchase_request", "read_department");
  const hasCompanyScopePermission = can("procurement.purchase_request", "read_company");
  const rawScope  = searchParams.get("scope") || "own";
  const scope = (
    rawScope === "company" && hasCompanyScopePermission ? "company" :
    rawScope === "team"    && hasTeamScopePermission    ? "team"    : "own"
  ) as "own" | "team" | "company";

  // Company-scope override unlock state (session-only, resets on navigation)
  const [overrideUnlocked, setOverrideUnlocked] = useState(false);

  const { data, isLoading, isError, refetch } = useGetPurchaseRequestById(id);
  const updatePR = useUpdatePurchaseRequest(id);
  const addLineItem = useAddLineItem(id);
  const deleteLineItem = useDeleteLineItem(id);
  const submitPR = useSubmitPurchaseRequest(id);
  const withdrawPR = useWithdrawPurchaseRequest(id);
  const approvePR = useApprovePurchaseRequest(id);
  const rejectPR = useRejectPurchaseRequest(id);
  const convertToPO = useConvertToPO(id);
  const deletePR = useDeletePurchaseRequest(id);
  const canChangeDept = can("procurement.purchase_request", "manage") || can("department", "manage");
  const { data: deptData } = useGetAllDepartmentsApi({ enabled: canChangeDept });
  const canCreatePOAccess = can("procurement.purchase_request", "convert_to_po") || can("procurement.purchase_order", "create");
  const { data: vendorData } = useGetVendors({ enabled: canCreatePOAccess });
  const { data: catData } = useGetProcurementCategories();

  const [editingLineItem, setEditingLineItem] = useState<PurchaseRequestLineItem | null>(null);
  const updateLineItemHook = useUpdateLineItem(id, editingLineItem?.purchaseRequestLineItemId || "");
  const [modal, setModal] = useState<"submit" | "withdraw" | "reject" | "approve" | "add_item" | "edit_header" | "delete_item" | "delete_pr" | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const pr: PurchaseRequestDetail | undefined = data?.data;
  const departments = (deptData?.data || []).map(d => ({ label: d.departmentName, value: d.departmentId }));
  
  // Try to find the category name across all parent and child categories
  const allCategories = useMemo(() => {
    const rawCategories = catData?.data || [];
    return rawCategories.flatMap(c => [c, ...(c.children || [])]);
  }, [catData]);

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return null;
    const cat = allCategories.find(c => c.categoryId === categoryId);
    return cat ? cat.name : "Category";
  };

  const departmentOptions = pr
    ? mergeDepartmentOption(departments, pr, user)
    : departments;

  const deptNameFallback = pr ? resolveDepartmentLabel(pr, departmentOptions, user) : "—";

  const vendors: Vendor[] = vendorData?.data || [];
  const currency = pr?.currency || "USD";

  // ── Status flags ─────────────────────────────────────────────────────────
  const isDraft     = pr?.status === "draft";
  const isSubmitted = pr?.status === "submitted";
  const isApproved  = pr?.status === "approved" || pr?.status === "partially_converted";
  const _isLocked    = !isDraft; // once submitted, editing is locked

  // ── Permission gates ──────────────────────────────────────────────────────
  const isOwnScope     = scope === "own";
  const isTeamScope    = scope === "team";
  const isCompanyScope = scope === "company";

  // True if the currently logged-in user is the requester of THIS specific PR —
  // regardless of which scope tab they navigated from. A user with company-wide
  // approve permission could still open their own request via the team/company
  // tab; this flag ensures self-approval is blocked everywhere, matching the
  // backend's rejection of self-approval.
  const isOwnRequest = !!user?.userId && !!pr?.requesterId && user.userId === pr.requesterId;

  // Edit/manage own draft — only meaningful on own scope
  const canEdit   = isDraft && can("procurement.purchase_request", "update_own_draft");
  const canSubmit = isDraft && (pr?.lineItems?.length || 0) > 0 && can("procurement.purchase_request", "submit");

  // Approve/Reject base permission
  const hasApprovePermission = can("procurement.purchase_request", "approve") ||
    can("procurement.purchase_request", "approve_department") ||
    can("procurement.purchase_request", "approve_company");

  // Withdraw: owner can withdraw their own request; admin can withdraw via override on company scope.
  // Uses a dedicated "withdraw" permission rather than re-using "submit" — they are distinct actions.
  const canWithdraw = (isDraft || isSubmitted || isApproved) && (
    (isOwnScope && (can("procurement.purchase_request", "withdraw") || can("procurement.purchase_request", "submit"))) ||
    (isCompanyScope && overrideUnlocked && hasApprovePermission)
  );

  // On own scope — never show approve/reject
  // On team/company scope — show if permission + submitted, AND the viewer is not the requester
  // (the backend rejects self-approval, so the UI must not offer it either)
  const canApprove = !isOwnScope && !isOwnRequest && isSubmitted && hasApprovePermission &&
    (isTeamScope || (isCompanyScope && overrideUnlocked));
  const _canReject  = canApprove;

  // Create PO: available on team/company scope regardless of override state
  const canCreatePO = !isOwnScope && isApproved && (
    can("procurement.purchase_request", "convert_to_po") ||
    can("procurement.purchase_order", "create")
  );

  // Whether to show the lock/unlock override banner.
  // Never show it on the requester's own request — there is nothing to override
  // since self-approval is not permitted regardless of unlock state.
  const showOverrideBanner = isCompanyScope && isSubmitted && hasApprovePermission && !isOwnRequest;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleEditHeader = async (payload: Partial<CreatePurchaseRequestPayload>) => {
    try {
      await updatePR.mutateAsync(payload);
      setModal(null);
      toast.success("Request details updated");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to update"));
    }
  };

  const handleAddItem = async (payload: LineItemPayload) => {
    try {
      await addLineItem.mutateAsync({ lineItems: [cleanLineItemPayload(payload)] });
      setModal(null);
      toast.success("Item added");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to add item"));
    }
  };

  const handleEditItem = async (payload: LineItemPayload) => {
    try {
      await updateLineItemHook.mutateAsync(payload);
      setEditingLineItem(null);
      setModal(null);
      toast.success("Item updated");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to update item"));
    }
  };

  const handleDeleteItem = async (lineItemId: string) => {
    try {
      await deleteLineItem.mutateAsync(lineItemId);
      toast.success("Item removed");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to delete item"));
    }
  };

  const handleDeletePR = async () => {
    try {
      await deletePR.mutateAsync();
      setModal(null);
      toast.success("Draft request deleted");
      router.push("/procurement/purchase-request");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to delete request"));
    }
  };

  const handleSubmit = async () => {
    try {
      await submitPR.mutateAsync();
      setModal(null);
      toast.success("Purchase request submitted for review!");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to submit"));
    }
  };

  const handleWithdraw = async (reason: string) => {
    try {
      await withdrawPR.mutateAsync({ reason });
      setModal(null);
      toast.success("Purchase request withdrawn");
      router.push("/procurement/purchase-request");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to withdraw"));
    }
  };

  const handleApprove = async () => {
    try {
      await approvePR.mutateAsync();
      setModal(null);
      toast.success("Purchase request approved!");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to approve"));
    }
  };

  const handleReject = async (reason: string) => {
    try {
      await rejectPR.mutateAsync({ reason });
      setModal(null);
      toast.success("Purchase request rejected");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to reject"));
    }
  };

  const handleConvertToPOs = async (draftPurchaseOrders: DraftPurchaseOrder[]) => {
    try {
      await convertToPO.mutateAsync({ draftPurchaseOrders });
      toast.success("Purchase orders created successfully!");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to create purchase orders"));
    }
  };

  // ── Workflow steps ────────────────────────────────────────────────────────

  const workflowSteps: WorkflowStep[] = pr ? (() => {
    if (pr.timeline && pr.timeline.length > 0) {
      const eventsByAction: Record<string, any> = {};
      pr.timeline.forEach(event => {
        eventsByAction[event.action] = event;
      });

      const formatPerson = (event: any): string | undefined => {
        if (!event || !event.performedBy) return undefined;
        const performedByName = `${event.performedBy.firstName || ""} ${event.performedBy.lastName || ""}`.trim();
        if (!performedByName) return undefined;
        const roleName = event.performedBy.roleName || "";
        
        const loggedInName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "";
        
        if (user && performedByName === loggedInName) {
          return roleName ? `You (${roleName})` : "You";
        }
        
        return roleName ? `${performedByName} (${roleName})` : performedByName;
      };

      const submitEvent = eventsByAction["submitted"];
      const step1: WorkflowStep = submitEvent ? {
        label: "Submitted",
        person: formatPerson(submitEvent),
        timestamp: formatTs(submitEvent.timestamp),
        status: "done"
      } : { label: "Submitted", status: "inactive" };

      const reviewEvent = eventsByAction["under_review"];
      const step2: WorkflowStep = reviewEvent ? {
        label: "Under Review",
        person: formatPerson(reviewEvent),
        timestamp: formatTs(reviewEvent.timestamp),
        status: "done"
      } : { label: "Under Review", status: "inactive" };

      const approveEvent = eventsByAction["approved"] || eventsByAction["rejected"] || eventsByAction["declined"];
      const step3: WorkflowStep = approveEvent ? {
        label: approveEvent.action === "rejected" || approveEvent.action === "declined" ? "Manager Rejected" : "Manager Approved",
        person: formatPerson(approveEvent),
        timestamp: formatTs(approveEvent.timestamp),
        badge: approveEvent.action === "rejected" || approveEvent.action === "declined" ? "Rejected" : "Approved",
        badgeColor: approveEvent.action === "rejected" || approveEvent.action === "declined" ? "text-red-500 bg-red-50" : "text-emerald-600 bg-emerald-50",
        status: "done"
      } : { label: "Manager Approved", status: "inactive" };

      const poEvent = eventsByAction["converted_to_po"] || eventsByAction["partially_converted"];
      const withdrawEvent = eventsByAction["withdrawn"] || eventsByAction["cancelled"];
      
      let step4: WorkflowStep;
      if (withdrawEvent) {
        step4 = {
          label: "Withdrawn",
          person: formatPerson(withdrawEvent),
          timestamp: formatTs(withdrawEvent.timestamp),
          badge: "Withdrawn",
          badgeColor: "text-red-500 bg-red-50",
          status: "done"
        };
      } else {
        step4 = poEvent ? {
          label: "Converted to PO",
          person: formatPerson(poEvent),
          timestamp: formatTs(poEvent.timestamp),
          status: "done"
        } : { 
          label: pr.status === "cancelled" ? "Withdrawn" : "Converted to PO", 
          status: "inactive" 
        };
      }

      return [step1, step2, step3, step4];
    }

    const submittedStatuses = ["submitted", "approved", "rejected", "partially_converted", "converted_to_po", "cancelled"];
    const approvedStatuses = ["approved", "partially_converted", "converted_to_po"];
    const poCreatedStatuses = ["partially_converted", "converted_to_po"];

    const isSubmittedOrBeyond = submittedStatuses.includes(pr.status);
    const isApprovedOrBeyond  = approvedStatuses.includes(pr.status);
    const isPOCreated          = poCreatedStatuses.includes(pr.status);

    return [
      {
        label: pr.status === "draft" ? "Created by" : "Submitted by",
        person: pr.createdAt ? `${getRequesterName(pr)} (${getRoleName(pr.creator || pr.employee || user)})` : undefined,
        timestamp: formatTs(pr.createdAt),
        status: "done" as StepStatus,
      },
      {
        label: "Under Review",
        status: (isSubmittedOrBeyond ? "done" : "inactive") as StepStatus,
        timestamp: isSubmittedOrBeyond ? formatTs(pr.updatedAt) : undefined,
      },
      {
        label: "Manager Approved",
        person: pr.approvedBy ? `${pr.approvedBy.firstName} ${pr.approvedBy.lastName}` : undefined,
        badge: pr.status === "rejected" ? "Rejected" : isApprovedOrBeyond ? "Approved" : undefined,
        badgeColor: pr.status === "rejected" ? "text-red-500 bg-red-50" : "text-emerald-600 bg-emerald-50",
        status: (isApprovedOrBeyond ? "done" : isSubmittedOrBeyond ? "pending" : "inactive") as StepStatus,
        timestamp: isApprovedOrBeyond ? formatTs(pr.approvedAt || pr.updatedAt) : undefined,
      },
      {
        label: pr.status === "cancelled" ? "Withdrawn" : "Converted to PO",
        status: (pr.status === "cancelled" ? "done" : isPOCreated ? "done" : "inactive") as StepStatus,
        badge: pr.status === "cancelled" ? "Withdrawn" : undefined,
        badgeColor: pr.status === "cancelled" ? "text-red-500 bg-red-50" : undefined,
      },
    ];
  })() : [];

  // ── Loading / error states ────────────────────────────────────────────────

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

  // ── If user has create PO permission and PR is approved → show PO creation view ──
  if (canCreatePO) {
    return (
      <>
        {modal === "reject" && (
          <RejectModal
            onClose={() => setModal(null)}
            onConfirm={handleReject}
            loading={rejectPR.isPending}
          />
        )}
        <CreatePOView
          pr={pr}
          vendors={vendors}
          onConvertToPOs={handleConvertToPOs}
          onReject={() => setModal("reject")}
          convertLoading={convertToPO.isPending}
          rejectLoading={rejectPR.isPending}
          departmentName={deptNameFallback}
          workflowSteps={workflowSteps}
        />
      </>
    );
  }

  const lineItems = pr.lineItems || [];

  // ── Standard detail view ──────────────────────────────────────────────────
  return (
    <>
      {/* Modals */}
      {modal === "submit" && (
        <ConfirmModal
          title="Submit Request"
          message={<>You are submitting <strong>{pr.title}</strong> for approval. Once submitted, items cannot be edited.</>}
          confirmLabel="Submit Request"
          loading={submitPR.isPending}
          onClose={() => setModal(null)}
          onConfirm={handleSubmit}
        />
      )}
      {modal === "delete_item" && itemToDelete && (
        <ConfirmModal
          title="Remove Item"
          message={<>Are you sure you want to remove <strong>{itemToDelete.name}</strong> from the request?</>}
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
      {modal === "delete_pr" && (
        <ConfirmModal
          title="Delete Draft Request"
          message={<>Are you sure you want to delete <strong>{pr.title}</strong>? This action cannot be undone.</>}
          confirmLabel="Delete Request"
          danger
          loading={deletePR.isPending}
          onClose={() => setModal(null)}
          onConfirm={handleDeletePR}
        />
      )}
      {modal === "withdraw" && (
        <WithdrawModal
          onClose={() => setModal(null)}
          onConfirm={handleWithdraw}
          loading={withdrawPR.isPending}
        />
      )}
      {modal === "reject" && (
        <RejectModal
          onClose={() => setModal(null)}
          onConfirm={handleReject}
          loading={rejectPR.isPending}
        />
      )}
      {modal === "approve" && (
        <ConfirmModal
          title="Approve Request"
          message={<>You are approving <strong>{pr.title}</strong>. This will move the request to the procurement team for PO creation.</>}
          confirmLabel="Approve Request"
          loading={approvePR.isPending}
          onClose={() => setModal(null)}
          onConfirm={handleApprove}
        />
      )}
      {(modal === "add_item" || (modal === null && editingLineItem)) && (
        <LineItemModal
          onClose={() => { setModal(null); setEditingLineItem(null); }}
          onSave={editingLineItem ? handleEditItem : handleAddItem}
          initial={editingLineItem ? {
            name: editingLineItem.name, description: editingLineItem.description || "",
            categoryId: editingLineItem.categoryId || "", categoryName: "",
            departmentId: editingLineItem.departmentId || "",
            quantity: editingLineItem.quantity, unitPrice: editingLineItem.unitPrice,
            taxAmount: editingLineItem.taxAmount, sku: editingLineItem.sku || "",
            unitOfMeasure: editingLineItem.unitOfMeasure || "unit",
          } : undefined}
          loading={addLineItem.isPending || updateLineItemHook.isPending}
          departments={departmentOptions}
          currency={pr.currency || "USD"}
        />
      )}
      {modal === "edit_header" && (
        <EditHeaderModal
          pr={pr}
          onClose={() => setModal(null)}
          onSave={handleEditHeader}
          loading={updatePR.isPending}
          departments={departmentOptions}
        />
      )}

      <div className="flex flex-col h-full max-w-6xl mx-auto pb-4">
        {/* Global Page Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{pr.requestNumber}</h1>
              <StatusBadge status={pr.status} approvalStatus={pr.approvalStatus} isOwnRequest={isOwnRequest} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">{pr.title}</p>
            {pr.description && <p className="text-xs text-muted-foreground mt-0.5">{pr.description}</p>}
          </div>

          {/* Action buttons — permission gated */}
          {(canEdit || canSubmit || canApprove || canWithdraw) && (
            <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
              {canEdit && (
                <>
                  <button onClick={() => setModal("edit_header")}
                    className="h-9 px-4 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted/40 transition-colors flex items-center gap-2">
                    <Pencil className="w-3.5 h-3.5" /> Edit Request
                  </button>
                  <button onClick={() => setModal("delete_pr")}
                    className="h-9 px-4 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 hover:border-red-300 transition-colors flex items-center gap-2">
                    <Trash2 className="w-3.5 h-3.5" /> Delete Draft
                  </button>
                </>
              )}
              {canSubmit && (
                <button onClick={() => setModal("submit")} disabled={(pr?.lineItems?.length || 0) === 0}
                  className="h-9 px-5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed">
                  Submit Request
                </button>
              )}
              {canApprove && (
                <button onClick={() => setModal("reject")}
                  className="h-9 px-4 rounded-lg border border-red-400 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
                  Reject Request
                </button>
              )}
              {canApprove && (
                <button onClick={() => setModal("approve")}
                  className="h-9 px-5 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                  Approve Request
                </button>
              )}
              {canWithdraw && (
                <button onClick={() => setModal("withdraw")}
                  className="h-9 px-4 rounded-lg border border-red-400 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-2">
                  {withdrawPR.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin inline" />}
                  Withdraw Request
                </button>
              )}
            </div>
          )}
        </div>

        {/* Self-approval restriction note — shown to requesters who hold approve
            permission but are viewing their own pending request. Mirrors the
            backend's rejection of self-approval so the UI doesn't offer an
            action that will fail. */}
        {isOwnRequest && isSubmitted && hasApprovePermission && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              You can&apos;t approve or reject your own purchase request. This request is awaiting review from another approver.
            </p>
          </div>
        )}

        {/* 2-Column Content */}
        <div className="flex flex-1 gap-6 items-start min-h-0">
          {/* Left Column */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            <div className="shrink-0 space-y-4 mb-4 pr-1">
              {/* Info Cards */}
              <div className="flex gap-4">
                <InfoCard label="Department" value={deptNameFallback} />
                <InfoCard label="Priority" value={PRIORITY_LABELS[pr.priority] || pr.priority} />
                <InfoCard label="Expected Date" value={formatDate(pr.neededByDate)} />
                <InfoCard label="Currency" value={pr.currency} />
              </div>
            </div>

            {/* Line Items — grouped by converted PO if available, otherwise flat table */}
            {(() => {
              const purchaseOrders = (pr as PurchaseRequestDetail).purchaseOrders || [];
              const hasPOGroups = purchaseOrders.length > 0 && purchaseOrders.some(po => (po.lineItems || []).length > 0);
              const hasResolvedVendors = lineItems.some(li => li.resolvedVendorId);
              const showGroupedView = hasPOGroups || ((pr.status === "converted_to_po" || pr.status === "partially_converted") && hasResolvedVendors);

              if (showGroupedView) {
                const poAccents = [
                  { border: "border-violet-300", header: "bg-violet-50 border-b border-violet-200", badge: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
                  { border: "border-emerald-300", header: "bg-emerald-50 border-b border-emerald-200", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
                  { border: "border-sky-300", header: "bg-sky-50 border-b border-sky-200", badge: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
                  { border: "border-amber-300", header: "bg-amber-50 border-b border-amber-200", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
                  { border: "border-pink-300", header: "bg-pink-50 border-b border-pink-200", badge: "bg-pink-100 text-pink-700", dot: "bg-pink-500" },
                  { border: "border-teal-300", header: "bg-teal-50 border-b border-teal-200", badge: "bg-teal-100 text-teal-700", dot: "bg-teal-500" },
                ];

                let displayGroups: Array<{
                  id: string;
                  vendorName: string;
                  poNumber?: string;
                  deliveryDate?: string;
                  status?: string;
                  lineItems: typeof lineItems;
                }> = [];

                if (hasPOGroups) {
                  const lineItemById = new Map(lineItems.map(li => [li.purchaseRequestLineItemId, li]));
                  displayGroups = purchaseOrders.map((po, idx) => ({
                    id: po.purchaseOrderId || String(idx),
                    vendorName: po.vendor?.displayName || po.vendor?.legalName || po.vendorId || "Unknown Vendor",
                    poNumber: po.poNumber,
                    deliveryDate: po.deliveryDate,
                    status: po.status,
                    lineItems: (po.lineItems || []).map(pli => lineItemById.get(pli.purchaseRequestLineItemId)).filter(Boolean) as typeof lineItems,
                  }));
                } else {
                  const groupsByVendor = new Map<string, typeof lineItems>();
                  const unassignedItems: typeof lineItems = [];
                  lineItems.forEach(li => {
                    const vId = li.resolvedVendorId;
                    if (vId) {
                      if (!groupsByVendor.has(vId)) groupsByVendor.set(vId, []);
                      groupsByVendor.get(vId)!.push(li);
                    } else {
                      unassignedItems.push(li);
                    }
                  });
                  displayGroups = Array.from(groupsByVendor.entries()).map(([vId, items]) => {
                    const vendor = vendors.find(v => (v as any).id === vId || v.vendorId === vId);
                    return {
                      id: vId,
                      vendorName: vendor?.displayName || vendor?.legalName || "Vendor", // fallback name since we might just have ID
                      lineItems: items,
                    };
                  });
                  if (unassignedItems.length > 0) {
                    displayGroups.push({
                      id: "unassigned",
                      vendorName: "Unassigned Items",
                      lineItems: unassignedItems,
                    });
                  }
                }

                return (
                  <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-foreground">Assigned Vendors</h2>
                      <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-gray-100 text-xs font-semibold px-1.5">
                        {displayGroups.length}
                      </span>
                    </div>
                    {displayGroups.map((group, idx) => {
                      const isUnassigned = group.id === "unassigned";
                      const accent = isUnassigned 
                        ? { border: "border-gray-300", header: "bg-gray-50 border-b border-gray-200", badge: "bg-gray-200 text-gray-700", dot: "bg-gray-400" } 
                        : poAccents[idx % poAccents.length];
                      const poTotal = group.lineItems.reduce((s, li) => s + (li.subtotal || 0), 0);

                      return (
                        <div key={group.id} className={`rounded-2xl border-2 bg-white overflow-hidden ${accent.border}`}>
                          {/* PO Card Header */}
                          <div className={`px-5 py-3 flex items-center justify-between ${accent.header}`}>
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${accent.dot}`} />
                              <div>
                                <p className="text-sm font-bold text-foreground">{group.vendorName}</p>
                                {group.poNumber && <p className="text-xs text-muted-foreground">{group.poNumber}</p>}
                              </div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${accent.badge}`}>
                                {group.lineItems.length} item{group.lineItems.length !== 1 ? "s" : ""}
                              </span>
                              {poTotal > 0 && <span className="text-xs font-semibold text-foreground">· {formatAmount(poTotal, currency)}</span>}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {group.deliveryDate && (
                                <span>Delivery: <strong className="text-foreground">{formatDate(group.deliveryDate)}</strong></span>
                              )}
                              {group.status && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold capitalize">
                                  {group.status.replace(/_/g, " ")}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* PO Items Table */}
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border/60 bg-white">
                                {["Item", "Description", "Category", "Qty", "Unit Price", "Subtotal"].map(h => (
                                  <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {group.lineItems.map(item => (
                                <tr key={item.purchaseRequestLineItemId} className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
                                  <td className="px-5 py-3 font-semibold text-foreground">{item.name}</td>
                                  <td className="px-5 py-3 text-muted-foreground max-w-[160px] truncate">{item.description || "—"}</td>
                                  <td className="px-5 py-3">
                                    {item.categoryId
                                      ? <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">{getCategoryName(item.categoryId)}</span>
                                      : <span className="text-muted-foreground">—</span>}
                                  </td>
                                  <td className="px-5 py-3 text-foreground">{item.quantity}</td>
                                  <td className="px-5 py-3 text-foreground">{formatAmount(item.unitPrice, currency)}</td>
                                  <td className="px-5 py-3 font-medium text-foreground">{formatAmount(item.subtotal, currency)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                    {/* Grand Total */}
                    <div className="flex justify-end">
                      <div className="space-y-1.5 min-w-[220px] bg-white rounded-xl border border-border px-5 py-4">
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
                  </div>
                );
              }

              // Fallback: flat table (draft / submitted / approved states)
              return (
                <div className="bg-white rounded-2xl border border-border flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    Request Items
                    <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-gray-100 text-xs font-semibold px-1.5">
                      {lineItems.length}
                    </span>
                  </h2>
                  {canEdit && (
                    <button onClick={() => setModal("add_item")}
                      className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                      <Plus className="w-4 h-4" /> Add Item
                    </button>
                  )}
                </div>

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
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-white">
                          <tr className="border-b border-border/60 bg-muted/5 shadow-sm">
                            {["Name", "Description", "Category", "Qty", "Unit Price", "Subtotal", ...(canEdit ? [""] : [])].map(h => (
                              <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map(item => (
                            <tr key={item.purchaseRequestLineItemId} className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
                              <td className="px-5 py-3.5 font-semibold text-foreground">{item.name}</td>
                              <td className="px-5 py-3.5 text-muted-foreground max-w-[180px] truncate">{item.description || "—"}</td>
                              <td className="px-5 py-3.5">
                                {item.categoryId
                                  ? <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">{getCategoryName(item.categoryId)}</span>
                                  : <span className="text-muted-foreground">—</span>
                                }
                              </td>
                              <td className="px-5 py-3.5 text-foreground">{item.quantity}</td>
                              <td className="px-5 py-3.5 text-foreground">{formatAmount(item.unitPrice, currency)}</td>
                              <td className="px-5 py-3.5 font-medium text-foreground">{formatAmount(item.subtotal, currency)}</td>
                              {canEdit && (
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-1">
                                    <div className="relative group">
                                      <button onClick={() => setEditingLineItem(item)}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap text-foreground text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity z-10">Edit item</span>
                                    </div>
                                    <div className="relative group">
                                      <button onClick={() => { setItemToDelete({ id: item.purchaseRequestLineItemId, name: item.name }); setModal("delete_item"); }}
                                        disabled={deleteLineItem.isPending}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap text-foreground text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity z-10">Remove item</span>
                                    </div>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {canEdit && (
                      <div className="shrink-0 px-5 py-3 border-t border-border/40 bg-white">
                        <button onClick={() => setModal("add_item")}
                          className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                          <Plus className="w-4 h-4" /> Add Item
                        </button>
                      </div>
                    )}

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
              );
            })()}
        </div>

        {/* Right Sidebar */}
        <div className="w-[300px] shrink-0 h-full overflow-y-auto pr-1 space-y-4 pb-4">

          {/* Manager Override Banner */}
          {showOverrideBanner && (
            <ManagerOverrideBanner
              isUnlocked={overrideUnlocked}
              onUnlock={() => setOverrideUnlocked(true)}
              onLock={() => setOverrideUnlocked(false)}
            />
          )}

          {/* ── Own scope: dark-header Workflow Progress card only ── */}
          {isOwnScope && (
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="bg-[#1C2B36] rounded-t-2xl px-5 py-4">
                <h3 className="text-base font-bold text-white">Workflow Progress</h3>
              </div>
              <div className="px-5 py-4">
                <WorkflowProgress steps={workflowSteps} />
              </div>
            </div>
          )}

          {/* ── Team/Company scope: Request Summary dark card ── */}
          {!isOwnScope && (
            <div className="bg-[#1C2B36] rounded-2xl p-5 text-white">
              <h3 className="text-base font-bold mb-4">Request Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Total Items</span>
                  <span className="text-sm font-semibold">{lineItems.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Priority</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-medium capitalize">
                    {PRIORITY_LABELS[pr.priority] || pr.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Est. Delivery</span>
                  <span className="text-xs text-gray-200">{formatDate(pr.neededByDate)}</span>
                </div>
                <div className="border-t border-white/10 pt-3">
                  <p className="text-xs text-gray-400">Total Amount</p>
                  <p className="text-xl font-bold mt-0.5">{formatAmount(pr.totalAmount, currency)}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Team/Company scope: bare workflow timeline below summary card ── */}
          {!isOwnScope && (() => {
            const CheckIcon = () => (
              <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            );

            const approvedBy = pr.approvedBy;
            const purchaseOrders = pr.purchaseOrders || [];
            const hasPO = purchaseOrders.length > 0;
            const po = purchaseOrders[0];

            const poCreatorName = (() => {
              const createdBy = po?.createdBy;
              if (isRecord(createdBy)) {
                const firstName = getOptionalString(createdBy.firstName);
                if (firstName) {
                  const name = `${firstName} ${getOptionalString(createdBy.lastName) || ""}`.trim();
                  return `${getRoleName(createdBy)} (${name})`;
                }
              }
              if (typeof createdBy === "string") return `Procurement (${createdBy})`;

              const name = user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Procurement";
              return `${getRoleName(user)} (${name})`;
            })();

            const isPoCreatorSelf = !isRecord(po?.createdBy) && typeof po?.createdBy !== "string";

            // Determine the single "next" step that should show Pending
            const nextStepKey = pr.status === "cancelled" 
              ? null
              : !approvedBy
              ? "manager"
              : !hasPO
              ? "create_po"
              : null;

            // Steps logic
            let steps: Array<{
              key: string;
              label: string;
              done: boolean;
              personName: string | null;
              badge: { text: string; color: string } | null;
              timestamp: string | null;
            }> = [];

            if (pr.timeline && pr.timeline.length > 0) {
              const eventsByAction: Record<string, any> = {};
              pr.timeline.forEach(event => {
                eventsByAction[event.action] = event;
              });

              const formatPerson = (event: any) => {
                if (!event || !event.performedBy) return "System";
                const performedByName = `${event.performedBy.firstName || ""} ${event.performedBy.lastName || ""}`.trim() || "System";
                const roleName = event.performedBy.roleName || "";
                
                const loggedInName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "";
                
                if (user && performedByName === loggedInName) {
                  return roleName ? `You (${roleName})` : "You";
                }
                
                return roleName ? `${performedByName} (${roleName})` : performedByName;
              };

              const submitEvent = eventsByAction["submitted"];
              const reviewEvent = eventsByAction["under_review"];
              const approveEvent = eventsByAction["approved"] || eventsByAction["rejected"] || eventsByAction["declined"];
              const poEvent = eventsByAction["converted_to_po"] || eventsByAction["partially_converted"];
              const withdrawEvent = eventsByAction["withdrawn"] || eventsByAction["cancelled"];

              steps = [
                {
                  key: "submitted",
                  label: submitEvent ? "Submitted by" : "Created by",
                  done: !!submitEvent,
                  personName: submitEvent ? formatPerson(submitEvent) : null,
                  badge: null,
                  timestamp: submitEvent ? formatTs(submitEvent.timestamp) : null,
                },
                {
                  key: "under_review",
                  label: "Under Review",
                  done: !!reviewEvent,
                  personName: reviewEvent ? formatPerson(reviewEvent) : null,
                  badge: null,
                  timestamp: reviewEvent ? formatTs(reviewEvent.timestamp) : null,
                },
                {
                  key: "manager",
                  label: "Manager Approval",
                  done: !!approveEvent,
                  personName: approveEvent ? formatPerson(approveEvent) : null,
                  badge: approveEvent 
                    ? { 
                        text: approveEvent.action === "rejected" || approveEvent.action === "declined" ? "Rejected" : "Approved", 
                        color: approveEvent.action === "rejected" || approveEvent.action === "declined" ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600" 
                      } 
                    : nextStepKey === "manager"
                    ? { text: "Pending", color: "bg-amber-50 text-amber-600" }
                    : null,
                  timestamp: approveEvent ? formatTs(approveEvent.timestamp) : null,
                },
                {
                  key: withdrawEvent ? "withdrawn" : "create_po",
                  label: withdrawEvent ? "Withdrawn" : "Converted to PO",
                  done: !!(poEvent || withdrawEvent),
                  personName: withdrawEvent ? formatPerson(withdrawEvent) : poEvent ? formatPerson(poEvent) : null,
                  badge: withdrawEvent 
                    ? { text: "Withdrawn", color: "bg-red-50 text-red-500" }
                    : poEvent
                    ? { text: "Done", color: "bg-emerald-50 text-emerald-600" }
                    : nextStepKey === "create_po"
                    ? { text: "Pending", color: "bg-amber-50 text-amber-600" }
                    : null,
                  timestamp: withdrawEvent ? formatTs(withdrawEvent.timestamp) : poEvent ? formatTs(poEvent.timestamp) : null,
                },
              ];
            } else {
              // Fallback for requests without timeline array
              steps = [
                {
                  key: "submitted",
                  label: pr.status === "draft" ? "Created by" : "Submitted by",
                  done: true,
                  personName: `${getRequesterName(pr) || "Employee"} (${getRoleName(pr.creator || pr.employee || user)})`.trim(),
                  badge: null,
                  timestamp: formatTs(pr.createdAt),
                },
                {
                  key: "manager",
                  label: "Manager Approval",
                  done: !!approvedBy,
                  personName: approvedBy
                    ? (() => {
                        const appName = `${approvedBy.firstName || ""} ${approvedBy.lastName || ""}`.trim();
                        const appRole = getRoleName(approvedBy);
                        const loggedInName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "";
                        const loggedInRole = user ? getRoleName(user) : "";
                        if (user && appName === loggedInName && appRole === loggedInRole) {
                          return `You (${appRole})`;
                        }
                        return `${appName} (${appRole})`.trim();
                      })()
                    : `You (${getRoleName(user)})`,
                  badge: approvedBy
                    ? { text: "Approved", color: "bg-emerald-50 text-emerald-600" }
                    : nextStepKey === "manager"
                    ? { text: "Pending", color: "bg-amber-50 text-amber-600" }
                    : null,
                  timestamp: approvedBy ? formatTs(pr.approvedAt || pr.updatedAt) : null,
                },
                {
                  key: pr.status === "cancelled" ? "withdrawn" : "create_po",
                  label: pr.status === "cancelled" ? "Withdrawn" : "Converted to PO",
                  done: pr.status === "cancelled" ? true : hasPO,
                  personName: pr.status === "cancelled" ? "System" : (hasPO ? (isPoCreatorSelf ? `${poCreatorName} (You)` : poCreatorName) : null),
                  badge: pr.status === "cancelled"
                    ? { text: "Withdrawn", color: "bg-red-50 text-red-500" }
                    : hasPO
                    ? { text: "Done", color: "bg-emerald-50 text-emerald-600" }
                    : nextStepKey === "create_po"
                    ? { text: "Pending", color: "bg-amber-50 text-amber-600" }
                    : null,
                  timestamp: pr.status === "cancelled" ? formatTs(pr.updatedAt) : (hasPO ? formatTs(po?.createdAt || pr.updatedAt) : null),
                },
              ];
            }

            return (
              <div className="space-y-0 pt-1 pl-1">
                {steps.map((step, idx) => {
                  const isLast = idx === steps.length - 1;
                  const isPending = !step.done && step.badge?.text === "Pending";
                  return (
                    <div key={step.key} className={`flex items-start gap-3 ${!step.done && !isPending ? "opacity-45" : ""}`}>
                      {/* Icon + connector */}
                      <div className="flex flex-col items-center shrink-0 pt-0.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          step.done
                            ? "bg-primary/10"
                            : "bg-muted border border-border"
                        }`}>
                          {step.done
                            ? <CheckIcon />
                            : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                          }
                        </div>
                        {!isLast && (
                          <div className="w-px bg-border/60 flex-1 min-h-[16px] mt-0.5" />
                        )}
                      </div>

                      {/* Content */}
                      <div className={`pb-4 min-w-0 ${isLast ? "pb-0" : ""}`}>
                        <p className={`text-xs font-medium ${step.done ? "text-muted-foreground" : "text-muted-foreground/60"}`}>{step.label}</p>
                        {step.personName && (
                          <p className={`text-sm font-semibold flex items-center gap-1.5 flex-wrap mt-0.5 ${step.done ? "text-foreground" : "text-muted-foreground/60"}`}>
                            {step.personName}
                            {step.badge && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${step.badge.color}`}>
                                {step.badge.text}
                              </span>
                            )}
                          </p>
                        )}
                        {!step.personName && step.badge && (
                          <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${step.badge.color}`}>
                            {step.badge.text}
                          </span>
                        )}
                        {step.timestamp && (
                          <p className="text-xs text-muted-foreground mt-0.5">{step.timestamp}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
    </>
  );
}