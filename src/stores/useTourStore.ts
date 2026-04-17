import { create } from "zustand";

interface TourState {
  /** True while the Villeto onboarding tour is visible */
  isTourActive: boolean;
  setTourActive: (active: boolean) => void;

  /**
   * True once the SetPasswordModal flow has completed for a
   * CONTROLLING_OFFICER / ORGANIZATION_OWNER first-login user.
   * VilletoSetupGuide waits for this flag before showing.
   */
  setupGuideReady: boolean;
  setSetupGuideReady: (ready: boolean) => void;
}

export const useTourStore = create<TourState>((set) => ({
  isTourActive: false,
  setTourActive: (active) => set({ isTourActive: active }),

  setupGuideReady: false,
  setSetupGuideReady: (ready) => set({ setupGuideReady: ready }),
}));
