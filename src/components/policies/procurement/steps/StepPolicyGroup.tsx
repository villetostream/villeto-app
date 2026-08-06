"use client";

import { cn } from "@/lib/utils";
import { POLICY_GROUPS } from "../constants";
import type { ProcurementPolicyGroup } from "../types";

export function StepPolicyGroup({
  value,
  onChange,
}: {
  value: ProcurementPolicyGroup | null;
  onChange: (group: ProcurementPolicyGroup) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-1">Policy Group</h2>
      <p className="text-sm text-[#68726d] mb-6">
        Choose the procurement workflow stage this policy will govern.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {POLICY_GROUPS.map((group) => {
          const selected = value === group.value;
          const Icon = group.icon;
          return (
            <button
              key={group.value}
              type="button"
              onClick={() => onChange(group.value)}
              className={cn(
                "text-left rounded-[24px] border p-5 transition-colors cursor-pointer",
                selected
                  ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30"
                  : "border-black/[0.06] bg-white hover:border-primary/40 hover:bg-[#f9faf9]/20"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-[12px] bg-primary/10 flex items-center justify-center text-primary">
                  <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </div>
                <div
                  className={cn(
                    "w-[18px] h-[18px] rounded-full border flex items-center justify-center shrink-0",
                    selected ? "border-primary" : "border-black/[0.06]"
                  )}
                >
                  {selected && <div className="w-[9px] h-[9px] rounded-full bg-primary" />}
                </div>
              </div>
              <h3 className="text-sm font-bold text-foreground mb-2">{group.title}</h3>
              <p className="text-xs leading-relaxed text-[#68726d]">{group.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
