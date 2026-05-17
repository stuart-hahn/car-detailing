/** Semantic palette tokens — field mode overrides theme via CSS. */
export const FIELD_PALETTE = {
  bg: "#f8f9fa",
  text: "#111827",
  border: "#374151",
  cta: "#059669",
  warn: "#d97706",
  error: "#dc2626",
  info: "#0284c7",
} as const;

export const DARK_PALETTE = {
  bg: "#020617",
  surface: "#0f172a",
  surfaceMuted: "rgba(15, 23, 42, 0.5)",
  text: "#f1f5f9",
  textSecondary: "#cbd5e1",
  textMuted: "#94a3b8",
  textFaint: "#64748b",
  border: "#1e293b",
  borderStrong: "#334155",
  cta: "#0284c7",
  ctaMuted: "rgba(2, 132, 199, 0.15)",
  warn: "#fbbf24",
  error: "#ef4444",
  info: "#38bdf8",
  success: "#34d399",
} as const;

export const LIGHT_PALETTE = {
  bg: "#f8fafc",
  surface: "#ffffff",
  surfaceMuted: "rgba(255, 255, 255, 0.8)",
  text: "#0f172a",
  textSecondary: "#334155",
  textMuted: "#64748b",
  textFaint: "#94a3b8",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  cta: "#0284c7",
  ctaMuted: "rgba(2, 132, 199, 0.12)",
  warn: "#d97706",
  error: "#dc2626",
  info: "#0284c7",
  success: "#059669",
} as const;

export type ResolvedTheme = "light" | "dark";
