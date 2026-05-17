import { create } from "zustand";

export type AppTab = "active" | "history" | "settings";

interface UiStore {
  appTab: AppTab;
  fieldMode: boolean;
  showNewJob: boolean;
  setAppTab: (tab: AppTab) => void;
  toggleFieldMode: () => void;
  setFieldMode: (on: boolean) => void;
  openNewJob: () => void;
  closeNewJob: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  appTab: "active",
  fieldMode: false,
  showNewJob: false,

  setAppTab: (appTab) => set({ appTab }),

  toggleFieldMode: () => set((s) => ({ fieldMode: !s.fieldMode })),

  setFieldMode: (fieldMode) => set({ fieldMode }),

  openNewJob: () => set({ showNewJob: true, appTab: "active" }),

  closeNewJob: () => set({ showNewJob: false }),
}));
