"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface RoleMultiSelectOption {
  id: string;
  label: string;
  description?: string;
}

interface RoleMultiSelectProps {
  value: string[];
  options: RoleMultiSelectOption[];
  onChange: (roleIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

export function RoleMultiSelect({
  value,
  options,
  onChange,
  placeholder = "Select roles",
  disabled = false,
  required = true,
  error,
}: RoleMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOptions = useMemo(
    () => options.filter((option) => value.includes(option.id)),
    [options, value],
  );
  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.description?.toLowerCase().includes(query),
    );
  }, [options, search]);

  const toggleRole = (roleId: string) => {
    if (value.includes(roleId)) {
      if (required && value.length === 1) return;
      onChange(value.filter((id) => id !== roleId));
      return;
    }
    onChange([...value, roleId]);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex min-h-10 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm",
              "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive",
            )}
          >
            <span className={selectedOptions.length ? "text-foreground" : "text-muted-foreground"}>
              {selectedOptions.length
                ? `${selectedOptions.length} role${selectedOptions.length === 1 ? "" : "s"} selected`
                : placeholder}
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0"
        >
          <div className="relative border-b p-2">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search roles"
              className="h-9 w-full rounded-md bg-muted/40 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="h-60 overflow-y-auto modal-scrollbar">
            <div className="p-1">
              {filteredOptions.length === 0 ? (
              <p className="px-3 py-5 text-center text-sm text-muted-foreground">No roles found</p>
            ) : (
              filteredOptions.map((option) => {
                const selected = value.includes(option.id);
                const removalDisabled = selected && required && value.length === 1;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleRole(option.id)}
                    aria-pressed={selected}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left hover:bg-muted/60",
                      selected && "bg-primary/5",
                      removalDisabled && "cursor-not-allowed",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0">
                       <span className="block text-sm font-medium">{option.label}</span>
                       {option.description && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="line-clamp-2 text-xs text-muted-foreground cursor-default">
                              {option.description}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="max-w-[220px] whitespace-normal text-xs"
                          >
                            {option.description}
                          </TooltipContent>
                        </Tooltip>
                      )}
                     </span>
                  </button>
                );
              })
            )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <span
              key={option.id}
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-xs font-medium text-primary"
            >
              {option.label}
              {(!required || value.length > 1) && !disabled && (
                <button type="button" onClick={() => toggleRole(option.id)} aria-label={`Remove ${option.label}`}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {required && value.length === 1 && (
        <p className="text-xs text-muted-foreground">Every active user must retain at least one role.</p>
      )}
    </div>
  );
}
