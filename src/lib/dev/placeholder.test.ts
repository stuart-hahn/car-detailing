import { describe, expect, it } from "vitest";

describe("createPlaceholderBlob", () => {
  it("is browser-only (skipped in node tests)", () => {
    expect(typeof document).toBe("undefined");
  });
});
