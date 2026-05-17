import { useEffect, useRef } from "react";
import { applyTheme } from "../lib/theme/applyTheme";
import { resolveTheme } from "../lib/theme/resolveTheme";
import { useSettingsStore } from "../store/settingsStore";
import { useUiStore } from "../store/uiStore";

/** Load settings, apply theme tokens, honor field-default on first launch. */
export function useAppTheme(): { ready: boolean } {
  const { settings, loaded, load } = useSettingsStore();
  const fieldMode = useUiStore((s) => s.fieldMode);
  const setFieldMode = useUiStore((s) => s.setFieldMode);
  const fieldDefaultApplied = useRef(false);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!loaded || !settings || fieldDefaultApplied.current) return;
    fieldDefaultApplied.current = true;
    setFieldMode(settings.field_default_on_launch);
  }, [loaded, settings, setFieldMode]);

  useEffect(() => {
    if (!settings) return;

    const sync = () => {
      const resolved = resolveTheme(settings.theme);
      applyTheme(resolved, fieldMode);
    };

    sync();

    if (settings.theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => sync();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings, fieldMode]);

  return { ready: loaded };
}
