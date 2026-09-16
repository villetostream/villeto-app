"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useHeaderBackStore } from "@/stores/useHeaderBackStore";
import { Stepper } from "./Stepper";
import { StepDetails } from "./steps/StepConfigure";
import { StepCategories } from "./steps/StepCategories";
import { StepRules } from "./steps/StepRules";
import { StepReview } from "./steps/StepReview";
import { emptySpendProgramDraft } from "./types";
import type { SpendProgramDraft } from "./types";
import { SPEND_PROGRAM_GROUPS } from "./constants";
import { 
  useCreateSpendProgram, 
  useUpdateSpendProgram, 
  useCreateSpendProgramDraft, 
  useUpdateSpendProgramDraft, 
  useGetSpendProgramById, 
  useGetSpendProgramDraftById,
  useGetSpendProgramSettings,
  mapSpendProgramFromBackend
} from "@/queries/procurement/policies";

const TOTAL_STEPS = 4;

export function ProcurementPolicyWizard({
  programId,
  initialDraftId,
  initialStep = 1,
  onCancel,
  onComplete,
}: {
  programId?: string | null;
  initialDraftId?: string | null;
  initialStep?: number;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(initialStep);
  const [draft, setDraft] = useState<SpendProgramDraft>(emptySpendProgramDraft());
  const { setBackHandler, clearBackHandler } = useHeaderBackStore();
  const stepRef = useRef(step);
  
  const createProgram = useCreateSpendProgram();
  const updateProgram = useUpdateSpendProgram(programId || "");
  const createDraft = useCreateSpendProgramDraft();
  const updateDraft = useUpdateSpendProgramDraft();

  const { data: activeData, isLoading: isActiveLoading } = useGetSpendProgramById(programId || "", {
    enabled: !!programId,
  });
  const { data: draftData, isLoading: isDraftLoading } = useGetSpendProgramDraftById(initialDraftId || "", {
    enabled: !!initialDraftId,
  });
  const { data: settingsData, isLoading: isSettingsLoading } = useGetSpendProgramSettings();

  // Derive which stages are active from governance settings (default all if not yet loaded)
  const activeStages: string[] = settingsData?.data?.enabledGroups ?? settingsData?.data?.activeStages ?? ["pr_submission", "pr_to_po", "po_submission"];

  const isLoading = isActiveLoading || isDraftLoading || isSettingsLoading;

  useEffect(() => {
    const data = programId ? activeData?.data : (initialDraftId ? draftData?.data : null);
    if (data) {
      const mapped = mapSpendProgramFromBackend(data);
      setDraft({
        name: mapped.name || "",
        description: mapped.description || "",
        categoryIds: mapped.categoryIds || [],
        groups: mapped.groups || activeStages.map(s => ({ group: s as any, rules: [] })),
        draftId: initialDraftId || undefined,
        programId: programId || undefined,
      });
    } else if (!programId && !initialDraftId) {
      // Fresh create — always reset to a completely empty draft
      setDraft({
        name: "",
        description: "",
        categoryIds: [],
        draftId: undefined,
        programId: undefined,
        groups: activeStages.length > 0
          ? activeStages.map(s => ({ group: s as any, rules: [] }))
          : SPEND_PROGRAM_GROUPS.map(g => ({ group: g.value, rules: [] })),
      });
    }
  }, [activeData?.data, draftData?.data, programId, initialDraftId, activeStages.join(',')]);
  // NOTE: activeStages.join(',') used instead of full array/settingsData to avoid
  // triggering re-render on every settings refetch while still reacting to stage changes

  useEffect(() => { stepRef.current = step; }, [step]);

  useEffect(() => {
    setBackHandler(() => {
      // Smart back: if step > 1 go back a step, otherwise leave the wizard
      if (stepRef.current <= 1) { 
        onCancel(); 
        return; 
      }
      setStep((s) => Math.max(1, s - 1));
    });
    return () => clearBackHandler();
  }, [onCancel, setBackHandler, clearBackHandler]);

  const patch = (p: Partial<SpendProgramDraft>) => setDraft((d) => ({ ...d, ...p }));

  const goBack = () => {
    if (step <= 1) { onCancel(); return; }
    setStep((s) => Math.max(1, s - 1));
  };

  const canContinue = (): boolean => {
    switch (step) {
      case 1: return draft.name.trim().length >= 3;
      case 2: return true; // Can continue with 0 categories (will prompt warning maybe later)
      case 3: return true; // Rules are optional
      case 4: return true;
      default: return true;
    }
  };

  const validationMessage = (): string => {
    switch (step) {
      case 1: return draft.name.trim().length === 0 ? "Please enter a program name." : "Name must be at least 3 characters.";
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
        if (programId) {
          await updateProgram.mutateAsync(draft);
          toast.success("Spend program updated successfully.");
        } else {
          await createProgram.mutateAsync(draft);
          toast.success("Spend program created successfully.");
        }
        onComplete();
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to save spend program. Please try again.";
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
      onComplete();
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
        <div className="max-w-[1100px] w-full mx-auto px-6 pt-8 pb-4">
          <Stepper currentStep={step} />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="max-w-[1100px] w-full mx-auto pb-4">
          {step === 1 && (
            <StepDetails
              name={draft.name}
              description={draft.description}
              onChange={patch}
            />
          )}
          {step === 2 && (
            <StepCategories
              categoryIds={draft.categoryIds}
              onChange={patch}
            />
          )}
          {step === 3 && (
            <StepRules
              draft={draft}
              onChange={patch}
              activeStages={activeStages}
            />
          )}
          {step === 4 && <StepReview draft={draft} />}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="shrink-0 z-10 w-full bg-white">
        <div className="max-w-[1100px] w-full mx-auto px-6 py-5 border-t border-black/[0.06] flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={createProgram.isPending}
            className="h-11 px-7 rounded-[14px] border border-black/[0.06] bg-white text-[#0b100e] hover:bg-[#f9faf9] font-semibold text-sm transition-colors disabled:opacity-50"
          >
            Back
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={saveDraft}
              disabled={createProgram.isPending || createDraft.isPending || updateDraft.isPending}
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
              disabled={!canContinue() || createProgram.isPending || updateProgram.isPending || createDraft.isPending || updateDraft.isPending}
              className="h-11 px-7 min-w-[140px] rounded-[14px] bg-[#087f70] text-white hover:opacity-90 font-semibold text-sm transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {(createProgram.isPending || updateProgram.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : step === TOTAL_STEPS ? (
                "Create Program"
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
