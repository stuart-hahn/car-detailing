import { describe, expect, it } from "vitest";
import { createPlaceholderImageFile } from "./placeholder";

describe("createPlaceholderImageFile", () => {
  it("returns a JPEG file", () => {
    const file = createPlaceholderImageFile();
    expect(file.type).toBe("image/jpeg");
    expect(file.size).toBeGreaterThan(0);
  });

  it("returns a new File instance each call", () => {
    const a = createPlaceholderImageFile();
    const b = createPlaceholderImageFile();
    expect(a).not.toBe(b);
  });
});
