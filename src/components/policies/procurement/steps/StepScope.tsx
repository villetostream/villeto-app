"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetAllDepartmentsApi } from "@/queries/departments/get-all-departments";
import { useGetAllRolesApi } from "@/queries/role/get-all-roles";
import { useGetProcurementCategories, type ProcurementCategory } from "@/queries/procurement/purchase-requests";
import { useGetVendors } from "@/queries/procurement/purchase-requests";
import { AddExceptionModal } from "./AddExceptionModal";
import type { ScopeType, PolicyDraft, ExceptionSelection, ExceptionCategory } from "../types";

// ─── Reusable searchable multi-select pill picker ─────────────────────────────

function PillPicker({
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
  getId: (item: unknown) => string;
  getName: (item: unknown) => string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = (items as object[]).filter((item) =>
    getName(item).toLowerCase().includes(search.toLowerCase())
  );

  const selectedItems = (items as object[]).filter((item) => selected.includes(getId(item)));

  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#68726d] uppercase tracking-wide mb-2">
        {label}
      </label>

      {/* Selected pills */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedItems.map((item) => (
            <span
              key={getId(item)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs font-medium text-primary"
            >
              {getName(item)}
              <button
                type="button"
                onClick={() => onToggle(getId(item))}
                className="text-primary/60 hover:text-primary transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full h-11 rounded-[14px] border border-black/[0.06] bg-white px-3 flex items-center justify-between text-sm text-[#68726d] hover:border-primary/40 transition-colors"
        >
          <span>{placeholder}</span>
          <ChevronsUpDown className="w-4 h-4 shrink-0" />
        </button>

        {open && (
          <div className="absolute z-30 left-0 right-0 top-12 rounded-[14px] border border-black/[0.06] bg-white shadow-lg overflow-hidden">
            <div className="p-2 border-b border-black/[0.06]">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full h-9 px-3 rounded-[12px] border border-black/[0.06] text-sm bg-[#f9faf9]/30 focus:outline-none focus:border-primary"
              />
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-[#68726d]" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-[#68726d] text-center py-4">No results</p>
              ) : (
                filtered.map((item) => {
                  const id = getId(item);
                  const name = getName(item);
                  const isSelected = selected.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        onToggle(id);
                        setSearch("");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-[12px] text-sm text-foreground hover:bg-[#f9faf9]/40 transition-colors"
                    >
                      <span
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                          isSelected ? "bg-primary border-primary" : "border-black/[0.06]"
                        )}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </span>
                      {name}
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

// ─── RadioRow ─────────────────────────────────────────────────────────────────

function RadioRow({
  value,
  label,
  subLabel,
  checked,
  onChange,
}: {
  value: string;
  label: string;
  subLabel?: string;
  checked: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer" onClick={() => onChange(value)}>
      <span
        className={cn(
          "mt-0.5 w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0",
          checked ? "border-primary" : "border-black/[0.06]"
        )}
      >
        {checked && <span className="w-[9px] h-[9px] rounded-full bg-primary" />}
      </span>
      <span className="flex flex-col">
        <span className="text-sm text-foreground font-medium">{label}</span>
        {subLabel && <span className="text-xs text-[#68726d] mt-0.5">{subLabel}</span>}
      </span>
    </label>
  );
}

// ─── StepScope ────────────────────────────────────────────────────────────────

type Props = {
  scopeType: ScopeType;
  categoryIds: string[];
  departmentIds: string[];
  roleIds: string[];
  vendorIds: string[];
  exceptions: ExceptionSelection;
  onChange: (patch: Partial<PolicyDraft>) => void;
};

export function StepScope({
  scopeType,
  categoryIds,
  departmentIds,
  roleIds,
  vendorIds,
  exceptions,
  onChange,
}: Props) {
  const [exceptionOpen, setExceptionOpen] = useState(false);

  const categoriesQ = useGetProcurementCategories({ enabled: scopeType === "specific" });
  const deptsQ = useGetAllDepartmentsApi({ enabled: scopeType === "specific" });
  const rolesQ = useGetAllRolesApi({ limit: 100 }, { enabled: scopeType === "specific" });
  const vendorsQ = useGetVendors({ enabled: scopeType === "specific" });

  // Flatten categories (parent + children)
  const allCategories: { categoryId: string; name: string }[] = [];
  (categoriesQ.data?.data ?? []).forEach((cat: ProcurementCategory) => {
    allCategories.push({ categoryId: cat.categoryId, name: cat.name });
    (cat.children ?? []).forEach((child) =>
      allCategories.push({ categoryId: child.categoryId, name: `\u00a0\u00a0${child.name}` })
    );
  });

  const departments: { departmentId: string; departmentName: string }[] =
    deptsQ.data?.data ?? [];
  const roles: { roleId: string; name: string }[] = rolesQ.data?.data ?? [];
  const vendors: { vendorId: string; displayName: string }[] = vendorsQ.data?.data ?? [];

  const toggle = (key: keyof Pick<PolicyDraft, "categoryIds" | "departmentIds" | "roleIds" | "vendorIds">, id: string) => {
    const current = key === "categoryIds" ? categoryIds
      : key === "departmentIds" ? departmentIds
      : key === "roleIds" ? roleIds
      : vendorIds;
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onChange({ [key]: next });
  };

  const removeException = (cat: ExceptionCategory, item: string) => {
    onChange({
      exceptions: {
        ...exceptions,
        [cat]: exceptions[cat].filter((i) => i !== item),
      },
    });
  };

  const hasExceptions = exceptions.department.length > 0 || exceptions.role.length > 0 || exceptions.location.length > 0;

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-1">Scope</h2>
      <p className="text-sm text-[#68726d] mb-6">
        Define where this policy applies — company-wide or to specific categories, departments, roles, or vendors.
      </p>

      <div className="max-w-3xl space-y-6">
        {/* Scope type */}
        <div className="rounded-[24px] border border-black/[0.06] bg-white p-5 space-y-4">
          <RadioRow
            value="company"
            label="Entire Company"
            subLabel="This policy applies to all matching transactions across the company."
            checked={scopeType === "company"}
            onChange={(v) => onChange({ scopeType: v as ScopeType })}
          />
          <div className="h-px bg-border" />
          <RadioRow
            value="specific"
            label="Specific Scope"
            subLabel="Limit this policy to specific categories, departments, roles, or vendors."
            checked={scopeType === "specific"}
            onChange={(v) => onChange({ scopeType: v as ScopeType })}
          />
        </div>

        {/* Specific pickers */}
        {scopeType === "specific" && (
          <div className="rounded-[24px] border border-black/[0.06] bg-white p-5 space-y-6">
            <p className="text-xs text-[#68726d]">
              Select one or more options in each category. Leave a section empty to match all values.
            </p>

            <PillPicker
              label="Categories"
              placeholder="Select procurement categories…"
              items={allCategories}
              selected={categoryIds}
              onToggle={(id) => toggle("categoryIds", id)}
              isLoading={categoriesQ.isLoading}
              getId={(i) => (i as { categoryId: string }).categoryId}
              getName={(i) => (i as { name: string }).name}
            />

            <PillPicker
              label="Departments"
              placeholder="Select departments…"
              items={departments}
              selected={departmentIds}
              onToggle={(id) => toggle("departmentIds", id)}
              isLoading={deptsQ.isLoading}
              getId={(i) => (i as { departmentId: string }).departmentId}
              getName={(i) => (i as { departmentName: string }).departmentName}
            />

            <PillPicker
              label="Roles"
              placeholder="Select roles…"
              items={roles}
              selected={roleIds}
              onToggle={(id) => toggle("roleIds", id)}
              isLoading={rolesQ.isLoading}
              getId={(i) => (i as { roleId: string }).roleId}
              getName={(i) => (i as { name: string }).name}
            />

            <PillPicker
              label="Vendors (approved)"
              placeholder="Select approved vendors…"
              items={vendors}
              selected={vendorIds}
              onToggle={(id) => toggle("vendorIds", id)}
              isLoading={vendorsQ.isLoading}
              getId={(i) => (i as { vendorId: string }).vendorId}
              getName={(i) => (i as { displayName: string }).displayName}
            />
          </div>
        )}

        {/* Exceptions */}
        <div className="rounded-[24px] border border-black/[0.06] bg-white p-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Exceptions</h3>
              <p className="text-xs text-[#68726d] mt-0.5">
                Select specific groups that bypass this policy.
              </p>
            </div>
            <button
              onClick={() => setExceptionOpen(true)}
              className="text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
            >
              + Add Exception
            </button>
          </div>

          {hasExceptions ? (
            <div className="flex flex-wrap gap-2 mt-4">
              {(["department", "role", "location"] as ExceptionCategory[]).flatMap((cat) =>
                exceptions[cat].map((item) => (
                  <span
                    key={`${cat}-${item}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-black/[0.06] bg-[#f9faf9]/40 text-xs font-medium text-foreground"
                  >
                    <span className="text-[10px] uppercase text-[#68726d] mr-0.5">{cat}:</span>
                    {item}
                    <button onClick={() => removeException(cat, item)} className="hover:opacity-70">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          ) : (
            <div className="rounded-[14px] border border-dashed border-black/[0.06] bg-[#f9faf9]/20 py-5 text-center mt-4">
              <p className="text-xs text-[#68726d]">No exceptions added</p>
            </div>
          )}
        </div>
      </div>

      <AddExceptionModal
        open={exceptionOpen}
        initial={exceptions}
        onClose={() => setExceptionOpen(false)}
        onSave={(newExceptions) => onChange({ exceptions: newExceptions })}
      />
    </div>
  );
}
