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
import { StepApproval } from "./steps/StepApproval";
import { StepReview } from "./steps/StepReview";
import { emptyDraft } from "./types";
import type { PolicyDraft } from "./types";
import { useCreateProcurementPolicy } from "@/queries/procurement/policies";

const TOTAL_STEPS = 6;

export function ProcurementPolicyWizard({
  onCancel,
  onComplete,
}: {
  onCancel: () => void;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<PolicyDraft>(emptyDraft());
  const { setBackHandler, clearBackHandler } = useHeaderBackStore();
  const stepRef = useRef(step);
  const createPolicy = useCreateProcurementPolicy();

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
      case 2: return draft.name.trim().length > 0;
      case 3: return true; // scope is always valid
      case 4:
        return (
          draft.rules.length > 0 &&
          draft.rules.every((r) => r.condition !== "" && r.enforcementAction !== "")
        );
      case 5: return true; // approvers optional if requiresApproval is false
      case 6: return true;
      default: return true;
    }
  };

  const validationMessage = (): string => {
    switch (step) {
      case 1: return "Please select a policy group to continue.";
      case 2: return "Please enter a policy name before continuing.";
      case 4: return "Each rule must have a condition and enforcement action selected.";
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
        await createPolicy.mutateAsync(draft);
        toast.success("Procurement policy created successfully.");
        onComplete();
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to create policy. Please try again.";
        toast.error(message);
      }
      return;
    }

    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Stepper */}
      <div className="shrink-0 z-40 bg-card">
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
          {step === 5 && (
            <StepApproval
              approverIds={draft.approverIds}
              requiresApproval={draft.requiresApproval}
              onChange={(approverIds) => patch({ approverIds })}
            />
          )}
          {step === 6 && <StepReview draft={draft} />}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="shrink-0 z-10 w-full bg-card">
        <div className="max-w-5xl w-full mx-auto px-6 py-5 border-t border-border flex items-center justify-end gap-3">
          <Button variant="outline" className="rounded-xl h-11 px-7" onClick={goBack} disabled={createPolicy.isPending}>
            Back
          </Button>
          <Button
            className="rounded-xl h-11 px-7 min-w-[140px]"
            onClick={goNext}
            disabled={!canContinue() || createPolicy.isPending}
          >
            {createPolicy.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating…
              </>
            ) : step === TOTAL_STEPS ? (
              "Create Policy"
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
