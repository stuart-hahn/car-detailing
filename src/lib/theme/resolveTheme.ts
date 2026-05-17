import type { AppSettings } from "../db";
import type { ResolvedTheme } from "./tokens";

export function resolveTheme(
  preference: AppSettings["theme"],
  prefersDark: boolean = typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : true,
): ResolvedTheme {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return prefersDark ? "dark" : "light";
}
