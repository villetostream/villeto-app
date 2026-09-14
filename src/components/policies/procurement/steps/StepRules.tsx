"use client";

import { useState } from "react";
import { PlusCircle, Info, Settings2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPEND_PROGRAM_GROUPS, getGroupConfig, getActionStyle, buildConditionSummary, getActionLabel } from "../constants";
import type { SpendProgramRule, SpendProgramGroupDraft, SpendProgramGroup, SpendProgramDraft } from "../types";
import { RuleConfigurationModal } from "./RuleConfigurationModal";
import { useGetProcurementCategories } from "@/queries/procurement/purchase-requests";
import { useExceptionFormatter } from "../hooks/useExceptionFormatter";
import { toast } from "sonner";

export interface StepRulesProps {
  draft: SpendProgramDraft;
  onChange: (patch: Partial<{ groups: SpendProgramGroupDraft[] }>) => void;
  activeStages?: string[];
}

// Simple toggle switch component
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus:outline-none",
        checked ? "bg-[#087f70]" : "bg-gray-200"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transform transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

export function StepRules({ draft, onChange, activeStages }: StepRulesProps) {
  const visibleGroups = activeStages && activeStages.length > 0
    ? SPEND_PROGRAM_GROUPS.filter(g => activeStages.includes(g.value))
    : SPEND_PROGRAM_GROUPS;

  const [activeTab, setActiveTab] = useState<SpendProgramGroup>(
    () => (visibleGroups[0]?.value ?? "pr_submission")
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SpendProgramRule | undefined>(undefined);

  const { formatExceptionSummary } = useExceptionFormatter();

  const { data: categoriesData } = useGetProcurementCategories();
  const allCategories = categoriesData?.data || [];

  const activeGroupRules = draft.groups.find((g) => g.group === activeTab)?.rules || [];

  const handleSaveRule = (rule: SpendProgramRule) => {
    const updatedGroups = draft.groups.map((g) => {
      if (g.group !== activeTab) return g;
      const exists = g.rules.some(r => r.id === rule.id);
      if (exists) {
        return { ...g, rules: g.rules.map(r => r.id === rule.id ? rule : r) };
      }
      return { ...g, rules: [...g.rules, rule] };
    });
    onChange({ groups: updatedGroups });
    setIsModalOpen(false);
    setEditingRule(undefined);
  };

  const handleDeleteRule = (ruleId: string) => {
    const updatedGroups = draft.groups.map((g) => {
      if (g.group !== activeTab) return g;
      return { ...g, rules: g.rules.filter(r => r.id !== ruleId) };
    });
    onChange({ groups: updatedGroups });
  };

  const handleToggleRule = (ruleId: string) => {
    // Check if we're trying to turn off the last active rule
    const ruleToToggle = draft.groups.flatMap(g => g.rules).find(r => r.id === ruleId);
    if (ruleToToggle && (ruleToToggle.isActive ?? true)) {
      const totalActiveRules = draft.groups.flatMap(g => g.rules).filter(r => r.isActive ?? true).length;
      if (totalActiveRules <= 1) {
        toast.error("At least one rule must remain active across all stages.");
        return;
      }
    }

    const updatedGroups = draft.groups.map((g) => {
      if (g.group !== activeTab) return g;
      return {
        ...g,
        rules: g.rules.map(r =>
          r.id === ruleId ? { ...r, isActive: !(r.isActive ?? true) } : r
        ),
      };
    });
    onChange({ groups: updatedGroups });
  };

  const openAddRule = () => {
    setEditingRule(undefined);
    setIsModalOpen(true);
  };

  const openEditRule = (rule: SpendProgramRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* ── Sticky header: title, tabs AND add-rule bar ── */}
      <div className="sticky top-0 bg-white z-10 pt-8 pb-3 border-b border-black/[0.05]">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-[#10231d]">Configure Rules</h2>
          <p className="text-sm text-[#68726d] mt-1">
            Define the checks and actions that apply during different stages of the procurement process.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#f9faf9] p-1 rounded-xl mb-4 self-start inline-flex">
          {visibleGroups.map((group) => {
            const isActive = activeTab === group.value;
            const ruleCount = draft.groups.find(g => g.group === group.value)?.rules.length || 0;
            return (
              <button
                key={group.value}
                onClick={() => setActiveTab(group.value)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                  isActive
                    ? "bg-white text-[#10231d] shadow-sm border border-black/[0.04]"
                    : "text-[#68726d] hover:text-[#10231d]"
                )}
              >
                {group.label}
                {ruleCount > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-bold",
                    isActive ? "bg-[#087f70]/10 text-[#087f70]" : "bg-black/5 text-[#84908a]"
                  )}>
                    {ruleCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Group subtitle + Add Rule — always visible */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 text-[#10231d]">
            {(() => {
              const Icon = getGroupConfig(activeTab)?.icon || Settings2;
              return <Icon className="w-4 h-4 text-[#087f70]" />;
            })()}
            <h3 className="font-medium text-sm">{getGroupConfig(activeTab)?.subtitle}</h3>
          </div>
          <button
            onClick={openAddRule}
            className="h-9 px-4 rounded-lg bg-white border border-[#087f70]/30 text-[#087f70] hover:bg-[#087f70]/5 font-semibold text-xs transition-colors flex items-center gap-2"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add Rule
          </button>
        </div>
      </div>

      {/* ── Scrollable rules list ── */}
      <div className="mt-4 space-y-3 pb-8">
          {activeGroupRules.length === 0 ? (
            <div className="border border-dashed border-black/[0.1] rounded-xl p-12 flex flex-col items-center justify-center text-center bg-[#f9faf9]/50">
              <div className="w-12 h-12 rounded-full bg-white border border-black/[0.06] flex items-center justify-center mb-4 shadow-sm">
                <Settings2 className="w-5 h-5 text-[#84908a]" />
              </div>
              <h4 className="text-sm font-semibold text-[#10231d] mb-1">No rules configured</h4>
              <p className="text-[13px] text-[#68726d] max-w-[260px] mb-6">
                Add a rule to enforce controls during the {getGroupConfig(activeTab)?.shortLabel} stage.
              </p>
              <button
                onClick={openAddRule}
                className="h-9 px-4 rounded-lg bg-[#087f70] text-white hover:opacity-90 font-semibold text-xs transition-opacity flex items-center gap-2 shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add First Rule
              </button>
            </div>
          ) : (
            activeGroupRules.map((rule) => {
              const actionStyle = getActionStyle(rule.action);
              const isRuleActive = rule.isActive ?? true;
              return (
                <div
                  key={rule.id}
                  className={cn(
                    "group relative border rounded-xl p-5 bg-white transition-all",
                    isRuleActive
                      ? "border-black/[0.08] hover:border-[#087f70]/30"
                      : "border-black/[0.05] bg-[#fafaf9] opacity-60"
                  )}
                >
                  {/* Toggle + Edit + Delete */}
                  <div className="absolute right-4 top-4 flex items-center gap-1.5">
                    {!!(draft.programId || draft.draftId) && (
                      <div className="mr-1 flex items-center">
                        <Toggle checked={isRuleActive} onChange={() => handleToggleRule(rule.id)} />
                      </div>
                    )}
                    <button
                      onClick={() => openEditRule(rule)}
                      className="p-1.5 rounded-md text-[#84908a] hover:text-[#087f70] hover:bg-[#087f70]/10 transition-colors"
                      title="Edit rule"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 rounded-md text-[#84908a] hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pr-36">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-[15px] font-semibold text-[#10231d]">{rule.displayName}</h4>
                      {!isRuleActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wide">
                          Disabled
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 mt-3">
                      {/* Condition Summary */}
                      {Object.keys(rule.conditionConfig).length > 0 && (
                        <div className="text-[13px] text-[#68726d] flex items-start gap-2">
                          <span className="font-medium text-[#10231d]">Condition:</span>
                          <span>{buildConditionSummary(rule.conditionConfig)}</span>
                        </div>
                      )}

                      {/* Action Summary */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[13px] font-medium text-[#10231d]">Action:</span>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
                          style={{ color: actionStyle.color, backgroundColor: actionStyle.bgColor }}
                        >
                          {getActionLabel(rule.action)}
                        </span>
                      </div>

                      {/* Applies To */}
                      <div className="text-[13px] text-[#84908a] mt-2 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        Applies to: {(() => {
                          if (rule.appliesToAll) return "All selected categories";
                          if (rule.appliesToCategoryIds.length === 0) return "No categories";
                          return rule.appliesToCategoryIds
                            .map(id => allCategories.find((c: any) => c.categoryId === id)?.name || id)
                            .filter(Boolean)
                            .join(", ");
                        })()}
                      </div>

                      {/* Exception Summary */}
                      {Object.keys(rule.exceptionConfig || {}).length > 0 && formatExceptionSummary(rule.exceptionConfig) && (
                        <div className="text-[13px] text-[#68726d] flex flex-col gap-1 mt-2 pt-2 border-t border-black/[0.04]">
                          {Object.keys(rule.exceptionConfig.conditionConfig || {}).length > 0 && (
                            <div className="flex items-start gap-2">
                              <span className="font-medium text-[#10231d]">Exception Condition:</span>
                              <span>{buildConditionSummary(rule.exceptionConfig.conditionConfig)}</span>
                            </div>
                          )}
                          {rule.exceptionConfig.action && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#10231d]">Exception Action:</span>
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
                                style={{
                                  color: getActionStyle(rule.exceptionConfig.action).color,
                                  backgroundColor: getActionStyle(rule.exceptionConfig.action).bgColor
                                }}
                              >
                                {getActionLabel(rule.exceptionConfig.action)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-start gap-2 mt-0.5">
                            <span className="font-medium text-[#10231d]">Exceptions:</span>
                            <span>{formatExceptionSummary(rule.exceptionConfig)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      <RuleConfigurationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        group={activeTab}
        draft={draft}
        existingRule={editingRule}
        onSave={handleSaveRule}
      />
    </div>
  );
}
