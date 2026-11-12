import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const UOM_OPTIONS = [
  // General & Packaging
  "unit",
  "piece",
  "item",
  "set",
  "pair",
  "pack",
  "package",
  "box",
  "carton",
  "case",
  "dozen",
  "pallet",
  "bundle",
  "roll",
  "sheet",
  "bag",
  "bottle",
  "can",
  "drum",
  "container",
  "kit",
  "lot",

  // Weight
  "kg",
  "g",
  "mg",
  "lbs",
  "oz",
  "ton",

  // Volume & Liquid
  "liter",
  "ml",
  "cl",
  "gallon",
  "barrel",

  // Length & Area
  "meter",
  "m",
  "cm",
  "mm",
  "km",
  "ft",
  "inch",
  "yard",
  "sqm",
  "sqft",

  // Time & Services
  "hour",
  "day",
  "week",
  "month",
  "year",
  "service",
  "license",
  "session",
  "project",
];

export function UnitOfMeasureCombobox({
  value,
  onChange,
  error,
  className,
  placeholder = "Select or type unit...",
}: {
  value: string;
  onChange: (val: string) => void;
  error?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setIsTyping(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setIsTyping(false);
      setSearch("");
    }
  }, [open]);

  const query = isTyping ? search.trim().toLowerCase() : "";
  const filtered = query
    ? UOM_OPTIONS.filter((o) => o.toLowerCase().includes(query))
    : UOM_OPTIONS;

  const currentValue = (value || "").trim();
  const hasExactPresetMatch = UOM_OPTIONS.some(
    (o) => o.toLowerCase() === (query || currentValue).toLowerCase()
  );

  const isCurrentCustom =
    Boolean(currentValue) &&
    !UOM_OPTIONS.some((o) => o.toLowerCase() === currentValue.toLowerCase());

  const displayInputValue = isTyping ? search : value || "";

  const handleSelect = (unit: string) => {
    onChange(unit);
    setIsTyping(false);
    setSearch("");
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setIsTyping(true);
    setSearch(nextVal);
    onChange(nextVal);
    if (!open) setOpen(true);
  };

  const handleInputFocus = () => {
    setOpen(true);
    setIsTyping(false);
    setSearch("");
  };

  const toggleDropdown = () => {
    if (open) {
      setOpen(false);
      setIsTyping(false);
      setSearch("");
    } else {
      setOpen(true);
      setIsTyping(false);
      setSearch("");
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setIsTyping(false);
      setSearch("");
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open) {
        if (filtered.length > 0) {
          handleSelect(filtered[0]);
        } else if (search.trim()) {
          handleSelect(search.trim());
        } else {
          setOpen(false);
        }
      }
    } else if (e.key === "ArrowDown" && !open) {
      setOpen(true);
      setIsTyping(false);
      setSearch("");
    }
  };

  return (
    <div className={cn("relative w-full", className)} ref={ref}>
      <div
        className={cn(
          "flex items-center w-full h-10 px-3 rounded-lg border bg-white focus-within:border-[#087f70] transition-colors",
          error ? "border-destructive" : "border-black/[0.08]"
        )}
      >
        <input
          ref={inputRef}
          type="text"
          value={displayInputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 text-sm bg-transparent border-none outline-none text-[#0b100e] placeholder:text-[#68726d] min-w-0"
        />
        <button
          type="button"
          onClick={toggleDropdown}
          aria-label="Toggle unit options"
          className="ml-2 focus:outline-none flex items-center justify-center w-5 h-5 shrink-0 text-[#68726d] hover:text-[#0b100e] transition-colors"
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform",
              open ? "rotate-180 text-[#087f70]" : ""
            )}
          />
        </button>
      </div>

      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-full z-[100] bg-white rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-black/[0.08] py-1 max-h-56 overflow-y-auto">
          {/* If the current value is a custom unit not in the preset list, show it selected at top */}
          {!query && isCurrentCustom && (
            <button
              type="button"
              onClick={() => handleSelect(currentValue)}
              className="w-full text-left px-3 py-2 text-sm flex items-center justify-between bg-[#f0faf8] text-[#087f70] font-semibold border-b border-black/[0.04]"
            >
              <span>{currentValue} (Current)</span>
              <Check className="w-4 h-4 text-[#087f70] shrink-0" />
            </button>
          )}

          {filtered.length > 0 ? (
            filtered.map((opt) => {
              const isSelected =
                currentValue.toLowerCase() === opt.toLowerCase();
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors",
                    isSelected
                      ? "bg-[#f0faf8] text-[#087f70] font-semibold"
                      : "text-[#0b100e] hover:bg-[#f9faf9]"
                  )}
                >
                  <span className="capitalize">{opt}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-[#087f70] shrink-0" />
                  )}
                </button>
              );
            })
          ) : null}

          {/* If the user typed a custom query that doesn't match any preset */}
          {query && !hasExactPresetMatch && (
            <button
              type="button"
              onClick={() => handleSelect(search.trim())}
              className="w-full text-left px-3 py-2 text-sm text-[#087f70] font-medium hover:bg-[#f0faf8] transition-colors border-t border-black/[0.04] flex items-center justify-between"
            >
              <span>Use custom: &quot;{search.trim()}&quot;</span>
              <span className="text-xs text-[#68726d]">Custom unit</span>
            </button>
          )}

          {filtered.length === 0 && !query && (
            <div className="px-3 py-2 text-sm text-[#68726d] text-center">
              No units found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
