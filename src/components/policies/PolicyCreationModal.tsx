"use client";

import { useState, useMemo, useRef, useLayoutEffect } from "react";
import {
  X, Plus, ChevronDown, ChevronUp, Loader2, UserCircle, Check, Trash2,
  MapPin, Users, Tag, ShieldCheck, Info,
} from "lucide-react";
import { useGetCompanyRolesApi } from "@/queries/role/get-all-roles";
import { useGetExpenseCategoriesApi } from "@/queries/companies/get-expense-categories";
import { useGetInvitedUsersApi } from "@/queries/users/get-all-users";
import { useGetAllDepartmentsApi } from "@/queries/departments/get-all-departments";
import { useCreatePolicyApi, type CreatePolicyPayload } from "@/queries/companies/create-policy";
import type { UpdatePolicyPayload } from "@/queries/companies/update-policy";
import { useUpdatePolicyApi } from "@/queries/companies/update-policy";
import { useGetPolicyDetailsApi } from "@/queries/companies/get-policy-details";
import SimpleAddExpenseCategoryDialog from "@/components/policies/SimpleAddExpenseCategoryDialog";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-stores";
import { getCurrencyConfig } from "@/lib/utils/currency";
import { getApiErrorMessage } from "@/lib/types/api-error";
import { ExpenseCategory } from "@/queries/companies/get-expense-categories";
import { Role } from "@/queries/role/get-all-roles";
import { AppUser, Department } from "@/queries/departments/get-all-departments";
import { Roles } from "@/core/permissions/roles";

/* ─── Types ───────────────────────────────────────────────── */
export interface CreatedPolicyData {
  name: string;
  categories: string[];
  /**
   * "all"      → every employee
   * "specific" → filtered by selectedDepts and/or selectedRoles
   */
  scope: "all" | "specific";
  selectedRoles: string[];
  selectedDepts: string[];
  location: string;
  rules: PolicyRule[];
  approvers: string[];
}

export interface PolicyRule {
  id: string;
  type: RuleType;
  amount: string;
  enforcement: string;
  timeframe: "daily" | "weekly" | "monthly" | "yearly";
  /** receipt_requirement only — "all" = Required for All (no threshold), "threshold" = amount-gated */
  receiptMode?: "all" | "threshold";
}

type RuleType = "spend_limit" | "receipt_requirement";

interface DropdownOption {
  label: string;
  subLabel?: string;
  sideBadge?: string;
  value: string;
  policyCount?: number;
  policyNames?: string[];
}

/*
  STEPS
  1 = Name
  2 = Scope
  3 = Rules
  4 = Approvers
  5 = Preview
*/

const RULE_TYPE_LABELS: Record<RuleType, { label: string; amountLabel: string }> = {
  spend_limit:         { label: "Spend Limit",         amountLabel: "Limit amount" },
  receipt_requirement: { label: "Receipt Requirement",  amountLabel: "Required above amount" },
};

/* ─────────────────────────────────────────────────────────────
   PortalDropdown — fixed positioning, escapes overflow parents
───────────────────────────────────────────────────────────── */
function PortalDropdown({
  triggerRef, open, onClose, children, minWidth,
}: {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  minWidth?: string | number;
}) {
  const [pos, setPos] = useState<{
    top?: number; bottom?: number; left: number; width: number; maxHeight: number;
  }>({ left: 0, width: 0, maxHeight: 360 });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const GAP = 6;
    const MARGIN = 12;
    const spaceBelow = window.innerHeight - r.bottom - GAP - MARGIN;
    const spaceAbove = r.top - GAP - MARGIN;
    if (spaceBelow >= spaceAbove) {
      setPos({ top: r.bottom + GAP, left: r.left, width: r.width, maxHeight: Math.max(120, spaceBelow) });
    } else {
      setPos({ bottom: window.innerHeight - r.top + GAP, left: r.left, width: r.width, maxHeight: Math.max(120, spaceAbove) });
    }
  }, [open, triggerRef]);

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div
        className="fixed z-[61] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden"
        style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, minWidth: minWidth, maxHeight: pos.maxHeight, overflowY: "auto" }}
      >
        {children}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   PolicyPeekPanel — inline panel showing policies on a category
───────────────────────────────────────────────────────────── */
function PolicyPeekPanel({
  categoryName, policyNames, onClose,
}: {
  categoryName: string;
  policyNames: string[];
  onClose: () => void;
}) {
  return (
    <div className="m-2 mt-1 rounded-xl border border-[#03C3A6]/30 bg-[#03C3A6]/5 p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-[#03C3A6] uppercase tracking-widest leading-none mb-0.5">Attached policies</p>
          <p className="text-xs font-semibold text-gray-800 leading-snug truncate">{categoryName}</p>
        </div>
        <button type="button" onClick={onClose}
          className="w-5 h-5 rounded-full bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors shrink-0 mt-0.5">
          <X className="w-2.5 h-2.5 text-gray-500" />
        </button>
      </div>
      {policyNames.length > 0 && (
        <ul className="space-y-1">
          {policyNames.map((name, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#03C3A6] shrink-0" />
              <span className="text-xs text-gray-700 font-medium leading-snug">{name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DropdownList — searchable optional filter input
───────────────────────────────────────────────────────────── */
function DropdownList({
  options, selectedValues, multiSelect, onSelect, footer, isLoading, searchable = false,
}: {
  options: DropdownOption[];
  selectedValues: string[];
  multiSelect: boolean;
  onSelect: (v: string) => void;
  footer?: React.ReactNode;
  isLoading?: boolean;
  searchable?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query,  setQuery]  = useState("");
  const [faded,  setFaded]  = useState(false);
  const [peekOpt, setPeekOpt] = useState<DropdownOption | null>(null);

  useLayoutEffect(() => {
    if (searchable) {
      window.setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [searchable]);

  const checkFade = () => {
    const el = scrollRef.current;
    if (el) setFaded(el.scrollHeight - el.scrollTop > el.clientHeight + 2);
  };

  const filtered = query.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.subLabel?.toLowerCase().includes(query.toLowerCase()) ?? false)
      )
    : options;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-5 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div>
      {searchable && (
        <div className="px-2 pt-2 pb-1">
          <div className="flex items-center gap-2 h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 focus-within:border-[#03C3A6] focus-within:bg-white transition-colors">
            <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
              <circle cx="6.5" cy="6.5" r="4.5"/><path strokeLinecap="round" d="M10.5 10.5l3 3"/>
            </svg>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setTimeout(checkFade, 0); }}
              placeholder="Search…"
              className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-gray-400 text-gray-800"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")}
                className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={checkFade}
          style={{
            maxHeight: 264,
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "#03C3A6 #f0fdf9",
          } as React.CSSProperties}
        >
          <style>{`.dp-i::-webkit-scrollbar{width:5px}.dp-i::-webkit-scrollbar-track{background:#f0fdf9;border-radius:99px}.dp-i::-webkit-scrollbar-thumb{background:#03C3A6;border-radius:99px}`}</style>
          <div className="dp-i p-1.5">
            {filtered.length > 0 ? filtered.map((opt) => {
              const sel = selectedValues.includes(opt.value);
              const hasPolicy = (opt.policyCount ?? 0) > 0;
              return (
                <div
                  key={opt.value}
                  onClick={() => onSelect(opt.value)}
                  style={{ minHeight: 48 }}
                  className={`w-full flex items-center justify-between gap-3 px-3 rounded-xl text-left transition-colors cursor-pointer ${
                    sel ? "bg-[#03C3A6]/10" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 text-left leading-snug truncate">{opt.label}</span>
                      {opt.sideBadge && (
                        <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-[10px] font-medium text-gray-600 truncate max-w-[120px]">{opt.sideBadge}</span>
                      )}
                    </div>
                    {opt.subLabel && (
                      <span className="text-xs text-gray-400 text-left leading-snug truncate">{opt.subLabel}</span>
                    )}
                  </div>

                  {/* Right side: policy badge + info icon + checkbox */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Policy count badge */}
                    {opt.policyCount !== undefined && (
                      hasPolicy ? (
                        <span className="inline-flex items-center h-5 px-2 rounded-full bg-[#03C3A6]/15 text-[#03C3A6] text-[10px] font-semibold gap-1 whitespace-nowrap">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          {opt.policyCount} {opt.policyCount === 1 ? "policy" : "policies"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center h-5 px-2 rounded-full bg-gray-100 text-gray-400 text-[10px] font-medium whitespace-nowrap">
                          No policy
                        </span>
                      )
                    )}

                    {/* Info icon — peek attached policies */}
                    {hasPolicy && (
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPeekOpt(p => p?.value === opt.value ? null : opt);
                        }}
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                          peekOpt?.value === opt.value
                            ? "bg-[#03C3A6] text-white"
                            : "bg-gray-100 hover:bg-[#03C3A6]/20 text-gray-400 hover:text-[#03C3A6]"
                        }`}
                      >
                        <Info className="w-3 h-3" />
                      </span>
                    )}

                    {/* Checkbox / checkmark */}
                    {multiSelect ? (
                      <span className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center transition-all ${
                        sel ? "bg-[#03C3A6] border-[#03C3A6]" : "border-gray-300"
                      }`}>
                        {sel && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </span>
                    ) : (
                      sel && <Check className="w-4 h-4 text-[#03C3A6]" strokeWidth={2.5} />
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="py-5 text-sm text-center text-muted-foreground italic">
                {query ? `No results for "${query}"` : "No options available"}
              </div>
            )}
          </div>
        </div>
        {faded && (
          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none rounded-b-2xl"
            style={{ background: "linear-gradient(to bottom, transparent, white 90%)" }} />
        )}
      </div>

      {/* Policy peek panel — shown inline below the list */}
      {peekOpt && (
        <PolicyPeekPanel
          categoryName={peekOpt.label}
          policyNames={peekOpt.policyNames ?? []}
          onClose={() => setPeekOpt(null)}
        />
      )}

      {footer && <div className="border-t border-gray-100">{footer}</div>}
    </div>
  );
}

/* ─── Single select dropdown ──────────────────────────────── */
function SimpleDropdown({ placeholder, value, onChange, options, footer, isLoading = false, searchable = false }: {
  placeholder: string; value: string; onChange: (v: string) => void;
  options: DropdownOption[]; footer?: React.ReactNode; isLoading?: boolean; searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const sel = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button ref={ref} type="button" onClick={() => setOpen((p) => !p)} disabled={isLoading}
        className="w-full h-12 rounded-xl border border-border bg-white px-4 flex items-center justify-between gap-3 text-sm transition-colors hover:border-[#03C3A6]/50 focus:outline-none focus:border-[#03C3A6] disabled:opacity-50">
        <span className={`text-left truncate ${sel ? "text-gray-900 font-medium" : "text-muted-foreground"}`}>
          {isLoading ? "Loading…" : sel?.label ?? placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <PortalDropdown triggerRef={ref} open={open} onClose={() => setOpen(false)}>
        <DropdownList options={options} selectedValues={value ? [value] : []} multiSelect={false}
          onSelect={(v) => { onChange(v); setOpen(false); }} footer={footer} isLoading={isLoading} searchable={searchable} />
      </PortalDropdown>
    </div>
  );
}

/* ─── Multi select dropdown ───────────────────────────────── */
function MultiDropdown({ placeholder, values, onToggle, options, footer, isLoading = false, searchable = false }: {
  placeholder: string; values: string[]; onToggle: (v: string) => void;
  options: DropdownOption[]; footer?: React.ReactNode; isLoading?: boolean; searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  const triggerLabel = (() => {
    if (isLoading) return "Loading…";
    if (values.length === 0) return null;
    if (values.length === 1) return options.find((o) => o.value === values[0])?.label ?? values[0];
    return `${values.length} selected`;
  })();

  return (
    <div className="relative">
      <button ref={ref} type="button" onClick={() => setOpen((p) => !p)} disabled={isLoading}
        className="w-full h-12 rounded-xl border border-border bg-white px-4 flex items-center justify-between gap-3 text-sm transition-colors hover:border-[#03C3A6]/50 focus:outline-none focus:border-[#03C3A6] disabled:opacity-50">
        <span className={`text-left truncate ${triggerLabel ? "text-gray-900 font-medium" : "text-muted-foreground"}`}>
          {triggerLabel ?? placeholder}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {values.length > 1 && (
            <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-[#03C3A6] text-white text-[11px] font-bold flex items-center justify-center">
              {values.length}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      <PortalDropdown triggerRef={ref} open={open} onClose={() => setOpen(false)}>
        <DropdownList options={options} selectedValues={values} multiSelect={true}
          onSelect={onToggle} footer={footer} isLoading={isLoading} searchable={searchable} />
      </PortalDropdown>
    </div>
  );
}

/* ─── Small reusables ─────────────────────────────────────── */

/** Chip with teal outlined style matching the designer's screenshot */
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-7 pl-3 pr-1.5 rounded-full border border-[#03C3A6]/40 bg-[#03C3A6]/5 text-xs font-medium text-[#03C3A6]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="w-4 h-4 rounded-full border border-[#03C3A6]/30 hover:bg-[#03C3A6]/15 flex items-center justify-center transition-colors"
      >
        <X className="w-2 h-2" strokeWidth={3} />
      </button>
    </span>
  );
}

function RadioRow({ value, label, subLabel, checked, onChange }: {
  value: string; label: string; subLabel?: string; checked: boolean; onChange: (v: string) => void;
}) {
  return (
    <button type="button" onClick={() => onChange(value)}
      className="flex items-start gap-3 py-1 w-full text-left group">
      <span className={`mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
        checked ? "border-[#03C3A6]" : "border-gray-300 group-hover:border-[#03C3A6]/40"
      }`}>
        <span className={`rounded-full bg-[#03C3A6] transition-all ${checked ? "w-2 h-2" : "w-0 h-0"}`} />
      </span>
      <div className="text-left">
        <p className={`text-sm font-medium leading-snug ${checked ? "text-gray-900" : "text-gray-600"}`}>{label}</p>
        {subLabel && <p className="text-xs text-gray-400 mt-0.5">{subLabel}</p>}
      </div>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-gray-700 mb-1.5">{children}</p>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-gray-700 mb-1.5">{children}</p>;
}

function NumberInput({ value, onChange, placeholder = "0.00" }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const currencySymbol = useAuthStore(state => state.getCurrencySymbol());
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">{currencySymbol}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-12 rounded-xl border border-border bg-white pl-7 pr-8 text-sm font-medium text-gray-800 placeholder:text-muted-foreground focus:outline-none focus:border-[#03C3A6] transition-colors tabular-nums" />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
        <button type="button" onClick={() => onChange(String((parseFloat(value || "0") + 1).toFixed(2)))}
          className="text-gray-400 hover:text-gray-600 p-0.5"><ChevronUp className="w-3 h-3" /></button>
        <button type="button" onClick={() => onChange(String(Math.max(0, parseFloat(value || "0") - 1).toFixed(2)))}
          className="text-gray-400 hover:text-gray-600 p-0.5"><ChevronDown className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

/* ─── 3-step bar ──────────────────────────────────────────── */
function ThreeStepBar({ current }: { current: 1 | 2 | 3 }) {
  const steps = [{ n: 1, label: "Scope" }, { n: 2, label: "Rules" }, { n: 3, label: "Approvers" }] as const;
  return (
    <div className="flex items-center">
      {steps.map(({ n, label }, i) => (
        <div key={n} className="flex items-center">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              n < current ? "bg-[#03C3A6] text-white" :
              n === current ? "bg-[#03C3A6] text-white ring-[3px] ring-[#03C3A6]/20" :
              "bg-gray-100 text-gray-400"
            }`}>
              {n < current ? <Check className="w-3 h-3" strokeWidth={3} /> : n}
            </div>
            <span className={`text-xs font-medium ${n === current ? "text-gray-900" : "text-gray-400"}`}>{label}</span>
          </div>
          {i < 2 && <div className={`w-10 h-px mx-2 ${n < current ? "bg-[#03C3A6]" : "bg-gray-200"}`} />}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   RuleCard
───────────────────────────────────────────────────────────── */
function ReceiptModeToggle({
  mode,
  onChange,
}: {
  mode: "all" | "threshold";
  onChange: (m: "all" | "threshold") => void;
}) {
  return (
    <div className="flex rounded-xl border border-gray-200 overflow-hidden p-0.5 bg-gray-50 gap-0.5">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-[10px] text-sm font-medium transition-all ${
          mode === "all"
            ? "bg-[#03C3A6] text-white shadow-sm shadow-[#03C3A6]/30"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <span
          className={`w-3 h-3 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            mode === "all" ? "border-white" : "border-gray-300"
          }`}
        >
          {mode === "all" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
        </span>
        Always
      </button>
      <button
        type="button"
        onClick={() => onChange("threshold")}
        className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-[10px] text-sm font-medium transition-all ${
          mode === "threshold"
            ? "bg-[#03C3A6] text-white shadow-sm shadow-[#03C3A6]/30"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <span
          className={`w-3 h-3 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            mode === "threshold" ? "border-white" : "border-gray-300"
          }`}
        >
          {mode === "threshold" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
        </span>
        Set Threshold
      </button>
    </div>
  );
}

function RuleCard({
  rule, onChange, onDelete, canDelete,
}: {
  rule: PolicyRule;
  onChange: (updated: PolicyRule) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const meta = RULE_TYPE_LABELS[rule.type];
  const isSpendLimit = rule.type === "spend_limit";
  const isReceipt = rule.type === "receipt_requirement";
  const receiptMode = rule.receiptMode ?? "all";
  const isThreshold = receiptMode === "threshold";

  return (
    <div className="rounded-2xl border border-border p-5 space-y-4 relative">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">{meta.label}</p>
        {canDelete && (
          <button type="button" onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Receipt Requirement — mode toggle + conditional amount */}
      {isReceipt && (
        <>
          <div>
            <FieldLabel>When is a receipt required?</FieldLabel>
            <ReceiptModeToggle
              mode={receiptMode}
              onChange={(m) => onChange({ ...rule, receiptMode: m, amount: m === "all" ? "" : rule.amount })}
            />
            <p className="mt-2 text-xs text-gray-400 leading-snug">
              {receiptMode === "all"
                ? "Receipt is required on every transaction, regardless of the amount."
                : "Receipt is only required when a transaction exceeds the amount you set below."}
            </p>
          </div>

          <div className={`grid gap-4 ${isThreshold ? "grid-cols-2" : "grid-cols-1"}` }>
            {/* Amount — only shown in threshold mode */}
            {isThreshold && (
              <div>
                <FieldLabel>{meta.amountLabel}</FieldLabel>
                <NumberInput value={rule.amount} onChange={(v) => onChange({ ...rule, amount: v })} />
              </div>
            )}
            <div>
              <FieldLabel>Enforcement</FieldLabel>
              <SimpleDropdown placeholder="Select" value={rule.enforcement}
                onChange={(v) => onChange({ ...rule, enforcement: v })}
                options={WARNING_OPTIONS} />
            </div>
          </div>
        </>
      )}

      {/* Spend Limit — unchanged layout */}
      {isSpendLimit && (
        <div className="grid gap-4 grid-cols-3">
          <div>
            <FieldLabel>Timeframe</FieldLabel>
            <SimpleDropdown
              placeholder="Select"
              value={rule.timeframe}
              onChange={(v) => onChange({ ...rule, timeframe: v as PolicyRule["timeframe"] })}
              options={TIMEFRAME_OPTIONS}
            />
          </div>
          <div>
            <FieldLabel>{meta.amountLabel}</FieldLabel>
            <NumberInput value={rule.amount} onChange={(v) => onChange({ ...rule, amount: v })} />
          </div>
          <div>
            <FieldLabel>Enforcement</FieldLabel>
            <SimpleDropdown placeholder="Select" value={rule.enforcement}
              onChange={(v) => onChange({ ...rule, enforcement: v })}
              options={WARNING_OPTIONS} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Preview
───────────────────────────────────────────────────────────── */
function Preview({
  policyName, categories, scope, selectedRoles, roleOptions,
  selectedDepts, departmentOptions,
  location, rules, approvers, expenseCategoryOptions, adminOptions,
}: {
  policyName: string; categories: string[]; scope: "all" | "specific";
  selectedRoles: string[]; roleOptions: DropdownOption[];
  selectedDepts: string[]; departmentOptions: DropdownOption[];
  location: string; rules: PolicyRule[]; approvers: string[];
  expenseCategoryOptions: DropdownOption[];
  adminOptions: DropdownOption[];
}) {
  const currencySymbol = useAuthStore(state => state.getCurrencySymbol());

  const scopeSummary = (() => {
    if (scope === "all") return "All employees, all departments";
    const deptNames = selectedDepts.map((d: string) => departmentOptions.find((o: DropdownOption) => o.value === d)?.label ?? d);
    const roleNames = selectedRoles.map((r: string) => roleOptions.find((o: DropdownOption) => o.value === r)?.label ?? r);
    const listFmt = new Intl.ListFormat("en", { style: "long", type: "conjunction" });
    const deptPart = deptNames.length > 0 ? listFmt.format(deptNames) : "All departments";
    const rolePart = roleNames.length > 0 ? listFmt.format(roleNames) : "All employees";
    return `${rolePart} in ${deptPart}`;
  })();

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[#03C3A6]/25 bg-gradient-to-br from-[#03C3A6]/[0.06] to-white p-5">
        <p className="text-[11px] font-semibold text-[#03C3A6] uppercase tracking-widest mb-1">Policy name</p>
        <p className="text-base font-bold text-gray-900 mb-4">{policyName}</p>

        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Expense categories</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {categories.map((c: string, categoryIndex: number) => {
            const label = expenseCategoryOptions.find((o: DropdownOption) => o.value === c)?.label ?? (typeof c === 'string' ? c : (c as { name?: string })?.name || 'Category');
            return (
              <span key={`${c}-${categoryIndex}`} className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-[#03C3A6]/10 text-[#03C3A6] text-[11px] font-semibold">
                <Tag className="w-2.5 h-2.5" /> {label}
              </span>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3 h-3 text-gray-400" />
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Scope</p>
            </div>
            <p className="text-xs font-medium text-gray-700 leading-snug">{scopeSummary}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin className="w-3 h-3 text-gray-400" />
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Location</p>
            </div>
            <p className="text-xs font-medium text-gray-700 leading-snug">
              {location ? LOCATION_OPTIONS.find(o => o.value === location)?.label || location : "All locations"}
            </p>
          </div>
        </div>
      </div>

      {rules.length > 0 && (
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-3 px-4 py-2 bg-gray-50 border-b border-border">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Rule</p>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Amount</p>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Enforcement</p>
          </div>
          {rules.map((rule, i) => (
            <div key={rule.id}
              className={`grid grid-cols-3 px-4 py-3 items-center ${i < rules.length - 1 ? "border-b border-border" : ""}`}>
              <p className="text-sm font-medium text-gray-800">{RULE_TYPE_LABELS[rule.type].label}</p>
              <p className="text-sm text-gray-700 tabular-nums">
                {rule.type === "receipt_requirement" && (rule.receiptMode ?? "all") === "all"
                  ? <span className="inline-flex items-center gap-1 text-[#03C3A6] font-medium text-xs"><span className="w-1.5 h-1.5 rounded-full bg-[#03C3A6] inline-block" />All transactions</span>
                  : rule.type === "receipt_requirement" && rule.receiptMode === "threshold"
                    ? rule.amount
                      ? <span className="text-gray-700 tabular-nums">Above <span className="font-semibold">{currencySymbol}{rule.amount}</span></span>
                      : <span className="text-gray-300">—</span>
                    : rule.amount ? `${currencySymbol}${rule.amount}` : <span className="text-gray-300">—</span>
                }
              </p>
              <div>
                {rule.enforcement ? (
                  <span className={`inline-flex h-5 px-2 rounded-full text-[10px] font-semibold items-center ${
                    rule.enforcement === "block" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"
                  }`}>
                    {rule.enforcement === "block" ? "Hard block" : "Soft warning"}
                  </span>
                ) : <span className="text-gray-300 text-sm">—</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {approvers.filter(Boolean).length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Approvers</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {approvers.filter(Boolean).map((a, i) => (
              <div key={i} className="flex items-center gap-2 h-8 pl-2 pr-3 rounded-full bg-gray-50 border border-gray-100">
                <div className="w-5 h-5 rounded-full bg-[#03C3A6]/15 flex items-center justify-center">
                  <UserCircle className="w-3.5 h-3.5 text-[#03C3A6]" />
                </div>
                <span className="text-xs font-medium text-gray-700">
                  {adminOptions.find(o => o.value === a)?.label ?? (typeof a === "string" ? a : "User")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Static data ─────────────────────────────────────────── */
// EXPENSE_OPTIONS is now dynamically built from API — see expenseCategoryOptions below

/** Supported country locations — value matches the API payload format */
const LOCATION_OPTIONS: DropdownOption[] = [
  { value: "",            label: "None (optional)",  subLabel: "No location filter" },
  { value: "nigeria",     label: "Nigeria" },
  { value: "kenya",       label: "Kenya" },
  { value: "ghana",       label: "Ghana" },
  { value: "south_africa", label: "South Africa" },
];

/**
 * Maps a company countryOfRegistration string (may be ISO code, full name, or
 * already the API slug) to one of the four supported location values.
 */
function resolveDefaultLocation(countryRaw: string): string {
  const c = (countryRaw ?? "").toLowerCase().replace(/\s+/g, "_");
  if (c.includes("nigeria") || c === "ng")       return "nigeria";
  if (c.includes("kenya")   || c === "ke")       return "kenya";
  if (c.includes("ghana")   || c === "gh")       return "ghana";
  if (c.includes("south_africa") || c.includes("southafrica") || c === "za") return "south_africa";
  return ""; // unsupported / empty
}

const WARNING_OPTIONS: DropdownOption[] = [
  { value: "block", label: "Hard block",   subLabel: "Transaction is declined" },
  { value: "warn",  label: "Soft warning", subLabel: "User sees a caution prompt" },
  // { value: "notify", label: "Notify", subLabel: "Purpose TBD" },
];

const ADDABLE_RULE_TYPES: DropdownOption[] = [
  { value: "spend_limit",         label: "Spend Limit",        subLabel: "Cap daily spending" },
  { value: "receipt_requirement", label: "Receipt Requirement", subLabel: "Require receipts above a threshold" },
];

const TIMEFRAME_OPTIONS: DropdownOption[] = [
  { value: "daily",   label: "Daily",   subLabel: "Resets every day" },
  { value: "weekly",  label: "Weekly",  subLabel: "Resets every week" },
  { value: "monthly", label: "Monthly", subLabel: "Resets every month" },
  { value: "yearly",  label: "Yearly",  subLabel: "Resets every year" },
];

const mkRule = (type: RuleType = "spend_limit"): PolicyRule => ({
  id: Math.random().toString(36).slice(2),
  type,
  amount: "",
  enforcement: "",
  timeframe: "daily",
  receiptMode: type === "receipt_requirement" ? "all" : undefined,
});

/* ═══════════════════════════════════════════════════════════
   MAIN MODAL
═══════════════════════════════════════════════════════════ */
export default function PolicyCreationModal({
  open, onOpenChange, onSuccess, policyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (data: CreatedPolicyData) => void;
  policyId?: string | null;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1
  const [policyName, setPolicyName] = useState("");

  // Step 2 — Scope
  // Two radio choices: "all" | "specific"
  const [scope,         setScope]         = useState<"all" | "specific">("all");
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [categories,    setCategories]    = useState<string[]>([]);
  
  const userCountry = useAuthStore(state => state.user?.company?.countryOfRegistration ?? "");
  const [location, setLocation] = useState<string>(() => resolveDefaultLocation(userCountry));

  const [isAddCatOpen,  setIsAddCatOpen]  = useState(false);

  // Step 3 — Rules
  const [rules, setRules] = useState<PolicyRule[]>([
    mkRule("spend_limit"),
    mkRule("receipt_requirement"),
  ]);
  const [showAddRule, setShowAddRule] = useState(false);
  const addRuleRef = useRef<HTMLButtonElement>(null);

  // Step 4 — Approvers (multi-select IDs)
  const [approvers, setApprovers] = useState<string[]>([]);

  const can = useAuthStore(state => state.can);

  const rolesApi         = useGetCompanyRolesApi({}, { enabled: open && can("read", "Role") });
  const invitedUsersApi  = useGetInvitedUsersApi({ enabled: open && can("read", "People") });
  const departmentsApi   = useGetAllDepartmentsApi({ enabled: open && can("read", "Department") });
  // Expense categories are viewed within the context of Expense / Policies.
  const expCatApi        = useGetExpenseCategoriesApi({ enabled: open && (can("read", "Expense") || can("read", "Policy")) });

  const createPolicyMutation = useCreatePolicyApi();
  const updatePolicyMutation = useUpdatePolicyApi();
  const detailsApi = useGetPolicyDetailsApi(policyId || null, { enabled: open && !!policyId });

  const isEditing = !!policyId;
  const isFetchingDetails = isEditing && detailsApi.isLoading;
  const isLoading = createPolicyMutation.isPending || updatePolicyMutation.isPending;

  const reset = () => {
    setStep(1); setPolicyName(""); setScope("all");
    setSelectedRoles([]); setSelectedDepts([]);
    setCategories([]); setLocation(resolveDefaultLocation(userCountry));
    setRules([mkRule("spend_limit"), mkRule("receipt_requirement")]);
    setApprovers([]);
  };

  const detailsData = detailsApi.data?.data;
  const [syncedDetails, setSyncedDetails] = useState(detailsData);
  if (open && isEditing && detailsData && detailsData !== syncedDetails) {
    setSyncedDetails(detailsData);
    const data = detailsData;
    setPolicyName(data.name || "");
    const scopeType = data.scope?.type === "all" || data.scope?.type === "all_employees" ? "all" : "specific";
    setScope(scopeType);

    if (data.scope?.type === "specific") {
      setSelectedDepts(data.scope.departments || []);
      setSelectedRoles(data.scope.userRoles || []);
      setLocation(data.scope.location || "");
    } else {
      setLocation((data.scope as { location?: string } | undefined)?.location || "");
    }

    const categoryIds = (data.expenseCategories || []).map((c: string | { categoryId?: string; id?: string }) => typeof c === 'string' ? c : (c?.categoryId || c?.id || ''));
    setCategories(categoryIds);
    const approverIds = (data.approvers || []).map((a: string | { userId?: string; id?: string }) => typeof a === 'string' ? a : (a?.userId || a?.id || '')).filter(Boolean);
    setApprovers(approverIds);

    if (data.rules?.length) {
      setRules(data.rules.map((r: {
        type: RuleType;
        amount?: string | number;
        receiptAmountThreshold?: string | number;
        timeUnit?: string;
        timeframe?: string;
        enforcementAction?: string;
      }, ruleIndex: number) => {
        const isReceipt = r.type === "receipt_requirement";
        const rawAmount = (r.amount ?? r.receiptAmountThreshold ?? "").toString();
        const receiptMode: "all" | "threshold" =
          isReceipt && rawAmount !== "" && parseFloat(rawAmount) > 0
            ? "threshold"
            : "all";
        const tf = r.timeUnit || r.timeframe;
        const mappedTimeframe = tf === "day" ? "daily" : tf === "week" ? "weekly" : tf === "month" ? "monthly" : tf === "year" ? "yearly" : (tf || "daily");
        return {
          id: `rule-${ruleIndex}-${r.type}`,
          type: r.type,
          amount: isReceipt && receiptMode === "all" ? "" : rawAmount,
          enforcement: r.enforcementAction === "block" ? "block" : (r.enforcementAction === "warn" || r.enforcementAction === "warning" || r.enforcementAction === "soft" || r.enforcementAction === "soft warning" || r.enforcementAction === "soft warn" || r.enforcementAction === "soft_warn") ? "warn" : r.enforcementAction || "",
          timeframe: mappedTimeframe as PolicyRule["timeframe"],
          receiptMode: isReceipt ? receiptMode : undefined,
        };
      }));
    }
  } else if (open && !isEditing && syncedDetails) {
    setSyncedDetails(undefined);
    reset();
  }

  const expenseCategoryOptions = useMemo<DropdownOption[]>(() =>
    (expCatApi.data?.data ?? []).map((c: ExpenseCategory) => {
      const policyNames: string[] = Array.isArray(c.policies)
        ? c.policies
            .map((p) => {
              if (typeof p === "object" && p !== null && "name" in p) {
                const name = (p as { name?: string; policyName?: string }).name
                  ?? (p as { policyName?: string }).policyName;
                return name || "Unnamed policy";
              }
              return "Unnamed policy";
            })
            .filter(Boolean)
        : [];
      const policyCount = c.isPolicyAttached
        ? (policyNames.length > 0 ? policyNames.length : 1)
        : 0;
      return {
        label: c.name,
        value: c.categoryId ?? c.name,
        subLabel: c.description || undefined,
        policyCount,
        policyNames,
      };
    }), [expCatApi.data?.data]);

  const roleOptions = useMemo<DropdownOption[]>(() =>
    (rolesApi.data?.data ?? []).map((r: Role) => {
      const n = (r.name ?? "").replace(/_/g, " ");
      return { label: n.charAt(0).toUpperCase() + n.slice(1).toLowerCase(), value: r.roleId };
    }), [rolesApi.data?.data]);

  const currentUserId = useAuthStore(state => state.user?.userId);

  const adminOptions = useMemo<DropdownOption[]>(() =>
    (invitedUsersApi.data?.data ?? [])
      .filter((u: AppUser) =>
        u.userId !== currentUserId &&
        (u.position ?? u.villetoRole?.name) !== Roles.EMPLOYEE
      )
      .map((u: AppUser) => {
        const rawRole = u.position ?? u.villetoRole?.name ?? "";
        const villetoRoleName = rawRole
          ? rawRole.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
          : "Administrator";

        const jobTitle = u.jobTitle || u.role?.name || "";

        return {
          label: `${u.firstName} ${u.lastName}`,
          value: u.userId,
          sideBadge: villetoRoleName,
          ...(jobTitle && { subLabel: jobTitle }),
        };
      }), [invitedUsersApi.data?.data, currentUserId]);

  const departmentOptions = useMemo<DropdownOption[]>(() =>
    (departmentsApi.data?.data ?? []).map((d: Department) => ({
      label: d.departmentName,
      value: String(d.departmentId),
    })), [departmentsApi.data?.data]);

  const approverRequired = adminOptions.length > 0;
  const approverFilled   = approvers.length > 0;
  const togApprover = (v: string) => setApprovers((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);

  const togCat  = (v: string) => setCategories((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
  const togDept = (v: string) => setSelectedDepts((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
  const togRole = (v: string) => setSelectedRoles((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);

  const updateRule = (id: string, updated: PolicyRule) => setRules((r) => r.map((x) => x.id === id ? updated : x));
  const deleteRule = (id: string) => setRules((r) => r.filter((x) => x.id !== id));
  const addRule    = (type: RuleType) => { setRules((r) => [...r, mkRule(type)]); setShowAddRule(false); };

  /**
   * Human-readable "Applies to:" summary shown beneath the scope selectors.
   * Only shown when scope === "specific" and at least one dept or role is chosen.
   */
  const appliesTo = useMemo(() => {
    if (scope !== "specific") return "";
    const deptNames = selectedDepts.map((d) => departmentOptions.find((o) => o.value === d)?.label ?? d);
    const roleNames = selectedRoles.map((r) => roleOptions.find((o) => o.value === r)?.label ?? r);
    if (deptNames.length === 0 && roleNames.length === 0) return "";
    const listFmt = new Intl.ListFormat("en", { style: "long", type: "conjunction" });
    const rolePart = roleNames.length > 0 ? listFmt.format(roleNames) : "All employees";
    const deptPart = deptNames.length > 0
      ? `the ${listFmt.format(deptNames)} department${deptNames.length > 1 ? "s" : ""}`
      : "all departments";
    return `${rolePart} in ${deptPart}`;
  }, [scope, selectedDepts, selectedRoles, departmentOptions, roleOptions]);

  const handleClose   = () => { onOpenChange(false); reset(); };
  const handleBack    = () => setStep((s) => (s > 1 ? (s - 1) as 1|2|3|4|5 : s));
  const handleForward = () => {
    if (step < 5) setStep((s) => (s + 1) as 1|2|3|4|5);
    else handleConfirm();
  };

  const buildPayload = (): CreatePolicyPayload => {
    const currencyCode = getCurrencyConfig(userCountry).code;
    const capitalizeName = (n: string) => n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : "";
    const formattedName = capitalizeName(policyName);
    
    return {
      name: formattedName,
      description: formattedName,
      expenseCategories: categories,
      scope: scope === "all"
        ? { type: "all" as const, ...(location ? { location } : {}) }
        : {
            type: "specific" as const,
            departments: selectedDepts,
            userRoles: selectedRoles,
            ...(location ? { location } : {}),
          },
      rules: rules
        .filter(r => {
          if (r.type === "receipt_requirement") {
            const mode = r.receiptMode ?? "all";
            return mode === "all" ? !!r.enforcement : !!(r.amount && r.enforcement);
          }
          return !!(r.amount && r.enforcement);
        })
        .map(r => {
          const enforcementAction =
            r.enforcement === "warn" ? "soft_warn" : (r.enforcement as string);
          if (r.type === "spend_limit") return {
            type: "spend_limit" as const,
            timeUnit: r.timeframe || "daily",
            amount: parseFloat(r.amount),
            currency: currencyCode,
            enforcementAction,
          };
          // receipt_requirement
          const mode = r.receiptMode ?? "all";
          const isThreshold = mode === "threshold";
          return {
            type: "receipt_requirement" as const,
            receiptNeeded: true,
            receiptAmountThreshold: isThreshold && r.amount ? parseFloat(r.amount) : 0,
            currency: currencyCode,
            enforcementAction,
          };
        }),
      approvers: approvers.filter(Boolean),
      override_policy: false,
    };
  };

  const handleSaveDraft = async () => {
    try {
      // TODO: draft endpoint not yet confirmed — saving with status "draft"
      toast.info("Draft saving is not available for this endpoint yet.");
      handleClose();
    } catch {
      // If draft endpoint is not available, just close without pretending to save
      handleClose();
    }
  };

  const handleConfirm = async () => {
    try {
      const payload = buildPayload();
      
      if (isEditing && policyId) {
        const updatePayload: UpdatePolicyPayload = {
          name: payload.name,
          description: payload.description,
          expenseCategories: payload.expenseCategories,
          scope: payload.scope,
          rules: payload.rules,
          approvers: payload.approvers,
          override_policy: false,
        };
        await updatePolicyMutation.mutateAsync({ id: policyId, payload: updatePayload });
        toast.success("Policy updated successfully!");
      } else {
        await createPolicyMutation.mutateAsync(payload);
        toast.success("Policy created successfully!");
      }

      onSuccess?.({
        name: policyName, categories, scope,
        selectedRoles, selectedDepts,
        location, rules, approvers: approvers.filter(Boolean),
      });
      handleClose();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, `Failed to ${isEditing ? 'update' : 'create'} policy`));
    }
  };

  const scopeValid =
    categories.length > 0 &&
    (scope === "all" || (scope === "specific" && (selectedDepts.length > 0 || selectedRoles.length > 0)));

  const rulesValid = rules.every(r => {
    if (r.type === "receipt_requirement") {
      const mode = r.receiptMode ?? "all";
      return mode === "all" ? !!r.enforcement : !!(r.amount && r.enforcement);
    }
    return !!(r.amount && r.enforcement);
  });

  const continueDisabled =
    isLoading ||
    (step === 1 && !policyName.trim()) ||
    (step === 2 && !scopeValid) ||
    (step === 3 && !rulesValid) ||
    (step === 4 && approverRequired && !approverFilled);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={handleClose} />

        <div className={`relative bg-white rounded-[1.75rem] shadow-2xl w-full flex flex-col ${
          step === 1 ? "max-w-[460px]" : step === 5 ? "max-w-[560px]" : "max-w-[540px]"
        }`} style={{ maxHeight: "92vh" }}>

          {isFetchingDetails && (
            <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-[1.75rem]">
              <Loader2 className="w-8 h-8 text-[#03C3A6] animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-600">Loading policy details...</p>
            </div>
          )}

          {/* ════ STEP 1 — Name ════════════════════════════════ */}
          {step === 1 && (
            <div className="p-9">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-5">New Policy</p>
              <h2 className="text-[22px] font-semibold text-gray-900 mb-7">Policy Name</h2>
              <input autoFocus
                placeholder="e.g. Sales Team Travel Policy"
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && policyName.trim() && setStep(2)}
                className="w-full h-12 rounded-xl border border-border px-4 text-sm font-medium text-gray-900 placeholder:text-muted-foreground focus:outline-none focus:border-[#03C3A6] transition-colors mb-8"
              />
              <div className="flex justify-end gap-4">
                <button type="button" onClick={handleClose}
                  className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-4 transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={() => policyName.trim() && setStep(2)} disabled={!policyName.trim()}
                  className="h-11 px-8 rounded-xl bg-[#03C3A6] text-white text-sm font-semibold disabled:opacity-40 hover:bg-[#03C3A6]/90 transition-all shadow-sm shadow-[#03C3A6]/20">
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ════ STEPS 2–5 ════════════════════════════════════ */}
          {step >= 2 && (
            <>
              {/* Header */}
              <div className="px-8 pt-7 pb-5 shrink-0">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-3">
                    <p className="text-xs text-gray-400 font-medium truncate mb-0.5">{policyName}</p>
                    <h2 className="text-[20px] font-semibold text-gray-900 leading-tight">
                      {step === 2 && "Scope"}
                      {step === 3 && "Rules"}
                      {step === 4 && "Approvers"}
                      {step === 5 && "Review & confirm"}
                    </h2>
                  </div>
                  <button onClick={handleClose}
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                {step <= 4 && (
                  <div className="mt-5">
                    <ThreeStepBar current={step === 2 ? 1 : step === 3 ? 2 : 3} />
                  </div>
                )}
              </div>

              <div className="h-px bg-gray-100 shrink-0" />

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 min-h-0" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
                <style>{`.modal-scroll::-webkit-scrollbar{display:none}`}</style>

                {/* ══ STEP 2 — Scope ══════════════════════════ */}
                {step === 2 && (
                  <>
                    {/* Expense category */}
                    <div>
                      <FieldLabel>Which type of expense category should this policy apply to?</FieldLabel>
                      <MultiDropdown
                        placeholder="Select expense category"
                        values={categories}
                        onToggle={togCat}
                        options={expenseCategoryOptions}
                        isLoading={expCatApi.isLoading}
                        searchable
                        footer={
                          <button type="button" onClick={() => setIsAddCatOpen(true)}
                            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-[#03C3A6] hover:bg-gray-50 transition-colors text-left">
                            <Plus className="w-4 h-4" strokeWidth={2.5} /> Add category
                          </button>
                        }
                      />
                      {categories.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {categories.map((c) => (
                            <Chip key={c} label={expenseCategoryOptions.find((o) => o.value === c)?.label ?? c}
                              onRemove={() => togCat(c)} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Who */}
                    <div>
                      <FieldLabel>Who should this policy apply to?</FieldLabel>
                      <div className="space-y-3">

                        {/* Option 1 — All Employees */}
                        <RadioRow
                          value="all"
                          label="All Employees"
                          checked={scope === "all"}
                          onChange={(v) => setScope(v as "all" | "specific")}
                        />

                        {/* Option 2 — Employees by department or role */}
                        <RadioRow
                          value="specific"
                          label="Employees by department or role"
                          subLabel="Narrow down by department, role, or both"
                          checked={scope === "specific"}
                          onChange={(v) => setScope(v as "all" | "specific")}
                        />

                        {/* Expanded sub-fields — only shown when specific is chosen */}
                        {scope === "specific" && (
                          <div className="ml-7 space-y-4 pt-4 px-4 pb-4 rounded-2xl bg-[#03C3A6]/[0.03] border border-[#03C3A6]/10">

                            {/* Department selector */}
                            <div>
                              <SectionLabel>Select department(s)</SectionLabel>
                              <MultiDropdown
                                placeholder="Select department(s)"
                                values={selectedDepts}
                                onToggle={togDept}
                                options={departmentOptions}
                                isLoading={departmentsApi.isLoading}
                                searchable
                              />
                              {selectedDepts.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {selectedDepts.map((d) => (
                                    <Chip
                                      key={d}
                                      label={departmentOptions.find((o) => o.value === d)?.label ?? d}
                                      onRemove={() => togDept(d)}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Role selector */}
                            <div>
                              <SectionLabel>Select role(s)</SectionLabel>
                              <MultiDropdown
                                placeholder="Select role(s)"
                                values={selectedRoles}
                                onToggle={togRole}
                                options={roleOptions}
                                isLoading={rolesApi.isLoading}
                                searchable
                              />
                              {selectedRoles.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {selectedRoles.map((r) => (
                                    <Chip
                                      key={r}
                                      label={roleOptions.find((o) => o.value === r)?.label ?? r}
                                      onRemove={() => togRole(r)}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>

                            {/*
                              Nudge — only visible when neither field has a selection yet.
                              Tells the user exactly what's needed without blocking them.
                              Disappears the moment they pick anything.
                            */}
                            {selectedDepts.length === 0 && selectedRoles.length === 0 && (
                              <p className="text-xs text-amber-600 flex items-center gap-1.5 mt-1">
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 2.5L1.5 13.5h13L8 2.5zM8 7v3M8 11.5v.5"/>
                                </svg>
                                <span>
                                  Please select at least one department or role to narrow down the policy scope.
                                </span>
                              </p>
                            )}

                            {/* "Applies to:" summary — appears once something is selected */}
                            {appliesTo && (
                              <p className="text-sm text-gray-500 leading-snug">
                                Applies to:{" "}
                                <span className="font-medium text-gray-700">{appliesTo}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <FieldLabel>
                        Location Filter{" "}
                        <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                      </FieldLabel>
                      <SimpleDropdown
                        placeholder="Select location…"
                        value={location}
                        onChange={setLocation}
                        options={LOCATION_OPTIONS}
                      />
                      {location && (
                        <p className="mt-1.5 text-xs text-gray-400">
                          Policy will apply to employees in{" "}
                          <span className="font-medium text-gray-600">
                            {LOCATION_OPTIONS.find(o => o.value === location)?.label}
                          </span>.
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* ══ STEP 3 — Rules ══════════════════════════ */}
                {step === 3 && (
                  <>
                    <p className="text-sm text-gray-500 leading-relaxed -mt-2">
                      Stack multiple rules to create complex enforcement logic.
                    </p>
                    <div className="space-y-4">
                      {rules.map((rule) => (
                        <RuleCard
                          key={rule.id}
                          rule={rule}
                          onChange={(updated) => updateRule(rule.id, updated)}
                          onDelete={() => deleteRule(rule.id)}
                          canDelete={rule.type !== "spend_limit"}
                        />
                      ))}
                    </div>
                    <div className="relative">
                      {(() => {
                        const usedTypes = new Set(rules.map((r) => r.type));
                        const availableRuleTypes = ADDABLE_RULE_TYPES.filter((opt) => !usedTypes.has(opt.value as RuleType));
                        if (availableRuleTypes.length === 0) return null;
                        return (
                          <>
                            <button ref={addRuleRef} type="button" onClick={() => setShowAddRule((p) => !p)}
                              className="flex items-center gap-1.5 text-sm font-medium text-[#03C3A6] hover:underline">
                              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Add Another Rule
                            </button>
                            <PortalDropdown triggerRef={addRuleRef} open={showAddRule} onClose={() => setShowAddRule(false)} minWidth={280}>
                              <DropdownList options={availableRuleTypes} selectedValues={[]} multiSelect={false}
                                onSelect={(v) => addRule(v as RuleType)} />
                            </PortalDropdown>
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}

                {/* ══ STEP 4 — Approvers ══════════════════════ */}
                {step === 4 && (
                  <div className="space-y-4">
                    {approverRequired ? (
                      <p className="text-sm text-gray-500 leading-relaxed">
                        Assign one or more administrators to review this policy before it goes live.
                      </p>
                    ) : (
                      <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                        <p className="text-sm text-amber-700 font-medium">No other admins found</p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          You appear to be the only admin. This policy will activate without a secondary review.
                        </p>
                      </div>
                    )}
                    {approverRequired && (
                      <>
                        <MultiDropdown
                          placeholder="Select approver(s)"
                          values={approvers}
                          onToggle={togApprover}
                          options={adminOptions}
                          isLoading={invitedUsersApi.isLoading}
                          searchable
                        />
                        {approvers.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {approvers.map((id) => (
                              <Chip
                                key={id}
                                label={adminOptions.find((o) => o.value === id)?.label ?? id}
                                onRemove={() => togApprover(id)}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ══ STEP 5 — Preview ════════════════════════ */}
                {step === 5 && (
                  <Preview
                    policyName={policyName}
                    categories={categories}
                    scope={scope}
                    selectedRoles={selectedRoles}
                    roleOptions={roleOptions}
                    selectedDepts={selectedDepts}
                    departmentOptions={departmentOptions}
                    location={location}
                    rules={rules}
                    approvers={approvers}
                    expenseCategoryOptions={expenseCategoryOptions}
                    adminOptions={adminOptions}
                  />
                )}
              </div>

              {/* Footer */}
              <div className="h-px bg-gray-100 shrink-0" />
              <div className="px-8 py-5 shrink-0 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={handleBack}
                    className="h-11 px-6 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
                    Back
                  </button>
                  {step < 5 && (
                    <button type="button" onClick={handleSaveDraft}
                      className="h-11 px-6 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
                      Save as Draft
                    </button>
                  )}
                </div>
                <button type="button" onClick={handleForward} disabled={continueDisabled}
                  className="h-11 px-8 rounded-xl bg-[#03C3A6] text-white text-sm font-semibold hover:bg-[#03C3A6]/90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:scale-100 transition-all shadow-sm shadow-[#03C3A6]/20 flex items-center gap-2">
                  {isLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : step === 5 ? "Submit for approval" : "Continue"
                  }
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <SimpleAddExpenseCategoryDialog
        open={isAddCatOpen}
        onOpenChange={setIsAddCatOpen}
        onSuccess={() => setIsAddCatOpen(false)}
      />
    </>
  );
}