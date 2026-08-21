"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ManagerOverrideBanner } from "@/components/procurement/ManagerOverrideBanner";
import {
  Pencil, X, ChevronDown, AlertCircle, Loader2,
  Plus, Trash2, Calendar as CalendarIcon,
  Scissors, Check, Search,
} from "lucide-react";
import LineItemBatchModal from "@/components/procurement/LineItemBatchModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { ProcurementPolicyCheckModal } from "@/components/procurement/ProcurementPolicyCheckModal";
import { format } from "date-fns";
import { useAuthStore } from "@/stores/auth-stores";
import { useAxios } from "@/hooks/useAxios";
import { PROCUREMENT_KEYS } from "@/lib/constants/apis";
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
import { getApiErrorMessage, isProcurementPolicyViolationError, getProcurementPolicyViolations, applyProcurementPolicyErrorToLineItems, type ProcurementPolicyViolation, isRecord, getOptionalString } from "@/lib/types/api-error";
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

function formatAmount(n?: number, currency = "USD") {
  const val = n ?? 0;
  const sym = currency === "USD" ? "$" : currency === "NGN" ? "₦" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency;
  return `${sym}${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  const cfg = PR_STATUS_CFG[displayKey] || PR_STATUS_CFG[status] || { label: status, className: "text-[#68726d] bg-[#f9faf9]" };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-[12px] border border-black/[0.06] p-4 flex-1 border-l-[3px] border-l-emerald-500">
      <p className="text-xs text-[#68726d] mb-1">{label}</p>
      <p className="text-base font-bold text-[#0b100e]">{value}</p>
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
      <div className="w-full h-10 px-3 rounded-lg border border-black/[0.06] bg-[#f9faf9] text-sm flex items-center text-[#0b100e]">
        {selected?.label || value}
      </div>
    );
  }
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full h-10 px-3 rounded-lg border border-black/[0.06] bg-[#f9faf9] text-sm flex items-center justify-between hover:border-[#087f70]/60 focus:outline-none transition-colors">
        <span>{selected?.label || "Select..."}</span>
        <ChevronDown className={`w-4 h-4 text-[#68726d] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 bg-white border border-black/[0.06] rounded-[12px] shadow-lg mt-1 max-h-48 overflow-y-auto">
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
                  ? "bg-[#f0faf8]"
                  : "bg-[#f5f7f6] border border-black/[0.06]"
              }`}>
                {step.status === "done"
                  ? <svg className="w-3 h-3 text-[#087f70]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  : <div className={`w-1.5 h-1.5 rounded-full ${step.status === "pending" ? "bg-amber-400" : "bg-muted-foreground/40"}`} />
                }
              </div>
              {!isLast && (
                <div className="w-px bg-border/60 flex-1 min-h-[16px] mt-0.5" />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 min-w-0 ${isLast ? "pb-0" : ""}`}>
              <p className={`text-xs font-medium ${step.status === "done" ? "text-[#68726d]" : "text-[#84908a]"}`}>{step.label}</p>
              {step.person && (
                <p className={`text-sm font-semibold flex items-center gap-1.5 flex-wrap mt-0.5 ${step.status === "done" || step.status === "pending" ? "text-[#0b100e]" : "text-[#84908a]"}`}>
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
                <p className="text-xs text-[#68726d] mt-0.5">{step.timestamp}</p>
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
      <div className="relative bg-white rounded-[14px] shadow-2xl w-full max-w-sm p-6 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f9faf9] transition-colors">
          <X className="w-4 h-4 text-[#68726d]" />
        </button>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-[#fff5f5] flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-[#d33d44]" />
          </div>
          <h3 className="text-base font-bold text-[#0b100e]">Withdraw Request</h3>
          <p className="text-sm text-[#68726d]">Please provide a reason for withdrawing this purchase request.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#0b100e]">Reason for withdrawal <span className="text-[#d33d44]">*</span></label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="e.g. Requirements have changed, budget re-allocated..."
            className="w-full px-3 py-2.5 rounded-lg border border-black/[0.06] text-sm resize-none focus:outline-none focus:border-[#087f70] transition-colors" />
        </div>
        <button onClick={() => {
          if (!reason.trim()) { toast.error("Please provide a reason"); return; }
          onConfirm(reason.trim());
        }} disabled={loading}
          className="w-full h-11 rounded-[12px] bg-[#d33d44] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 transition-opacity">
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
      <div className="relative bg-white rounded-[14px] shadow-2xl w-full max-w-sm p-6 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f9faf9] transition-colors">
          <X className="w-4 h-4 text-[#68726d]" />
        </button>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-[#fff5f5] flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-[#d33d44]" />
          </div>
          <h3 className="text-base font-bold text-[#0b100e]">Reject Request</h3>
          <p className="text-sm text-[#68726d]">Please provide a reason for rejecting this purchase request.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#0b100e]">Rejection reason <span className="text-[#d33d44]">*</span></label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
            placeholder="e.g. Over budget, needs revision..."
            className="w-full px-3 py-2.5 rounded-lg border border-black/[0.06] text-sm resize-none focus:outline-none focus:border-[#087f70] transition-colors" />
        </div>
        <button onClick={() => {
          if (!reason.trim()) { toast.error("Please provide a reason"); return; }
          onConfirm(reason.trim());
        }} disabled={loading}
          className="w-full h-11 rounded-[12px] bg-[#d33d44] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 transition-opacity">
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
      <div className="relative bg-white rounded-[14px] shadow-2xl w-full max-w-sm mx-4 p-6 space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f9faf9] transition-colors">
          <X className="w-4 h-4 text-[#68726d]" />
        </button>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${danger ? "bg-[#fff5f5]" : "bg-amber-50"}`}>
            <AlertCircle className={`w-7 h-7 ${danger ? "text-[#d33d44]" : "text-amber-500"}`} />
          </div>
          <h3 className="text-base font-bold text-[#0b100e]">{title}</h3>
          <p className="text-sm text-[#68726d]">{message}</p>
        </div>
        <button onClick={onConfirm} disabled={loading}
          className={`w-full h-11 rounded-[12px] text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 ${danger ? "bg-[#d33d44]" : "bg-[#087f70]"}`}>
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
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#68726d]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input ref={searchRef} value={search} onChange={e => { setSearch(e.target.value); setExpandedId(null); }}
                placeholder="Search categories..."
                className="w-full h-8 pl-8 pr-7 text-sm rounded-md border border-black/[0.06] focus:outline-none focus:border-[#087f70] transition-colors bg-white" />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#68726d] hover:text-[#0b100e]">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-[#68726d]" />
            </div>
          ) : q ? (
            <div className="max-h-56 overflow-y-auto py-1">
              {searchResults.length === 0 ? (
                <p className="text-sm text-[#68726d] px-4 py-3 text-center">No matches for &ldquo;{search}&rdquo;</p>
              ) : (
                searchResults.map(r => (
                  <button key={r.id} type="button" onClick={() => { onChange(r.id, r.name); close(); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#f9faf9] transition-colors flex items-baseline gap-2 ${value === r.id ? "text-[#087f70] font-medium" : "text-[#0b100e]"}`}>
                    <span>{r.name}</span>
                    {r.parentName && <span className="text-xs text-[#68726d] font-normal">in {r.parentName}</span>}
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto py-1">
              {rawCategories.length === 0 ? (
                <p className="text-sm text-[#68726d] px-4 py-3">No categories yet</p>
              ) : (
                rawCategories.map(cat => {
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
  departmentId: string; quantity: number; unitPrice?: number;
  taxAmount: number; sku: string; unitOfMeasure: string;
}
const EMPTY_ITEM: ModalItem = {
  name: "", categoryName: "", description: "", categoryId: "", departmentId: "",
  quantity: 0, taxAmount: 0, sku: "", unitOfMeasure: "unit",
};

function safeModalItem(initial?: ModalItem): ModalItem {
  if (!initial) return EMPTY_ITEM;
  return {
    name: initial.name || "",
    categoryName: initial.categoryName || "",
    description: initial.description || "",
    categoryId: initial.categoryId || "",
    departmentId: initial.departmentId || "",
    quantity: initial.quantity || 0,
    unitPrice: initial.unitPrice || 0,
    taxAmount: initial.taxAmount || 0,
    sku: initial.sku || "",
    unitOfMeasure: initial.unitOfMeasure || "unit",
  };
}

function LineItemModal({ onClose, onSave, initial, loading, departments: _departments, currency = "USD" }: {
  onClose: () => void;
  onSave: (d: LineItemPayload) => void;
  initial?: ModalItem;
  loading: boolean;
  departments: { label: string; value: string }[];
  currency?: string;
}) {
  const [form, setForm] = useState<ModalItem>(() => safeModalItem(initial));
  const set = (k: keyof ModalItem, v: string | number | undefined) => setForm(p => ({ ...p, [k]: v }));
  const subtotal = form.quantity * (form.unitPrice || 0);

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
            <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Dell XPS Laptop"
              className="w-full h-11 px-3 rounded-lg border border-black/[0.06] text-sm focus:outline-none focus:border-[#087f70] transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#0b100e]">Category</label>
            <CategoryDropdown value={form.categoryId} onChange={(id, name) => setForm(p => ({ ...p, categoryId: id, categoryName: name }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0b100e]">Quantity <span className="text-[#d33d44]">*</span></label>
              <input type="number" min={1} value={form.quantity || ""} onChange={e => set("quantity", Number(e.target.value))} placeholder="0"
                className="w-full h-11 px-3 rounded-lg border border-black/[0.06] text-sm focus:outline-none focus:border-[#087f70] transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0b100e]">
                Unit Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#68726d] text-sm font-medium">
                  {{ USD: "$", NGN: "₦", EUR: "€", GBP: "£", CAD: "$", AUD: "$" }[currency] || currency}
                </span>
                <input type="number" min={0} value={form.unitPrice ?? ""} onChange={e => set("unitPrice", e.target.value === "" ? undefined : Number(e.target.value))} placeholder="0.00"
                  className="w-full h-11 pl-8 pr-3 rounded-lg border border-black/[0.06] text-sm focus:outline-none focus:border-[#087f70] transition-colors" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#0b100e]">Unit of Measure</label>
            <input type="text" value={form.unitOfMeasure} onChange={e => set("unitOfMeasure", e.target.value)} placeholder="unit / box / kg"
              className="w-full h-11 px-3 rounded-lg border border-black/[0.06] text-sm focus:outline-none focus:border-[#087f70] transition-colors" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#0b100e]">Description <span className="text-[#68726d] font-normal">(optional)</span></label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} placeholder="Brief description of this item"
              className="w-full px-3 py-2.5 rounded-lg border border-black/[0.06] text-sm resize-none focus:outline-none focus:border-[#087f70] transition-colors" />
          </div>
          {subtotal > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-[#f9faf9] rounded-[12px] mt-2">
              <span className="text-sm text-[#68726d]">Line Subtotal</span>
              <span className="text-sm font-semibold text-[#0b100e]">
                {formatAmount(subtotal, currency)}
              </span>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-black/[0.06] bg-white z-10 shrink-0 rounded-b-2xl">
          <button type="button" disabled={loading}
            onClick={() => {
              if (!(form.name || "").trim()) { toast.error("Item name required"); return; }
              if (!form.quantity || form.quantity <= 0) { toast.error("Quantity must be > 0"); return; }
              onSave({
                name: form.name, description: form.description || undefined,
                quantity: form.quantity, unitPrice: form.unitPrice || 0,
                taxAmount: form.taxAmount || undefined, sku: form.sku || undefined,
                unitOfMeasure: form.unitOfMeasure || undefined,
                categoryId: form.categoryId || undefined,
                departmentId: form.departmentId || undefined,
                accountingResolutionStatus: "unresolved",
              });
            }}
            className="w-full h-11 rounded-[12px] bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity">
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
      <div className="relative bg-white rounded-[14px] shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] sticky top-0 bg-white z-10">
          <h3 className="text-base font-bold text-[#0b100e]">Edit Request Details</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f9faf9] transition-colors">
            <X className="w-4 h-4 text-[#68726d]" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#0b100e]">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-black/[0.06] text-sm focus:outline-none focus:border-[#087f70] transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0b100e]">Priority</label>
              <SimpleSelect value={priority} onChange={v => { if (isPRPriorityValue(v)) setPriority(v); }} options={PRIORITIES} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0b100e]">Currency</label>
              <SimpleSelect value={currency} onChange={setCurrency} options={CURRENCIES.map(c => ({ label: c, value: c }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#0b100e]">Need by Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className={`w-full h-10 px-3 rounded-lg border border-black/[0.06] text-sm flex items-center justify-between transition-colors focus:outline-none focus:border-[#087f70] ${!neededByDate ? "text-[#68726d]" : "text-[#0b100e]"}`}>
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
              <label className="text-sm font-medium text-[#0b100e]">Department</label>
              <SimpleSelect value={departmentId} onChange={setDepartmentId} options={departments} disabled={!canChangeDept} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#0b100e]">Description <span className="text-[#68726d] font-normal">(optional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Provide context for this request..."
              className="w-full px-3 py-2.5 rounded-lg border border-black/[0.06] text-sm resize-none focus:outline-none focus:border-[#087f70] transition-colors" />
          </div>
        </div>
        <div className="px-6 pb-6">
          <button type="button" disabled={loading}
            onClick={() => onSave({ title, description: description || undefined, priority, currency, neededByDate, departmentId })}
            className="w-full h-11 rounded-[12px] bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 transition-opacity">
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
        className="w-full h-9 px-3 rounded-lg border border-black/[0.06] bg-white text-sm flex items-center justify-between hover:border-[#087f70]/60 focus:outline-none transition-colors">
        <span className={selected ? "text-[#0b100e]" : "text-[#68726d] text-xs"}>
          {selected ? (selected.displayName || selected.legalName || "Unknown Vendor") : "Select vendor"}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#68726d] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 bg-white border border-black/[0.06] rounded-[12px] shadow-lg mt-1 overflow-hidden" style={{ minWidth: "200px" }}>
          {/* Search input */}
          <div className="px-2 pt-2 pb-1 border-b border-border/40">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#68726d] pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vendor..."
                className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-border/60 bg-[#f9faf9] focus:outline-none focus:border-[#087f70]/60 focus:bg-white transition-colors"
              />
            </div>
          </div>
          {/* Vendor list */}
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-[#68726d] px-4 py-3 text-center">No vendors found</p>
            ) : filtered.map(v => (
              <button key={v.vendorId} type="button" onClick={() => { onChange(v.vendorId); setOpen(false); setSearch(""); }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#f9faf9] transition-colors ${value === v.vendorId ? "text-[#087f70] font-medium bg-[#f0faf8]" : "text-[#0b100e]"}`}>
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
  { border: "border-emerald-300", header: "bg-[#f0faf8] border-b border-emerald-200", badge: "bg-[#e6f5f3] text-[#087f70]", dot: "bg-[#f0faf8]0", rowAccent: "bg-[#f0faf8]/40" },
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
          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-[#68726d] uppercase tracking-wide">{h}</th>
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
  onCancel,
  convertLoading,
  departmentName,
  workflowSteps,
}: {
  pr: PurchaseRequest;
  vendors: Vendor[];
  onConvertToPOs: (draftPurchaseOrders: DraftPurchaseOrder[]) => void;
  onCancel?: () => void;
  convertLoading: boolean;
  departmentName?: string | null;
  workflowSteps: WorkflowStep[];
}) {
  const lineItems = useMemo<PurchaseRequestLineItemType[]>(() => {
    const allItems = pr.lineItems || [];
    return allItems.filter(item => item.conversionStatus !== "converted");
  }, [pr]);
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

  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});

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
  const readyToCreate = poCount > 0;

  const [vendorDetails, setVendorDetails] = useState<Record<string, { deliveryDate: string; notes: string }>>({});

  const vendorIdList = Array.from(vendorGroups.keys());
  const accentFor = (vendorId: string) =>
    CARD_ACCENTS[vendorIdList.indexOf(vendorId) % CARD_ACCENTS.length];

  const defaultDate = pr.neededByDate ? pr.neededByDate.split("T")[0] : "";

  const handleCreate = () => {
    if (poCount === 0) {
      toast.error("Please assign a vendor to at least one item to create a Purchase Order.");
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
        lineItems: items.map(i => ({ 
           purchaseRequestLineItemId: i.purchaseRequestLineItemId,
           unitPrice: priceOverrides[i.purchaseRequestLineItemId] !== undefined && priceOverrides[i.purchaseRequestLineItemId] !== "" 
               ? Number(priceOverrides[i.purchaseRequestLineItemId]) 
               : undefined 
        }))
      });
    });
    if (draftPurchaseOrders.length === 0) { toast.error("No items to create PO from"); return; }
    if (missingDate) { toast.error("Please specify a delivery date for all vendor groups"); return; }
    onConvertToPOs(draftPurchaseOrders);
  };

  const renderItemRow = ({
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
    <tr key={item.purchaseRequestLineItemId} className={`border-b border-border/30 last:border-0 transition-colors hover:bg-[#f9faf9] ${inGroup && accent ? accent.rowAccent : ""}`}>
      <td className="px-4 py-3">
        <p className="font-semibold text-[#0b100e] text-sm leading-tight">{item.name}</p>
        {item.description && (
          <p className="text-xs text-[#68726d] mt-0.5 truncate max-w-[180px]">{item.description}</p>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-[#0b100e] whitespace-nowrap">{item.quantity}</td>
      <td className="px-4 py-3 text-sm text-[#0b100e] whitespace-nowrap">
        <div className="relative w-28">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#68726d] text-xs">{{ USD: "$", NGN: "₦", EUR: "€", GBP: "£", CAD: "$", AUD: "$" }[currency] || currency}</span>
          <input
            type="number"
            min={0}
            className="w-full h-8 pl-6 pr-2 rounded-md border border-black/[0.06] text-xs focus:outline-none focus:border-[#087f70] transition-colors bg-white"
            value={priceOverrides[item.purchaseRequestLineItemId] ?? item.unitPrice ?? ""}
            onChange={e => setPriceOverrides(prev => ({ ...prev, [item.purchaseRequestLineItemId]: e.target.value }))}
            placeholder="0.00"
          />
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-[#0b100e] whitespace-nowrap">
        {formatAmount(item.quantity * (priceOverrides[item.purchaseRequestLineItemId] !== undefined && priceOverrides[item.purchaseRequestLineItemId] !== "" ? Number(priceOverrides[item.purchaseRequestLineItemId]) : (item.unitPrice || 0)), currency)}
      </td>
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
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#68726d] hover:text-[#d33d44] hover:bg-[#fff5f5] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </td>
      )}
      {!inGroup && <td className="px-2 py-3" />}
    </tr>
  );


  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-3 sm:-m-5 min-h-0">
      {/* ── Page Header — outside scroll area so action buttons stay in view ── */}
      <div className="shrink-0 pt-9 sm:pt-11 px-9 sm:px-11 pb-6">
        <div className="w-full flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-[#0b100e]">{pr.requestNumber}</h1>
              <StatusBadge status={pr.status} approvalStatus={pr.approvalStatus} />
            </div>
            {pr.title && <p className="text-sm text-[#68726d] mt-1">{pr.title}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
            {onCancel && (
              <button onClick={onCancel} disabled={convertLoading}
                className="h-9 px-4 rounded-lg border border-black/[0.06] text-[#0b100e] text-sm font-medium hover:bg-[#f9faf9] transition-colors disabled:opacity-60 flex items-center gap-1.5">
                Cancel
              </button>
            )}
            <button
              onClick={handleCreate}
              disabled={!readyToCreate || convertLoading}
              className="h-9 px-5 rounded-lg bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
            >
              {convertLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Convert to {poCount} Purchase Order{poCount !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-9 sm:px-11 pb-9 sm:pb-11">
      <div className="max-w-6xl mx-auto flex gap-6 items-start flex-1 min-h-0">
        {/* ── Left ─────────────────────────────────────────────────────── */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Info cards */}
          <div className="flex gap-4">
            <InfoCard label="Department" value={departmentName || pr.departmentId || "—"} />
            <InfoCard label="Priority" value={PRIORITY_LABELS[pr.priority] || pr.priority} />
            <InfoCard label="Need by Date" value={formatDate(pr.neededByDate)} />
          </div>

          {/* Instructions — hidden once all items are assigned */}
          {assignedCount < lineItems.length && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-[12px] bg-sky-50 border border-sky-200">
              <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-white text-[10px] font-bold">i</span>
              </div>
              <p className="text-sm text-sky-800 leading-relaxed">
                Assign a <strong>vendor</strong> to each line item. Items sharing the same vendor are
                automatically grouped into <strong>one Purchase Order</strong>. Different vendors create separate POs.
              </p>
            </div>
          )}

          {/* Progress */}
          <div className="bg-white rounded-[12px] border border-black/[0.06] px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#68726d]">Vendor assignment progress</span>
              <span className="text-xs font-semibold text-[#0b100e]">{assignedCount} / {lineItems.length} items assigned</span>
            </div>
            <div className="h-2 rounded-full bg-[#f9faf9] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#087f70] transition-all duration-300"
                style={{ width: lineItems.length ? `${(assignedCount / lineItems.length) * 100}%` : "0%" }}
              />
            </div>
            {poCount > 0 && (
              <p className="text-xs text-[#68726d] mt-2">
                <span className="font-semibold text-[#0b100e]">{poCount}</span>{" "}
                Purchase Order{poCount > 1 ? "s" : ""} will be created
              </p>
            )}
          </div>

          {/* No vendors onboarded */}
          {vendors.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-[12px] px-5 py-6 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0b100e]">No vendors onboarded yet</p>
                <p className="text-xs text-[#68726d] mt-1 max-w-sm">
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
                const groupTotal = groupItems.reduce((s, li) => {
                  const price = priceOverrides[li.purchaseRequestLineItemId] !== undefined && priceOverrides[li.purchaseRequestLineItemId] !== "" 
                    ? Number(priceOverrides[li.purchaseRequestLineItemId]) 
                    : (li.unitPrice || 0);
                  return s + (li.quantity * price);
                }, 0);

                return (
                  <div key={vendorId} className={`rounded-[14px] border-2 bg-white overflow-visible ${accent.border}`}>
                    {/* Card header */}
                    <div className={`px-5 py-3 flex items-center justify-between rounded-t-xl ${accent.header}`}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${accent.dot}`} />
                        <div>
                          <p className="text-sm font-bold text-[#0b100e] leading-tight">{vendor?.displayName || vendor?.legalName || vendorId}</p>
                          {vendor?.email && <p className="text-xs text-[#68726d]">{vendor.email}</p>}
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${accent.badge}`}>
                          {groupItems.length} item{groupItems.length > 1 ? "s" : ""} · 1 PO
                        </span>
                        {groupTotal > 0 && (
                          <span className="text-xs font-semibold text-[#0b100e]">
                            · {formatAmount(groupTotal, currency)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => ungroupAllForVendor(vendorId)}
                        title="Move all items back to Unassigned"
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#d33d44]/20 text-[#d33d44] text-xs font-medium hover:bg-[#fff5f5] transition-colors shrink-0"
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        Ungroup All
                      </button>
                    </div>
                    {/* Setup PO Details */}
                    <div className="px-5 py-3 border-b border-border/50 bg-white grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-[#68726d]">Delivery Date <span className="text-[#d33d44]">*</span></label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button type="button" className={`w-full h-8 px-3 rounded-md border text-xs flex items-center justify-between transition-colors focus:outline-none focus:border-[#087f70] ${!(vendorDetails[vendorId]?.deliveryDate || defaultDate) ? "text-[#68726d] border-black/[0.06]" : "text-[#0b100e] border-border/80"}`}>
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
                            <label className="text-xs font-semibold text-[#68726d]">Notes <span className="text-[#84908a] font-normal">(optional)</span></label>
                            <input 
                                type="text" 
                                className="w-full h-8 px-2 text-sm border rounded-md focus:outline-none focus:border-[#087f70]" 
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
                          {groupItems.map(item => renderItemRow({
                              item,
                              inGroup: true,
                              vendorId,
                              accent,
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {/* ── Unassigned Pool ─────────────────────────────────────── */}
              {unassignedItems.length > 0 && (
                <div className="rounded-[14px] border-2 border-dashed border-black/[0.06] bg-white overflow-visible">
                  <div className="px-5 py-3 bg-[#f9faf9] flex items-center justify-between rounded-t-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                      <p className="text-sm font-semibold text-[#68726d]">Unassigned Items</p>
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
                        {unassignedItems.map(item => renderItemRow({
                            item,
                            inGroup: false,
                            vendorId: "",
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* All assigned confirmation */}
              {unassignedItems.length === 0 && poCount > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-[12px] bg-[#f0faf8] border border-emerald-200">
                  <div className="w-5 h-5 rounded-full bg-[#f0faf8]0 flex items-center justify-center shrink-0">
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
          <div className="bg-[#1C2B36] rounded-[14px] p-5 text-white space-y-4">
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
            <div className="bg-white rounded-[14px] border border-black/[0.06] p-5 space-y-3">
              <h3 className="text-sm font-semibold text-[#0b100e]">PO Breakdown</h3>
              <div className="space-y-2.5">
                {Array.from(vendorGroups.entries()).map(([vId, items], idx) => {
                  const vendor = vendors.find(v => v.vendorId === vId);
                  const accent = CARD_ACCENTS[idx % CARD_ACCENTS.length];
                  const gTotal = items.reduce((s, li) => s + (li.subtotal || 0), 0);
                  return (
                    <div key={vId} className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${accent.dot} mt-1.5 shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#0b100e] truncate">{vendor?.displayName || vendor?.legalName || vId}</p>
                        <p className="text-xs text-[#68726d]">
                          {items.length} item{items.length > 1 ? "s" : ""} · {formatAmount(gTotal, currency)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-[14px] border border-black/[0.06] p-5">
            <h3 className="text-sm font-semibold text-[#0b100e] mb-4">Workflow Progress</h3>
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
  const axiosInstance = useAxios();

  // ── Scope validation: never trust ?scope= blindly from the URL ────────────
  // A user could manually type ?scope=company to try to elevate their view.
  // We re-validate the requested scope against the same permission gates used
  // on the list page before honouring it.
  const hasTeamScopePermission    = can("procurement.purchase_request", "read_department");
  const hasCompanyScopePermission = can("procurement.purchase_request", "read_company");
  const rawScope  = searchParams.get("scope") || searchParams.get("outerTab") || "own";
  const scope = (
    rawScope === "company" && hasCompanyScopePermission ? "company" :
    rawScope === "team"    && hasTeamScopePermission    ? "team"    : "own"
  ) as "own" | "team" | "company";

  // Company-scope override unlock state (session-only, resets on navigation)
  const [overrideUnlocked, setOverrideUnlocked] = useState(false);

  const { data, isLoading, isFetching, isError, refetch } = useGetPurchaseRequestById(id);
  // Block render on both first-load AND background refetch so stale cached status never flashes
  const isPageLoading = isLoading || isFetching;
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
  const [modal, setModal] = useState<"submit" | "withdraw" | "reject" | "approve" | "edit_header" | "delete_item" | "delete_pr" | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelSaving, setPanelSaving] = useState(false);
  const [policyViolations, setPolicyViolations] = useState<ProcurementPolicyViolation[] | null>(null);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isConvertingPartially, setIsConvertingPartially] = useState(false);
  const pr: PurchaseRequestDetail | undefined = data?.data;
  const departments: { label: string; value: string }[] = (deptData?.data || []).map(d => ({ label: d.departmentName || d.name || "Unknown", value: d.departmentId }));
  
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
  const currencySymbol = currency === "USD" ? "$" : currency === "NGN" ? "₦" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency;

  // ── Status flags ─────────────────────────────────────────────────────────
  const isDraft     = pr?.status === "draft";
  const isSubmitted = pr?.status === "submitted";
  const isPartiallyConverted = pr?.status === "partially_converted";
  const isApproved  = pr?.status === "approved" || isPartiallyConverted;
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
  const canEdit   = isOwnRequest && isDraft && can("procurement.purchase_request", "update_own_draft");
  const canSubmit = isOwnRequest && isDraft && (pr?.lineItems?.length || 0) > 0 && can("procurement.purchase_request", "submit");

  // Approve/Reject base permission
  const hasApprovePermission = can("procurement.purchase_request", "approve") ||
    can("procurement.purchase_request", "approve_department") ||
    can("procurement.purchase_request", "approve_company");

  // Withdraw: owner can withdraw their own submitted or approved request. 
  // (Drafts cannot be withdrawn, and company scope overrides cannot withdraw).
  const hasWithdrawPermission = can("procurement.purchase_request", "withdraw");
  const canWithdraw = (isSubmitted || isApproved) && (
    (isOwnScope && isOwnRequest && (hasWithdrawPermission || can("procurement.purchase_request", "submit")))
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
  // Never show it on the requester's own request — there is nothing to override.
  // Never show it on partially converted PRs — they've already been approved and are in progress.
  const showOverrideBanner = isCompanyScope && !isOwnRequest && !isPartiallyConverted && (
    (isSubmitted && hasApprovePermission) ||
    ((isSubmitted || isApproved) && (hasWithdrawPermission || hasApprovePermission))
  );

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

  const handleAddItems = async (payloads: LineItemPayload[]) => {
    setPanelSaving(true);
    try {
      await addLineItem.mutateAsync({ lineItems: payloads.map(cleanLineItemPayload) });
      setPolicyViolations(null); // Clear errors so user can resubmit
      toast.success(`${payloads.length} item${payloads.length !== 1 ? "s" : ""} added`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to add items"));
      throw err; // rethrow so panel keeps staged items on failure
    } finally {
      setPanelSaving(false);
    }
  };

  const handleEditItem = async (payload: LineItemPayload) => {
    setPanelSaving(true);
    try {
      await updateLineItemHook.mutateAsync(payload);
      setEditingLineItem(null);
      setPanelOpen(false);
      setPolicyViolations(null); // Clear errors so user can resubmit
      toast.success("Item updated");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to update item"));
      throw err;
    } finally {
      setPanelSaving(false);
    }
  };

  const handleDeleteItem = async (lineItemId: string) => {
    try {
      await deleteLineItem.mutateAsync(lineItemId);
      setPolicyViolations(null); // Clear errors so user can resubmit
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
      if (isProcurementPolicyViolationError(err)) {
        setPolicyViolations(getProcurementPolicyViolations(err));
        setIsPolicyModalOpen(true);
        // No toast — the policy modal provides the feedback
      } else {
        toast.error(getApiErrorMessage(err, "Failed to submit"));
      }
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
      // 1. If there are any overridden prices, we must PATCH the line items first before converting
      // The backend expects the PR line items to reflect the agreed unit price before PO creation.
      /*
      const updatePromises: Promise<any>[] = [];
      draftPurchaseOrders.forEach((draft) => {
        draft.lineItems.forEach((li) => {
          if (li.unitPrice !== undefined) {
            // Find original item to preserve other required fields if needed, 
            // though typical PATCH only needs the updated fields.
            const originalItem = pr?.lineItems.find(item => item.purchaseRequestLineItemId === li.purchaseRequestLineItemId);
            if (originalItem) {
              const payload: LineItemPayload = {
                name: originalItem.name,
                description: originalItem.description,
                quantity: originalItem.quantity,
                unitPrice: li.unitPrice,
                taxAmount: originalItem.taxAmount,
                sku: originalItem.sku,
                unitOfMeasure: originalItem.unitOfMeasure,
                categoryId: originalItem.categoryId,
                departmentId: originalItem.departmentId,
                accountingAccountRef: originalItem.accountingAccountRef,
                accountingItemRef: originalItem.accountingItemRef,
                accountingClassRef: originalItem.accountingClassRef,
                accountingLocationRef: originalItem.accountingLocationRef,
                accountingProjectRef: originalItem.accountingProjectRef,
                accountingTaxCodeRef: originalItem.accountingTaxCodeRef,
                accountingResolutionStatus: originalItem.accountingResolutionStatus,
              };
              updatePromises.push(
                axiosInstance.patch(
                  PROCUREMENT_KEYS.LINE_ITEM(id, li.purchaseRequestLineItemId),
                  payload
                )
              );
            }
          }
        });
      });

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }
      */

      // 2. Convert to POs using the (now updated) line items
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
        badgeColor: approveEvent.action === "rejected" || approveEvent.action === "declined" ? "text-[#d33d44] bg-[#fff5f5]" : "text-[#087f70] bg-[#f0faf8]",
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
          badgeColor: "text-[#d33d44] bg-[#fff5f5]",
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
        badgeColor: pr.status === "rejected" ? "text-[#d33d44] bg-[#fff5f5]" : "text-[#087f70] bg-[#f0faf8]",
        status: (isApprovedOrBeyond ? "done" : isSubmittedOrBeyond ? "pending" : "inactive") as StepStatus,
        timestamp: isApprovedOrBeyond ? formatTs(pr.approvedAt || pr.updatedAt) : undefined,
      },
      {
        label: pr.status === "cancelled" ? "Withdrawn" : "Converted to PO",
        status: (pr.status === "cancelled" ? "done" : isPOCreated ? "done" : "inactive") as StepStatus,
        badge: pr.status === "cancelled" ? "Withdrawn" : undefined,
        badgeColor: pr.status === "cancelled" ? "text-[#d33d44] bg-[#fff5f5]" : undefined,
      },
    ];
  })() : [];

  // ── Loading / error states ────────────────────────────────────────────────

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-[#68726d]">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading request...</span>
      </div>
    );
  }

  if (isError || !pr) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-8 h-8 text-[#68726d]" />
        <p className="text-sm text-[#68726d]">Failed to load purchase request.</p>
        <button onClick={() => refetch()} className="flex items-center gap-2 h-9 px-4 rounded-lg border border-black/[0.06] text-sm hover:bg-[#f9faf9] transition-colors">
          Try again
        </button>
      </div>
    );
  }

  // ── If user has create PO permission and PR is approved (or converting partially) → show PO creation view ──
  if (canCreatePO && (pr.status === "approved" || isConvertingPartially)) {
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
          onCancel={isConvertingPartially ? () => setIsConvertingPartially(false) : undefined}
          convertLoading={convertToPO.isPending}
          departmentName={deptNameFallback}
          workflowSteps={workflowSteps}
        />
      </>
    );
  }

  const lineItems = applyProcurementPolicyErrorToLineItems(pr.lineItems || [], policyViolations);

  // ── Standard detail view ──────────────────────────────────────────────────
  return (
    <>
      {/* Modals */}
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
      {/* Line Item Batch Modal — for draft add/edit */}
      {isDraft && (
        <LineItemBatchModal
          open={panelOpen}
          onClose={() => { setPanelOpen(false); setEditingLineItem(null); }}
          currency={pr.currency || "USD"}
          onSaveAll={handleAddItems}
          saving={panelSaving}
          editInitial={editingLineItem ? {
            name: editingLineItem.name,
            description: editingLineItem.description || "",
            categoryId: editingLineItem.categoryId || "",
            categoryName: "",
            quantity: editingLineItem.quantity,
            unitPrice: editingLineItem.unitPrice,
            taxAmount: editingLineItem.taxAmount,
            sku: editingLineItem.sku || "",
            unitOfMeasure: editingLineItem.unitOfMeasure || "unit",
            accountingResolutionStatus: "unresolved",
          } : null}
          onEditSaved={handleEditItem}
          editSaving={panelSaving}
          persistKey={id}
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

      <div className="flex flex-col h-[calc(100vh-64px)] -m-3 sm:-m-5 min-h-0">
        {/* Global Page Header — transparent with exact original padding */}
        <div className="shrink-0 pt-9 sm:pt-11 px-9 sm:px-11 pb-6">
          <div className="w-full flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-[#0b100e]">{pr.requestNumber}</h1>
                <StatusBadge status={pr.status} approvalStatus={pr.approvalStatus} isOwnRequest={isOwnRequest} />
              </div>
              <p className="text-sm text-[#68726d] mt-1">{pr.title}</p>
              {pr.description && <p className="text-xs text-[#68726d] mt-0.5">{pr.description}</p>}
            </div>

            {/* Action buttons — permission gated */}
            {(canEdit || canSubmit || canApprove || canWithdraw || canCreatePO) && (
              <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                {canEdit && (
                  <>
                    <button onClick={() => setModal("edit_header")}
                      className="h-9 px-4 rounded-lg border border-black/[0.06] text-[#0b100e] text-sm font-medium hover:bg-[#f9faf9] transition-colors flex items-center gap-2">
                      <Pencil className="w-3.5 h-3.5" /> Edit Request
                    </button>
                    <button onClick={() => setModal("delete_pr")}
                      className="h-9 px-4 rounded-lg border border-[#d33d44]/20 text-[#d33d44] text-sm font-medium hover:bg-[#fff5f5] hover:border-red-300 transition-colors flex items-center gap-2">
                      <Trash2 className="w-3.5 h-3.5" /> Delete Draft
                    </button>
                  </>
                )}
                {canSubmit && (
                  <button onClick={() => {
                    if (policyViolations) {
                      setIsPolicyModalOpen(true);
                      return;
                    }
                    handleSubmit();
                  }}
                    disabled={submitPR.isPending}
                    className={`h-10 px-6 rounded-[12px] text-white text-sm font-semibold transition-all flex items-center gap-2 ${
                      policyViolations
                        ? "bg-[#d33d44] hover:bg-[#c33339] cursor-pointer"
                        : "bg-[#087f70] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                    }`}>
                    {submitPR.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {policyViolations ? "Fix Violations to Submit" : "Submit Request"}
                  </button>
                )}
                {canApprove && (
                  <button onClick={() => setModal("reject")}
                    className="h-9 px-4 rounded-lg border border-red-400 text-[#d33d44] text-sm font-medium hover:bg-[#fff5f5] transition-colors">
                    Reject Request
                  </button>
                )}
                {canApprove && (
                  <button onClick={() => setModal("approve")}
                    className="h-9 px-5 rounded-lg bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                    Approve Request
                  </button>
                )}
                {canCreatePO && !isConvertingPartially && (
                  <button onClick={() => setIsConvertingPartially(true)}
                    className="h-9 px-5 rounded-lg bg-[#087f70] text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
                    {isPartiallyConverted ? "Convert Remaining to PO" : "Convert to PO"}
                  </button>
                )}
                {canWithdraw && (
                  <button onClick={() => setModal("withdraw")}
                    className="h-9 px-4 rounded-lg border border-red-400 text-[#d33d44] text-sm font-medium hover:bg-[#fff5f5] transition-colors flex items-center gap-2">
                    {withdrawPR.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin inline" />}
                    Withdraw Request
                  </button>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 px-9 sm:px-11 pb-9 sm:pb-11">
          <div className="flex flex-col h-full max-w-6xl mx-auto">

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

        {/* Rejection / Withdrawal Reason */}
        {pr.rejectionReason && (pr.status === "rejected" || pr.status === "cancelled") && (
          <div className={`mb-4 flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${pr.status === "rejected" ? "border-[#d33d44]/20 bg-[#fff5f5] text-red-800" : "border-gray-200 bg-gray-50 text-gray-800"}`}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{pr.status === "rejected" ? "Reason for Rejection" : "Reason for Withdrawal"}</p>
              <p className="mt-0.5">{pr.rejectionReason}</p>
            </div>
          </div>
        )}

        {/* 2-Column Content */}
        <div className="flex flex-col lg:flex-row flex-1 gap-6 items-start min-h-0">
          {/* Left Column */}
          <div className="flex-1 flex flex-col w-full min-w-0 h-full overflow-hidden">
            <div className="shrink-0 space-y-4 mb-4 pr-1">
              {/* Info Cards */}
              <div className="flex gap-4">
                <InfoCard label="Department" value={deptNameFallback} />
                <InfoCard label="Priority" value={PRIORITY_LABELS[pr.priority] || pr.priority} />
                <InfoCard label="Need by Date" value={formatDate(pr.neededByDate)} />
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
                  { border: "border-emerald-300", header: "bg-[#f0faf8] border-b border-emerald-200", badge: "bg-[#e6f5f3] text-[#087f70]", dot: "bg-[#f0faf8]0" },
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
                    // Skip unconverted items so they don't appear in the main vendor groups (they will appear in Pending Conversion below)
                    if (isPartiallyConverted && li.conversionStatus !== "converted") return;
                    
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
                      <h2 className="text-base font-semibold text-[#0b100e]">Assigned Vendors</h2>
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
                        <div key={group.id} className={`rounded-[14px] border-2 bg-white overflow-hidden ${accent.border}`}>
                          {/* PO Card Header */}
                          <div className={`px-5 py-3 flex items-center justify-between ${accent.header}`}>
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${accent.dot}`} />
                              <div>
                                <p className="text-sm font-bold text-[#0b100e]">{group.vendorName}</p>
                                {group.poNumber && <p className="text-xs text-[#68726d]">{group.poNumber}</p>}
                              </div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${accent.badge}`}>
                                {group.lineItems.length} item{group.lineItems.length !== 1 ? "s" : ""}
                              </span>
                              {poTotal > 0 && <span className="text-xs font-semibold text-[#0b100e]">· {formatAmount(poTotal, currency)}</span>}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-[#68726d]">
                              {group.deliveryDate && (
                                <span>Delivery: <strong className="text-[#0b100e]">{formatDate(group.deliveryDate)}</strong></span>
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
                                  <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold text-[#68726d] uppercase tracking-wide">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {group.lineItems.map(item => (
                                <tr key={item.purchaseRequestLineItemId} className="border-b border-border/40 last:border-0 hover:bg-[#f9faf9] transition-colors">
                                  <td className="px-5 py-3 font-semibold text-[#0b100e]">{item.name}</td>
                                  <td className="px-5 py-3 text-[#68726d] max-w-[160px] truncate">{item.description || "—"}</td>
                                  <td className="px-5 py-3">
                                    {item.categoryId
                                      ? <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">{getCategoryName(item.categoryId)}</span>
                                      : <span className="text-[#68726d]">—</span>}
                                  </td>
                                  <td className="px-5 py-3 text-[#0b100e]">{item.quantity}</td>
                                  <td className="px-5 py-3 text-[#0b100e]">{formatAmount(item.unitPrice, currency)}</td>
                                  <td className="px-5 py-3 font-medium text-[#0b100e]">{formatAmount(item.subtotal, currency)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}

                    {/* Unconverted items — shown when PR is partially converted */}
                    {(() => {
                      if (!isPartiallyConverted) return null;
                      
                      const unconverted = lineItems.filter(li => li.conversionStatus !== "converted");
                      if (unconverted.length === 0) return null;
                      const unconvertedTotal = unconverted.reduce((s, li) => s + (li.subtotal || 0), 0);

                      return (
                        <div className="rounded-[14px] border-2 border-dashed border-amber-300 bg-amber-50/30 overflow-hidden">
                          {/* Header */}
                          <div className="px-5 py-3 flex items-center justify-between bg-amber-50 border-b border-amber-200">
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-amber-400" />
                              <div>
                                <p className="text-sm font-bold text-amber-800">Pending Conversion</p>
                                <p className="text-xs text-amber-600">These items have not been converted to a PO yet</p>
                              </div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                {unconverted.length} item{unconverted.length !== 1 ? "s" : ""}
                              </span>
                              {unconvertedTotal > 0 && <span className="text-xs font-semibold text-amber-800">· {formatAmount(unconvertedTotal, currency)}</span>}
                            </div>
                            {canCreatePO && (
                              <button
                                onClick={() => setIsConvertingPartially(true)}
                                className="h-8 px-3 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors flex items-center gap-1.5"
                              >
                                Convert to PO
                              </button>
                            )}
                          </div>
                          {/* Items Table */}
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-amber-200/60 bg-white/60">
                                {["Item", "Description", "Category", "Qty", "Unit Price", "Subtotal"].map(h => (
                                  <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold text-amber-700 uppercase tracking-wide">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {unconverted.map(item => (
                                <tr key={item.purchaseRequestLineItemId} className="border-b border-amber-100 last:border-0 hover:bg-amber-50/60 transition-colors">
                                  <td className="px-5 py-3 font-semibold text-[#0b100e]">{item.name}</td>
                                  <td className="px-5 py-3 text-[#68726d] max-w-[160px] truncate">{item.description || "—"}</td>
                                  <td className="px-5 py-3">
                                    {item.categoryId
                                      ? <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-100 text-amber-700 text-xs font-medium">{getCategoryName(item.categoryId)}</span>
                                      : <span className="text-[#68726d]">—</span>}
                                  </td>
                                  <td className="px-5 py-3 text-[#0b100e]">{item.quantity}</td>
                                  <td className="px-5 py-3 text-[#0b100e]">{formatAmount(item.unitPrice, currency)}</td>
                                  <td className="px-5 py-3 font-medium text-[#0b100e]">{formatAmount(item.subtotal, currency)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}

                    {/* Grand Total */}
                    <div className="flex justify-end">
                      <div className="space-y-1.5 min-w-[220px] bg-white rounded-[12px] border border-black/[0.06] px-5 py-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#68726d]">Subtotal</span>
                          <span className="font-medium">{formatAmount(pr.subtotal, currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#68726d]">Tax</span>
                          <span className="font-medium">{formatAmount(pr.taxAmount, currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-border/60 pt-1.5">
                          <span className="font-semibold text-[#0b100e]">Total</span>
                          <span className="font-bold text-[#0b100e]">{formatAmount(pr.totalAmount, currency)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Fallback: flat table (draft / submitted / approved states)
              return (
                <div className="bg-white rounded-[14px] border border-black/[0.06] flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between shrink-0">
                  <h2 className="text-base font-semibold text-[#0b100e] flex items-center gap-2">
                    Request Items
                    <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-gray-100 text-xs font-semibold px-1.5">
                      {lineItems.length}
                    </span>
                  </h2>
                  {canEdit && (
                    <button onClick={() => { setEditingLineItem(null); setPanelOpen(true); }}
                      className="flex items-center gap-1 text-sm font-semibold text-[#087f70] hover:text-primary/80 transition-colors">
                      <Plus className="w-4 h-4" /> Add Items
                    </button>
                  )}
                </div>

                {lineItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <p className="text-sm text-[#68726d]">No items added yet.</p>
                    {canEdit && (
                      <button onClick={() => { setEditingLineItem(null); setPanelOpen(true); }}
                        className="flex items-center gap-2 h-9 px-4 rounded-lg border border-[#087f70] text-[#087f70] text-sm font-medium hover:bg-[#f0faf8] transition-colors">
                        <Plus className="w-4 h-4" /> Add first item
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-white">
                          <tr className="border-b border-border/60 bg-[#f9faf9] shadow-sm">
                            {["Name", "Description", "Category", "Qty", "Unit Price", "Subtotal", ...(canEdit ? [""] : [])].map(h => (
                              <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[#68726d] uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map(item => {
                            const hasViolations = !!(item.policyViolations && item.policyViolations.length > 0);
                            const hasBlock = hasViolations && item.policyViolations!.some(v => v.type === "hard_block");
                            const colCount = canEdit ? 7 : 6;
                            return (
                              <React.Fragment key={item.purchaseRequestLineItemId}>
                                <tr className={`border-b ${hasViolations ? "border-transparent" : "border-border/40 last:border-0"} hover:bg-[#f9faf9] transition-colors`}>
                                  <td className="px-5 py-3.5 font-semibold text-[#0b100e]">
                                    <div className="flex items-center gap-2">
                                      {hasViolations && (
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${hasBlock ? "bg-red-500" : "bg-amber-400"}`} />
                                      )}
                                      {item.name}
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5 text-[#68726d] max-w-[180px] truncate">{item.description || "—"}</td>
                                  <td className="px-5 py-3.5">
                                    {item.categoryId
                                      ? <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">{getCategoryName(item.categoryId)}</span>
                                      : <span className="text-[#68726d]">—</span>
                                    }
                                  </td>
                                  <td className="px-5 py-3.5 text-[#0b100e]">{item.quantity}</td>
                                  <td className="px-5 py-3.5 text-[#0b100e]">{currencySymbol}{(item.unitPrice || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                  <td className="px-5 py-3.5 font-medium text-[#0b100e]">{currencySymbol}{(item.subtotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                  {canEdit && (
                                    <td className="px-5 py-3.5">
                                      <div className="flex items-center gap-1">
                                        <div className="relative group">
                                          <button onClick={() => { setEditingLineItem(item); setPanelOpen(true); }}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#68726d] hover:bg-[#f9faf9] hover:text-[#0b100e] transition-colors">
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap text-[#0b100e] text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity z-10">Edit item</span>
                                        </div>
                                        <div className="relative group">
                                          <button onClick={() => { setItemToDelete({ id: item.purchaseRequestLineItemId, name: item.name }); setModal("delete_item"); }}
                                            disabled={deleteLineItem.isPending}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-[#fff5f5] hover:text-[#d33d44] transition-colors disabled:opacity-40">
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap text-[#0b100e] text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity z-10">Remove item</span>
                                        </div>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                                {hasViolations && (
                                  <tr className="border-b border-border/40 last:border-0">
                                    <td colSpan={colCount} className="px-5 pb-3 pt-0">
                                      <div className="flex flex-col gap-1.5">
                                        {item.policyViolations!.map((v, idx) => (
                                          <div key={idx} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs font-medium ${v.type === "hard_block" ? "bg-red-50 text-red-700 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                            <span>{v.message}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {canEdit && (
                      <div className="shrink-0 px-5 py-3 border-t border-border/40 bg-white">
                        <button onClick={() => { setEditingLineItem(null); setPanelOpen(true); }}
                          className="flex items-center gap-1.5 text-sm font-semibold text-[#087f70] hover:text-primary/80 transition-colors">
                          <Plus className="w-4 h-4" /> Add Items
                        </button>
                      </div>
                    )}

                    <div className="shrink-0 flex justify-end px-5 py-4 border-t border-border/60 bg-white">
                      <div className="space-y-1.5 min-w-[220px]">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#68726d]">Subtotal</span>
                          <span className="font-medium">{formatAmount(pr.subtotal, currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#68726d]">Tax</span>
                          <span className="font-medium">{formatAmount(pr.taxAmount, currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-border/60 pt-1.5">
                          <span className="font-semibold text-[#0b100e]">Total</span>
                          <span className="font-bold text-[#0b100e]">{formatAmount(pr.totalAmount, currency)}</span>
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
        <div className="w-full lg:w-[300px] shrink-0 lg:h-full lg:overflow-y-auto pr-1 space-y-4 pb-4">

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
            <div className="bg-white rounded-[14px] border border-black/[0.06] overflow-hidden">
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
            <div className="bg-[#1C2B36] rounded-[14px] p-5 text-white">
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
              <svg className="w-3 h-3 text-[#087f70]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
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
                        color: approveEvent.action === "rejected" || approveEvent.action === "declined" ? "bg-[#fff5f5] text-[#d33d44]" : "bg-[#f0faf8] text-[#087f70]" 
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
                    ? { text: "Withdrawn", color: "bg-[#fff5f5] text-[#d33d44]" }
                    : poEvent
                    ? { text: "Done", color: "bg-[#f0faf8] text-[#087f70]" }
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
                    ? { text: "Approved", color: "bg-[#f0faf8] text-[#087f70]" }
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
                    ? { text: "Withdrawn", color: "bg-[#fff5f5] text-[#d33d44]" }
                    : hasPO
                    ? { text: "Done", color: "bg-[#f0faf8] text-[#087f70]" }
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
                            ? "bg-[#f0faf8]"
                            : "bg-[#f5f7f6] border border-black/[0.06]"
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
                        <p className={`text-xs font-medium ${step.done ? "text-[#68726d]" : "text-[#84908a]"}`}>{step.label}</p>
                        {step.personName && (
                          <p className={`text-sm font-semibold flex items-center gap-1.5 flex-wrap mt-0.5 ${step.done ? "text-[#0b100e]" : "text-[#84908a]"}`}>
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
                          <p className="text-xs text-[#68726d] mt-0.5">{step.timestamp}</p>
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
      </div>
    </div>

    {/* Policy Violation Modal */}
    {policyViolations && (
      <ProcurementPolicyCheckModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        violations={policyViolations}
        onEditRequest={() => setIsPolicyModalOpen(false)}
        onProceedWithWarnings={async (justifications) => {
          try {
            await submitPR.mutateAsync({ policyJustifications: justifications });
            toast.success("Purchase request submitted for review!");
            setPolicyViolations(null);
          } catch (err: unknown) {
            if (isProcurementPolicyViolationError(err)) {
              setPolicyViolations(getProcurementPolicyViolations(err));
            } else {
              toast.error(getApiErrorMessage(err, "Failed to submit with justifications"));
            }
          }
        }}
      />
    )}
    </>
  );
}