import { describe, expect, it } from "vitest";
import type { StepInstance } from "../types";
import {
  findUpNextStep,
  getChecklistWorkSteps,
  partitionChecklistSteps,
} from "./focus";

function inst(
  slot: StepInstance["slot"],
  status: StepInstance["status"],
  template_id = "t",
): StepInstance {
  return {
    instance_id: `${template_id}-1`,
    template_id,
    slot,
    status,
    completed_at: status === "completed" ? "2026-05-16T12:00:00Z" : null,
    photo_taken: false,
    tech_note: null,
  };
}

describe("checklist focus", () => {
  it("excludes intake and qc slots from work steps", () => {
    const steps = [
      inst("intake", "completed", "intake"),
      inst("wash", "pending", "wash"),
      inst("qc", "pending", "qc_work"),
    ];
    expect(getChecklistWorkSteps(steps).map((s) => s.slot)).toEqual(["wash"]);
  });

  it("prioritizes needs_rework over later pending steps", () => {
    const steps = [
      inst("wash", "completed", "wash"),
      inst("glass", "pending", "glass"),
      inst("dry", "needs_rework", "dry"),
    ];
    expect(findUpNextStep(steps)?.template_id).toBe("dry");
  });

  it("skips locked upsell steps when finding up next", () => {
    const steps = [
      inst("wash", "locked", "upsell"),
      inst("dry", "pending", "dry"),
    ];
    expect(findUpNextStep(steps)?.template_id).toBe("dry");
  });

  it("returns null when all actionable steps are complete", () => {
    const steps = [
      inst("wash", "completed", "wash"),
      inst("dry", "completed", "dry"),
      inst("glass", "locked", "upsell"),
    ];
    expect(findUpNextStep(steps)).toBeNull();
  });

  it("partitions done vs up next", () => {
    const steps = [
      inst("wash", "completed", "wash"),
      inst("dry", "pending", "dry"),
      inst("glass", "pending", "glass"),
    ];
    const { doneSteps, upNext } = partitionChecklistSteps(steps);
    expect(doneSteps).toHaveLength(1);
    expect(upNext?.template_id).toBe("dry");
  });
});
