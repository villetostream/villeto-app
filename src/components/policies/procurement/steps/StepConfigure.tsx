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
        <p className="text-sm text-muted-foreground">
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
            className="h-12 rounded-xl"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Description{" "}
            <span className="text-muted-foreground font-normal text-xs">(Optional)</span>
          </label>
          <Textarea
            placeholder="Briefly describe the purpose of this policy…"
            value={description}
            onChange={(e) => onChange({ description: e.target.value })}
            className="rounded-xl min-h-[100px]"
          />
        </div>
      </div>

      {/* Scheduling */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-4">
          Schedule{" "}
          <span className="text-muted-foreground font-normal text-xs">(Optional)</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1.5">
              Effective from
            </label>
            <Popover open={effectiveOpen} onOpenChange={setEffectiveOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full h-11 flex items-center justify-between rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:border-primary transition-colors",
                    !effectiveAt && "text-muted-foreground"
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
            <label className="block text-[11px] text-muted-foreground mb-1.5">
              Expires on
            </label>
            <Popover open={expiresOpen} onOpenChange={setExpiresOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full h-11 flex items-center justify-between rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:border-primary transition-colors",
                    !expiresAt && "text-muted-foreground"
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
        <label className="block text-sm font-semibold text-foreground mb-1">
          Priority
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Lower numbers run first. Default is 100.
        </p>
        <Input
          type="number"
          min={1}
          max={999}
          value={priority}
          onChange={(e) => onChange({ priority: Number(e.target.value) || 100 })}
          className="h-11 rounded-xl w-40"
        />
      </div>

      {/* Requires Approval */}
      <div className="rounded-2xl border border-border bg-white p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-foreground">Policy requires approval</p>
          <Switch
            checked={requiresApproval}
            onCheckedChange={(v) =>
              onChange({ requiresApproval: v, approvalMode: v ? "sequential" : "none" })
            }
          />
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          When enabled, this policy must be approved before it becomes active.
        </p>

        {requiresApproval && (
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1.5">
              Approval mode
            </label>
            <Select
              value={approvalMode}
              onValueChange={(v) =>
                onChange({ approvalMode: v as PolicyDraft["approvalMode"] })
              }
            >
              <SelectTrigger className="h-11 w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sequential">Sequential — approvers sign off in order</SelectItem>
                <SelectItem value="parallel">Parallel — all approvers notified at once</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
