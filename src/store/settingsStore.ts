import { create } from "zustand";
import {
  getOrCreateSettings,
  saveSettings,
  type AppSettings,
} from "../lib/db";

interface SettingsStore {
  settings: AppSettings | null;
  loaded: boolean;
  load: () => Promise<AppSettings>;
  patch: (partial: Partial<Omit<AppSettings, "id">>) => Promise<AppSettings>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: null,
  loaded: false,

  load: async () => {
    const settings = await getOrCreateSettings();
    set({ settings, loaded: true });
    return settings;
  },

  patch: async (partial) => {
    const settings = await saveSettings(partial);
    set({ settings });
    return settings;
  },
}));
