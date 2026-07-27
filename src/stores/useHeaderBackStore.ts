import { create } from "zustand";

/**
 * Lets any page register a custom "back" handler that takes precedence over
 * the global pathname-based back logic in UserSection. This is used for
 * in-page multi-step flows (e.g. the Procurement Policy wizard) that live on
 * a single route but have their own internal notion of "one level back".
 *
 * When a handler is registered, the header shows the "← Back" affordance and
 * clicking it calls the handler instead of navigating via next/navigation.
 * The owning component is responsible for clearing the handler on unmount or
 * whenever it is no longer the "current level" (e.g. leaving the wizard).
 */
interface HeaderBackStore {
  handler: (() => void) | null;
  label?: string;
  setBackHandler: (handler: (() => void) | null, label?: string) => void;
  clearBackHandler: () => void;
}

export const useHeaderBackStore = create<HeaderBackStore>((set) => ({
  handler: null,
  label: undefined,
  setBackHandler: (handler, label) => set({ handler, label }),
  clearBackHandler: () => set({ handler: null, label: undefined }),
}));
