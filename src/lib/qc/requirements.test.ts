import { describe, expect, it } from "vitest";
import {
  FINAL_PHOTO_TARGETS,
  ODOMETER_PHOTO_TAG,
  countFinalPhotos,
  evaluateFinalPhotoGate,
  finalPhotoTag,
  getFinalPhotoRequirements,
} from "./requirements";

describe("QC final photo requirements", () => {
  it("targets maintenance at 4 final photos plus odometer", () => {
    const reqs = getFinalPhotoRequirements("maintenance");
    expect(reqs).toHaveLength(5);
    expect(reqs[0]?.tag).toBe(finalPhotoTag(1));
    expect(reqs.at(-1)?.tag).toBe(ODOMETER_PHOTO_TAG);
  });

  it("targets refresh at 10 final photos", () => {
    expect(getFinalPhotoRequirements("refresh")).toHaveLength(11);
    expect(FINAL_PHOTO_TARGETS.refresh).toBe(10);
  });

  it("counts final photo tags only", () => {
    const tags = [
      finalPhotoTag(1),
      finalPhotoTag(2),
      "corner_fl",
      ODOMETER_PHOTO_TAG,
    ];
    expect(countFinalPhotos(tags)).toBe(2);
  });

  it("passes gate when count and odometer met", () => {
    const tags = Array.from({ length: 4 }, (_, i) => finalPhotoTag(i + 1));
    tags.push(ODOMETER_PHOTO_TAG);
    const gate = evaluateFinalPhotoGate(tags, "maintenance");
    expect(gate.met).toBe(true);
    expect(gate.have).toBe(4);
  });

  it("fails gate without odometer", () => {
    const tags = Array.from({ length: 4 }, (_, i) => finalPhotoTag(i + 1));
    const gate = evaluateFinalPhotoGate(tags, "maintenance");
    expect(gate.met).toBe(false);
    expect(gate.missingOdometer).toBe(true);
  });
});
