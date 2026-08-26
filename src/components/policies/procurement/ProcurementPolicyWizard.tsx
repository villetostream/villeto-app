"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";
import { Stepper } from "./Stepper";
import { StepPolicyGroup } from "./steps/StepPolicyGroup";
import { StepConfigure } from "./steps/StepConfigure";
import { StepScope } from "./steps/StepScope";
import { StepRules } from "./steps/StepRules";
import { StepReview } from "./steps/StepReview";
import { emptyDraft } from "./types";
import type { PolicyDraft } from "./types";
import { useCreateProcurementPolicy, useUpdateProcurementPolicy, useCreateProcurementPolicyDraft, useUpdateProcurementPolicyDraft, useGetProcurementPolicyById, useGetProcurementPolicyDraftById } from "@/queries/procurement/policies";
import type { ProcurementPolicyApiRecord } from "@/queries/procurement/policies";

const TOTAL_STEPS = 5;

export function ProcurementPolicyWizard({
  policyId,
  initialDraftId,
  initialStep = 1,
  onCancel,
  onComplete,
}: {
  policyId?: string | null;
  initialDraftId?: string | null;
  initialStep?: number;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(initialStep);
  const [draft, setDraft] = useState<PolicyDraft>(emptyDraft());
  const { setBackHandler, clearBackHandler } = useHeaderBackStore();
  const stepRef = useRef(step);
  const createPolicy = useCreateProcurementPolicy();
  const updatePolicy = useUpdateProcurementPolicy(policyId || "");
  const createDraft = useCreateProcurementPolicyDraft();
  const updateDraft = useUpdateProcurementPolicyDraft();

  const { data: activeData, isLoading: isActiveLoading } = useGetProcurementPolicyById(policyId || "", {
    enabled: !!policyId,
  });
  const { data: draftData, isLoading: isDraftLoading } = useGetProcurementPolicyDraftById(initialDraftId || "", {
    enabled: !!initialDraftId,
  });

  const isLoading = isActiveLoading || isDraftLoading;

  useEffect(() => {
    const data = policyId ? activeData?.data : (initialDraftId ? draftData?.data : null);
    if (data) {
      setDraft({
        policyGroup: data.policyGroup as any || null,
        name: data.name || "",
        description: data.description || "",
        scopeType: (data.scopeType as "company" | "specific") || "company",
        categoryIds: data.categories?.map((c) => c.id || c.categoryId) || [],
        departmentIds: (data.departments || data.applicableDepartments)?.map((d) => d.id || d.departmentId) || [],
        roleIds: data.applicableRoles?.map((r) => r.id || r.roleId) || [],
        jobGradeIds: data.jobGrades?.map((jg) => jg.id || jg.jobGradeId) || [],
        managementLevelIds: data.managementLevels?.map((ml) => ml.id || ml.managementLevelId) || [],
        vendorIds: data.vendors?.map((v) => v.id || v.vendorId) || [],
        exceptions: { department: [], role: [], location: [], user: [], jobGrade: [], managementLevel: [] },
        rules: (data.rules || []).map((r, i): any => ({
          id: `rule-${Date.now()}-${i}`,
          criteriaLabel: r.criteria || "",
          condition: r.condition || "",
          enforcementAction: r.enforcementAction || "",
          amount: r.amount,
          currency: r.currency,
          timeUnit: r.timeUnit as any,
          minimumQuotes: r.minimumQuotes,
          maxCount: r.maxCount,
          allowedVendorIds: r.allowedVendorIds,
          allowedRoleIds: r.allowedRoleIds,
          allowedPositions: r.allowedPositions,
          requiredAttachmentTypes: r.requiredAttachmentTypes,
        })),
        requiresApproval: !!data.requiresApproval,
        approvalMode: (data.approvalMode as "none" | "sequential" | "parallel") || "none",
        approverIds: data.approvers?.map((a) => a.id || a.userId) || [],
        effectiveAt: data.effectiveAt || "",
        expiresAt: data.expiresAt || "",
        priority: data.priority ?? 100,
        draftId: initialDraftId || undefined,
        procurementPolicyId: policyId || undefined,
      });
    }
  }, [activeData?.data, draftData?.data, policyId, initialDraftId]);

  useEffect(() => { stepRef.current = step; }, [step]);

  useEffect(() => {
    setBackHandler(() => {
      if (stepRef.current <= 1) { onCancel(); return; }
      setStep((s) => Math.max(1, s - 1));
    });
    return () => clearBackHandler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (p: Partial<PolicyDraft>) => setDraft((d) => ({ ...d, ...p }));

  const goBack = () => {
    if (step <= 1) { onCancel(); return; }
    setStep((s) => Math.max(1, s - 1));
  };

  const canContinue = (): boolean => {
    switch (step) {
      case 1: return draft.policyGroup !== null;
      case 2: return draft.name.trim().length >= 3;
      case 3: return true; // scope is always valid
      case 4:
        return (
          draft.rules.length > 0 &&
          draft.rules.every((r) => r.condition !== "" && r.enforcementAction !== "")
        );
      case 5: return true;
      default: return true;
    }
  };

  const validationMessage = (): string => {
    switch (step) {
      case 1: return "Please select a policy group to continue.";
      case 2: return draft.name.trim().length === 0 ? "Please enter a policy name before continuing." : "Policy name must be at least 3 characters long.";
      case 4: return draft.rules.length === 0 ? "You must add at least one rule to continue." : "Each rule must have a condition and enforcement action selected.";
      default: return "";
    }
  };

  const goNext = async () => {
    if (!canContinue()) {
      toast.error(validationMessage());
      return;
    }

    if (step >= TOTAL_STEPS) {
      // Submit to backend
      try {
        if (policyId) {
          await updatePolicy.mutateAsync(draft);
          toast.success("Procurement policy updated successfully.");
        } else {
          await createPolicy.mutateAsync(draft);
          toast.success("Procurement policy created successfully.");
        }
        onComplete();
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to save policy. Please try again.";
        toast.error(message);
      }
      return;
    }

    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const saveDraft = async () => {
    if (!canContinue()) {
      toast.error(validationMessage());
      return;
    }
    try {
      if (draft.draftId) {
        await updateDraft.mutateAsync({ draftId: draft.draftId, payload: draft });
      } else {
        const res = await createDraft.mutateAsync(draft);
        if (res?.data?.draftId) {
          patch({ draftId: res.data.draftId });
        }
      }
      toast.success("Draft saved successfully.");
      onComplete(); // Assuming we return to the main policies page after saving
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to save draft. Please try again.";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-0 bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#087f70]" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Stepper */}
      <div className="shrink-0 z-40 bg-white">
        <div className="max-w-5xl w-full mx-auto px-6 pt-8 pb-4">
          <Stepper currentStep={step} />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-5xl w-full mx-auto pb-4">
          {step === 1 && (
            <StepPolicyGroup
              value={draft.policyGroup}
              onChange={(policyGroup) => patch({ policyGroup })}
            />
          )}
          {step === 2 && (
            <StepConfigure
              name={draft.name}
              description={draft.description}
              effectiveAt={draft.effectiveAt}
              expiresAt={draft.expiresAt}
              priority={draft.priority}
              requiresApproval={draft.requiresApproval}
              approvalMode={draft.approvalMode}
              onChange={patch}
            />
          )}
          {step === 3 && (
            <StepScope
              scopeType={draft.scopeType}
              categoryIds={draft.categoryIds}
              departmentIds={draft.departmentIds}
              roleIds={draft.roleIds}
              jobGradeIds={draft.jobGradeIds}
              managementLevelIds={draft.managementLevelIds}
              vendorIds={draft.vendorIds}
              exceptions={draft.exceptions}
              onChange={patch}
            />
          )}
          {step === 4 && (
            <StepRules
              rules={draft.rules}
              policyGroup={draft.policyGroup}
              onChange={(rules) => patch({ rules })}
            />
          )}
          {step === 5 && <StepReview draft={draft} />}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="shrink-0 z-10 w-full bg-white">
        <div className="max-w-5xl w-full mx-auto px-6 py-5 border-t border-black/[0.06] flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={createPolicy.isPending}
            className="h-11 px-7 rounded-[14px] border border-black/[0.06] bg-white text-[#0b100e] hover:bg-[#f9faf9] font-semibold text-sm transition-colors disabled:opacity-50"
          >
            Back
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={saveDraft}
              disabled={createPolicy.isPending || createDraft.isPending || updateDraft.isPending}
              className="h-11 px-7 rounded-[14px] border border-black/[0.06] bg-white text-[#0b100e] hover:bg-[#f9faf9] font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {(createDraft.isPending || updateDraft.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : draft.draftId ? (
                "Save Changes"
              ) : (
                "Save as Draft"
              )}
            </button>
            <button
              onClick={goNext}
              disabled={!canContinue() || createPolicy.isPending || updatePolicy.isPending || createDraft.isPending || updateDraft.isPending}
              className="h-11 px-7 min-w-[140px] rounded-[14px] bg-[#087f70] text-white hover:opacity-90 font-semibold text-sm transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {(createPolicy.isPending || updatePolicy.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : step === TOTAL_STEPS ? (
                "Create Policy"
              ) : (
                "Continue"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
