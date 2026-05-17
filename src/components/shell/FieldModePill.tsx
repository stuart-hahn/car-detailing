import { useUiStore } from "../../store/uiStore";

export function FieldModePill() {
  const { fieldMode, toggleFieldMode } = useUiStore();

  return (
    <button
      type="button"
      onClick={toggleFieldMode}
      aria-pressed={fieldMode}
      className={`min-h-11 shrink-0 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
        fieldMode
          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
          : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
      }`}
    >
      ☀ Field (light)
    </button>
  );
}
