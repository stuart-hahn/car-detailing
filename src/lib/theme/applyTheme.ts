import type { ResolvedTheme } from "./tokens";

export function applyTheme(resolved: ResolvedTheme, fieldMode: boolean): void {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  if (fieldMode) {
    root.dataset.fieldMode = "true";
  } else {
    delete root.dataset.fieldMode;
  }
}
