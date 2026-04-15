import { create } from "zustand";

export interface HeaderActionItem {
  label: string;
  onClick: () => void;
}

export interface HeaderAction {
  label: string;
  /** Simple button — provide onClick */
  onClick?: () => void;
  /** Dropdown button — provide items array instead */
  items?: HeaderActionItem[];
  /** Optional icon name to override the default plus circle */
  iconName?: "plus" | "upload";
  /** Optional data-tour attribute value for the tour guide to target */
  dataTourId?: string;
  /** Optional secondary action button shown alongside */
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    items?: HeaderActionItem[];
    iconName?: "plus" | "upload";
    dataTourId?: string;
  };
}

interface HeaderActionStore {
  action: HeaderAction | null;
  setAction: (action: HeaderAction | null) => void;
  clearAction: () => void;
}

export const useHeaderActionStore = create<HeaderActionStore>((set) => ({
  action: null,
  setAction: (action) => set({ action }),
  clearAction: () => set({ action: null }),
}));