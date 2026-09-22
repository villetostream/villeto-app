"use client";

import React, { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, AlertCircle, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CapabilityGroup, RoleCapabilityInput, CapabilityScopeType } from "@/queries/role/get-all-roles";
import type { Department } from "@/queries/departments/get-all-departments";
import {
  selectCapability,
  removeCapability,
  changeCapabilityScope,
  toggleScopeResource,
} from "@/features/auth/role-capability-form";
import { cn, formatPermissionName } from "@/lib/utils";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { Input } from "@/components/ui/input";

interface RoleCapabilityEditorProps {
  catalog: CapabilityGroup[];
  value: RoleCapabilityInput[];
  onChange: (capabilities: RoleCapabilityInput[]) => void;
  departments: Department[];
  isEditDisabled?: boolean;
}

const SCOPE_LABELS: Record<CapabilityScopeType, string> = {
  own: "Only their own",
  reporting_chain: "Their team",
  department: "Specific departments",
  company: "Entire company",
};

const SCOPE_DESCRIPTIONS: Record<CapabilityScopeType, string> = {
  own: "This person can only see and work with data they created or are assigned to.",
  reporting_chain: "This person can see and work with data from their direct and indirect reports.",
  department: "This person can see and work with data from the departments you select below.",
  company: "This person can see and work with all data across the entire company.",
};

const RISK_CONFIG = {
  standard: { color: "bg-slate-100 text-slate-700 border-slate-200", label: "Standard", description: "Everyday permissions for normal day-to-day work" },
  elevated: { color: "bg-amber-100 text-amber-700 border-amber-200", label: "Elevated", description: "Broader access — review carefully before assigning" },
  sensitive: { color: "bg-red-100 text-red-700 border-red-200", label: "Sensitive", description: "Powerful access that can affect financial data or manage other users" },
};

export function RoleCapabilityEditor({
  catalog,
  value,
  onChange,
  departments,
  isEditDisabled = false,
}: RoleCapabilityEditorProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  
  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(() => {
    const mods = new Set<string>();
    for (const group of catalog) {
      mods.add(group.module);
    }
    const sortedModNames = Array.from(mods).sort((a, b) => a.localeCompare(b));
    
    const valueSet = new Set(value.map(v => v.key));
    const collapsed = new Set<string>();
    
    // We consider it "Edit Mode" if they have any explicit capabilities selected
    const hasAnySelection = value.length > 0;
    
    sortedModNames.forEach((modName, index) => {
      if (hasAnySelection) {
        // Edit mode: Expand if it has selected capabilities, otherwise collapse
        const hasSelectionInModule = catalog.some(g => g.module === modName && valueSet.has(g.key));
        if (!hasSelectionInModule) {
          collapsed.add(modName);
        }
      } else {
        // Create mode: Expand ONLY the first module
        if (index > 0) {
          collapsed.add(modName);
        }
      }
    });
    
    return collapsed;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [pendingSensitiveGroup, setPendingSensitiveGroup] = useState<CapabilityGroup | null>(null);

  const valueByKey = useMemo(() => {
    const map = new Map<string, RoleCapabilityInput>();
    for (const v of value) map.set(v.key, v);
    return map;
  }, [value]);

  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return catalog;
    const query = searchQuery.toLowerCase();
    return catalog.filter((g) => 
      g.name.toLowerCase().includes(query) || 
      g.description?.toLowerCase().includes(query)
    );
  }, [catalog, searchQuery]);

  const modules = useMemo(() => {
    const mods = new Map<string, CapabilityGroup[]>();
    for (const group of filteredCatalog) {
      if (!mods.has(group.module)) mods.set(group.module, []);
      mods.get(group.module)!.push(group);
    }
    const result = Array.from(mods.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    // Sort groups within modules
    for (const [, groups] of result) {
      groups.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    return result;
  }, [filteredCatalog]);

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleModule = (modName: string) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(modName)) next.delete(modName);
      else next.add(modName);
      return next;
    });
  };

  const handleToggle = (group: CapabilityGroup, isSelected: boolean) => {
    if (isEditDisabled || group.isBaseCapability) return;

    if (isSelected) {
      onChange(removeCapability(value, group.key));
    } else {
      // If it's sensitive, warn first
      if (group.riskLevel === "sensitive") {
        setPendingSensitiveGroup(group);
      } else {
        onChange(selectCapability(value, group));
      }
    }
  };

  const confirmSensitive = () => {
    if (pendingSensitiveGroup) {
      onChange(selectCapability(value, pendingSensitiveGroup));
      setPendingSensitiveGroup(null);
    }
  };

  const handleScopeChange = (key: string, scopeType: CapabilityScopeType) => {
    if (isEditDisabled) return;
    onChange(changeCapabilityScope(value, key, scopeType));
  };

  const handleDepartmentToggle = (key: string, deptId: string) => {
    if (isEditDisabled) return;
    onChange(toggleScopeResource(value, key, "departmentIds", deptId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#84908a]" />
          <Input
            placeholder="Search capabilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-[42px] border-black/[0.1] rounded-[10px] text-[13px] focus-visible:ring-[#0ea894]"
          />
        </div>
        <div className="text-[12px] text-[#84908a]">
          {value.length} selected
        </div>
      </div>

      {modules.length === 0 ? (
        <div className="text-center py-12 text-[#84908a] border border-dashed border-black/[0.1] rounded-xl">
          No capabilities found.
        </div>
      ) : (
        <div className="space-y-10">
          {modules.map(([modName, groups]) => {
            const label = modName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            const isModuleOpen = !collapsedModules.has(modName);
            return (
              <div key={modName} className="space-y-4">
                <button
                  type="button"
                  onClick={() => toggleModule(modName)}
                  className="flex items-center gap-3 w-full text-left"
                >
                  <h3 className="text-[12px] font-bold text-[#84908a] uppercase tracking-[0.1em]">
                    {label}
                  </h3>
                  <div className="flex-1 h-px bg-black/[0.06]" />
                  {isModuleOpen ? <ChevronUp className="w-4 h-4 text-[#84908a]" /> : <ChevronDown className="w-4 h-4 text-[#84908a]" />}
                </button>

                {isModuleOpen && (
                <div className="space-y-3">
                  {groups.map((group) => {
                    const isSelected = valueByKey.has(group.key) || group.isBaseCapability;
                    const currentValue = valueByKey.get(group.key);
                    const isExpanded = expandedKeys.has(group.key);
                    const risk = group.riskLevel || "standard";
                    const riskStyles = RISK_CONFIG[risk as keyof typeof RISK_CONFIG] || RISK_CONFIG.standard;

                    return (
                      <div
                        key={group.key}
                        className={cn(
                          "border rounded-[12px] overflow-hidden transition-all bg-white",
                          isSelected ? "border-[#0ea894]/40 bg-[#e7f6f2]/10" : "border-black/[0.08]"
                        )}
                      >
                        <div className="flex items-start p-4 gap-4">
                          <Checkbox
                            checked={isSelected}
                            disabled={isEditDisabled || group.isBaseCapability}
                            onCheckedChange={() => handleToggle(group, !!isSelected)}
                            className="mt-1 w-4.5 h-4.5 border-2 border-[#84908a] data-[state=checked]:border-[#0ea894] data-[state=checked]:bg-[#0ea894] shrink-0"
                          />
                          <div
                            className="flex-1 min-w-0 cursor-pointer select-none"
                            onClick={() => toggleExpand(group.key)}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={cn("text-[14px] font-semibold", isSelected ? "text-[#087f70]" : "text-[#0b100e]")}>
                                {group.name}
                              </p>
                              {group.isBaseCapability && (
                                <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600 hover:bg-slate-100 border-none">
                                  Always Included
                                </Badge>
                              )}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="cursor-help inline-flex">
                                      <Badge className={cn("text-[10px] font-medium border", riskStyles.color)} variant="outline">
                                        {riskStyles.label}
                                      </Badge>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-[200px] text-center">{riskStyles.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <p className="text-[13px] text-[#66706b] mt-1 pr-4">{group.description}</p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => toggleExpand(group.key)}
                            className="flex items-center gap-1.5 text-[12px] text-[#84908a] hover:text-[#303834] transition-colors shrink-0 mt-1 px-2 py-1"
                          >
                            Details
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-black/[0.05] bg-[#fcfdfc]">
                            {isSelected && !group.isBaseCapability && group.supportedScopes && group.supportedScopes.length > 0 && (
                              <div className="p-4 border-b border-black/[0.04] bg-[#f4f7f5]/50">
                                <div className="space-y-4 max-w-xl">
                                  <div>
                                    <label className="text-[12px] font-semibold text-[#303834] mb-1.5 block">
                                      Who can they access?
                                    </label>
                                    <Select
                                      disabled={isEditDisabled}
                                      value={currentValue?.scopeType || group.defaultScope || "company"}
                                      onValueChange={(val) => handleScopeChange(group.key, val as CapabilityScopeType)}
                                    >
                                      <SelectTrigger className="h-[42px] bg-white border-black/[0.1] text-[13px] rounded-[8px]">
                                        <SelectValue placeholder="Select scope" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {group.supportedScopes.map((scope) => (
                                          <SelectItem key={scope} value={scope} className="text-[13px]">
                                            {SCOPE_LABELS[scope] || scope}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <p className="text-[12px] text-[#84908a] mt-2">
                                      {SCOPE_DESCRIPTIONS[currentValue?.scopeType || group.defaultScope || "company"]}
                                    </p>
                                  </div>

                                  {currentValue?.scopeType === "department" && (
                                    <div className="bg-white border border-black/[0.08] rounded-[8px] p-3">
                                      <p className="text-[11px] font-semibold text-[#84908a] mb-2 uppercase tracking-[0.05em]">
                                        Select Departments
                                      </p>
                                      {departments.length === 0 ? (
                                        <p className="text-[12px] text-slate-400">No departments available.</p>
                                      ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                          {departments.map((dept) => {
                                            const isDeptSelected = currentValue.scopeConfig?.departmentIds?.includes(dept.departmentId);
                                            return (
                                              <label key={dept.departmentId} className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-md cursor-pointer transition-colors">
                                                <Checkbox
                                                  checked={isDeptSelected}
                                                  disabled={isEditDisabled}
                                                  onCheckedChange={() => handleDepartmentToggle(group.key, dept.departmentId)}
                                                  className="w-4 h-4"
                                                />
                                                <span className="text-[13px] text-[#303834] truncate">{dept.name || dept.departmentName || "Unnamed Department"}</span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {group.requiredCapabilityKeys && group.requiredCapabilityKeys.length > 0 && (
                              <div className="px-4 py-3 border-b border-black/[0.04]">
                                <p className="text-[12px] text-[#84908a] italic">
                                  Requires: {group.requiredCapabilityKeys.map((reqKey) => {
                                    const reqGroup = catalog.find(g => g.key === reqKey);
                                    return reqGroup?.name || reqKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                  }).join(', ')}. Dependencies are included automatically.
                                </p>
                              </div>
                            )}

                            <div className="p-4">
                              <p className="text-[11px] font-semibold text-[#84908a] mb-1 uppercase tracking-[0.06em]">
                                What this includes
                              </p>
                              {group.permissions && group.permissions.length > 0 ? (
                                <>
                                  <p className="text-[12px] text-[#84908a] mb-3">
                                    Selecting this capability grants the following actions.
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {group.permissions.map((p) => (
                                      <div key={p.permissionId} className="inline-flex items-center px-3 py-1.5 rounded-[6px] border border-black/[0.08] text-[12px] text-[#505a55] bg-white shadow-sm">
                                        {formatPermissionName(p.name)}
                                      </div>
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <p className="text-[12px] text-[#84908a] italic">
                                  This capability grants general access to the {group.module.replace(/_/g, ' ')} workflow. Additional specific actions may depend on other capabilities.
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!pendingSensitiveGroup}
        onClose={() => setPendingSensitiveGroup(null)}
        onConfirm={confirmSensitive}
        title="Assign Sensitive Capability"
        description={
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg text-red-800 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                You are assigning <strong>{pendingSensitiveGroup?.name}</strong>. 
                This is a sensitive capability — people with this access can make changes that affect financial data or manage other users.
              </p>
            </div>
            <p className="text-slate-600 text-sm">
              Make sure this person actually needs this level of access. Do you want to continue?
            </p>
          </div>
        }
      />
    </div>
  );
}
