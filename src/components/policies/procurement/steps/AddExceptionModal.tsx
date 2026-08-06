"use client";

import { useMemo, useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENT_OPTIONS, LOCATION_OPTIONS, ROLE_OPTIONS } from "../constants";
import type { ExceptionCategory, ExceptionSelection } from "../types";

const CATEGORY_META: { value: ExceptionCategory; label: string; options: string[]; placeholder: string }[] = [
  { value: "department", label: "Department", options: DEPARTMENT_OPTIONS, placeholder: "Search departments..." },
  { value: "role", label: "Role", options: ROLE_OPTIONS, placeholder: "Search roles..." },
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
  const [category, setCategory] = useState<ExceptionCategory>("department");
  const [draft, setDraft] = useState<ExceptionSelection>(initial);

  useEffect(() => {
    if (open) {
      setDraft(initial);
    }
  }, [open, initial]);

  const meta = useMemo(() => CATEGORY_META.find((c) => c.value === category)!, [category]);

  if (!open) return null;

  const addItem = (item: string) => {
    if (draft[category].includes(item)) return;
    setDraft({ ...draft, [category]: [...draft[category], item] });
  };

  const removeItem = (cat: ExceptionCategory, item: string) => {
    setDraft({ ...draft, [cat]: draft[cat].filter((i) => i !== item) });
  };

  const totalSelected = draft.department.length + draft.role.length + draft.location.length;

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
        <div className="flex items-center gap-6 mb-5">
          {CATEGORY_META.map((c) => (
            <label key={c.value} className="flex items-center gap-2 cursor-pointer">
              <span
                className={cn(
                  "w-[18px] h-[18px] rounded-full border flex items-center justify-center",
                  category === c.value ? "border-primary" : "border-black/[0.06]"
                )}
                onClick={() => setCategory(c.value)}
              >
                {category === c.value && <span className="w-[9px] h-[9px] rounded-full bg-primary" />}
              </span>
              <span
                className="text-sm text-foreground"
                onClick={() => setCategory(c.value)}
              >
                {c.label}
              </span>
            </label>
          ))}
        </div>

        <Select onValueChange={addItem}>
          <SelectTrigger className="h-11 w-full rounded-[14px] mb-4">
            <SelectValue placeholder={meta.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {meta.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="rounded-[14px] bg-[#f9faf9]/40 p-4 mb-6 min-h-[70px]">
          <p className="text-[11px] font-semibold tracking-wide text-[#68726d] mb-2">
            SELECTED ITEMS ({totalSelected})
          </p>
          <div className="flex flex-wrap gap-2">
            {totalSelected === 0 && (
              <span className="text-xs text-[#68726d]">No exceptions added yet.</span>
            )}
            {(["department", "role", "location"] as ExceptionCategory[]).flatMap((cat) =>
              draft[cat].map((item) => (
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
