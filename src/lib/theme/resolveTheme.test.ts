import { describe, expect, it } from "vitest";
import { resolveTheme } from "./resolveTheme";

describe("resolveTheme", () => {
  it("returns explicit light and dark", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows system preference when theme is system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});
