import { describe, expect, it } from "vitest";
import { detectChecklistCompleteMode } from "./useChecklistCompleteMode";

describe("detectChecklistCompleteMode", () => {
  it("uses checkbox for fine pointer (desktop)", () => {
    expect(detectChecklistCompleteMode(false)).toBe("checkbox");
  });

  it("uses swipe for coarse pointer (touch)", () => {
    expect(detectChecklistCompleteMode(true)).toBe("swipe");
  });
});
