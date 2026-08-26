"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, ChevronDown, Loader2, Pencil, PlusCircle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useGetAllRolesApi } from "@/queries/role/get-all-roles";
import { useGetVendors } from "@/queries/procurement/purchase-requests";
import {
  actionsForGroup,
  buildCriteriaLabel,
  conditionsForGroup,
  CURRENCY_OPTIONS,
  getActionDef,
  getConditionDef,
  TIME_UNIT_OPTIONS,
} from "../constants";
import type { PolicyRule, ProcurementPolicyGroup } from "../types";

// ─── Searchable multi-select (roles / vendors) ────────────────────────────────

function MultiSelect({
  label,
  placeholder,
  items,
  selected,
  onToggle,
  isLoading,
  getId,
  getName,
}: {
  label: string;
  placeholder: string;
  items: unknown[];
  selected: string[];
  onToggle: (id: string) => void;
  isLoading?: boolean;
  getId: (i: unknown) => string;
  getName: (i: unknown) => string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = (items as object[]).filter((i) =>
    getName(i).toLowerCase().includes(search.toLowerCase())
  );
  const selectedItems = (items as object[]).filter((i) => selected.includes(getId(i)));

  return (
    <div>
      <label className="block text-[11px] text-[#68726d] mb-1.5">{label}</label>

      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedItems.map((i) => (
            <span
              key={getId(i)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-primary/30 bg-primary/5 text-xs font-medium text-primary"
            >
              {getName(i)}
              <button type="button" onClick={() => onToggle(getId(i))}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div ref={dropdownRef} className="relative">
        <div
          onClick={() => {
            if (!open) setOpen(true);
          }}
          className="w-full h-11 rounded-[14px] border border-black/[0.06] bg-white px-3 flex items-center justify-between text-sm text-[#68726d] hover:border-primary/40 transition-colors cursor-text"
        >
          {open ? (
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full h-full bg-transparent focus:outline-none text-[#0b100e]"
            />
          ) : (
            <span className="w-full text-left truncate cursor-pointer" onClick={() => setOpen(true)}>{selected.length > 0 ? `${selected.length} selected` : placeholder}</span>
          )}
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); setOpen(!open); }} 
            className="flex items-center justify-center shrink-0 cursor-pointer hover:text-black ml-2"
          >
            <ChevronsUpDown className="w-4 h-4" />
          </button>
        </div>

        {open && (
          <div className="absolute z-40 left-0 right-0 top-12 rounded-[14px] border border-black/[0.06] bg-white shadow-lg overflow-hidden py-1">
            <div className="max-h-44 overflow-y-auto px-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-5">
                  <Loader2 className="w-4 h-4 animate-spin text-[#68726d]" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-[#68726d] text-center py-4">No results</p>
              ) : (
                filtered.map((item) => {
                  const id = getId(item);
                  const isSelected = selected.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { onToggle(id); setSearch(""); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-[12px] text-sm text-foreground hover:bg-[#f9faf9]/40 transition-colors"
                    >
                      <span className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                        isSelected ? "bg-primary border-primary" : "border-black/[0.06]"
                      )}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </span>
                      {getName(item)}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tag input for attachment types ──────────────────────────────────────────

function TagInput({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("");
  };

  return (
    <div>
      <label className="block text-[11px] text-[#68726d] mb-1.5">{label}</label>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-black/[0.06] bg-[#f9faf9]/40 text-xs font-medium text-foreground">
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder='e.g. invoice, statement_of_work'
          className="h-11 rounded-[14px] flex-1"
        />
        <Button type="button" className="bg-white border border-black/[0.06] text-[#0b100e] hover:bg-[#f9faf9] rounded-[14px] h-11 px-4 shrink-0 font-semibold text-sm transition-colors" onClick={add}>
          Add
        </Button>
      </div>
      <p className="text-[10px] text-[#68726d] mt-1">Press Enter or click Add after each type.</p>
    </div>
  );
}

// ─── RuleCard ─────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  policyGroup,
  onChange,
  onDelete,
  canDelete,
  roles,
  vendors,
  rolesLoading,
  vendorsLoading,
  usedConditions,
}: {
  rule: PolicyRule;
  policyGroup: ProcurementPolicyGroup;
  onChange: (r: PolicyRule) => void;
  onDelete: () => void;
  canDelete: boolean;
  roles: { roleId: string; name: string }[];
  vendors: { vendorId: string; displayName: string }[];
  rolesLoading: boolean;
  vendorsLoading: boolean;
  usedConditions: Set<string>;
}) {
  const [editingName, setEditingName] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);

  const condDef = getConditionDef(rule.condition);
  const fieldType = condDef?.fieldType ?? "none";
  const baseConditions = conditionsForGroup(policyGroup);
  const availableConditions = baseConditions.filter(
    (c) => !usedConditions.has(c.condition) || c.condition === rule.condition
  );
  const availableActions = actionsForGroup(policyGroup);
  const selectedAction = getActionDef(rule.enforcementAction);

  const update = (patch: Partial<PolicyRule>) => {
    const next = { ...rule, ...patch };
    const allowedRoleNames = next.allowedRoleIds
      ? roles.filter((r) => next.allowedRoleIds?.includes(r.roleId)).map((r) => r.name)
      : undefined;

    // Auto-update the criteriaLabel whenever key fields change
    next.criteriaLabel = buildCriteriaLabel(next.condition, {
      amount: next.amount,
      currency: next.currency,
      minimumQuotes: next.minimumQuotes,
      maxCount: next.maxCount,
      timeUnit: next.timeUnit,
      allowedVendorCount: next.allowedVendorIds?.length,
      allowedRoleCount: next.allowedRoleIds?.length,
      allowedRoleNames,
    });
    onChange(next);
  };

  const onConditionChange = (condition: PolicyRule["condition"]) => {
    // Reset all optional fields when condition changes
    update({
      condition,
      enforcementAction: "",
      amount: undefined,
      currency: "NGN",
      minimumQuotes: undefined,
      maxCount: undefined,
      timeUnit: undefined,
      allowedVendorIds: [],
      allowedRoleIds: [],
      requiredAttachmentTypes: [],
    });
  };

  return (
    <div className="rounded-[24px] border border-black/[0.06] bg-white p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-3">
        {editingName ? (
          <Input
            autoFocus
            value={rule.criteriaLabel || ""}
            onChange={(e) => onChange({ ...rule, criteriaLabel: e.target.value })}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
            className="h-8 text-sm font-bold"
          />
        ) : (
          <button type="button" onClick={() => setEditingName(true)} className="flex items-center gap-2 group text-left">
            <h3 className="text-sm font-bold text-foreground">
              {rule.criteriaLabel || "New Rule — select a condition below"}
            </h3>
            <Pencil className="w-3.5 h-3.5 text-[#68726d] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        )}
        {canDelete && (
          <button onClick={onDelete} className="text-destructive/60 hover:text-destructive transition-colors shrink-0">
            <Trash2 className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>

      {/* IF: Condition */}
      <p className="text-xs font-semibold text-foreground mb-3">Condition (IF)</p>
      <div className="space-y-4 mb-5">
        <div>
          <label className="block text-[11px] text-[#68726d] mb-1.5">When this matches…</label>
          <Select
            value={rule.condition || undefined}
            onValueChange={(v) => onConditionChange(v as PolicyRule["condition"])}
          >
            <SelectTrigger className="h-11 w-full rounded-[14px]">
              <SelectValue placeholder="Select a condition" />
            </SelectTrigger>
            <SelectContent side="bottom">
              {availableConditions.map((c) => (
                <SelectItem key={c.condition} value={c.condition}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {condDef && (
            <p className="text-[11px] text-[#68726d] mt-1.5">{condDef.description}</p>
          )}
        </div>

        {/* Dynamic fields */}
        {fieldType === "amount_currency" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[#68726d] mb-1.5">Amount</label>
              <Input
                type="text"
                value={rule.amount ? rule.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, "");
                  const parts = raw.split(".");
                  const numericStr = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : raw;
                  update({ amount: numericStr ? Number(numericStr) : undefined });
                }}
                placeholder="0.00"
                className="h-11 rounded-[14px] tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#68726d] mb-1.5">Currency</label>
              <Select
                value={rule.currency ?? "NGN"}
                onValueChange={(v) => update({ currency: v })}
              >
                <SelectTrigger className="h-11 rounded-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="bottom">
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {fieldType === "min_quotes" && (
          <div className="max-w-xs">
            <label className="block text-[11px] text-[#68726d] mb-1.5">Minimum quotes required</label>
            <Input
              type="number"
              min={1}
              max={10}
              value={rule.minimumQuotes ?? ""}
              onChange={(e) => update({ minimumQuotes: e.target.value ? Number(e.target.value) : undefined })}
              placeholder="e.g. 3"
              className="h-11 rounded-[14px]"
            />
          </div>
        )}

        {fieldType === "role_picker" && (
          <MultiSelect
            label="Allowed / target roles"
            placeholder="Select roles…"
            items={roles}
            selected={rule.allowedRoleIds ?? []}
            onToggle={(id) => {
              const curr = rule.allowedRoleIds ?? [];
              update({ allowedRoleIds: curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id] });
            }}
            isLoading={rolesLoading}
            getId={(i) => (i as { roleId: string }).roleId}
            getName={(i) => (i as { name: string }).name}
          />
        )}

        {fieldType === "vendor_picker" && (
          <MultiSelect
            label="Allowed vendors"
            placeholder="Select approved vendors…"
            items={vendors}
            selected={rule.allowedVendorIds ?? []}
            onToggle={(id) => {
              const curr = rule.allowedVendorIds ?? [];
              update({ allowedVendorIds: curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id] });
            }}
            isLoading={vendorsLoading}
            getId={(i) => (i as { vendorId: string }).vendorId}
            getName={(i) => (i as { displayName: string }).displayName}
          />
        )}

        {fieldType === "attachment_types" && (
          <TagInput
            label="Required document types"
            values={rule.requiredAttachmentTypes ?? []}
            onChange={(v) => update({ requiredAttachmentTypes: v })}
          />
        )}

        {fieldType === "pr_count" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[#68726d] mb-1.5">Maximum PRs allowed</label>
              <Input
                type="number"
                min={1}
                value={rule.maxCount ?? ""}
                onChange={(e) => update({ maxCount: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="e.g. 10"
                className="h-11 rounded-[14px]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#68726d] mb-1.5">Time period</label>
              <Select
                value={rule.timeUnit ?? "monthly"}
                onValueChange={(v) => update({ timeUnit: v as PolicyRule["timeUnit"] })}
              >
                <SelectTrigger className="h-11 rounded-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="bottom">
                  {TIME_UNIT_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* THEN: Enforcement action */}
      <p className="text-xs font-semibold text-foreground mb-3">Enforcement Action (THEN)</p>
      <Popover open={actionOpen} onOpenChange={setActionOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full h-auto min-h-11 rounded-[14px] border border-black/[0.06] px-4 py-2.5 flex items-center justify-between text-left hover:border-primary/40 transition-colors"
            disabled={!rule.condition}
          >
            {selectedAction ? (
              <span>
                <span className="block text-sm font-semibold text-foreground">{selectedAction.label}</span>
                <span className="block text-xs text-[#68726d]">{selectedAction.description}</span>
              </span>
            ) : (
              <span className="text-sm text-[#68726d]">
                {rule.condition ? "Select enforcement action" : "Select a condition first"}
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-[#68726d] shrink-0 ml-2" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          align="start" 
          side="bottom"
          className="w-[--radix-popover-trigger-width] min-w-[320px] p-2 space-y-2 overflow-y-auto"
          style={{ maxHeight: "min(400px, var(--radix-popover-content-available-height))" }}
        >
          {availableActions.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => {
                update({ enforcementAction: a.value });
                setActionOpen(false);
              }}
              className="w-full flex flex-col items-start gap-1 py-3 px-4 cursor-pointer rounded-[14px] border border-black/[0.06] bg-white hover:border-primary hover:bg-[#f9faf9]/10 transition-colors focus:outline-none focus:border-primary text-left"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                {a.label}
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  a.severity === "hard" ? "bg-destructive/10 text-destructive" : "bg-blue-50 text-blue-600"
                )}>
                  {a.severity === "hard" ? "Hard block" : "Soft"}
                </span>
              </span>
              <span className="text-xs text-[#68726d] leading-relaxed">{a.description}</span>
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ─── StepRules ────────────────────────────────────────────────────────────────

export function StepRules({
  rules,
  policyGroup,
  onChange,
}: {
  rules: PolicyRule[];
  policyGroup: ProcurementPolicyGroup | null;
  onChange: (rules: PolicyRule[]) => void;
}) {
  const rolesQ = useGetAllRolesApi({ limit: 100 }, { enabled: true });
  const vendorsQ = useGetVendors({ enabled: true });

  const roles: { roleId: string; name: string }[] = rolesQ.data?.data ?? [];
  const vendors: { vendorId: string; displayName: string }[] = vendorsQ.data?.data ?? [];

  const usedConditions = new Set(rules.map((r) => r.condition).filter(Boolean));

  const addRule = () =>
    onChange([...rules, {
      id: `rule-${Date.now()}-${rules.length}`,
      criteriaLabel: "",
      condition: "",
      enforcementAction: "",
    }]);

  const updateRule = (id: string, updated: PolicyRule) =>
    onChange(rules.map((r) => (r.id === id ? updated : r)));

  const deleteRule = (id: string) => onChange(rules.filter((r) => r.id !== id));

  if (!policyGroup) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <p className="text-sm text-[#68726d]">Select a policy group first to configure rules.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-1">Configure Rules &amp; Enforcement</h2>
      <p className="text-sm text-[#68726d] mb-6">
        Define the conditions that trigger this policy and what action to take. Each rule is evaluated independently.
      </p>

      {rules.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-black/[0.06] bg-[#f9faf9]/20 py-14 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-white border border-black/[0.06] flex items-center justify-center mb-4 text-[#68726d]">
            <Pencil className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">No rules yet</h3>
          <p className="text-sm text-[#68726d] mb-5">Add at least one rule to define when this policy fires.</p>
          <Button onClick={addRule} variant="outlinePrimary" className="rounded-[14px] h-10 px-5">
            <PlusCircle className="w-4 h-4 mr-1.5" /> Add Rule
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              policyGroup={policyGroup}
              onChange={(updated) => updateRule(rule.id, updated)}
              onDelete={() => deleteRule(rule.id)}
              canDelete={rules.length >= 1}
              roles={roles}
              vendors={vendors}
              rolesLoading={rolesQ.isLoading}
              vendorsLoading={vendorsQ.isLoading}
              usedConditions={usedConditions}
            />
          ))}
          <Button onClick={addRule} variant="outlinePrimary" className="rounded-[14px] h-10 px-5">
            <PlusCircle className="w-4 h-4 mr-1.5" /> Add Rule
          </Button>
        </div>
      )}
    </div>
  );
}
