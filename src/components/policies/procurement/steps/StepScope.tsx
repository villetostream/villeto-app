"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetAllDepartmentsApi } from "@/queries/departments/get-all-departments";
import { useGetProcurementCategories, type ProcurementCategory } from "@/queries/procurement/purchase-requests";
import { useGetVendors } from "@/queries/procurement/purchase-requests";
import { useGetJobGradesApi, useGetManagementLevelsApi } from "@/queries/companies/get-company-references";
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
  getBadge,
}: {
  label: string;
  placeholder: string;
  items: unknown[];
  selected: string[];
  onToggle: (id: string) => void;
  isLoading?: boolean;
  getId: (item: unknown) => string;
  getName: (item: unknown) => string;
  getBadge?: (item: unknown) => string | undefined;
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
              <span className="flex items-center gap-1.5">
                {getName(item)}
                {getBadge?.(item) && (
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-[9px] font-semibold text-primary uppercase tracking-wide">
                    {getBadge(item)}
                  </span>
                )}
              </span>
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
            <span className="w-full text-left truncate cursor-pointer" onClick={() => setOpen(true)}>{placeholder}</span>
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
          <div className="absolute z-30 left-0 right-0 top-12 rounded-[14px] border border-black/[0.06] bg-white shadow-lg overflow-hidden py-1">
            <div className="max-h-48 overflow-y-auto px-1">
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
                      {getBadge?.(item) && (
                        <span className="ml-auto px-1.5 py-0.5 rounded-full bg-[#f5f7f6] text-[10px] font-medium text-[#68726d] truncate">
                          {getBadge(item)}
                        </span>
                      )}
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
  jobGradeIds: string[];
  managementLevelIds: string[];
  vendorIds: string[];
  exceptions: ExceptionSelection;
  onChange: (patch: Partial<PolicyDraft>) => void;
};

export function StepScope({
  scopeType,
  categoryIds,
  departmentIds,
  roleIds,
  jobGradeIds,
  managementLevelIds,
  vendorIds,
  exceptions,
  onChange,
}: Props) {
  const [exceptionOpen, setExceptionOpen] = useState(false);

  const categoriesQ = useGetProcurementCategories({ enabled: scopeType === "specific" });
  const deptsQ = useGetAllDepartmentsApi({ enabled: scopeType === "specific" });
  const vendorsQ = useGetVendors({ enabled: scopeType === "specific" });
  const jobGradesQ = useGetJobGradesApi({ enabled: scopeType === "specific" });
  const mgmtLevelsQ = useGetManagementLevelsApi({ enabled: scopeType === "specific" });

  // Flatten categories (parent + children)
  const allCategories: { categoryId: string; name: string }[] = [];
  (categoriesQ.data?.data ?? []).forEach((cat: ProcurementCategory) => {
    allCategories.push({ categoryId: cat.categoryId, name: cat.name });
    (cat.children ?? []).forEach((child) =>
      allCategories.push({ categoryId: child.categoryId, name: `\u00a0\u00a0${child.name}` })
    );
  });

  const departments: { departmentId: string; departmentName: string }[] =
    (deptsQ.data?.data as any) ?? [];
  const vendors: { vendorId: string; displayName: string }[] = vendorsQ.data?.data ?? [];
  const jobGrades = jobGradesQ.data?.data?.jobGrades ?? [];
  const mgmtLevels = mgmtLevelsQ.data?.data?.managementLevels ?? [];

  const unifiedMgmtGradeItems = [
    ...mgmtLevels.map(ml => ({
      id: ml.managementLevelId,
      name: ml.name || ml.code || "Unknown Management Level",
      type: "Management Level"
    })),
    ...jobGrades.map(jg => ({
      id: jg.jobGradeId,
      name: jg.name || jg.code || "Unknown Job Grade",
      type: "Job Grade"
    }))
  ];

  const unifiedSelection = [...jobGradeIds, ...managementLevelIds];

  const toggleUnified = (id: string) => {
    const isJobGrade = jobGrades.some(jg => jg.jobGradeId === id);
    if (isJobGrade) toggle("jobGradeIds", id);
    else toggle("managementLevelIds", id);
  };

  const toggle = (key: keyof Pick<PolicyDraft, "categoryIds" | "departmentIds" | "roleIds" | "jobGradeIds" | "managementLevelIds" | "vendorIds">, id: string) => {
    const current = key === "categoryIds" ? categoryIds
      : key === "departmentIds" ? departmentIds
      : key === "roleIds" ? roleIds
      : key === "jobGradeIds" ? jobGradeIds
      : key === "managementLevelIds" ? managementLevelIds
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

  const hasExceptions = (Object.keys(exceptions) as ExceptionCategory[]).some(cat => exceptions[cat]?.length > 0);

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
              label={
                jobGrades.length > 0 && mgmtLevels.length > 0
                  ? "Management Levels / Job Grades"
                  : jobGrades.length > 0
                  ? "Job Grades"
                  : "Management Levels"
              }
              placeholder={
                jobGrades.length > 0 && mgmtLevels.length > 0
                  ? "Select management levels / job grades…"
                  : jobGrades.length > 0
                  ? "Select job grades…"
                  : "Select management levels…"
              }
              items={unifiedMgmtGradeItems}
              selected={unifiedSelection}
              onToggle={toggleUnified}
              isLoading={jobGradesQ.isLoading || mgmtLevelsQ.isLoading}
              getId={(i) => (i as { id: string }).id}
              getName={(i) => (i as { name: string }).name}
              getBadge={(i) => (i as { type: string }).type}
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
              {(Object.keys(exceptions) as ExceptionCategory[]).flatMap((cat) =>
                (exceptions[cat] || []).map((item) => (
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
        departments={departments}
        jobGrades={jobGrades?.filter(j => j.name != null).map(j => ({ ...j, name: j.name! }))}
        managementLevels={mgmtLevels}
      />
    </div>
  );
}
