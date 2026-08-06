"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const WIZARD_STEPS = [
  "Policy Group",
  "Configure",
  "Scope",
  "Rules",
  "Approval",
  "Review",
] as const;

export function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-start gap-1 sm:gap-3 flex-wrap">
      {WIZARD_STEPS.map((label, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <div key={label} className="flex items-center gap-1 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors",
                  isDone && "bg-[#087f70]/15 text-[#087f70]",
                  isActive && "bg-[#087f70] text-white",
                  !isDone && !isActive && "bg-[#f9faf9] text-[#68726d]"
                )}
              >
                {isDone ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : stepNum}
              </div>
              <span
                className={cn(
                  "text-sm font-medium whitespace-nowrap hidden sm:inline",
                  isDone ? "text-[#087f70]" : isActive ? "text-[#0b100e] font-semibold" : "text-[#68726d]"
                )}
              >
                {label}
              </span>
            </div>
            {stepNum !== WIZARD_STEPS.length && (
              <div className={cn("w-4 sm:w-8 h-px", isDone ? "bg-[#087f70]/40" : "bg-black/[0.06]")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
