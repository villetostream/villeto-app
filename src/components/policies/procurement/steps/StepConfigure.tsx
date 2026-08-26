"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { PolicyDraft } from "../types";
import { PRIORITY_OPTIONS } from "../types";

type Props = Pick<
  PolicyDraft,
  "name" | "description" | "effectiveAt" | "expiresAt" | "priority" | "requiresApproval" | "approvalMode"
> & {
  onChange: (patch: Partial<PolicyDraft>) => void;
};

export function StepConfigure({
  name,
  description,
  effectiveAt,
  expiresAt,
  priority,
  requiresApproval,
  approvalMode,
  onChange,
}: Props) {
  const [effectiveOpen, setEffectiveOpen] = useState(false);
  const [expiresOpen, setExpiresOpen] = useState(false);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Configure Policy Details</h2>
        <p className="text-sm text-[#68726d]">
          Provide a name, description, and scheduling details for this policy.
        </p>
      </div>

      {/* Name & Description */}
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Policy Name <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="e.g. High-value purchase approval"
            value={name}
            onChange={(e) => onChange({ name: e.target.value })}
            className={cn("h-12 rounded-[14px]", name.trim().length > 0 && name.trim().length < 3 ? "border-destructive focus-visible:ring-destructive" : "")}
          />
          {name.trim().length > 0 && name.trim().length < 3 && (
            <p className="text-xs text-destructive mt-1.5 font-medium">
              Policy name must be at least 3 characters long.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Description{" "}
            <span className="text-[#68726d] font-normal text-xs">(Optional)</span>
          </label>
          <Textarea
            placeholder="Briefly describe the purpose of this policy…"
            value={description}
            onChange={(e) => onChange({ description: e.target.value })}
            className="rounded-[14px] min-h-[100px]"
          />
        </div>
      </div>

      {/* Scheduling */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-4">
          Schedule{" "}
          <span className="text-[#68726d] font-normal text-xs">(Optional)</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-[#68726d] mb-1.5">
              Effective from
            </label>
            <Popover open={effectiveOpen} onOpenChange={setEffectiveOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full h-11 flex items-center justify-between rounded-[14px] border border-black/[0.06] bg-white px-3 text-sm focus:outline-none focus:border-primary transition-colors",
                    !effectiveAt && "text-[#68726d]"
                  )}
                >
                  <span>
                    {effectiveAt ? format(new Date(effectiveAt), "PPP") : "Select start date"}
                  </span>
                  <CalendarIcon className="h-4 w-4 opacity-50 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={effectiveAt ? new Date(effectiveAt) : undefined}
                  onSelect={(date) => {
                    onChange({ effectiveAt: date ? date.toISOString() : "" });
                    setEffectiveOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="block text-[11px] text-[#68726d] mb-1.5">
              Expires on
            </label>
            <Popover open={expiresOpen} onOpenChange={setExpiresOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full h-11 flex items-center justify-between rounded-[14px] border border-black/[0.06] bg-white px-3 text-sm focus:outline-none focus:border-primary transition-colors",
                    !expiresAt && "text-[#68726d]"
                  )}
                >
                  <span>
                    {expiresAt ? format(new Date(expiresAt), "PPP") : "Select end date (optional)"}
                  </span>
                  <CalendarIcon className="h-4 w-4 opacity-50 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiresAt ? new Date(expiresAt) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      date.setHours(23, 59, 59, 999);
                      onChange({ expiresAt: date.toISOString() });
                    } else {
                      onChange({ expiresAt: "" });
                    }
                    setExpiresOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">
          Priority
        </label>
        <Select
          value={String(priority)}
          onValueChange={(v) => onChange({ priority: Number(v) })}
        >
          <SelectTrigger className="h-11 w-48 rounded-[14px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

    </div>
  );
}
