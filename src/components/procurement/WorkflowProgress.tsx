"use client";

import React from "react";

export type StepStatus = "done" | "pending" | "inactive";

export interface WorkflowStep {
  label: string;
  person?: string;
  timestamp?: string;
  badge?: string;
  badgeColor?: string;
  status: StepStatus;
}

export function WorkflowProgress({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="space-y-0 pt-1 pl-1">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <div key={idx} className={`flex items-start gap-3 ${step.status === "inactive" ? "opacity-45" : ""}`}>
            {/* Icon + connector */}
            <div className="flex flex-col items-center shrink-0 pt-0.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                step.status === "done"
                  ? "bg-[#f0faf8]"
                  : "bg-[#f5f7f6] border border-black/[0.06]"
              }`}>
                {step.status === "done"
                  ? <svg className="w-3 h-3 text-[#087f70]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  : <div className={`w-1.5 h-1.5 rounded-full ${step.status === "pending" ? "bg-amber-400" : "bg-muted-foreground/40"}`} />
                }
              </div>
              {!isLast && (
                <div className="w-px bg-border/60 flex-1 min-h-[16px] mt-0.5" />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 min-w-0 ${isLast ? "pb-0" : ""}`}>
              <p className={`text-xs font-medium ${step.status === "done" ? "text-[#68726d]" : "text-[#84908a]"}`}>{step.label}</p>
              {step.person && (
                <p className={`text-sm font-semibold flex items-center gap-1.5 flex-wrap mt-0.5 ${step.status === "done" || step.status === "pending" ? "text-[#0b100e]" : "text-[#84908a]"}`}>
                  {step.person}
                  {step.badge && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${step.badgeColor}`}>
                      {step.badge}
                    </span>
                  )}
                </p>
              )}
              {!step.person && step.badge && (
                <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${step.badgeColor}`}>
                  {step.badge}
                </span>
              )}
              {step.timestamp && (
                <p className="text-xs text-[#68726d] mt-0.5">{step.timestamp}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
