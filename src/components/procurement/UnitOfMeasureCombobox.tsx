import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const UOM_OPTIONS = [
  "unit", "piece", "set", "pair",
  "box", "pack", "carton", "dozen", "pallet",
  "kg", "g", "lbs", "oz", "ton",
  "liter", "ml", "gallon",
  "m", "cm", "ft", "inch", "yard",
  "sqm", "sqft", "roll", "sheet", "bag",
];

export function UnitOfMeasureCombobox({
  value,
  onChange,
  error,
  className
}: {
  value: string;
  onChange: (val: string) => void;
  error?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = UOM_OPTIONS.filter(o => o.toLowerCase().includes((value || "").toLowerCase()));

  return (
    <div className={cn("relative w-full", className)} ref={ref}>
      <div className={cn(
        "flex items-center w-full h-10 px-3 rounded-lg border bg-white focus-within:border-[#087f70] transition-colors",
        error ? "border-destructive" : "border-black/[0.06]"
      )}>
        <input 
          type="text" 
          value={value || ""}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Select or type unit..."
          className="flex-1 text-sm bg-transparent border-none outline-none text-[#0b100e] placeholder:text-[#68726d] min-w-0"
        />
        <button 
          type="button" 
          onClick={() => setOpen(v => !v)} 
          className="ml-2 focus:outline-none flex items-center justify-center w-5 h-5 shrink-0"
        >
          <ChevronDown className={cn("w-4 h-4 text-[#68726d] transition-transform", open ? "rotate-180" : "")} />
        </button>
      </div>
      
      {open && filtered.length > 0 && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-full z-[100] bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-black/[0.08] py-1 max-h-48 overflow-y-auto">
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-[#0b100e] hover:bg-[#f9faf9] transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
