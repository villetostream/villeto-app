"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { Search, Loader2, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useGetApprovalSettingByTarget,
  useGetEligibleRoles,
  useUpdateApprovalSettings,
  type ApproverRole,
} from "@/queries/policies/governance";
import { 
  useGetSpendProgramSettings, 
  useUpdateSpendProgramSettings,
  useGetSpendProgramEligibleRoles,
  useGetSpendProgramRuleDefinitions,
  useDeleteSpendProgramRuleDefinition,
  useSeedDefaultRuleDefinitions,
  useGetSpendProgramSettingsCategories
} from "@/queries/procurement/policies";
import { RuleDefinitionModal } from "@/components/policies/governance/RuleDefinitionModal";
import type { SpendProgramGroup } from "@/components/policies/procurement/types";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import withPermissions from "@/components/permissions/permission-protected-routes";

// ─── Expense Policy Panel ───────────────────────────────────────────────────

function ExpensePanel({ onStateChange, onRegisterActions }: any) {
  const [search, setSearch] = useState("");
  const { data: settingData, isLoading: settingLoading } = useGetApprovalSettingByTarget("expense_policy");
  const { data: rolesData, isLoading: rolesLoading }     = useGetEligibleRoles("expense_policy");

  const setting = settingData?.data;
  const eligibleRoles: ApproverRole[] = rolesData?.data ?? [];

  const [autoApprove, setAutoApprove] = useState<boolean>(true);
  const [allRolesCanApprove, setAllRolesCanApprove] = useState<boolean>(false);
  const [approverRoleIds, setApproverRoleIds] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (setting) {
      setAutoApprove(!setting.approvalRequired);
      setAllRolesCanApprove(setting.allRolesCanApprove ?? false);
      setApproverRoleIds(setting.approverRoleIds ?? []);
      setIsDirty(false);
    }
  }, [setting]);

  const updateMutation = useUpdateApprovalSettings("expense_policy");
  
  const validationError = (!autoApprove && !allRolesCanApprove && approverRoleIds.length === 0)
    ? "Toggle at least one approver role, enable 'All eligible roles', or turn on Auto-Approve."
    : null;

  useEffect(() => { 
    onStateChange({ isDirty, isPending: updateMutation.isPending, validationError }); 
  }, [isDirty, updateMutation.isPending, validationError, onStateChange]);

  const handleSave = useCallback(async () => {
    if (validationError) { toast.error(validationError); return; }
    try {
      await updateMutation.mutateAsync({
        approvalRequired: !autoApprove,
        allRolesCanApprove: !autoApprove ? allRolesCanApprove : false,
        approverRoleIds: (!autoApprove && !allRolesCanApprove) ? approverRoleIds : [],
      });
      setIsDirty(false);
      toast.success("Expense policy settings updated successfully.");
    } catch {
      toast.error("Failed to update expense policy settings.");
    }
  }, [validationError, updateMutation, autoApprove, allRolesCanApprove, approverRoleIds]);

  useEffect(() => {
    onRegisterActions({
      save: handleSave,
      discard: () => {
        if (setting) {
          setAutoApprove(!setting.approvalRequired);
          setAllRolesCanApprove(setting.allRolesCanApprove ?? false);
          setApproverRoleIds(setting.approverRoleIds ?? []);
        }
        setIsDirty(false);
      }
    });
  }, [handleSave, onRegisterActions, setting]);

  if (settingLoading || rolesLoading) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#087f70]" /></div>;
  }

  const filteredRoles = eligibleRoles.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="bg-white border border-black/[0.08] rounded-xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div className="p-6">
          <div className="flex justify-between items-start gap-12">
            <div className="space-y-1">
              <h2 className="text-[17px] font-semibold text-[#10231d]">Auto-Approve Expense Policies</h2>
              <p className="text-[13px] text-[#68726d] max-w-[480px] leading-relaxed">
                Automatically activate newly created expense policies without requiring admin approval.
              </p>
            </div>
            <Switch checked={autoApprove} onCheckedChange={(c) => { setAutoApprove(c); setIsDirty(true); }} className="scale-110" />
          </div>

          {!autoApprove && (
            <div className="mt-8 pt-8 border-t border-black/[0.06]">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-[15px] font-semibold text-[#10231d]">Approver Roles</h3>
                  <p className="text-[13px] text-[#68726d] mt-1">Select which roles can approve drafted expense policies.</p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="flex flex-col text-right">
                    <span className="text-[13px] font-semibold text-[#10231d] group-hover:text-[#087f70] transition-colors">All eligible roles</span>
                    <span className="text-[11px] text-[#84908a]">Any admin can approve</span>
                  </div>
                  <Switch checked={allRolesCanApprove} onCheckedChange={(c) => { setAllRolesCanApprove(c); setIsDirty(true); }} />
                </label>
              </div>

              {!allRolesCanApprove && (
                <div className="border border-black/[0.06] rounded-[10px] overflow-hidden bg-white">
                  <div className="p-3 border-b border-black/[0.06] bg-[#f9faf9]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#84908a]" />
                      <input
                        type="text"
                        placeholder="Search roles..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-9 pl-9 pr-4 text-[13px] bg-white border border-black/[0.08] rounded-md focus:outline-none focus:border-[#087f70] focus:ring-1 focus:ring-[#087f70] transition-all"
                      />
                    </div>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {filteredRoles.map((role) => (
                      <label key={role.roleId} className="flex items-center justify-between p-4 hover:bg-[#f9faf9] border-b border-black/[0.03] last:border-0 cursor-pointer transition-colors group">
                        <div className="flex flex-col gap-0.5 max-w-[80%]">
                          <span className="text-[14px] font-medium text-[#10231d] group-hover:text-[#087f70] transition-colors">{role.name}</span>
                          {role.description && <span className="text-[12px] text-[#68726d] line-clamp-1">{role.description}</span>}
                          <span className="text-[11px] font-semibold text-[#84908a] mt-0.5">{role.userCount} users</span>
                        </div>
                        <Switch
                          checked={approverRoleIds.includes(role.roleId)}
                          onCheckedChange={(c) => {
                            setApproverRoleIds((prev) => c ? [...prev, role.roleId] : prev.filter(id => id !== role.roleId));
                            setIsDirty(true);
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Spend Program Panel ────────────────────────────────────────────────────

function SpendProgramPanel({ onStateChange, onRegisterActions }: any) {
  const [search, setSearch] = useState("");
  const { data: settingData, isLoading: settingLoading } = useGetSpendProgramSettings();
  const { data: rolesData, isLoading: rolesLoading } = useGetSpendProgramEligibleRoles();
  const { data: categoriesData } = useGetSpendProgramSettingsCategories();
  
  const setting = settingData?.data;
  const eligibleRoles: any[] = rolesData?.data ?? [];

  // Extract flat list of categories
  const allCategories = useMemo(() => {
    if (!categoriesData?.data?.categories) return [];
    return categoriesData.data.categories.map(cat => ({
      ...cat,
      displayName: cat.name
    }));
  }, [categoriesData?.data]);

  // Local state
  const [coverageMode, setCoverageMode] = useState<"none" | "all_categories" | "specific_categories">("none");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [activeStages, setActiveStages] = useState<string[]>(["pr_submission", "pr_to_po", "po_submission"]);
  const [autoApprove, setAutoApprove] = useState<boolean>(true);
  const [allRolesCanApprove, setAllRolesCanApprove] = useState<boolean>(false);
  const [approverRoleIds, setApproverRoleIds] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  
  const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);
  const [tempCoverageMode, setTempCoverageMode] = useState<"none" | "all_categories" | "specific_categories">("none");
  const [tempSelectedCategoryIds, setTempSelectedCategoryIds] = useState<string[]>([]);

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [ruleToDeactivate, setRuleToDeactivate] = useState<any>(null);

  const [isLoadRulesConfirmOpen, setIsLoadRulesConfirmOpen] = useState(false);
  const [loadRulesSuccessMessage, setLoadRulesSuccessMessage] = useState("");

  const updateMutation = useUpdateSpendProgramSettings();
  const { data: ruleDefsResponse, isLoading: isLoadingRuleDefs } = useGetSpendProgramRuleDefinitions();
  const ruleDefinitions = useMemo(() => ruleDefsResponse?.data || [], [ruleDefsResponse?.data]);
  const deleteRuleMutation = useDeleteSpendProgramRuleDefinition();
  const seedDefaultsMutation = useSeedDefaultRuleDefinitions();

  const handleLoadRules = async () => {
    try {
      const res: any = await seedDefaultsMutation.mutateAsync();
      setIsLoadRulesConfirmOpen(false);
      setLoadRulesSuccessMessage(res.data?.message || res?.message || "Standard rules successfully loaded.");
    } catch {
      toast.error("Failed to load standard rules.");
      setIsLoadRulesConfirmOpen(false);
    }
  };

  useEffect(() => {
    if (setting) {
      setCoverageMode(setting.coverageMode);
      setSelectedCategoryIds(setting.categoryIds ?? setting.categories ?? []);
      setActiveStages(setting.enabledGroups ?? setting.activeStages ?? ["pr_submission", "pr_to_po", "po_submission"]);
      setAutoApprove(!setting.approvalRequired);
      setAllRolesCanApprove(setting.allRolesCanApprove ?? false);
      setApproverRoleIds(setting.approverRoleIds ?? []);
      setIsDirty(false);
    }
  }, [setting]);

  const validationError = (!autoApprove && !allRolesCanApprove && approverRoleIds.length === 0)
    ? "Toggle at least one approver role, enable 'All eligible roles', or turn on Auto-Approve."
    : null;

  useEffect(() => { 
    onStateChange({ isDirty, isPending: updateMutation.isPending, validationError }); 
  }, [isDirty, updateMutation.isPending, validationError, onStateChange]);

  const handleSave = useCallback(async () => {
    if (validationError) { toast.error(validationError); return; }
    try {
      await updateMutation.mutateAsync({ 
        coverageMode,
        categoryIds: coverageMode === "specific_categories" ? selectedCategoryIds : [],
        enabledGroups: activeStages,
        approvalRequired: !autoApprove,
        approverRoleIds: (!autoApprove && !allRolesCanApprove) ? approverRoleIds : [],
        enabled: coverageMode !== "none",
      });
      setIsDirty(false);
      toast.success("Spend program settings updated successfully.");
    } catch {
      toast.error("Failed to update spend program settings.");
    }
  }, [coverageMode, selectedCategoryIds, activeStages, autoApprove, allRolesCanApprove, approverRoleIds, updateMutation, validationError]);

  useEffect(() => {
    onRegisterActions({
      save: handleSave,
      discard: () => {
        if (setting) {
          setCoverageMode(setting.coverageMode);
          setSelectedCategoryIds(setting.categoryIds ?? setting.categories ?? []);
          setActiveStages(setting.enabledGroups ?? setting.activeStages ?? ["pr_submission", "pr_to_po", "po_submission"]);
          setAutoApprove(!setting.approvalRequired);
          setAllRolesCanApprove(setting.allRolesCanApprove ?? false);
          setApproverRoleIds(setting.approverRoleIds ?? []);
        }
        setIsDirty(false);
      }
    });
  }, [handleSave, onRegisterActions, setting]);

  if (settingLoading || rolesLoading) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#087f70]" /></div>;
  }

  const getCoverageModeText = (mode: string) => {
    if (mode === "all_categories") return { title: "All categories", subtitle: "Every procurement category must have an active Spend Program before it can be used." };
    if (mode === "specific_categories") return { title: "Specific category", subtitle: "Spend Programs apply to categories where they are created; other categories can be used without one." };
    return { title: "No Spend Program", subtitle: "Spend Programs are not required. Procurement continues using the standard workflow." };
  };

  const filteredRoles = eligibleRoles.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
  const currentCoverageText = getCoverageModeText(coverageMode);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[800px]">
      
      {/* Requirement Section */}
      <div className="bg-white border border-black/[0.08] rounded-[10px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div className="p-6">
          <h3 className="text-[13px] font-bold text-[#84908a] uppercase tracking-wider mb-4">Spend Program Requirement</h3>
          
          <div className="border border-black/[0.08] rounded-lg p-5 flex items-center justify-between bg-white">
            <div className="pr-8">
              <h4 className="text-[15px] font-semibold text-[#10231d] mb-1">{currentCoverageText.title}</h4>
              <p className="text-[13px] text-[#68726d] leading-relaxed">{currentCoverageText.subtitle}</p>
              {coverageMode === "specific_categories" && selectedCategoryIds.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedCategoryIds.map(id => {
                    const cat = allCategories.find(c => c.categoryId === id);
                    return cat ? (
                      <span key={id} className="text-[11px] font-medium bg-[#f0fbf9] text-[#087f70] px-2 py-1 rounded">
                        {cat.displayName}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setTempCoverageMode(coverageMode);
                setTempSelectedCategoryIds(selectedCategoryIds);
                setIsRequirementModalOpen(true);
              }}
              className="shrink-0 h-9 px-4 border border-[#a6e6df] text-[#087f70] hover:bg-[#a6e6df]/20 font-medium text-[13px] rounded-lg transition-colors"
            >
              Edit Requirement
            </button>
          </div>
        </div>
      </div>

      {/* Active Stages Section */}
      {coverageMode !== "none" && (
        <>
          <div className="bg-white border border-black/[0.08] rounded-[10px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div className="px-6 pt-5 pb-2">
              <h3 className="text-[13px] font-bold text-[#84908a] uppercase tracking-wider mb-0.5">Active Stages</h3>
              <p className="text-[12px] text-[#68726d] mb-4">Choose which procurement steps check spend program rules.</p>
            </div>
            <div className="divide-y divide-black/[0.04]">
              {[
                { id: "pr_submission", label: "Purchase Requests", desc: "Rules checked when an employee submits a PR." },
                { id: "pr_to_po",     label: "PR → PO Conversion", desc: "Rules checked when a PR is converted to a PO." },
                { id: "po_submission",label: "Purchase Orders", desc: "Rules checked when a PO is submitted directly." },
              ].map(stage => {
                const isActive = activeStages.includes(stage.id);
                return (
                  <div
                    key={stage.id}
                    className="flex items-center justify-between px-6 py-3 hover:bg-[#f9faf9] transition-colors cursor-pointer"
                    onClick={() => {
                      if (isActive && activeStages.length === 1) {
                        toast.error("At least one active stage must be enabled. To disable Spend Programs entirely, change the Requirement to 'No Spend Program' instead.");
                        return;
                      }
                      setActiveStages(prev =>
                        isActive ? prev.filter(s => s !== stage.id) : [...prev, stage.id]
                      );
                      setIsDirty(true);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        isActive ? "bg-[#08b6a3]" : "bg-[#d0d5d3]"
                      )} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#10231d]">{stage.label}</p>
                        <p className="text-[11px] text-[#84908a]">{stage.desc}</p>
                      </div>
                    </div>
                    <Switch
                      checked={isActive}
                      onCheckedChange={(c) => {
                        if (!c && activeStages.length === 1) {
                          toast.error("At least one active stage must be enabled. To disable Spend Programs entirely, change the Requirement to 'No Spend Program' instead.");
                          return;
                        }
                        setActiveStages(prev => c ? [...prev, stage.id] : prev.filter(s => s !== stage.id));
                        setIsDirty(true);
                      }}
                      onClick={e => e.stopPropagation()}
                      className="shrink-0 ml-4"
                    />
                  </div>
                );
              })}
            </div>
            <div className="h-3" />
          </div>


          {/* Auto-Approval Section */}
          <div className="bg-white border border-black/[0.08] rounded-[10px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div className="p-6">
              <div className="flex justify-between items-start gap-12">
                <div className="space-y-1">
              <h2 className="text-[15px] font-semibold text-[#10231d]">Procurement Spend Program Auto-Approval</h2>
              <p className="text-[13px] text-[#68726d] max-w-[480px] leading-relaxed">
                Automatically approve newly created Spend Programs without requiring admin approval.
              </p>
            </div>
            <Switch checked={autoApprove} onCheckedChange={(c) => { setAutoApprove(c); setIsDirty(true); }} className="scale-110" />
          </div>

          {!autoApprove && (
            <div className="mt-8 pt-8 border-t border-black/[0.06]">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-[15px] font-semibold text-[#10231d] flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-[#ecfdf5] border border-[#10b981]/30 flex items-center justify-center shrink-0 text-[#10b981]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </span>
                    Who can approve Spend Programs?
                  </h3>
                  <p className="text-[13px] text-[#68726d] mt-2">
                    <span className="font-semibold text-[#10231d]">{approverRoleIds.length} users</span> currently have the Approve Spend Program permission.
                  </p>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#84908a]" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-4 text-[13px] bg-white border border-black/[0.08] rounded-md focus:outline-none focus:border-[#087f70] focus:ring-1 focus:ring-[#087f70] transition-all"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 bg-[#f9faf9] border-t border-b border-black/[0.04] text-[12px] font-semibold text-[#68726d] uppercase">
                <div className="flex-1">Role</div>
                <div className="w-24 text-center">User(s)</div>
                <div className="w-40 flex items-center justify-end gap-3">
                  Action
                </div>
              </div>

              {!allRolesCanApprove && (
                <div className="max-h-[320px] overflow-y-auto">
                  {filteredRoles.map((role) => {
                    const isDisabled = role.userCount === 0;
                    return (
                    <div key={role.roleId} className="flex items-center justify-between p-4 border-b border-black/[0.03] last:border-0 hover:bg-[#f9faf9]/50 transition-colors">
                      <div className="flex-1">
                        <div className="font-semibold text-[13px] text-[#10231d]">{role.name}</div>
                        {role.description && <div className="text-[12px] text-[#68726d] mt-0.5 pr-4 line-clamp-1">{role.description}</div>}
                      </div>
                      <div className="w-24 text-center text-[13px] text-[#68726d]">{role.userCount}</div>
                      <div className="w-40 flex items-center justify-end gap-3">
                        {approverRoleIds.includes(role.roleId) && (
                           <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#ecfdf5] text-[#087f70]">Approve Policy</span>
                        )}
                        {isDisabled ? (
                          <TooltipProvider delayDuration={100}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Switch disabled checked={approverRoleIds.includes(role.roleId)} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-800 text-white border-0 text-[12px] px-3 py-1.5 rounded-md shadow-lg" sideOffset={8}>
                                Cannot assign approval to a role with 0 users.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <Switch
                            checked={approverRoleIds.includes(role.roleId)}
                            onCheckedChange={(c) => {
                              setApproverRoleIds((prev) => c ? [...prev, role.roleId] : prev.filter(id => id !== role.roleId));
                              setIsDirty(true);
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rule Definitions Section (Hidden from UI as per requirements) */}
      <div className="hidden bg-white border border-black/[0.08] rounded-xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div className="p-6">
          <div className="flex justify-between items-start gap-4 mb-6">
            <div>
              <h2 className="text-[17px] font-semibold text-[#10231d] flex items-center gap-2">
                Procurement Rule Definitions
                <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-black/[0.08] bg-[#f9faf9] text-[#84908a] uppercase tracking-wider ml-1">Saved Instantly</span>
              </h2>
              <p className="text-[13px] text-[#68726d] mt-1">
                Manage the rules that can be configured inside Procurement Spend Programs.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsLoadRulesConfirmOpen(true)}
                disabled={seedDefaultsMutation.isPending}
                className="h-9 px-4 rounded-[8px] border border-black/[0.1] bg-white text-[13px] font-semibold text-[#52605b] hover:bg-[#f4f7f5] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {seedDefaultsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Load Standard Rules
              </button>
              <button
                onClick={() => { setEditingRule(null); setIsRuleModalOpen(true); }}
                className="h-9 px-4 rounded-[8px] bg-[#087f70] text-white text-[13px] font-semibold hover:bg-[#076b5e] transition-colors"
              >
                Create Rule
              </button>
            </div>
          </div>

          {isLoadingRuleDefs ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#68726d]" /></div>
          ) : ruleDefinitions.length === 0 ? (
            <div className="py-10 text-center border-t border-black/[0.06]">
              <p className="text-[13px] text-[#68726d]">No rule definitions found.</p>
            </div>
          ) : (
            <div className="border-t border-black/[0.06] divide-y divide-black/[0.08]">
              {[
                { id: "pr_submission", label: "PR Submission" },
                { id: "pr_to_po", label: "PR to PO Conversion" },
                { id: "po_submission", label: "PO Submission" },
              ].map(stage => {
                const stageRules = ruleDefinitions.filter(r => r.groups?.includes(stage.id as SpendProgramGroup));
                if (stageRules.length === 0) return null;

                return (
                  <div key={stage.id} className="py-6 first:pt-4 last:pb-2">
                    <h3 className="text-[13px] font-bold text-[#10231d] uppercase tracking-wider mb-4 px-3 py-1 bg-[#f4f7f5] inline-block rounded-md">
                      {stage.label}
                    </h3>
                    <div className="divide-y divide-black/[0.04]">
                      {stageRules.map((rule) => (
                        <div key={rule.ruleType} className="py-3 flex justify-between items-center group">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#10231d] text-[14px]">{rule.name}</span>
                              {!rule.isActive && (
                                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider">Inactive</span>
                              )}
                            </div>
                            <p className="text-[13px] text-[#68726d] mt-0.5 max-w-lg">{rule.description || "No description."}</p>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingRule(rule); setIsRuleModalOpen(true); }}
                              className="h-8 px-3 rounded text-[12px] font-semibold text-[#087f70] bg-[#e8f8f5] hover:bg-[#d1f1eb] transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setRuleToDeactivate(rule)}
                              className="h-8 px-3 rounded text-[12px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              Deactivate
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      <RuleDefinitionModal
        isOpen={isRuleModalOpen}
        onClose={() => { setIsRuleModalOpen(false); setEditingRule(null); }}
        initialData={editingRule}
      />
        </>
      )}

      {/* Requirement Edit Modal */}
      <Dialog open={isRequirementModalOpen} onOpenChange={setIsRequirementModalOpen}>
        <DialogContent className="max-w-[560px] p-0 overflow-hidden bg-[#f4f7f5] border-0 rounded-2xl shadow-xl flex flex-col max-h-[85vh]">
          <div className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle className="text-lg font-bold text-[#10231d]">Spend Program Requirement</DialogTitle>
          </div>

          <div className="p-6 space-y-3 overflow-y-auto flex-1">
            {[
              { id: "none", title: "No Spend Program", desc: "Spend Programs are not required. Procurement continues using the standard workflow." },
              { id: "specific_categories", title: "Specific category", desc: "Only certain procurement categories are covered. The categories you select below will be available to choose from when creating a new Spend Program." },
              { id: "all_categories", title: "All categories", desc: "Every procurement category must have an active Spend Program before it can be used." }
            ].map(option => {
              const isActive = tempCoverageMode === option.id;
              return (
                <div key={option.id}>
                  <div 
                    onClick={() => setTempCoverageMode(option.id as any)}
                    className={cn(
                      "flex items-start gap-4 p-5 rounded-xl border bg-white cursor-pointer transition-all",
                      isActive ? "border-[#08b6a3] bg-[#f0fbf9]" : "border-black/[0.06] hover:border-black/[0.15]"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      isActive ? "border-[#08b6a3]" : "border-black/[0.2]"
                    )}>
                      {isActive && <div className="w-2.5 h-2.5 rounded-full bg-[#08b6a3]" />}
                    </div>
                    <div>
                      <h4 className="text-[14px] font-bold text-[#10231d] mb-1">{option.title}</h4>
                      <p className="text-[13px] text-[#68726d] leading-relaxed">{option.desc}</p>
                    </div>
                  </div>
                  
                  {/* Category Selection for specific_categories */}
                  {isActive && option.id === "specific_categories" && (
                    <div className="mt-2 ml-9 p-4 bg-white border border-black/[0.06] rounded-xl shadow-sm">
                      <p className="text-[12px] font-semibold text-[#10231d] mb-3">Select applicable categories:</p>
                      <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
                        {allCategories.map(cat => (
                          <label key={cat.categoryId} className="flex items-center gap-3 p-2 hover:bg-[#f9faf9] rounded cursor-pointer group">
                            <Checkbox
                              checked={tempSelectedCategoryIds.includes(cat.categoryId)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setTempSelectedCategoryIds(prev => [...prev, cat.categoryId]);
                                } else {
                                  setTempSelectedCategoryIds(prev => prev.filter(id => id !== cat.categoryId));
                                }
                              }}
                              className="shrink-0 w-4 h-4"
                            />
                            <span className="text-[13px] text-[#10231d] group-hover:text-[#087f70] transition-colors">{cat.displayName}</span>
                          </label>
                        ))}
                        {allCategories.length === 0 && (
                          <div className="text-[13px] text-[#84908a] italic">No categories available.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-6 pt-2 flex items-center justify-center gap-4">
            <button
              onClick={() => setIsRequirementModalOpen(false)}
              className="h-10 px-8 rounded-lg border border-black/[0.2] bg-white font-semibold text-[13px] hover:bg-[#f9faf9] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setCoverageMode(tempCoverageMode);
                setSelectedCategoryIds(tempSelectedCategoryIds);
                setIsRequirementModalOpen(false);
                setIsDirty(true);
              }}
              className="h-10 px-8 rounded-lg bg-[#08b6a3] text-white font-semibold text-[13px] hover:bg-[#08a291] transition-colors shadow-sm"
            >
              Confirm
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Load Standard Rules Confirm Modal */}
      <Dialog open={isLoadRulesConfirmOpen} onOpenChange={setIsLoadRulesConfirmOpen}>
        <DialogContent className="max-w-[480px] p-0 overflow-hidden bg-white border-0 rounded-2xl shadow-xl">
          <div className="p-6">
            <DialogTitle className="text-[17px] font-bold text-[#10231d] mb-2">Load Standard Rules</DialogTitle>
            <p className="text-[13px] text-[#68726d] leading-relaxed">
              This will automatically generate a set of standard procurement rules (such as approval thresholds, list matching, etc.) for you to use. This action is irreversible, but you can always edit or deactivate the rules later. Are you sure you want to proceed?
            </p>
          </div>
          <div className="p-4 bg-[#f9faf9] border-t border-black/[0.06] flex justify-end gap-3">
            <button
              onClick={() => setIsLoadRulesConfirmOpen(false)}
              className="h-9 px-6 rounded-[8px] border border-black/[0.1] bg-white text-[13px] font-semibold text-[#52605b] hover:bg-[#f4f7f5] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLoadRules}
              disabled={seedDefaultsMutation.isPending}
              className="h-9 px-6 rounded-[8px] bg-[#087f70] text-white text-[13px] font-semibold hover:bg-[#076b5e] transition-colors flex items-center gap-2"
            >
              {seedDefaultsMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Standard Rules Success Modal */}
      <Dialog open={!!loadRulesSuccessMessage} onOpenChange={(open) => !open && setLoadRulesSuccessMessage("")}>
        <DialogContent className="max-w-[420px] p-0 overflow-hidden bg-white border-0 rounded-2xl shadow-xl text-center">
          <div className="p-8 pb-6 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-[#ecfdf5] border border-[#10b981]/30 flex items-center justify-center text-[#10b981] mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <DialogTitle className="text-[17px] font-bold text-[#10231d] mb-2">Success!</DialogTitle>
            <p className="text-[14px] text-[#68726d] font-medium">{loadRulesSuccessMessage}</p>
          </div>
          <div className="p-4 bg-[#f9faf9] border-t border-black/[0.06] flex justify-center">
            <button
              onClick={() => setLoadRulesSuccessMessage("")}
              className="h-9 px-8 rounded-[8px] bg-[#087f70] text-white text-[13px] font-semibold hover:bg-[#076b5e] transition-colors"
            >
              Got it
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Deactivate Rule Confirm Modal */}
      <Dialog open={!!ruleToDeactivate} onOpenChange={(open) => !open && setRuleToDeactivate(null)}>
        <DialogContent className="max-w-[480px] p-0 overflow-hidden bg-white border-0 rounded-2xl shadow-xl">
          <div className="p-6">
            <DialogTitle className="text-[17px] font-bold text-[#10231d] mb-2">Deactivate Rule</DialogTitle>
            <p className="text-[13px] text-[#68726d] leading-relaxed">
              Are you sure you want to deactivate the rule <span className="font-semibold text-[#10231d]">"{ruleToDeactivate?.name}"</span>? This will remove it from use in any future Spend Programs.
            </p>
          </div>
          <div className="p-4 bg-[#f9faf9] border-t border-black/[0.06] flex justify-end gap-3">
            <button
              onClick={() => setRuleToDeactivate(null)}
              className="h-9 px-6 rounded-[8px] border border-black/[0.1] bg-white text-[13px] font-semibold text-[#52605b] hover:bg-[#f4f7f5] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (ruleToDeactivate) {
                  try {
                    await deleteRuleMutation.mutateAsync(ruleToDeactivate.ruleType);
                    setRuleToDeactivate(null);
                    toast.success("Rule deactivated successfully.");
                  } catch (e) {
                    toast.error("Failed to deactivate rule.");
                  }
                }
              }}
              disabled={deleteRuleMutation.isPending}
              className="h-9 px-6 rounded-[8px] bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              {deleteRuleMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Deactivate
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

function PolicyGovernancePage() {
  const [activeTab, setActiveTab] = useState<"expense_policy" | "procurement_policy">("expense_policy");
  
  const [panelState, setPanelState] = useState({
    isDirty: false,
    isPending: false,
    validationError: null as string | null,
  });
  
  const actionsRef = useRef<{ save: () => void; discard: () => void } | null>(null);

  const handlePanelState = useCallback((state: any) => {
    setPanelState(state);
  }, []);

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0 pb-32 min-h-0">
      <div className="sticky -top-3 sm:-top-5 lg:-top-6 z-50 bg-[#f4f7f5] -mt-3 sm:-mt-5 lg:-mt-6 pt-3 sm:pt-5 lg:pt-6 pb-4 mb-6 border-b border-black/[0.06] -mx-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] text-[#68726d]">
            Define how policies are approved, activated, and communicated across your organization.
          </p>

          {panelState.isDirty && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] text-[#087f70] font-medium mr-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#087f70] animate-pulse" />
                Unsaved changes
              </div>
              <button
                onClick={() => actionsRef.current?.discard()}
                disabled={panelState.isPending}
                className="h-8 px-3 rounded-[8px] border border-black/[0.1] bg-white text-[13px] font-medium text-[#52605b] hover:bg-[#f4f7f5] transition-colors disabled:opacity-50"
              >
                Discard
              </button>
              
              {panelState.validationError ? (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-block cursor-not-allowed">
                        <button
                          disabled={true}
                          className="h-8 px-4 rounded-[8px] bg-[#087f70] text-white text-[13px] font-semibold hover:bg-[#076b5e] transition-colors disabled:opacity-50 flex items-center gap-1.5 pointer-events-none"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Save Changes
                        </button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-[#1C2B36] text-white border-0 text-[13px] max-w-[600px] text-center font-medium px-4 py-2.5 shadow-xl rounded-[8px]">
                      <p>{panelState.validationError}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <button
                  onClick={() => actionsRef.current?.save()}
                  disabled={panelState.isPending}
                  className="h-8 px-4 rounded-[8px] bg-[#087f70] text-white text-[13px] font-semibold hover:bg-[#076b5e] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {panelState.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-8">
        <div className="w-48 shrink-0 flex flex-col gap-4 sticky top-20 self-start">
          <button
            onClick={() => setActiveTab("expense_policy")}
            className={cn("text-left text-[14px] font-medium transition-colors hover:text-[#087f70]", activeTab === "expense_policy" ? "text-[#087f70] font-semibold" : "text-[#68726d]")}
          >
            Expense policy
          </button>
          <button
            onClick={() => setActiveTab("procurement_policy")}
            className={cn("text-left text-[14px] font-medium transition-colors hover:text-[#087f70]", activeTab === "procurement_policy" ? "text-[#087f70] font-semibold" : "text-[#68726d]")}
          >
            Procurement policy
          </button>
        </div>

        <div className="flex-1 max-w-4xl">
          {activeTab === "expense_policy" ? (
            <ExpensePanel
              key="expense_policy"
              onStateChange={handlePanelState}
              onRegisterActions={(actions: any) => { actionsRef.current = actions; }}
            />
          ) : (
            <SpendProgramPanel
              key="procurement_policy"
              onStateChange={handlePanelState}
              onRegisterActions={(actions: any) => { actionsRef.current = actions; }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default withPermissions(PolicyGovernancePage, [
  { resource: "policy", action: "update_approval_setting" },
]);
