"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { X, Loader2, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetSpendProgramRuleDefinitions } from "@/queries/procurement/policies";
import { useGetProcurementCategories } from "@/queries/procurement/purchase-requests";
import { useLegalEntities } from "@/queries/legal-entities";
import { useGetAllDepartmentsApi } from "@/queries/departments/get-all-departments";
import { useGetManagementLevelsApi, useGetJobGradesApi } from "@/queries/companies/get-company-references";
import type { SpendProgramRule, SpendProgramDraft, SpendProgramGroup, RuleDefinition, ProcurementCategory } from "../types";
import { emptySpendProgramRule, emptyRuleExceptionConfig } from "../types";
import { getActionLabel, CONDITION_FIELD_LABELS, CURRENCY_OPTIONS } from "../constants";
import { cn } from "@/lib/utils";

const formatAmount = (value: number | string | undefined) => {
  if (value === undefined || value === null || value === "") return "";
  const str = String(value).replace(/,/g, "");
  if (isNaN(Number(str))) return value;
  const parts = str.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

// ─── Compact Multi-Select Chip Component ─────────────────────────────────────

function MultiSelectField({
  label,
  placeholder,
  options,
  selected,
  onToggle,
  getLabel,
  getId,
}: {
  label: string;
  placeholder: string;
  options: any[];
  selected: string[];
  onToggle: (id: string) => void;
  getLabel: (item: any) => string;
  getId: (item: any) => string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const selectedLabels = options.filter(o => selected.includes(getId(o))).map(getLabel);

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <Label className="text-[12px] font-medium text-[#68726d]">{label}</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between gap-2 h-10 px-3 bg-[#f9faf9] border border-black/[0.08] rounded-lg text-[13px] text-left transition-colors hover:border-black/[0.15]"
        >
          <span className={cn("flex-1 truncate", selected.length === 0 ? "text-[#84908a]" : "text-[#10231d]")}>
            {selected.length === 0
              ? placeholder
              : selected.length === 1
              ? selectedLabels[0]
              : `${selected.length} selected`}
          </span>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-[#84908a] shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-[#84908a] shrink-0" />}
        </button>

        {open && (
          <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 bg-white border border-black/[0.08] rounded-xl shadow-lg max-h-48 overflow-y-auto py-1">
            {options.length === 0 ? (
              <p className="text-[12px] text-[#84908a] text-center py-3">No options available</p>
            ) : (
              options.map(opt => {
                const id = getId(opt);
                const isChecked = selected.includes(id);
                return (
                  <label
                    key={id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-[#f9faf9] cursor-pointer"
                    onClick={() => onToggle(id)}
                  >
                    <Checkbox
                      checked={isChecked}
                      className="shrink-0"
                    />
                    <span className="text-[13px] text-[#10231d] truncate">{getLabel(opt)}</span>
                  </label>
                );
              })
            )}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {options.filter(o => selected.includes(getId(o))).map(opt => (
            <span
              key={getId(opt)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f0fbf9] text-[#087f70] text-[11px] font-medium"
            >
              {getLabel(opt)}
              <button type="button" onClick={() => onToggle(getId(opt))}>
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export interface RuleConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: SpendProgramGroup;
  draft: SpendProgramDraft;
  existingRule?: SpendProgramRule;
  onSave: (rule: SpendProgramRule) => void;
}

export function RuleConfigurationModal({
  isOpen,
  onClose,
  group,
  draft,
  existingRule,
  onSave,
}: RuleConfigurationModalProps) {
  const { data: ruleDefsResponse, isLoading: isLoadingDefs } = useGetSpendProgramRuleDefinitions(group);
  const { data: categoriesResponse } = useGetProcurementCategories();
  const { data: legalEntitiesResponse } = useLegalEntities();
  const { data: departmentsResponse } = useGetAllDepartmentsApi();
  const { data: mgmtLevelsResponse } = useGetManagementLevelsApi();
  const { data: jobGradesResponse } = useGetJobGradesApi();

  const ruleDefinitions = ruleDefsResponse?.data || [];
  const legalEntities = legalEntitiesResponse?.data || [];
  const departments = departmentsResponse?.data || [];
  const managementLevels = mgmtLevelsResponse?.data?.managementLevels || [];
  const jobGrades = jobGradesResponse?.data?.jobGrades || [];

  const managementGradeOptions = useMemo(() => {
    const ml = managementLevels.map(m => ({
      value: String(m.managementLevelId),
      label: m.name || m.code || "Unnamed Management Level",
      type: "management_level"
    }));
    const jg = jobGrades.map(j => ({
      value: String(j.jobGradeId),
      label: j.name || j.code || "Unnamed Job Grade",
      type: "job_grade"
    }));
    return [...ml, ...jg].sort((a, b) => a.label.localeCompare(b.label));
  }, [managementLevels, jobGrades]);

  const [rule, setRule] = useState<SpendProgramRule>(emptySpendProgramRule(0));
  const [showExceptions, setShowExceptions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (existingRule) {
        setRule({
          ...existingRule,
          legalEntityIds: existingRule.legalEntityIds || []
        });
        setShowExceptions(
          existingRule.exceptionConfig.departmentIds.length > 0 ||
          existingRule.exceptionConfig.managementLevelIds.length > 0 ||
          existingRule.exceptionConfig.jobGradeIds.length > 0
        );
      } else {
        setRule(emptySpendProgramRule(draft.groups.find(g => g.group === group)?.rules.length || 0));
        setShowExceptions(false);
      }
    }
  }, [isOpen, existingRule, group, draft]);

  // Categories scoped to those selected in Step 2
  const availableCategories = useMemo(() => {
    if (!categoriesResponse?.data) return [];
    const flatten = (cats: ProcurementCategory[]): ProcurementCategory[] => {
      let result: ProcurementCategory[] = [];
      cats.forEach(c => {
        result.push(c);
        if (c.children?.length) result = result.concat(flatten(c.children));
      });
      return result;
    };
    return flatten(categoriesResponse.data).filter(c => draft.categoryIds.includes(c.categoryId));
  }, [categoriesResponse?.data, draft.categoryIds]);

  const selectedDef = ruleDefinitions.find(d => d.ruleType === rule.ruleType);

  // All condition fields defined in the schema must have a non-empty value
  const hasAllConditionsFilled = !selectedDef?.conditionSchema ||
    Object.keys(selectedDef.conditionSchema).every(key => {
      const val = rule.conditionConfig[key];
      return val !== undefined && val !== "" && val !== null;
    });

  const isFormValid = !!rule.ruleType && !!rule.action && hasAllConditionsFilled;

  const handleRuleTypeChange = (ruleType: string) => {
    const def = ruleDefinitions.find(d => d.ruleType === ruleType);
    if (!def) return;
    setRule(prev => ({
      ...prev,
      ruleType: def.ruleType,
      ruleDefinitionId: def.procurementSpendProgramRuleDefinitionId,
      displayName: def.name,
      description: def.description,
      conditionConfig: {},
      action: def.allowedActions[0] || "",
      actionConfig: {},
      exceptionConfig: {
        ...prev.exceptionConfig,
        conditionConfig: {},
        action: def.allowedActions[0] || "",
        actionConfig: {},
      }
    }));
  };

  const updateConditionConfig = (key: string, value: any) => {
    setRule(prev => ({ ...prev, conditionConfig: { ...prev.conditionConfig, [key]: value } }));
  };

  const updateExceptionConditionConfig = (key: string, value: any) => {
    setRule(prev => ({
      ...prev,
      exceptionConfig: {
        ...prev.exceptionConfig,
        conditionConfig: { ...prev.exceptionConfig.conditionConfig, [key]: value }
      }
    }));
  };

  const toggleException = (field: keyof typeof rule.exceptionConfig, id: string) => {
    setRule(prev => {
      const current = prev.exceptionConfig[field] as string[];
      const updated = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
      return { ...prev, exceptionConfig: { ...prev.exceptionConfig, [field]: updated } };
    });
  };

  const toggleLegalEntity = (id: string) => {
    setRule(prev => {
      const current = prev.legalEntityIds || [];
      const updated = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
      return { ...prev, legalEntityIds: updated };
    });
  };
  const toggleDepartment = (id: string) => toggleException("departmentIds", id);

  const availableCurrencies = useMemo(() => {
    const entityIds = rule.legalEntityIds?.length > 0 
      ? rule.legalEntityIds 
      : legalEntities.map(e => e.legalEntityId);
      
    const allowedCurrencyCodes = new Set(
      legalEntities
        .filter(e => entityIds.includes(e.legalEntityId))
        .map(e => e.baseCurrency)
    );
    
    if (allowedCurrencyCodes.size === 0) return CURRENCY_OPTIONS;
    return CURRENCY_OPTIONS.filter(c => allowedCurrencyCodes.has(c.value));
  }, [rule.legalEntityIds, legalEntities]);

  const selectedRoles = [
    ...(rule.exceptionConfig.jobGradeIds || []),
    ...(rule.exceptionConfig.managementLevelIds || [])
  ];

  const toggleRole = (id: string) => {
    const option = managementGradeOptions.find(o => o.value === id);
    if (!option) return;
    if (option.type === "job_grade") {
      toggleException("jobGradeIds", id);
    } else {
      toggleException("managementLevelIds", id);
    }
  };

  const handleSave = () => {
    if (!rule.ruleType || !rule.action) return;
    onSave(rule);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden bg-white rounded-2xl">
        <DialogHeader className="px-6 py-5 border-b border-black/[0.06] flex flex-row items-center justify-between sticky top-0 bg-white z-10">
          <DialogTitle className="text-lg font-semibold text-[#10231d]">
            {existingRule ? "Edit Rule" : "Add Rule"}
          </DialogTitle>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-[#68726d] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col gap-6">
          {isLoadingDefs ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#087f70]" />
            </div>
          ) : (
            <>
              {/* Rule Type */}
              <div className="space-y-2 pt-2">
                <Label className="text-[13px] font-semibold text-[#10231d]">Rule Type</Label>
                <Select value={rule.ruleType} onValueChange={handleRuleTypeChange} disabled={!!existingRule}>
                  <SelectTrigger className="w-full h-11 bg-[#f9faf9] border-black/[0.08] rounded-xl">
                    <SelectValue placeholder="Select a rule..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ruleDefinitions.map(def => (
                      <SelectItem key={def.ruleType} value={def.ruleType}>{def.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDef?.description && (
                  <p className="text-[12px] text-[#68726d] flex gap-2 items-start bg-[#f9faf9] p-3 rounded-lg border border-black/[0.04]">
                    <Info className="w-4 h-4 text-[#84908a] shrink-0 mt-0.5" />
                    <span>{selectedDef.description}</span>
                  </p>
                )}
              </div>

              {selectedDef && (
                <>
                  {/* Legal Entity (Scope) */}
                  <div className="space-y-3 pt-4 border-t border-black/[0.06]">
                    <div>
                      <Label className="text-[13px] font-semibold text-[#10231d]">Legal Entity</Label>
                      <p className="text-[12px] text-[#68726d] mt-1 mb-3">Which entities does this rule apply to? Leave empty to apply to all.</p>
                    </div>
                    <MultiSelectField
                      label=""
                      placeholder="All entities"
                      options={legalEntities}
                      selected={rule.legalEntityIds || []}
                      onToggle={toggleLegalEntity}
                      getLabel={(e) => e.legalName}
                      getId={(e) => e.legalEntityId}
                    />
                  </div>

                  {/* Condition (Root) */}
                  {Object.keys(selectedDef.conditionSchema).length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-black/[0.06]">
                      <Label className="text-[12px] font-semibold text-[#10231d] uppercase tracking-wide">Condition (IF)</Label>
                      <div className="p-4 border border-black/[0.08] rounded-xl bg-white grid grid-cols-2 gap-4">
                        {Object.entries(selectedDef.conditionSchema).map(([key, type]) => (
                          <div key={key} className="space-y-1.5">
                            <Label className="text-[12px] font-medium text-[#68726d]">{CONDITION_FIELD_LABELS[key] || key}</Label>
                            {key === "currency" ? (
                              <Select value={rule.conditionConfig[key] || ""} onValueChange={(val) => updateConditionConfig(key, val)}>
                                <SelectTrigger className="w-full h-10 bg-[#f9faf9] border-black/[0.08] rounded-lg">
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableCurrencies.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            ) : type === "number" ? (
                              <Input
                                type="text"
                                value={formatAmount(rule.conditionConfig[key])}
                                onChange={(e) => {
                                  const rawValue = e.target.value.replace(/,/g, "");
                                  if (rawValue === "" || !isNaN(Number(rawValue))) {
                                    updateConditionConfig(key, rawValue === "" ? "" : Number(rawValue));
                                  }
                                }}
                                className="h-10 bg-[#f9faf9] border-black/[0.08] rounded-lg"
                                placeholder="Enter value..."
                              />
                            ) : type === "array" ? (
                              <Input value={(rule.conditionConfig[key] || []).join(", ")} onChange={(e) => updateConditionConfig(key, e.target.value.split(",").map(s => s.trim()))} className="h-10 bg-[#f9faf9] border-black/[0.08] rounded-lg" placeholder="Comma separated values..." />
                            ) : type === "attachment" ? (
                              <Input value={rule.conditionConfig[key] || ""} onChange={(e) => updateConditionConfig(key, e.target.value)} className="h-10 bg-[#f9faf9] border-black/[0.08] rounded-lg" placeholder="e.g. pdf, docx, image/*" />
                            ) : (
                              <Input value={rule.conditionConfig[key] || ""} onChange={(e) => updateConditionConfig(key, e.target.value)} className="h-10 bg-[#f9faf9] border-black/[0.08] rounded-lg" placeholder="Enter value..." />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action (Root) */}
                  <div className="space-y-3 pt-4 border-t border-black/[0.06]">
                    <Label className="text-[12px] font-semibold text-[#10231d] uppercase tracking-wide">Action (THEN)</Label>
                    <Select value={rule.action} onValueChange={(val) => setRule(prev => ({ ...prev, action: val }))}>
                      <SelectTrigger className="w-full h-11 bg-white border-black/[0.08] rounded-xl">
                        <SelectValue placeholder="Select an action..." />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedDef.allowedActions.map((action: string) => (
                          <SelectItem key={action} value={action}>{getActionLabel(action)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Applies To (Categories) */}
                  <div className="space-y-3 pt-4 border-t border-black/[0.06]">
                    <Label className="text-[13px] font-semibold text-[#10231d]">Applies to</Label>
                    <div className="space-y-3 p-4 border border-black/[0.08] rounded-xl bg-white">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <Checkbox checked={rule.appliesToAll} onCheckedChange={(c) => setRule(prev => ({ ...prev, appliesToAll: !!c, appliesToCategoryIds: [] }))} />
                        <span className="text-[13px] font-medium text-[#10231d]">All selected categories</span>
                      </label>
                      {!rule.appliesToAll && (
                        <div className="pl-7 space-y-2 mt-1 max-h-40 overflow-y-auto">
                          {availableCategories.length === 0 ? (
                            <p className="text-[12px] text-[#84908a] py-2">No categories selected in Step 2.</p>
                          ) : availableCategories.map(cat => (
                            <label key={cat.categoryId} className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-[#f9faf9] rounded-md">
                              <Checkbox checked={rule.appliesToCategoryIds.includes(cat.categoryId)} onCheckedChange={(c) => {
                                if (c) setRule(prev => ({ ...prev, appliesToCategoryIds: [...prev.appliesToCategoryIds, cat.categoryId] }));
                                else setRule(prev => ({ ...prev, appliesToCategoryIds: prev.appliesToCategoryIds.filter(id => id !== cat.categoryId) }));
                              }} />
                              <span className="text-[13px] text-[#10231d]">{cat.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Exceptions */}
                  <div className="bg-[#f9faf9] border border-black/[0.08] rounded-xl mt-4 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-[14px] font-semibold text-[#10231d]">Except WHEN</h3>
                        <p className="text-[12px] text-[#68726d] mt-1">
                          Exclude specific groups from being bound by this policy.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowExceptions(v => !v)}
                        className="text-[13px] font-semibold text-[#087f70] hover:opacity-80 transition-opacity"
                      >
                        {showExceptions ? "Hide Exceptions" : "Add Exception"}
                      </button>
                    </div>
                    
                    {showExceptions && (
                      <div className="mt-4 pt-4 border-t border-black/[0.04] flex flex-col space-y-4">
                        <MultiSelectField
                          label="Departments"
                          placeholder="Select departments..."
                          options={departments}
                          selected={rule.exceptionConfig.departmentIds}
                          onToggle={toggleDepartment}
                          getLabel={(d) => d.name || d.departmentName}
                          getId={(d) => d.departmentId}
                        />
                        <MultiSelectField
                          label="Roles (Job Grades & Management Levels)"
                          placeholder="Select roles..."
                          options={managementGradeOptions}
                          selected={selectedRoles}
                          onToggle={toggleRole}
                          getLabel={(o) => o.label}
                          getId={(o) => o.value}
                        />

                        {/* Condition (Exception) */}
                        {Object.keys(selectedDef.conditionSchema).length > 0 && (
                          <div className="space-y-3 pt-2">
                            <Label className="text-[12px] font-semibold text-[#10231d] uppercase tracking-wide">Exception Condition (IF)</Label>
                            <div className="p-4 border border-black/[0.08] rounded-xl bg-white grid grid-cols-2 gap-4">
                              {Object.entries(selectedDef.conditionSchema).map(([key, type]) => (
                                <div key={key} className="space-y-1.5">
                                  <Label className="text-[12px] font-medium text-[#68726d]">{CONDITION_FIELD_LABELS[key] || key}</Label>
                                  {key === "currency" ? (
                                    <Select value={rule.exceptionConfig.conditionConfig[key] || ""} onValueChange={(val) => updateExceptionConditionConfig(key, val)}>
                                      <SelectTrigger className="w-full h-10 bg-[#f9faf9] border-black/[0.08] rounded-lg">
                                        <SelectValue placeholder="Select currency" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {availableCurrencies.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  ) : type === "number" ? (
                                    <Input
                                      type="text"
                                      value={formatAmount(rule.exceptionConfig.conditionConfig[key])}
                                      onChange={(e) => {
                                        const rawValue = e.target.value.replace(/,/g, "");
                                        if (rawValue === "" || !isNaN(Number(rawValue))) {
                                          updateExceptionConditionConfig(key, rawValue === "" ? "" : Number(rawValue));
                                        }
                                      }}
                                      className="h-10 bg-[#f9faf9] border-black/[0.08] rounded-lg"
                                      placeholder="Enter value..."
                                    />
                                  ) : type === "array" ? (
                                    <Input value={(rule.exceptionConfig.conditionConfig[key] || []).join(", ")} onChange={(e) => updateExceptionConditionConfig(key, e.target.value.split(",").map(s => s.trim()))} className="h-10 bg-[#f9faf9] border-black/[0.08] rounded-lg" placeholder="Comma separated values..." />
                                  ) : (
                                    <Input value={rule.exceptionConfig.conditionConfig[key] || ""} onChange={(e) => updateExceptionConditionConfig(key, e.target.value)} className="h-10 bg-[#f9faf9] border-black/[0.08] rounded-lg" placeholder="Enter value..." />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action (Exception) */}
                        <div className="space-y-3 pt-2">
                          <Label className="text-[12px] font-semibold text-[#10231d] uppercase tracking-wide">Exception Action (THEN)</Label>
                          <Select value={rule.exceptionConfig.action} onValueChange={(val) => setRule(prev => ({ ...prev, exceptionConfig: { ...prev.exceptionConfig, action: val } }))}>
                            <SelectTrigger className="w-full h-11 bg-white border-black/[0.08] rounded-xl">
                              <SelectValue placeholder="Select an action..." />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from(new Set(["allow", "auto_approve", ...selectedDef.allowedActions])).map((action: string) => (
                                <SelectItem key={action} value={action}>{getActionLabel(action)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-black/[0.06] bg-[#f9faf9] flex items-center justify-end gap-3 rounded-b-2xl">
          <button onClick={onClose} className="h-10 px-5 rounded-xl border border-black/[0.08] bg-white text-[#10231d] hover:bg-[#f9faf9] font-medium text-sm transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isFormValid}
            className="h-10 px-6 rounded-xl bg-[#087f70] text-white hover:opacity-90 font-semibold text-sm transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Rule
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
