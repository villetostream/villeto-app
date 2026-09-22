"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface StepDetailsProps {
  name: string;
  description: string;
  onChange: (patch: Partial<{ name: string; description: string }>) => void;
}

export function StepDetails({
  name,
  description,
  onChange,
}: StepDetailsProps) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto pt-8">
      <div className="mb-2">
        <h2 className="text-xl font-semibold text-[#10231d]">Name your spend program</h2>
        <p className="text-sm text-[#68726d] mt-1">
          Give this program a clear name so your team knows what types of purchases it controls.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-[13px] font-semibold text-[#10231d]">
            Program name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. IT Equipment Purchases"
            className="h-10 text-[13px] rounded-[10px] bg-[#f9faf9] border-black/[0.08]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-[13px] font-semibold text-[#10231d]">
            Description <span className="text-[#84908a] font-normal">(Optional)</span>
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Briefly describe what this program controls so your team can understand its purpose at a glance."
            className="min-h-[120px] text-[13px] resize-none rounded-[10px] bg-[#f9faf9] border-black/[0.08]"
          />
        </div>
      </div>
    </div>
  );
}
