"use client";

import { useState, useMemo } from "react";
import { CheckCircle2, ChevronDown, Info, AlertTriangle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SPEND_PROGRAM_GROUPS,
  getGroupConfig,
  getActionLabel,
  getActionStyle,
  buildConditionSummary
} from "../constants";
import type { SpendProgramDraft, SpendProgramGroup } from "../types";
import { cn } from "@/lib/utils";
import { useGetProcurementCategories } from "@/queries/procurement/purchase-requests";
import { useExceptionFormatter } from "../hooks/useExceptionFormatter";

export interface StepReviewProps {
  draft: SpendProgramDraft;
}

type SimulationResult = {
  ruleName: string;
  action: string;
  reason: string;
  style: { color: string; bgColor: string };
};

export function StepReview({ draft }: StepReviewProps) {
  const [activeTab, setActiveTab] = useState<SpendProgramGroup>("pr_submission");
  const [simAmount, setSimAmount] = useState("15,000");
  const [simQty, setSimQty] = useState("25");
  const [simCategory, setSimCategory] = useState("");
  const [hasRun, setHasRun] = useState(false);
  const [isSimDirty, setIsSimDirty] = useState(true);
  const [simResults, setSimResults] = useState<SimulationResult[]>([]);

  const { formatExceptionSummary } = useExceptionFormatter();
  const { data: categoriesResponse } = useGetProcurementCategories();
  
  const allCategories = useMemo(() => {
    if (!categoriesResponse?.data) return [];
    const flatten = (cats: any[]): any[] => {
      let result: any[] = [];
      cats.forEach(c => {
        result.push(c);
        if (c.children?.length) result = result.concat(flatten(c.children));
      });
      return result;
    };
    return flatten(categoriesResponse.data);
  }, [categoriesResponse]);

  const selectedCategories = useMemo(() => {
    return allCategories.filter(c => draft.categoryIds.includes(c.categoryId));
  }, [allCategories, draft.categoryIds]);

  // Set default category for simulator
  useMemo(() => {
    if (selectedCategories.length > 0 && !simCategory) {
      setSimCategory(selectedCategories[0].categoryId);
    }
  }, [selectedCategories, simCategory]);

  const runSimulation = () => {
    const results: SimulationResult[] = [];
    const amount = Number(simAmount.replace(/,/g, ""));
    const qty = Number(simQty.replace(/,/g, ""));
    
    draft.groups.forEach(group => {
      group.rules.forEach(rule => {
        if (!rule.appliesToAll && !rule.appliesToCategoryIds.includes(simCategory)) {
          return;
        }
        
        let triggered = false;
        let isException = false;
        const reasons: string[] = [];
        const cond = rule.conditionConfig;
        const exc = rule.exceptionConfig?.conditionConfig || {};
        
        // First check if exception conditions match (if any exist)
        if (Object.keys(exc).length > 0) {
          let excMatches = true;
          if (exc.amount !== undefined && amount <= Number(exc.amount)) excMatches = false;
          if (exc.quantity !== undefined && qty <= Number(exc.quantity)) excMatches = false;
          
          if (excMatches) {
             isException = true;
          }
        }

        if (!isException) {
          if (cond.amount !== undefined) {
            if (amount > Number(cond.amount)) {
              triggered = true;
              reasons.push(`Amount exceeds limit`);
            }
          }
          if (cond.quantity !== undefined) {
            if (qty > Number(cond.quantity)) {
              triggered = true;
              reasons.push(`Quantity > ${cond.quantity}`);
            }
          }
          if (Object.keys(cond).length === 0) {
            triggered = true;
            reasons.push("Rule always applies");
          }
        } else {
          // If exception applies, trigger the exception action instead!
          if (rule.exceptionConfig?.action) {
             results.push({
               ruleName: `${rule.displayName} (Exception)`,
               action: rule.exceptionConfig.action,
               reason: "Matched exception override",
               style: getActionStyle(rule.exceptionConfig.action)
             });
          }
        }
        
        if (triggered) {
          results.push({
            ruleName: rule.displayName,
            action: rule.action,
            reason: reasons.join(" AND "),
            style: getActionStyle(rule.action)
          });
        }
      });
    });
    
    setSimResults(results);
    setHasRun(true);
    setIsSimDirty(false);
  };

  const activeGroupRules = draft.groups.find(g => g.group === activeTab)?.rules || [];

  return (
    <div className="flex items-start gap-8 max-w-6xl mx-auto pb-20 relative">
      {/* Left Column: Review details */}
      <div className="flex-1 max-w-2xl flex flex-col gap-5">
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-white pt-8 pb-4">
          <h2 className="text-[28px] font-bold text-[#0f211b] mb-1 tracking-tight">Review & Simulate</h2>
          <p className="text-[14px] text-[#5c6964]">
            Define who must approve this policy before it can be activated.
          </p>
        </div>

        <div className="border border-black/[0.08] rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="text-[12px] font-bold text-gray-600 uppercase tracking-wider mb-5">
            SUBMISSION POLICY DETAILS
          </h3>

          <div className="space-y-4">
            {/* Details Card */}
            <div className="rounded-[12px] border border-black/[0.06] bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  NAME & DESCRIPTION
                </h4>
                <p className="text-[14px] font-bold text-[#10231d]">{draft.name || "Untitled Program"}</p>
                {draft.description && (
                  <p className="text-[13px] text-gray-600 leading-relaxed">{draft.description}</p>
                )}
              </div>
            </div>

            {/* Applies To */}
            <div className="rounded-[12px] border border-black/[0.06] bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                APPLIES TO
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedCategories.length > 0 ? (
                  selectedCategories.map(cat => (
                    <span key={cat.categoryId} className="inline-flex items-center px-3 py-1 rounded-full bg-[#e6f2f0] text-[#087f70] text-[12px] font-semibold">
                      {cat.name}
                    </span>
                  ))
                ) : (
                  <span className="text-[12px] text-[#84908a]">No categories selected</span>
                )}
              </div>
            </div>

            {/* Rules Card */}
            <div className="rounded-[12px] border border-black/[0.06] bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                ENFORCEMENT RULES
              </h4>
              
              <div className="flex bg-[#f1f2f1] p-1 rounded-xl w-fit mb-5">
                {SPEND_PROGRAM_GROUPS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setActiveTab(g.value)}
                    className={cn(
                      "px-5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200",
                      activeTab === g.value
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-900 hover:bg-black/5"
                    )}
                  >
                    {g.shortLabel}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {activeGroupRules.length === 0 ? (
                  <p className="text-[12px] text-[#84908a] italic">
                    No rules configured for this stage.
                  </p>
                ) : (
                  activeGroupRules.map(rule => {
                    return (
                      <div key={rule.id} className="border border-black/[0.06] rounded-xl p-4 bg-white shadow-sm">
                        <h5 className="font-bold text-[14px] text-[#10231d] mb-1.5">{rule.displayName}</h5>
                        
                        <div className="text-[13px] text-gray-600 space-y-1 mb-2">
                          {Object.keys(rule.conditionConfig).length > 0 && (
                            <p>
                              {buildConditionSummary(rule.conditionConfig)}
                            </p>
                          )}
                          <p className="flex items-center gap-1.5 font-medium text-[#10231d]">
                            {getActionLabel(rule.action)}
                          </p>
                        </div>

                        <div className="text-[11px] text-gray-500 mt-2 space-y-1">
                          <p>
                            Applies to: {(() => {
                              if (rule.appliesToAll) return "All selected categories";
                              if (rule.appliesToCategoryIds.length === 0) return "No categories";
                              const names = rule.appliesToCategoryIds
                                .map(id => allCategories.find((c: any) => c.categoryId === id)?.name || id)
                                .filter(Boolean);
                              return names.join(", ");
                            })()}
                          </p>
                          {Object.keys(rule.exceptionConfig || {}).length > 0 && formatExceptionSummary(rule.exceptionConfig) && (
                            <div className="mt-2 pt-2 border-t border-black/[0.04] flex flex-col gap-1">
                              {Object.keys(rule.exceptionConfig.conditionConfig || {}).length > 0 && (
                                <p>
                                  <span className="font-semibold text-gray-700">Exception Condition:</span> {buildConditionSummary(rule.exceptionConfig.conditionConfig)}
                                </p>
                              )}
                              {rule.exceptionConfig.action && (
                                <p className="flex items-center gap-1.5">
                                  <span className="font-semibold text-gray-700">Exception Action:</span>
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold"
                                    style={{
                                      color: getActionStyle(rule.exceptionConfig.action).color,
                                      backgroundColor: getActionStyle(rule.exceptionConfig.action).bgColor
                                    }}
                                  >
                                    {getActionLabel(rule.exceptionConfig.action)}
                                  </span>
                                </p>
                              )}
                              <p>
                                <span className="font-semibold text-gray-700">Exceptions:</span> {formatExceptionSummary(rule.exceptionConfig)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Simulator */}
      <div className="w-[380px] shrink-0 pt-8">
        <div className="sticky top-6 rounded-[24px] border-x-[2px] border-b-[2px] border-t-[4px] border-[#087f70] bg-white p-5 shadow-sm">
          <h3 className="text-[16px] font-bold text-[#10231d] mb-1">Policy Simulator</h3>
          <p className="text-[13px] text-[#68726d] mb-6">Test your policy with sample scenarios.</p>

          <div className="space-y-5 mb-6">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-[#10231d]">Request Amount</label>
              <Input
                value={simAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  if (!val) setSimAmount("");
                  else setSimAmount(Number(val).toLocaleString());
                  setIsSimDirty(true);
                }}
                className="h-10 text-[13px] rounded-lg bg-white border-black/[0.08]"
                placeholder="e.g. 15,000"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-[#10231d]">Item Qty</label>
              <Input
                value={simQty}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  if (!val) setSimQty("");
                  else setSimQty(Number(val).toLocaleString());
                  setIsSimDirty(true);
                }}
                className="h-10 text-[13px] rounded-lg bg-white border-black/[0.08]"
                placeholder="e.g. 25"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-[#10231d]">Category</label>
              <Select value={simCategory} onValueChange={(val) => {
                setSimCategory(val);
                setIsSimDirty(true);
              }}>
                <SelectTrigger className="w-full h-10 bg-white border-black/[0.08] rounded-lg">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {selectedCategories.map(cat => (
                    <SelectItem key={cat.categoryId} value={cat.categoryId}>{cat.name}</SelectItem>
                  ))}
                  {selectedCategories.length === 0 && (
                    <SelectItem value="none" disabled>No categories selected</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <button 
            onClick={runSimulation}
            disabled={!isSimDirty || (!simAmount && !simQty)}
            className="w-full h-10 rounded-lg bg-[#087f70] text-white font-bold text-[13px] hover:opacity-90 transition-opacity mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {hasRun && !isSimDirty ? "Simulation Up to Date" : "Run Simulation"}
          </button>

          {hasRun && (
            <div className="bg-[#f9faf9] rounded-xl p-5 border border-black/[0.04] space-y-4">
              {simResults.length > 0 ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#fef2f2] border border-[#dc2626] flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#dc2626]" />
                    </div>
                    <h4 className="text-[13px] font-bold text-[#10231d]">Policy Triggered!</h4>
                  </div>
                  <div className="space-y-3">
                    {simResults.map((res, i) => (
                      <div key={i} className="flex flex-col gap-1.5 border-l-2 pl-3 py-1" style={{ borderColor: res.style.color }}>
                        <span className="text-[13px] font-semibold text-[#10231d]">{res.ruleName}</span>
                        <div className="text-[12px] text-[#68726d] leading-relaxed">
                          Because: {res.reason}
                        </div>
                        <span 
                          className="inline-flex w-fit px-2 py-0.5 rounded text-[11px] font-bold mt-1"
                          style={{ color: res.style.color, backgroundColor: res.style.bgColor }}
                        >
                          {getActionLabel(res.action)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#ecfdf5] border border-[#10b981] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                  </div>
                  <h4 className="text-[13px] font-bold text-[#10231d]">Clear to Proceed</h4>
                  <p className="text-[12px] text-[#68726d] ml-1">No rules were triggered.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
