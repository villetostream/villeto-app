"use client";

import { useMemo, useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEPARTMENT_OPTIONS,
  LOCATION_OPTIONS,
  JOB_GRADE_OPTIONS,
  MANAGEMENT_LEVEL_OPTIONS,
  POSITION_OPTIONS,
} from "../constants";
import type { ExceptionCategory, ExceptionSelection } from "../types";
import { Check, ChevronsUpDown } from "lucide-react";

type LocalCategory = ExceptionCategory | "managementGrade";

const CATEGORY_META: { value: LocalCategory; label: string; options: string[]; placeholder: string }[] = [
  { value: "department", label: "Department", options: DEPARTMENT_OPTIONS, placeholder: "Search departments..." },
  { value: "managementGrade", label: "Management Level / Job Grade", options: [...MANAGEMENT_LEVEL_OPTIONS, ...JOB_GRADE_OPTIONS], placeholder: "Search management levels or job grades..." },
  { value: "location", label: "Location", options: LOCATION_OPTIONS, placeholder: "Search locations..." },
];

export function AddExceptionModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: ExceptionSelection;
  onClose: () => void;
  onSave: (selection: ExceptionSelection) => void;
}) {
  const [category, setCategory] = useState<LocalCategory>("department");
  const [draft, setDraft] = useState<ExceptionSelection>(initial);
  const [openDropdown, setOpenDropdown] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(initial);
    }
  }, [open, initial]);

  const meta = useMemo(() => CATEGORY_META.find((c) => c.value === category) || CATEGORY_META[0], [category]);

  if (!open) return null;

  const addItem = (item: string) => {
    let targetCat = category as ExceptionCategory;
    if (category === "managementGrade") {
      targetCat = JOB_GRADE_OPTIONS.includes(item) ? "jobGrade" : "managementLevel";
    }

    if (draft[targetCat].includes(item)) return;
    setDraft({ ...draft, [targetCat]: [...draft[targetCat], item] });
  };

  const removeItem = (cat: ExceptionCategory, item: string) => {
    setDraft({ ...draft, [cat]: draft[cat].filter((i) => i !== item) });
  };

  const getTargetCategory = (item: string) => {
    let targetCat = category as ExceptionCategory;
    if (category === "managementGrade") {
      targetCat = JOB_GRADE_OPTIONS.includes(item) ? "jobGrade" : "managementLevel";
    }
    return targetCat;
  };

  const isItemSelected = (item: string) => {
    const targetCat = getTargetCategory(item);
    return draft[targetCat]?.includes(item);
  };

  const toggleItem = (item: string) => {
    const targetCat = getTargetCategory(item);
    if (draft[targetCat]?.includes(item)) {
      removeItem(targetCat, item);
    } else {
      setDraft({ ...draft, [targetCat]: [...draft[targetCat], item] });
    }
  };

  const totalSelected = (Object.values(draft) as string[][]).reduce((acc, curr) => acc + (curr?.length || 0), 0);
  const filteredOptions = meta.options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[520px] p-7">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">Add Exception</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f9faf9] transition-colors text-[#68726d]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="h-px bg-border mb-5" />

        <p className="text-xs font-semibold tracking-wide text-[#68726d] mb-3">SELECT CATEGORY</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 mb-6">
          {CATEGORY_META.map((c) => (
            <label key={c.value} className="flex items-center gap-2 cursor-pointer">
              <span
                className={cn(
                  "w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0",
                  category === c.value ? "border-primary" : "border-black/[0.06]"
                )}
                onClick={() => {
                  setCategory(c.value);
                  setSearch("");
                }}
              >
                {category === c.value && <span className="w-[9px] h-[9px] rounded-full bg-primary" />}
              </span>
              <span
                className="text-sm text-foreground"
                onClick={() => {
                  setCategory(c.value);
                  setSearch("");
                }}
              >
                {c.label}
              </span>
            </label>
          ))}
        </div>

        {/* Multiselect Dropdown */}
        <div className="relative mb-4">
          <button
            type="button"
            onClick={() => setOpenDropdown((o) => !o)}
            className="w-full h-11 rounded-[14px] border border-black/[0.06] bg-white px-3 flex items-center justify-between text-sm text-[#68726d] hover:border-primary/40 transition-colors"
          >
            <span>{meta.placeholder}</span>
            <ChevronsUpDown className="w-4 h-4 shrink-0" />
          </button>

          {openDropdown && (
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
                {filteredOptions.length === 0 ? (
                  <p className="text-xs text-[#68726d] text-center py-4">No results</p>
                ) : (
                  filteredOptions.map((opt) => {
                    const isSelected = isItemSelected(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleItem(opt)}
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
                        {opt}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[14px] bg-[#f9faf9]/40 p-4 mb-6 min-h-[70px]">
          <p className="text-[11px] font-semibold tracking-wide text-[#68726d] mb-2">
            SELECTED ITEMS ({totalSelected})
          </p>
          <div className="flex flex-wrap gap-2">
            {totalSelected === 0 && (
              <span className="text-xs text-[#68726d]">No exceptions added yet.</span>
            )}
            {(Object.keys(draft) as ExceptionCategory[]).flatMap((cat) =>
              (draft[cat] || []).map((item) => (
                <span
                  key={`${cat}-${item}`}
                  className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full"
                >
                  {item}
                  <button onClick={() => removeItem(cat, item)} className="hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button className="bg-white border border-black/[0.06] text-[#0b100e] hover:bg-[#f9faf9] rounded-[14px] h-11 px-6 font-semibold text-sm transition-colors" onClick={onClose}>
            Back
          </Button>
          <Button
            className="rounded-[14px] h-11 px-7"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
