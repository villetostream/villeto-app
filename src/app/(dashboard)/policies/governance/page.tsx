"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Search, Shield, Loader2, Save, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useGetApprovalSettingByTarget,
  useGetEligibleRoles,
  useUpdateApprovalSettings,
  type PolicyTarget,
  type ApproverRole,
} from "@/queries/policies/governance";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import withPermissions from "@/components/permissions/permission-protected-routes";

// ─── Per-target panel ─────────────────────────────────────────────────────────

type TargetPanelProps = {
  target: PolicyTarget;
  onStateChange: (state: { isDirty: boolean; isPending: boolean; validationError: string | null }) => void;
  onRegisterActions: (actions: { save: () => void; discard: () => void }) => void;
};

function TargetPanel({ target, onStateChange, onRegisterActions }: TargetPanelProps) {
  const isExpense = target === "expense_policy";
  const title = isExpense ? "Expense Policies" : "Procurement Policies";
  const desc  = `Automatically activate newly created ${isExpense ? "expense" : "procurement"} policies without requiring admin approval.`;

  const [search, setSearch] = useState("");

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: settingData, isLoading: settingLoading } = useGetApprovalSettingByTarget(target);
  const { data: rolesData, isLoading: rolesLoading }     = useGetEligibleRoles(target);

  const setting       = settingData?.data;
  const eligibleRoles: ApproverRole[] = rolesData?.data ?? [];

  // ── Draft / pending local state ───────────────────────────────────────────
  // autoApprove = true  ↔  approvalRequired = false (auto, no roles needed)
  // autoApprove = false ↔  approvalRequired = true  (manual, roles required)
  const [autoApprove,    setAutoApprove]    = useState<boolean>(true);
  const [allRolesCanApprove, setAllRolesCanApprove] = useState<boolean>(false);
  const [approverRoleIds, setApproverRoleIds] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);


  // Sync from server on first load (and on tab switch via key)
  useEffect(() => {
    if (setting) {
      setAutoApprove(!setting.approvalRequired);
      setAllRolesCanApprove(setting.allRolesCanApprove ?? false);
      setApproverRoleIds(setting.approverRoleIds ?? []);
      setIsDirty(false);
    }
  }, [setting]);

  const updateMutation = useUpdateApprovalSettings(target);
  const isPending = updateMutation.isPending;
  
  // Derived validation
  const validationError = (!autoApprove && !allRolesCanApprove && approverRoleIds.length === 0)
    ? "Toggle at least one approver role, enable 'All eligible roles', or turn on Auto-Approve."
    : null;

  // Notify parent of state changes
  useEffect(() => { 
    onStateChange({ isDirty, isPending, validationError }); 
  }, [isDirty, isPending, validationError, onStateChange]);


  // ── Local handlers (just update draft state + mark dirty) ────────────────
  const handleAutoApproveToggle = useCallback((checked: boolean) => {
    setAutoApprove(checked);
    setIsDirty(true);
  }, []);

  const handleAllRolesToggle = useCallback((checked: boolean) => {
    setAllRolesCanApprove(checked);
    setIsDirty(true);
  }, []);

  const handleRoleToggle = useCallback((roleId: string, nowEnabled: boolean) => {
    setApproverRoleIds((prev) =>
      nowEnabled ? [...prev, roleId] : prev.filter((id) => id !== roleId)
    );
    setIsDirty(true);
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        approvalRequired: !autoApprove,
        allRolesCanApprove: autoApprove ? false : allRolesCanApprove,
        approverRoleIds: autoApprove || allRolesCanApprove ? [] : approverRoleIds,
      });
      setIsDirty(false);
      toast.success("Approval settings saved");
    } catch {
      toast.error("Failed to save approval settings. Please try again.");
    }
  }, [autoApprove, allRolesCanApprove, approverRoleIds, updateMutation]);

  // ── Discard ───────────────────────────────────────────────────────────────
  const handleDiscard = useCallback(() => {
    if (setting) {
      setAutoApprove(!setting.approvalRequired);
      setAllRolesCanApprove(setting.allRolesCanApprove ?? false);
      setApproverRoleIds(setting.approverRoleIds ?? []);
    }
    setIsDirty(false);
  }, [setting]);

  // Register save/discard callbacks with parent
  useEffect(() => {
    onRegisterActions({ save: handleSave, discard: handleDiscard });
  }, [handleSave, handleDiscard, onRegisterActions]);

  // ── Loading / error ───────────────────────────────────────────────────────
  if (settingLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-[#68726d]" />
      </div>
    );
  }

  if (!setting && !settingLoading) {
    return (
      <div className="flex items-center gap-3 bg-white rounded-[12px] border border-black/[0.08] p-5 shadow-sm text-[13px] text-[#68726d]">
        <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
        Could not load approval settings. Please try again.
      </div>
    );
  }

  const filteredRoles = eligibleRoles.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* ── Auto-approve toggle card ── */}
      <div className="bg-white rounded-[12px] border border-black/[0.08] p-5 shadow-sm flex items-center justify-between gap-6">
        <div>
          <h3 className="text-[14px] font-semibold text-[#10231d]">{title}</h3>
          <p className="text-[12px] text-[#84908a] mt-0.5">{desc}</p>
        </div>
        <Switch
          checked={autoApprove}
          onCheckedChange={handleAutoApproveToggle}
          disabled={updateMutation.isPending}
        />
      </div>

      {/* ── Approver roles card (shown only when manual approval is chosen) ── */}
      {!autoApprove && (
        <div className="bg-white rounded-[12px] border border-black/[0.08] p-6 shadow-sm flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-[#f0faf8] flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-[#087f70]" />
              </div>
              <div className="pt-0.5">
                <h3 className="text-[16px] font-semibold text-[#10231d] mb-0.5">
                  Who can approve policies?
                </h3>
                <p className="text-[13px] text-[#68726d]">
                  {approverRoleIds.length > 0 ? (
                    <>
                      <span className="font-semibold text-[#10231d]">{approverRoleIds.length}</span>{" "}
                      {approverRoleIds.length === 1 ? "role has" : "roles have"} the Approve Policy permission.
                    </>
                  ) : (
                    <span className="text-amber-600">
                      No approver roles selected — select at least one below.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#84908a]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="w-full h-9 pl-9 pr-3 rounded-[8px] border border-black/[0.08] text-[13px] outline-none focus:border-[#087f70] transition-colors"
              />
            </div>
          </div>

          {/* Master Toggle for All Roles */}
          <div className="flex items-center justify-between gap-4 px-4 py-3 bg-[#f0faf8] rounded-[10px] border border-[#087f70]/20 mb-2">
            <div>
              <div className="text-[13px] font-semibold text-[#10231d]">Allow all eligible roles to approve</div>
              <div className="text-[12px] text-[#52605b] mt-0.5">If enabled, any user with an eligible role can approve this policy.</div>
            </div>
            <Switch
              checked={allRolesCanApprove}
              onCheckedChange={handleAllRolesToggle}
              disabled={updateMutation.isPending}
            />
          </div>

          {/* Role table */}
          <div className="border border-black/[0.08] rounded-[12px] overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_160px] gap-4 bg-black/[0.02] px-4 py-3 border-b border-black/[0.05]">
              <div className="text-[12px] font-semibold text-[#84908a]">Role</div>
              <div className="text-[12px] font-semibold text-[#84908a] text-center">User(s)</div>
              <div className="text-[12px] font-semibold text-[#84908a] text-right pr-2">Action</div>
            </div>

            {rolesLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-4 h-4 animate-spin text-[#68726d]" />
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="text-center text-[13px] text-[#84908a] py-8">
                {search ? "No roles match your search." : "No eligible roles found."}
              </div>
            ) : (
              <div className="flex flex-col max-h-[240px] overflow-y-auto pr-1">
                {filteredRoles.map((role) => {
                  const isEnabled = allRolesCanApprove || approverRoleIds.includes(role.roleId);
                  return (
                    <div
                      key={role.roleId}
                      className="grid grid-cols-[1fr_120px_160px] gap-4 px-2 py-4 border-b border-black/[0.05] last:border-0 items-center"
                    >
                      <div className="text-[13px] font-semibold text-[#10231d]">{role.name}</div>
                      <div className="text-[13px] font-medium text-[#52605b] text-center">
                        {role.userCount ?? "—"}
                      </div>
                      <div className="flex items-center justify-end gap-4">
                        <div
                          className={cn(
                            "px-3 py-1 rounded-full text-[11px] font-semibold transition-colors duration-200",
                            isEnabled
                              ? "bg-[#eaf5f3] text-[#087f70]"
                              : "bg-black/[0.06] text-[#84908a]"
                          )}
                        >
                          Approve Policy
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => handleRoleToggle(role.roleId, checked)}
                          disabled={allRolesCanApprove || updateMutation.isPending}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PolicyGovernancePage() {
  const [activeTab, setActiveTab] = useState<PolicyTarget>("expense_policy");
  const [panelState, setPanelState] = useState({ isDirty: false, isPending: false, validationError: null as string | null });
  const actionsRef = useRef<{ save: () => void; discard: () => void } | null>(null);

  const handlePanelState = useCallback((state: typeof panelState) => setPanelState(state), []);

  return (
    <div className="flex flex-col h-full bg-[#f4f7f5] pb-16">
      {/* Sticky header with subtitle + action buttons */}
      <div className="sticky -top-3 sm:-top-5 lg:-top-6 z-10 bg-[#f4f7f5] pb-4 mb-2 -mx-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6 -mt-3 sm:-mt-5 lg:-mt-6 pt-5 sm:pt-7 lg:pt-8">
        {/* Constrain to match the exact total width of the layout below (w-48 + gap-8 + max-w-4xl = 70rem) */}
        <div className="w-full max-w-[70rem] flex items-center justify-between gap-4">
          <p className="text-[13px] text-[#68726d]">
            Define how policies are approved, activated, and communicated across your organization.
          </p>

          {/* Action buttons — only shown when dirty */}
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
              
              {/* Custom Tooltip wrapper for disabled state hover */}
              {panelState.validationError ? (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-block cursor-not-allowed">
                        <button
                          onClick={() => actionsRef.current?.save()}
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
                  {panelState.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save Changes
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-8">
        {/* Left nav */}
        <div className="w-48 shrink-0 flex flex-col gap-4 sticky top-20 self-start">
          <button
            onClick={() => setActiveTab("expense_policy")}
            className={cn(
              "text-left text-[14px] font-medium transition-colors hover:text-[#087f70]",
              activeTab === "expense_policy" ? "text-[#087f70] font-semibold" : "text-[#68726d]"
            )}
          >
            Expense policy
          </button>
          <button
            onClick={() => setActiveTab("procurement_policy")}
            className={cn(
              "text-left text-[14px] font-medium transition-colors hover:text-[#087f70]",
              activeTab === "procurement_policy" ? "text-[#087f70] font-semibold" : "text-[#68726d]"
            )}
          >
            Procurement policy
          </button>
        </div>

        {/* Right panel — key forces remount on tab switch, resetting all local draft state */}
        <div className="flex-1 max-w-4xl">
          <TargetPanel
            key={activeTab}
            target={activeTab}
            onStateChange={handlePanelState}
            onRegisterActions={(actions) => { actionsRef.current = actions; }}
          />
        </div>
      </div>
    </div>
  );
}

export default withPermissions(PolicyGovernancePage, [
  { resource: "policy", action: "update_approval_setting" },
]);
