"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetAllUsersApi } from "@/queries/users/get-all-users";

/**
 * Positions that qualify as approvers — manager level and above.
 * EMPLOYEE is explicitly excluded.
 */
const APPROVER_POSITIONS = new Set([
  "MANAGER",
  "FINANCE_ADMIN",
  "ORGANIZATION_OWNER",
  "CONTROLLING_OFFICER",
]);

type Props = {
  approverIds: string[];
  requiresApproval: boolean;
  onChange: (ids: string[]) => void;
};

export function StepApproval({ approverIds, requiresApproval, onChange }: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const usersQ = useGetAllUsersApi({ enabled: true });

  // Filter: Active (invited & accepted) + manager level and above
  const eligibleUsers = (usersQ.data?.data ?? []).filter(
    (u) => (u.status ?? "") === "Active" && APPROVER_POSITIONS.has(u.position ?? "")
  ) as {
    userId: string;
    firstName: string;
    lastName: string;
    jobTitle?: string;
    position?: string;
    status?: string;
  }[];

  const filtered = eligibleUsers.filter((u) => {
    const full = `${u.firstName} ${u.lastName}`.toLowerCase();
    return full.includes(search.toLowerCase());
  });

  const selectedUsers = eligibleUsers.filter((u) => approverIds.includes(u.userId));

  const toggle = (id: string) =>
    onChange(approverIds.includes(id) ? approverIds.filter((x) => x !== id) : [...approverIds, id]);

  const getLabel = (u: typeof eligibleUsers[0]) => `${u.firstName} ${u.lastName}`.trim();
  const getSub = (u: typeof eligibleUsers[0]) => {
    const pos = u.position
      ? u.position.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "";
    return u.jobTitle ?? pos;
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-1">Approver(s)</h2>
      <p className="text-sm text-[#68726d] mb-2">
        Select who must approve this policy before it becomes active.
      </p>
      {!requiresApproval && (
        <p className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 rounded-[14px] px-4 py-2.5 mb-6">
          Policy approval is currently disabled. Enable &quot;Policy requires approval&quot; in the Configure step first.
        </p>
      )}

      {requiresApproval && (
        <div className="max-w-3xl space-y-3">
          {/* Selected pills */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              {selectedUsers.map((u) => (
                <div
                  key={u.userId}
                  className="h-12 rounded-[14px] border border-black/[0.06] bg-white px-4 flex items-center justify-between"
                >
                  <div>
                    <span className="text-sm font-medium text-foreground">{getLabel(u)}</span>
                    {getSub(u) && (
                      <span className="text-xs text-[#68726d] ml-2">({getSub(u)})</span>
                    )}
                  </div>
                  <button
                    onClick={() => toggle(u.userId)}
                    className="text-[#68726d] hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Searchable picker */}
          <div ref={dropdownRef} className="relative">
            <div
              onClick={() => {
                if (!open) setOpen(true);
              }}
              className="w-full h-11 rounded-[14px] border border-black/[0.06] bg-white px-3 flex items-center justify-between text-sm text-[#68726d] hover:border-primary/40 transition-colors cursor-text"
            >
              {open ? (
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search roles…"
                  className="w-full h-full bg-transparent focus:outline-none text-[#0b100e]"
                />
              ) : (
                <span className="w-full text-left truncate cursor-pointer" onClick={() => setOpen(true)}>Select roles…</span>
              )}
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }} 
                className="flex items-center justify-center shrink-0 cursor-pointer hover:text-black ml-2"
              >
                <ChevronsUpDown className="w-4 h-4" />
              </button>
            </div>

            {open && (
              <div className="absolute z-30 left-0 right-0 top-12 rounded-[14px] border border-black/[0.06] bg-white shadow-lg overflow-hidden py-1">
                <div className="max-h-48 overflow-y-auto px-1">
                  {usersQ.isLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-4 h-4 animate-spin text-[#68726d]" />
                    </div>
                  ) : filtered.length === 0 ? (
                    <p className="text-xs text-center text-[#68726d] py-4">
                      {search ? "No matching users" : "No eligible approvers found"}
                    </p>
                  ) : (
                    filtered.map((u) => {
                      const isSelected = approverIds.includes(u.userId);
                      return (
                        <button
                          key={u.userId}
                          type="button"
                          onClick={() => { toggle(u.userId); setSearch(""); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] hover:bg-[#f9faf9]/40 transition-colors"
                        >
                          <span className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                            isSelected ? "bg-primary border-primary" : "border-black/[0.06]"
                          )}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                          </span>
                          <span className="text-left">
                            <span className="block text-sm font-medium text-foreground">{getLabel(u)}</span>
                            {getSub(u) && (
                              <span className="block text-xs text-[#68726d]">{getSub(u)}</span>
                            )}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-black/[0.06] px-3 py-2">
                  <p className="text-[10px] text-[#68726d]">
                    Showing active users at Manager level and above only.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
