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
    <div className="flex items-center justify-start gap-2 sm:gap-4 flex-wrap">
      {WIZARD_STEPS.map((label, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <div key={label} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors",
                  isDone && "bg-primary/15 text-primary",
                  isActive && "bg-primary text-primary-foreground",
                  !isDone && !isActive && "bg-muted text-muted-foreground"
                )}
              >
                {isDone ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : stepNum}
              </div>
              <span
                className={cn(
                  "text-sm font-medium whitespace-nowrap",
                  (isDone || isActive) ? "text-primary" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {stepNum !== WIZARD_STEPS.length && (
              <div className={cn("w-6 sm:w-10 h-px", isDone ? "bg-primary/40" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
